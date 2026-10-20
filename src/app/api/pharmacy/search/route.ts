import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({ error: 'Debes ingresar una cédula o código de récipe para buscar' }, { status: 400 });
        }

        const cleanQuery = query.trim();

        // 1. Intentar buscar por Cédula de Paciente
        // Normalizar cédula eliminando posibles prefijos tipo "V-", "E-", "J-", etc. para una búsqueda flexible
        const numericCedula = cleanQuery.replace(/^[VvEeJjPp]-?/, '').trim();

        const { data: matchedPatients, error: patientError } = await supabaseAdmin
            .from('patients')
            .select('id, name, cedula, age, gender, phone, email, city, state')
            .or(`cedula.ilike.%${cleanQuery}%,cedula.ilike.%${numericCedula}%`)
            .limit(5);

        if (patientError) {
            console.error('Error buscando paciente por cédula:', patientError);
        }

        let patient = matchedPatients && matchedPatients.length > 0 ? matchedPatients[0] : null;
        let records: any[] = [];

        if (patient) {
            // Obtener récipes del paciente
            const { data: recordsData, error: recordsError } = await supabaseAdmin
                .from('medical_records')
                .select(`
                    id,
                    patient_id,
                    doctor_id,
                    visit_date,
                    diagnosis,
                    prescription,
                    prescription_expires_at,
                    recipe_status,
                    dispensed_by_pharmacy_id,
                    dispensed_by_pharmacy_name,
                    dispensed_at,
                    dispensation_notes,
                    treatment_plan,
                    created_at,
                    doctors (
                        id,
                        name,
                        specialty,
                        medical_license,
                        phone,
                        whatsapp,
                        city,
                        signature_url
                    )
                `)
                .eq('patient_id', patient.id)
                .not('prescription', 'is', null)
                .neq('prescription', '')
                .order('created_at', { ascending: false });

            if (recordsError) {
                console.error('Error buscando récipes del paciente:', recordsError);
            } else if (recordsData) {
                records = recordsData;
            }
        } else {
            // 2. Si no encontró paciente por cédula, intentar por Código de Récipe (ej. SUMA-REC-XXXXXXXX o UUID)
            const cleanCode = cleanQuery.replace(/^SUMA-REC-/i, '').trim();

            let recordQuery = supabaseAdmin
                .from('medical_records')
                .select(`
                    id,
                    patient_id,
                    doctor_id,
                    visit_date,
                    diagnosis,
                    prescription,
                    prescription_expires_at,
                    recipe_status,
                    dispensed_by_pharmacy_id,
                    dispensed_by_pharmacy_name,
                    dispensed_at,
                    dispensation_notes,
                    treatment_plan,
                    created_at,
                    doctors (
                        id,
                        name,
                        specialty,
                        medical_license,
                        phone,
                        whatsapp,
                        city,
                        signature_url
                    )
                `)
                .not('prescription', 'is', null)
                .neq('prescription', '');

            const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);

            if (isFullUuid) {
                recordQuery = recordQuery.eq('id', cleanCode);
            } else {
                const normalizedCode = cleanQuery.toUpperCase().startsWith('SUMA-REC-') 
                    ? cleanQuery.toUpperCase() 
                    : `SUMA-REC-${cleanQuery.toUpperCase()}`;
                recordQuery = recordQuery.or(`recipe_code.eq.${normalizedCode},recipe_code.ilike.%${cleanCode}%`);
            }

            const { data: recordData, error: recordError } = await recordQuery.limit(1).maybeSingle();

            if (recordError) {
                console.error('Error buscando récipe por código:', recordError);
            } else if (recordData) {
                records = [recordData];

                // Buscar paciente de ese récipe
                if (recordData.patient_id) {
                    const { data: foundPatient } = await supabaseAdmin
                        .from('patients')
                        .select('id, name, cedula, age, gender, phone, email, city, state')
                        .eq('id', recordData.patient_id)
                        .maybeSingle();

                    if (foundPatient) {
                        patient = foundPatient;
                    }
                }
            }
        }

        if (!patient && records.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No se encontraron pacientes ni récipes con los datos ingresados. Verifica el número de cédula o código del récipe.',
                patient: null,
                records: []
            });
        }

        // Formatear estado de vigencia de cada récipe
        const now = new Date();
        const formattedRecords = records.map((rec) => {
            const isDispensed = !!rec.dispensed_at || rec.recipe_status === 'dispensed';
            let calculatedStatus: 'active' | 'expiring_soon' | 'expired' | 'dispensed' = 'active';

            if (isDispensed) {
                calculatedStatus = 'dispensed';
            } else if (rec.prescription_expires_at) {
                const expiryDate = new Date(rec.prescription_expires_at);
                const diffTime = expiryDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffTime < 0) {
                    calculatedStatus = 'expired';
                } else if (diffDays <= 3) {
                    calculatedStatus = 'expiring_soon';
                } else {
                    calculatedStatus = 'active';
                }
            }

            return {
                id: rec.id,
                recipeCode: `SUMA-REC-${rec.id.slice(0, 8).toUpperCase()}`,
                visitDate: rec.visit_date || rec.created_at,
                prescription: rec.prescription,
                treatmentPlan: rec.treatment_plan,
                diagnosis: rec.diagnosis,
                prescriptionExpiresAt: rec.prescription_expires_at,
                calculatedStatus,
                recipeStatus: rec.recipe_status || (isDispensed ? 'dispensed' : 'active'),
                dispensedByPharmacyId: rec.dispensed_by_pharmacy_id,
                dispensedByPharmacyName: rec.dispensed_by_pharmacy_name,
                dispensedAt: rec.dispensed_at,
                dispensationNotes: rec.dispensation_notes,
                doctor: rec.doctors || {
                    name: 'Médico Tratante',
                    specialty: 'Especialista',
                    medical_license: '',
                    city: ''
                },
                createdAt: rec.created_at
            };
        });

        return NextResponse.json({
            success: true,
            patient: patient ? {
                id: patient.id,
                name: patient.name,
                cedula: patient.cedula,
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone,
                city: patient.city,
                state: patient.state
            } : null,
            records: formattedRecords
        });

    } catch (error: any) {
        console.error('Error en búsqueda de farmacia:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

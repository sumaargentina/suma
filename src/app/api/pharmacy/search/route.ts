import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const MEDICAL_RECORDS_SELECT = `
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
    guest_patient_name,
    guest_patient_cedula,
    guest_patient_phone,
    guest_patient_email,
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
`;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json({ error: 'Debes ingresar una cédula o código de récipe para buscar' }, { status: 400 });
        }

        const cleanQuery = query.trim();

        // 1. Normalizar cédula eliminando prefijos ("V-", "E-", "J-", puntos o espacios) para búsqueda flexible
        const numericCedula = cleanQuery.replace(/^[VvEeJjPp]-?/, '').replace(/[\.\s-]/g, '').trim();

        const { data: matchedPatients, error: patientError } = await supabaseAdmin
            .from('patients')
            .select('id, name, cedula, age, gender, phone, email, city, state')
            .or(
                numericCedula.length >= 4
                    ? `cedula.ilike.%${cleanQuery}%,cedula.ilike.%${numericCedula}%`
                    : `cedula.ilike.%${cleanQuery}%`
            )
            .limit(5);

        if (patientError) {
            console.error('Error buscando paciente por cédula:', patientError);
        }

        let patient: any = matchedPatients && matchedPatients.length > 0 ? matchedPatients[0] : null;
        const recordsMap = new Map<string, any>();

        // 1A. Si se encontró paciente en la tabla patients, buscar sus medical_records por patient_id
        if (patient?.id) {
            const { data: recordsData, error: recordsError } = await supabaseAdmin
                .from('medical_records')
                .select(MEDICAL_RECORDS_SELECT)
                .eq('patient_id', patient.id)
                .not('prescription', 'is', null)
                .neq('prescription', '')
                .order('created_at', { ascending: false });

            if (recordsError) {
                console.error('Error buscando récipes del paciente:', recordsError);
            } else if (recordsData) {
                for (const r of recordsData) {
                    recordsMap.set(r.id, r);
                }
            }
        }

        // 1B. Buscar también en medical_records por guest_patient_cedula (pacientes atendidos en jornadas o sin cuenta previa)
        if (numericCedula.length >= 4) {
            const { data: guestRecords, error: guestError } = await supabaseAdmin
                .from('medical_records')
                .select(MEDICAL_RECORDS_SELECT)
                .or(`guest_patient_cedula.ilike.%${cleanQuery}%,guest_patient_cedula.ilike.%${numericCedula}%`)
                .not('prescription', 'is', null)
                .neq('prescription', '')
                .order('created_at', { ascending: false });

            if (guestError) {
                console.warn('Warning buscando récipes por guest_patient_cedula:', guestError);
            } else if (guestRecords && guestRecords.length > 0) {
                for (const r of guestRecords) {
                    if (!recordsMap.has(r.id)) {
                        recordsMap.set(r.id, r);
                    }
                }
                if (!patient) {
                    const firstGuest = guestRecords[0];
                    patient = {
                        id: firstGuest.patient_id || firstGuest.id,
                        name: firstGuest.guest_patient_name || 'Paciente SUMA (Jornada)',
                        cedula: firstGuest.guest_patient_cedula || cleanQuery,
                        age: null,
                        gender: null,
                        phone: firstGuest.guest_patient_phone || null,
                        city: null,
                        state: null,
                    };
                }
            }
        }

        // 1C. Buscar también en health_campaign_attendances (Jornadas de Salud) por patient_cedula o patient_id
        if (numericCedula.length >= 4 || patient?.id) {
            const orFilters: string[] = [];
            if (numericCedula.length >= 4) {
                orFilters.push(`patient_cedula.ilike.%${cleanQuery}%`);
                orFilters.push(`patient_cedula.ilike.%${numericCedula}%`);
            }
            if (patient?.id) {
                orFilters.push(`patient_id.eq.${patient.id}`);
            }

            if (orFilters.length > 0) {
                const { data: campAttendances, error: campError } = await supabaseAdmin
                    .from('health_campaign_attendances')
                    .select('*')
                    .or(orFilters.join(','))
                    .not('prescription', 'is', null)
                    .neq('prescription', '')
                    .order('attended_at', { ascending: false });

                if (!campError && campAttendances && campAttendances.length > 0) {
                    for (const att of campAttendances) {
                        if (att.medical_record_id && recordsMap.has(att.medical_record_id)) {
                            continue;
                        }

                        // Si ya tiene medical_record_id pero no estaba en recordsMap (ej. patient_id distinto), cargarlo
                        if (att.medical_record_id) {
                            const { data: linkedRec } = await supabaseAdmin
                                .from('medical_records')
                                .select(MEDICAL_RECORDS_SELECT)
                                .eq('id', att.medical_record_id)
                                .maybeSingle();
                            if (linkedRec) {
                                recordsMap.set(linkedRec.id, linkedRec);
                                continue;
                            }
                        }

                        // Intentar sincronizar/crear el registro en medical_records automáticamente para que pueda dispensarse normalmente
                        let syncedRecord: any = null;
                        try {
                            const expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 30);
                            const { data: createdMr } = await supabaseAdmin
                                .from('medical_records')
                                .insert([
                                    {
                                        patient_id: att.patient_id || patient?.id || null,
                                        doctor_id: att.doctor_id,
                                        campaign_id: att.campaign_id,
                                        guest_patient_name: att.patient_name,
                                        guest_patient_cedula: att.patient_cedula,
                                        guest_patient_email: att.patient_email || null,
                                        guest_patient_phone: att.patient_phone || null,
                                        visit_date: att.attended_at || new Date().toISOString(),
                                        record_type: 'consultation',
                                        reason_for_visit: 'Jornada de Salud SUMA',
                                        symptoms: att.symptoms || null,
                                        diagnosis: att.diagnosis || att.evaluation || 'Atención en Jornada de Salud',
                                        evaluation: att.evaluation || att.diagnosis || null,
                                        treatment_plan: att.treatment_plan || att.prescription || 'Cumplir indicaciones según pauta médica.',
                                        prescription: att.prescription,
                                        requested_studies: att.requested_studies || null,
                                        recipe_status: 'active',
                                        prescription_expires_at: expiresAt.toISOString(),
                                        notes: 'Jornada de Salud SUMA',
                                    },
                                ])
                                .select(MEDICAL_RECORDS_SELECT)
                                .single();

                            if (createdMr) {
                                syncedRecord = createdMr;
                                await supabaseAdmin
                                    .from('health_campaign_attendances')
                                    .update({ medical_record_id: createdMr.id })
                                    .eq('id', att.id);
                            }
                        } catch {
                            // Si no se pudo crear en medical_records, usar los datos directos de la jornada
                        }

                        if (syncedRecord) {
                            recordsMap.set(syncedRecord.id, syncedRecord);
                        } else {
                            // Construir registro compatible desde health_campaign_attendances
                            let docData: any = null;
                            if (att.doctor_id) {
                                const { data: d } = await supabaseAdmin
                                    .from('doctors')
                                    .select('id, name, specialty, medical_license, phone, whatsapp, city, signature_url')
                                    .eq('id', att.doctor_id)
                                    .maybeSingle();
                                docData = d;
                            }

                            recordsMap.set(att.id, {
                                id: att.id,
                                patient_id: att.patient_id,
                                doctor_id: att.doctor_id,
                                visit_date: att.attended_at,
                                diagnosis: att.diagnosis,
                                prescription: att.prescription,
                                prescription_expires_at: null,
                                recipe_status: 'active',
                                dispensed_by_pharmacy_id: null,
                                dispensed_by_pharmacy_name: null,
                                dispensed_at: null,
                                dispensation_notes: null,
                                treatment_plan: att.treatment_plan,
                                created_at: att.attended_at,
                                doctors: docData || {
                                    id: att.doctor_id,
                                    name: att.doctor_name || 'Médico Tratante',
                                    specialty: att.specialty || 'Medicina General',
                                    medical_license: '',
                                    phone: '',
                                    whatsapp: '',
                                    city: '',
                                },
                            });
                        }

                        if (!patient) {
                            patient = {
                                id: att.patient_id || att.id,
                                name: att.patient_name || 'Paciente SUMA (Jornada)',
                                cedula: att.patient_cedula || cleanQuery,
                                age: att.patient_age ?? null,
                                gender: att.patient_gender || null,
                                phone: att.patient_phone || null,
                                city: null,
                                state: null,
                            };
                        }
                    }
                }
            }
        }

        // 2. Si aún no se encontraron récipes, intentar buscar por Código de Récipe (ej. SUMA-REC-XXXXXXXX o UUID)
        if (recordsMap.size === 0) {
            const cleanCode = cleanQuery.replace(/^SUMA-REC-/i, '').trim();

            let recordQuery = supabaseAdmin
                .from('medical_records')
                .select(MEDICAL_RECORDS_SELECT)
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
                recordsMap.set(recordData.id, recordData);

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
                if (!patient && (recordData.guest_patient_name || recordData.guest_patient_cedula)) {
                    patient = {
                        id: recordData.patient_id || recordData.id,
                        name: recordData.guest_patient_name || 'Paciente SUMA',
                        cedula: recordData.guest_patient_cedula || 'N/A',
                        age: null,
                        gender: null,
                        phone: recordData.guest_patient_phone || null,
                        city: null,
                        state: null,
                    };
                }
            }
        }

        const records = Array.from(recordsMap.values()).sort(
            (a, b) => new Date(b.created_at || b.visit_date || 0).getTime() - new Date(a.created_at || a.visit_date || 0).getTime()
        );

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

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    if ('favoriteDoctorIds' in result && !('favoritedDoctorIds' in result)) {
        result.favoritedDoctorIds = result.favoriteDoctorIds;
    }
    return result;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { doctorId } = body;

        if (!doctorId) {
            return NextResponse.json({ error: 'doctorId es requerido' }, { status: 400 });
        }

        // 1. Verificar si ya existe el registro espejo en la tabla patients con el mismo ID
        const { data: existingById } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', doctorId)
            .maybeSingle();

        if (existingById) {
            return NextResponse.json({
                patient: toCamelCase(existingById as Record<string, unknown>),
                created: false,
            });
        }

        // 2. Obtener los datos del médico desde la tabla doctors
        const { data: doctor, error: docErr } = await supabaseAdmin
            .from('doctors')
            .select('*')
            .eq('id', doctorId)
            .maybeSingle();

        if (docErr || !doctor) {
            return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 });
        }

        // 3. Verificar si existía un paciente previo con el mismo email o con la misma cédula
        if (doctor.email) {
            const { data: existingByEmail } = await supabaseAdmin
                .from('patients')
                .select('*')
                .ilike('email', doctor.email)
                .maybeSingle();

            if (existingByEmail) {
                return NextResponse.json({
                    patient: toCamelCase(existingByEmail as Record<string, unknown>),
                    created: false,
                });
            }
        }

        if (doctor.cedula) {
            const cleanCedula = String(doctor.cedula).replace(/\D/g, '');
            const { data: existingByCedula } = await supabaseAdmin
                .from('patients')
                .select('*')
                .or(`cedula.eq.${doctor.cedula}${cleanCedula ? `,cedula.eq.${cleanCedula}` : ''}`)
                .maybeSingle();

            if (existingByCedula) {
                return NextResponse.json({
                    patient: toCamelCase(existingByCedula as Record<string, unknown>),
                    created: false,
                });
            }
        }

        const resolvedPhone = doctor.phone || doctor.whatsapp || null;

        // 4. Crear el registro espejo en patients con el mismo ID del médico
        const fullPayload: Record<string, unknown> = {
            id: doctor.id,
            name: doctor.name,
            email: (doctor.email || '').toLowerCase(),
            password: doctor.password || '',
            phone: resolvedPhone,
            cedula: doctor.cedula || null,
            document_type: doctor.document_type || 'Cédula',
            country: doctor.country || 'VE',
            state: doctor.state || null,
            city: doctor.city || null,
            sector: doctor.sector || null,
            address: doctor.address || null,
            profile_image: doctor.profile_image || null,
            favorite_doctor_ids: [],
            profile_completed: Boolean(doctor.cedula && resolvedPhone),
        };

        let insertedPatient: Record<string, unknown> | null = null;

        const { data: createdFull, error: fullErr } = await supabaseAdmin
            .from('patients')
            .insert([fullPayload])
            .select('*')
            .maybeSingle();

        if (!fullErr && createdFull) {
            insertedPatient = createdFull as Record<string, unknown>;
        } else {
            // Fallback con columnas básicas por si alguna columna opcional no existe en patients
            const minimalPayload: Record<string, unknown> = {
                id: doctor.id,
                name: doctor.name,
                email: (doctor.email || '').toLowerCase(),
                password: doctor.password || '',
                phone: resolvedPhone,
                cedula: doctor.cedula || null,
                city: doctor.city || null,
                address: doctor.address || null,
                profile_image: doctor.profile_image || null,
                favorite_doctor_ids: [],
            };

            const { data: createdMin, error: minErr } = await supabaseAdmin
                .from('patients')
                .insert([minimalPayload])
                .select('*')
                .maybeSingle();

            if (minErr) {
                console.error('Error creating mirror patient profile for doctor:', minErr);
                return NextResponse.json({ error: minErr.message }, { status: 500 });
            }
            insertedPatient = createdMin as Record<string, unknown>;
        }

        // 5. Vincular automáticamente récipes o atenciones previas si las tuviera con su cédula
        try {
            if (doctor.cedula) {
                const cleanCedula = String(doctor.cedula).replace(/\D/g, '');
                if (cleanCedula) {
                    await supabaseAdmin
                        .from('medical_records')
                        .update({ patient_id: doctor.id })
                        .is('patient_id', null)
                        .or(`guest_patient_cedula.eq.${doctor.cedula},guest_patient_cedula.eq.${cleanCedula}`);

                    await supabaseAdmin
                        .from('health_campaign_attendances')
                        .update({ patient_id: doctor.id, is_registered_patient: true })
                        .is('patient_id', null)
                        .or(`patient_cedula.eq.${doctor.cedula},patient_cedula.eq.${cleanCedula}`);
                }
            }
        } catch (linkErr) {
            console.warn('Non-blocking warning linking records for doctor patient profile:', linkErr);
        }

        return NextResponse.json({
            patient: toCamelCase(insertedPatient || fullPayload),
            created: true,
        });
    } catch (error: any) {
        console.error('Error in POST /api/doctors/patient-profile:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

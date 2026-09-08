import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('id');
    const clinicId = searchParams.get('clinicId');
    const workspaceType = searchParams.get('workspaceType'); // 'private' | 'clinic' | 'public_hospital'

    if (!doctorId) {
        return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
    }

    try {
        let query = supabaseAdmin
            .from('appointments')
            .select('*');

        if (workspaceType === 'private' || (!clinicId && workspaceType !== 'clinic' && workspaceType !== 'public_hospital')) {
            // Consultorio Privado: solo citas donde NO pertenezcan a una clínica ni servicio institucional
            query = query
                .eq('doctor_id', doctorId)
                .is('clinic_id', null)
                .is('clinic_service_id', null);
        } else if (clinicId) {
            // Clínica / Hospital: citas asignadas a este médico en esta clínica específica
            const { data: services } = await supabaseAdmin
                .from('clinic_services')
                .select('id')
                .eq('clinic_id', clinicId);

            const serviceIds = (services || []).map(s => s.id);

            if (serviceIds.length > 0) {
                query = query
                    .eq('doctor_id', doctorId)
                    .or(`clinic_id.eq.${clinicId},clinic_service_id.in.(${serviceIds.join(',')})`);
            } else {
                query = query
                    .eq('doctor_id', doctorId)
                    .eq('clinic_id', clinicId);
            }
        } else {
            query = query.eq('doctor_id', doctorId);
        }

        const { data: appointments, error } = await query;

        if (error) {
            console.error('Error fetching appointments via API:', error);
            throw error;
        }

        // Obtener teléfonos actualizados de pacientes
        const patientIds = [...new Set(appointments?.map((a: any) => a.patient_id).filter(Boolean))];
        const patientPhoneMap = new Map();

        if (patientIds.length > 0) {
            const { data: patients, error: patientError } = await supabaseAdmin
                .from('patients')
                .select('id, phone')
                .in('id', patientIds);

            if (!patientError && patients) {
                patients.forEach((p: any) => {
                    if (p.phone) patientPhoneMap.set(p.id, p.phone);
                });
            } else if (patientError) {
                console.error("Error fetching patient phones:", patientError);
            }
        }

        // Convertir y mezclar
        const camelData = (appointments || []).map((item: any) => {
            const result: any = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = item[key];
            }

            if (item.patient_id && patientPhoneMap.has(item.patient_id)) {
                result.patientPhone = patientPhoneMap.get(item.patient_id);
            }

            return result;
        });

        return NextResponse.json(camelData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

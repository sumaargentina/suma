
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('id');

    if (!doctorId) {
        return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
    }

    try {
        // 1. Obtener citas
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctorId);

        if (error) {
            console.error('Error fetching appointments via API:', error);
            throw error;
        }

        // 2. Obtener teléfonos actualizados de pacientes
        // Usamos Set para ids únicos y filtramos nulos
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

        // 3. Convertir y mezclar
        const camelData = (appointments || []).map((item: any) => {
            const result: any = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = item[key];
            }

            // Inyectar teléfono actualizado si existe
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

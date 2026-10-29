import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pharmacyId = searchParams.get('pharmacyId');

        if (!pharmacyId) {
            return NextResponse.json({ error: 'ID de farmacia requerido' }, { status: 400 });
        }

        // Consultar récipes dispensados por esta farmacia con información completa del médico y paciente
        const { data: records, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                id,
                recipe_code,
                patient_id,
                doctor_id,
                visit_date,
                diagnosis,
                prescription,
                treatment_plan,
                recipe_status,
                dispensed_by_pharmacy_id,
                dispensed_by_pharmacy_name,
                dispensed_at,
                dispensation_notes,
                guest_patient_name,
                guest_patient_cedula,
                guest_patient_phone,
                created_at,
                doctors (
                    id,
                    name,
                    specialty,
                    medical_license,
                    phone,
                    whatsapp,
                    city
                ),
                patients (
                    id,
                    name,
                    cedula,
                    phone,
                    city
                )
            `)
            .eq('dispensed_by_pharmacy_id', pharmacyId)
            .order('dispensed_at', { ascending: false })
            .limit(250);

        if (error) {
            console.error('Error fetching pharmacy dispensation history:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = (records || []).map((r: any) => ({
            id: r.id,
            recipeCode: r.recipe_code || `SUMA-REC-${r.id.slice(0, 8).toUpperCase()}`,
            visitDate: r.visit_date || r.created_at,
            dispensedAt: r.dispensed_at,
            dispensedByPharmacyName: r.dispensed_by_pharmacy_name || 'Esta sede',
            dispensationNotes: r.dispensation_notes,
            diagnosis: r.diagnosis || '',
            prescription: r.prescription,
            treatmentPlan: r.treatment_plan || '',
            doctorId: r.doctors?.id || r.doctor_id || '',
            doctorName: r.doctors?.name || 'Médico Tratante',
            doctorSpecialty: r.doctors?.specialty || 'Medicina General',
            doctorLicense: r.doctors?.medical_license || '',
            doctorPhone: r.doctors?.whatsapp || r.doctors?.phone || '',
            doctorCity: r.doctors?.city || '',
            patientName: r.patients?.name || r.guest_patient_name || 'Paciente',
            patientCedula: r.patients?.cedula || r.guest_patient_cedula || 'N/A',
            patientPhone: r.patients?.phone || r.guest_patient_phone || ''
        }));

        return NextResponse.json(formatted);

    } catch (err: any) {
        console.error('Error in GET /api/pharmacy/history:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

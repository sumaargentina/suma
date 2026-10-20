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

        // Consultar récipes dispensados por esta farmacia
        const { data: records, error } = await supabaseAdmin
            .from('medical_records')
            .select(`
                id,
                recipe_code,
                patient_id,
                visit_date,
                prescription,
                treatment_plan,
                recipe_status,
                dispensed_by_pharmacy_id,
                dispensed_by_pharmacy_name,
                dispensed_at,
                dispensation_notes,
                created_at,
                doctors (
                    name,
                    specialty
                ),
                patients (
                    name,
                    cedula,
                    phone
                )
            `)
            .eq('dispensed_by_pharmacy_id', pharmacyId)
            .order('dispensed_at', { ascending: false })
            .limit(100);

        if (error) {
            console.error('Error fetching pharmacy dispensation history:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = (records || []).map((r: any) => ({
            id: r.id,
            recipeCode: r.recipe_code || `SUMA-REC-${r.id.slice(0, 8).toUpperCase()}`,
            dispensedAt: r.dispensed_at,
            dispensationNotes: r.dispensation_notes,
            prescription: r.prescription,
            doctorName: r.doctors?.name || 'Médico Tratante',
            doctorSpecialty: r.doctors?.specialty || '',
            patientName: r.patients?.name || 'Paciente',
            patientCedula: r.patients?.cedula || 'N/A',
            patientPhone: r.patients?.phone || ''
        }));

        return NextResponse.json(formatted);

    } catch (err: any) {
        console.error('Error in GET /api/pharmacy/history:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

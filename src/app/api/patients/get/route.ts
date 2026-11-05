import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Patient ID required' }, { status: 400 });
    }

    try {
        const [patientRes, lastRecordRes, attachmentsCountRes, labOrdersCountRes] = await Promise.all([
            supabaseAdmin
                .from('patients')
                .select('*')
                .eq('id', id)
                .single(),
            supabaseAdmin
                .from('medical_records')
                .select('id, diagnosis, reason_for_visit, visit_date, record_type')
                .eq('patient_id', id)
                .is('family_member_id', null)
                .order('visit_date', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabaseAdmin
                .from('medical_attachments')
                .select('id', { count: 'exact', head: true })
                .eq('patient_id', id),
            supabaseAdmin
                .from('laboratory_orders')
                .select('id', { count: 'exact', head: true })
                .eq('patient_id', id)
                .not('results_url', 'is', null)
        ]);

        if (patientRes.error) {
            console.error('Error fetching patient:', patientRes.error);
            return NextResponse.json({ error: patientRes.error.message }, { status: 500 });
        }

        const totalFilesCount = (attachmentsCountRes.count || 0) + (labOrdersCountRes.count || 0);
        const lastDiagnosis = lastRecordRes.data?.diagnosis || lastRecordRes.data?.reason_for_visit || null;

        return NextResponse.json({
            ...patientRes.data,
            last_diagnosis: lastDiagnosis,
            last_record_date: lastRecordRes.data?.visit_date || null,
            files_count: totalFilesCount,
        });
    } catch (error: any) {
        console.error('Error in GET /api/patients/get:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

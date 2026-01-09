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
        const { data, error } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching patient:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in GET /api/patients/get:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

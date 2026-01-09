
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get('id');

    if (!doctorId) {
        return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctorId);

        if (error) {
            console.error('Error fetching appointments via API:', error);
            throw error;
        }

        // Helper to convert snake_case to camelCase (basic version matching service logic)
        const camelData = (data || []).map((item: any) => {
            const result: any = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = item[key];
            }
            return result;
        });

        return NextResponse.json(camelData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

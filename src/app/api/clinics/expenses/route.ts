import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ error: 'Clinic ID required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('clinic_expenses')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('date', { ascending: false });

        if (error) throw error;

        // Convert to camelCase
        const camelData = data.map(item => {
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clinicId, description, amount, category, date } = body;

        if (!clinicId || !description || !amount || !category || !date) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('clinic_expenses')
            .insert([{
                clinic_id: clinicId,
                description,
                amount,
                category,
                date
            }])
            .select()
            .single();

        if (error) throw error;

        // Convert to camelCase
        const result: any = {};
        for (const key in data) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = data[key];
        }

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Expense ID required' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
            .from('clinic_expenses')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

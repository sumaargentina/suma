import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Convert camelCase to snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

// Convert snake_case to camelCase
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        let query = supabaseAdmin
            .from('doctors')
            .select('*');

        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.order('name');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching doctors:', error);
            return NextResponse.json([], { status: 200 });
        }

        const doctors = (data || []).map(d => toCamelCase(d as Record<string, unknown>));
        return NextResponse.json(doctors);
    } catch (error: any) {
        console.error('Error in GET /api/doctors:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
        }

        const snakeCaseData = toSnakeCase(body);

        const { error } = await supabaseAdmin
            .from('doctors')
            .update(snakeCaseData)
            .eq('id', id);

        if (error) {
            console.error('Error updating doctor:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in PATCH /api/doctors:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

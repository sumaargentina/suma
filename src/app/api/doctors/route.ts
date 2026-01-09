import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Convertir camelCase a snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
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

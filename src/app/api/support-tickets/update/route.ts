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

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Ticket ID is required' },
                { status: 400 }
            );
        }

        console.log('📝 Updating support ticket:', id, updateData);

        const snakeCaseData = toSnakeCase(updateData);

        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .update(snakeCaseData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating support ticket:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('✅ Support ticket updated successfully:', id);
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in PUT /api/support-tickets/update:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

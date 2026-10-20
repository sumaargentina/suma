import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Utility to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = value;
    }
    return result;
}

// Utility to convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = value;
    }
    return result;
}

// GET - Fetch orders for a laboratory
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const laboratoryId = searchParams.get('laboratoryId');

        if (!laboratoryId) {
            return NextResponse.json({ error: 'laboratoryId es requerido' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('laboratory_orders')
            .select('*')
            .eq('laboratory_id', laboratoryId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const orders = (data || []).map(item => toCamelCase(item as Record<string, unknown>));
        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching laboratory orders:', error);
        return NextResponse.json({ error: 'Error al obtener órdenes' }, { status: 500 });
    }
}

// PATCH - Update an order (status, results, notes)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateFields } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de orden es requerido' }, { status: 400 });
        }

        const snakeData = toSnakeCase(updateFields);
        snakeData.updated_at = new Date().toISOString();

        const { data, error } = await supabaseAdmin
            .from('laboratory_orders')
            .update(snakeData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(toCamelCase(data as Record<string, unknown>));
    } catch (error) {
        console.error('Error updating laboratory order:', error);
        const message = error instanceof Error ? error.message : 'Error al actualizar orden';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

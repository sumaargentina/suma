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

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validar campos requeridos (description viene del frontend, no message)
        if (!body.userId && !body.user_id) {
            return NextResponse.json(
                { error: 'Missing userId field' },
                { status: 400 }
            );
        }

        if (!body.subject) {
            return NextResponse.json(
                { error: 'Missing subject field' },
                { status: 400 }
            );
        }

        const snakeCaseData = toSnakeCase(body);

        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) {
            console.error('Error creating support ticket:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error in POST /api/support-tickets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { data, error } = await supabaseAdmin
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching support tickets:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Convertir a camelCase
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
        console.error('Error in GET /api/support-tickets:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

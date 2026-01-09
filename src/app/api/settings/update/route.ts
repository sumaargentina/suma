import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Convert camelCase to snake_case for database fields
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

export async function POST(request: Request) {
    try {
        const data = await request.json();

        console.log('Settings update API: received data', JSON.stringify(data, null, 2));

        const snakeCaseData = toSnakeCase(data as Record<string, unknown>);

        console.log('Settings update API: snake_case data', JSON.stringify(snakeCaseData, null, 2));

        const { error } = await supabaseAdmin
            .from('settings')
            .update(snakeCaseData)
            .eq('id', 'main');

        if (error) {
            console.error('Settings update API error:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Settings update API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

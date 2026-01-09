import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const doctorData = await request.json();

        console.log('API: Received doctor data:', JSON.stringify(doctorData, null, 2));

        // Convertir camelCase a snake_case para Supabase
        const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
            const result: Record<string, unknown> = {};
            for (const key in obj) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = obj[key];
            }
            return result;
        };

        const dataWithDefaults = {
            ...toSnakeCase(doctorData),
            read_by_admin: false,
            read_by_seller: false,
        };

        console.log('API: Inserting data:', JSON.stringify(dataWithDefaults, null, 2));

        const { data, error } = await supabaseAdmin
            .from('doctors')
            .insert([dataWithDefaults])
            .select()
            .single();

        if (error) {
            console.error('API: Supabase error:', JSON.stringify({
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                fullError: error
            }, null, 2));

            return NextResponse.json(
                {
                    error: error.message || 'Failed to add doctor',
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                    fullError: JSON.stringify(error)
                },
                { status: 500 }
            );
        }

        console.log('API: Doctor added successfully with ID:', data.id);
        return NextResponse.json({ id: data.id, success: true });
    } catch (error: any) {
        console.error('API: Exception caught:', {
            message: error?.message,
            stack: error?.stack,
            fullError: JSON.stringify(error)
        });

        return NextResponse.json(
            {
                error: error?.message || 'Internal server error',
                details: error?.stack,
                fullError: JSON.stringify(error)
            },
            { status: 500 }
        );
    }
}

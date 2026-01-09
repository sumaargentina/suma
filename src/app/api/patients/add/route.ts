import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
    try {
        const patientData = await request.json();

        console.log('API: Adding patient with data:', JSON.stringify(patientData, null, 2));

        const snakeCaseData = toSnakeCase(patientData);

        const { data, error } = await supabaseAdmin
            .from('patients')
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) {
            console.error('API: Error adding patient:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return NextResponse.json(
                { error: error.message || 'Failed to add patient' },
                { status: 400 }
            );
        }

        console.log('API: Patient added successfully:', data.id);
        return NextResponse.json({ id: data.id });
    } catch (error) {
        console.error('API: Caught exception in addPatient:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

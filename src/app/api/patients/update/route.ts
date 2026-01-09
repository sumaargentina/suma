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

export async function PATCH(request: NextRequest) {
    try {
        const { id, data } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Patient ID is required' },
                { status: 400 }
            );
        }

        // Remove 'role' field as it doesn't exist in the patients table
        const { role, ...dataWithoutRole } = data;
        const snakeCaseData = toSnakeCase(dataWithoutRole);

        const { error } = await supabaseAdmin
            .from('patients')
            .update(snakeCaseData)
            .eq('id', id);

        if (error) {
            console.error('API: Error updating patient:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            return NextResponse.json(
                { error: error.message || 'Failed to update patient' },
                { status: 400 }
            );
        }

        console.log('API: Patient updated successfully:', id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API: Caught exception in updatePatient:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Función para convertir camelCase a snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = obj[key];
        }
    }
    return result;
};

export async function PATCH(request: NextRequest) {
    try {
        const { id, data } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json(
                { error: 'Update data is required' },
                { status: 400 }
            );
        }

        // Convertir a snake_case para la base de datos
        const dataWithFlags: Record<string, unknown> = { ...toSnakeCase(data) };

        // Si se está marcando la asistencia, el paciente necesita ser notificado
        if ('attendance' in data) {
            dataWithFlags.read_by_patient = false;
        }

        console.log('📝 Updating appointment:', id, 'with data:', dataWithFlags);

        const { error } = await supabaseAdmin
            .from('appointments')
            .update(dataWithFlags)
            .eq('id', id);

        if (error) {
            console.error('❌ Error updating appointment:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to update appointment' },
                { status: 500 }
            );
        }

        console.log('✅ Appointment updated successfully:', id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('❌ Server error updating appointment:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { patientId } = body;

        // console.log(`Getting appointments for patient: ${patientId}`);

        if (!patientId) {
            return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('patient_id', patientId);

        if (error) {
            console.error('❌ Supabase Query Error (get-patient-appointments):', error);

            // Handle connection errors specifically
            if (error.message && (error.message.includes('fetch failed') || error.message.includes('connection refused'))) {
                return NextResponse.json({
                    error: 'Error de conexión con la base de datos. Por favor verifique su conexión a internet.'
                }, { status: 503 });
            }

            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // console.log(`Found ${data?.length || 0} appointments`);

        const appointments = (data || []).map(item => toCamelCase(item as Record<string, unknown>));

        return NextResponse.json(appointments);
    } catch (error) {
        console.error('Error in get-patient-appointments API:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

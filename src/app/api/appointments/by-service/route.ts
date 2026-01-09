
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const serviceId = searchParams.get('serviceId');
    const date = searchParams.get('date');

    if (!serviceId || !date) {
        return NextResponse.json({ error: 'Missing serviceId or date' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('clinic_service_id', serviceId)
            .eq('date', date)
            .neq('patient_confirmation_status', 'Cancelada');

        if (error) {
            console.error('Error fetching service appointments:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Helper to convert snake_case to camelCase
        const toCamelCase = (obj: any): any => {
            if (Array.isArray(obj)) {
                return obj.map(v => toCamelCase(v));
            } else if (obj !== null && obj.constructor === Object) {
                return Object.keys(obj).reduce(
                    (result, key) => ({
                        ...result,
                        [key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())]: toCamelCase(obj[key]),
                    }),
                    {},
                );
            }
            return obj;
        };

        return NextResponse.json(toCamelCase(data));
    } catch (error) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

import { getClinicAppointments } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');
        const date = searchParams.get('date');
        const endDate = searchParams.get('endDate');

        if (!clinicId) {
            return NextResponse.json({ error: 'Missing clinic ID' }, { status: 400 });
        }

        const appointments = await getClinicAppointments(clinicId, date || undefined, endDate || undefined);
        return NextResponse.json(appointments);
    } catch (error: any) {
        console.error('API Error fetching clinic appointments:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

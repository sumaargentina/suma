import { getClinicDoctors } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');

        if (!clinicId) {
            return NextResponse.json({ error: 'Missing clinic ID' }, { status: 400 });
        }

        const doctors = await getClinicDoctors(clinicId);
        return NextResponse.json(doctors);
    } catch (error: any) {
        console.error('API Error fetching clinic doctors:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

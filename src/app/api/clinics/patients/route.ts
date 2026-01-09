"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getClinicPatients } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
    }

    try {
        const patients = await getClinicPatients(clinicId);
        return NextResponse.json(patients);
    } catch (error) {
        console.error('Error fetching clinic patients:', error);
        return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
    }
}

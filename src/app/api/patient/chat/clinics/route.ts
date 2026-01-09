"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getPatientChatClinics } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
        return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    try {
        const clinics = await getPatientChatClinics(patientId);
        return NextResponse.json(clinics);
    } catch (error) {
        console.error('Error fetching patient chat clinics:', error);
        return NextResponse.json({ error: 'Failed to fetch clinics' }, { status: 500 });
    }
}

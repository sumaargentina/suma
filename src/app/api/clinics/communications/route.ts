"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getPatientCommunications, addPatientCommunication } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');
    const patientId = searchParams.get('patientId');

    if (!clinicId || !patientId) {
        return NextResponse.json({ error: 'clinicId and patientId are required' }, { status: 400 });
    }

    try {
        const communications = await getPatientCommunications(clinicId, patientId);
        return NextResponse.json(communications);
    } catch (error) {
        console.error('Error fetching communications:', error);
        return NextResponse.json({ error: 'Failed to fetch communications' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clinicId, patientId, type, message, sentBy, template } = body;

        if (!clinicId || !patientId || !type || !message || !sentBy) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const communication = await addPatientCommunication(clinicId, patientId, type, message, sentBy, template);
        return NextResponse.json(communication);
    } catch (error) {
        console.error('Error adding communication:', error);
        return NextResponse.json({ error: 'Failed to add communication' }, { status: 500 });
    }
}

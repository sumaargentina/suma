"use server";

import { NextRequest, NextResponse } from 'next/server';
import { markClinicChatAsRead } from '@/lib/supabaseService';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clinicId, patientId, readerType } = body;

        if (!clinicId || !patientId || !readerType) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        await markClinicChatAsRead(clinicId, patientId, readerType);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}

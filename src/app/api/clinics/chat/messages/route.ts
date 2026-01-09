"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getClinicChatMessages, sendClinicChatMessage } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');
    const patientId = searchParams.get('patientId');

    if (!clinicId || !patientId) {
        return NextResponse.json({ error: 'clinicId and patientId are required' }, { status: 400 });
    }

    try {
        const messages = await getClinicChatMessages(clinicId, patientId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clinicId, patientId, senderType, message } = body;

        if (!clinicId || !patientId || !senderType || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newMessage = await sendClinicChatMessage(clinicId, patientId, senderType, message);
        return NextResponse.json(newMessage);
    } catch (error) {
        console.error('Error sending chat message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

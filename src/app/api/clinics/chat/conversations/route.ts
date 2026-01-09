"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getClinicChatConversations } from '@/lib/supabaseService';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ error: 'clinicId is required' }, { status: 400 });
    }

    try {
        const conversations = await getClinicChatConversations(clinicId);
        return NextResponse.json(conversations);
    } catch (error) {
        console.error('Error fetching chat conversations:', error);
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }
}

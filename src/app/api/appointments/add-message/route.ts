import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST(request: NextRequest) {
    try {
        const { appointmentId, message } = await request.json();

        if (!appointmentId) {
            return NextResponse.json(
                { error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        if (!message || !message.sender || !message.text) {
            return NextResponse.json(
                { error: 'Message with sender and text is required' },
                { status: 400 }
            );
        }

        console.log('📝 Adding message to appointment:', appointmentId);

        // 1. Obtener mensajes actuales
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('messages, unread_messages_by_patient, unread_messages_by_doctor')
            .eq('id', appointmentId)
            .single();

        if (fetchError) {
            console.error('❌ Error fetching appointment:', fetchError);
            return NextResponse.json(
                { error: fetchError.message || 'Failed to fetch appointment' },
                { status: 500 }
            );
        }

        const currentMessages = (appointment.messages as any[]) || [];
        const newMessage = {
            id: crypto.randomUUID(),
            ...message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedMessages = [...currentMessages, newMessage];

        // 2. Actualizar mensajes y contadores
        const updateData: Record<string, unknown> = {
            messages: updatedMessages,
            last_message_timestamp: newMessage.timestamp
        };

        if (message.sender === 'doctor') {
            updateData.unread_messages_by_patient = (appointment.unread_messages_by_patient || 0) + 1;
            updateData.read_by_patient = false;
            updateData.read_by_doctor = true;
        } else {
            updateData.unread_messages_by_doctor = (appointment.unread_messages_by_doctor || 0) + 1;
            updateData.read_by_doctor = false;
            updateData.read_by_patient = true;
        }

        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId);

        if (updateError) {
            console.error('❌ Error updating appointment:', updateError);
            return NextResponse.json(
                { error: updateError.message || 'Failed to update appointment' },
                { status: 500 }
            );
        }

        console.log('✅ Message added successfully to appointment:', appointmentId);

        return NextResponse.json({ success: true, message: newMessage });
    } catch (error) {
        console.error('❌ Server error adding message:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

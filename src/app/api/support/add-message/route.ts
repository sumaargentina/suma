import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const { ticketId, message } = await request.json();

        if (!ticketId || !message) {
            return NextResponse.json(
                { error: 'Ticket ID and message are required' },
                { status: 400 }
            );
        }

        // Obtener el ticket actual
        const { data: ticket, error: fetchError } = await supabaseAdmin
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (fetchError) {
            console.error('Error fetching ticket:', fetchError);
            return NextResponse.json(
                { error: 'Ticket not found' },
                { status: 404 }
            );
        }

        // Crear el nuevo mensaje
        const newMessage = {
            ...message,
            id: `msg-${Date.now()}`,
            timestamp: new Date().toISOString()
        };

        // Agregar el mensaje al array de mensajes
        const messages = ticket.messages || [];
        messages.push(newMessage);

        // Preparar los datos de actualización
        const updateData: Record<string, unknown> = { messages };

        // Actualizar flags de lectura según el remitente
        if (message.sender === 'user') {
            updateData.read_by_admin = false;
            updateData.status = 'abierto';
        }

        if (message.sender === 'admin') {
            updateData.status = 'abierto';
            if (ticket.user_role === 'seller') {
                updateData.read_by_seller = false;
            } else if (ticket.user_role === 'doctor') {
                updateData.read_by_doctor = false;
            }
        }

        // Actualizar el ticket
        const { error: updateError } = await supabaseAdmin
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId);

        if (updateError) {
            console.error('Error updating ticket:', updateError);
            return NextResponse.json(
                { error: 'Failed to add message' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in add-message API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

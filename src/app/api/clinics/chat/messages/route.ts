"use server";

import { NextRequest, NextResponse } from 'next/server';
import { getClinicChatMessages, sendClinicChatMessage } from '@/lib/supabaseService';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, detectInjection } from '@/lib/sanitize';

// GET - Obtener mensajes de chat
export async function GET(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(request, ['clinic', 'laboratory', 'patient', 'secretary', 'admin']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(request.url);
        const clinicId = searchParams.get('clinicId');
        const patientId = searchParams.get('patientId');

        if (!clinicId || !patientId) {
            return NextResponse.json({ error: 'clinicId and patientId are required' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar acceso al chat
        const canAccess =
            user.role === 'admin' ||
            (user.role === 'patient' && patientId === user.id) ||
            ((user.role === 'clinic' || user.role === 'laboratory') && clinicId === user.id) ||
            (user.role === 'secretary' && (clinicId === user.clinicId || clinicId === user.laboratoryId));

        if (!canAccess) {
            logSecurityEvent('CHAT_ACCESS_FORBIDDEN', {
                userId: user.id,
                clinicId,
                patientId
            });
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        const messages = await getClinicChatMessages(clinicId, patientId);
        return NextResponse.json(messages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}

// POST - Enviar mensaje
export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(request, ['clinic', 'laboratory', 'patient', 'secretary', 'admin']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const body = await request.json();
        const { clinicId, patientId, senderType, message } = body;

        if (!clinicId || !patientId || !senderType || !message) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar que el remitente es quien dice ser
        if (senderType === 'patient' && patientId !== user.id && user.role !== 'admin') {
            return NextResponse.json({ error: 'No puedes enviar mensajes como otro paciente' }, { status: 403 });
        }
        const authorizedEntityId = user.clinicId || user.laboratoryId || user.id;
        if (senderType === 'clinic' && clinicId !== authorizedEntityId && user.role !== 'admin') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }

        // 🔐 SEGURIDAD: Detectar inyección y sanitizar
        if (detectInjection(message)) {
            return NextResponse.json({ error: 'Mensaje inválido' }, { status: 400 });
        }

        const sanitizedMessage = sanitizeString(message);

        logSecurityEvent('CHAT_MESSAGE_SENT', {
            userId: user.id,
            clinicId,
            patientId,
            senderType
        });

        const newMessage = await sendClinicChatMessage(clinicId, patientId, senderType, sanitizedMessage);
        return NextResponse.json(newMessage);
    } catch (error) {
        console.error('Error sending chat message:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

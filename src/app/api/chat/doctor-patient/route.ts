import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Obtener mensajes de una conversación doctor-paciente
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');
        const patientId = searchParams.get('patientId');
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        if (!doctorId || !patientId) {
            return NextResponse.json(
                { error: 'doctorId and patientId are required' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('doctor_patient_messages')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching messages:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('Error in GET /api/chat/doctor-patient:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Enviar un mensaje
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { doctorId, patientId, senderType, message } = body;

        if (!doctorId || !patientId || !senderType || !message) {
            return NextResponse.json(
                { error: 'doctorId, patientId, senderType, and message are required' },
                { status: 400 }
            );
        }

        if (!['doctor', 'patient'].includes(senderType)) {
            return NextResponse.json(
                { error: 'senderType must be "doctor" or "patient"' },
                { status: 400 }
            );
        }

        const { data, error } = await supabaseAdmin
            .from('doctor_patient_messages')
            .insert({
                doctor_id: doctorId,
                patient_id: patientId,
                sender_type: senderType,
                message: message.trim(),
                is_read: false
            })
            .select()
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error in POST /api/chat/doctor-patient:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Marcar mensajes como leídos
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { doctorId, patientId, markReadBy } = body;

        if (!doctorId || !patientId || !markReadBy) {
            return NextResponse.json(
                { error: 'doctorId, patientId, and markReadBy are required' },
                { status: 400 }
            );
        }

        // Marcar como leídos los mensajes enviados por el otro participante
        const senderToMarkRead = markReadBy === 'doctor' ? 'patient' : 'doctor';

        const { error } = await supabaseAdmin
            .from('doctor_patient_messages')
            .update({ is_read: true })
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .eq('sender_type', senderToMarkRead)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking messages as read:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH /api/chat/doctor-patient:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

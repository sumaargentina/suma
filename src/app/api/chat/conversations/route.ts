import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET - Obtener lista de conversaciones para un doctor o paciente
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');
        const patientId = searchParams.get('patientId');

        if (!doctorId && !patientId) {
            return NextResponse.json(
                { error: 'Either doctorId or patientId is required' },
                { status: 400 }
            );
        }

        // Build base query to get unique conversations with last message
        let query = supabaseAdmin
            .from('doctor_patient_messages')
            .select('doctor_id, patient_id, message, sender_type, is_read, created_at');

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        } else if (patientId) {
            query = query.eq('patient_id', patientId);
        }

        const { data: messages, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Group by conversation and get last message + unread count
        const conversationsMap = new Map<string, {
            doctorId: string;
            patientId: string;
            lastMessage: string;
            lastMessageAt: string;
            lastMessageSender: string;
            unreadCount: number;
        }>();

        for (const msg of messages || []) {
            const key = `${msg.doctor_id}-${msg.patient_id}`;

            if (!conversationsMap.has(key)) {
                conversationsMap.set(key, {
                    doctorId: msg.doctor_id,
                    patientId: msg.patient_id,
                    lastMessage: msg.message,
                    lastMessageAt: msg.created_at,
                    lastMessageSender: msg.sender_type,
                    unreadCount: 0
                });
            }

            // Count unread messages for the requesting user
            const conv = conversationsMap.get(key)!;
            if (!msg.is_read) {
                // If requesting as doctor, count patient messages as unread
                if (doctorId && msg.sender_type === 'patient') {
                    conv.unreadCount++;
                }
                // If requesting as patient, count doctor messages as unread
                if (patientId && msg.sender_type === 'doctor') {
                    conv.unreadCount++;
                }
            }
        }

        const conversations = Array.from(conversationsMap.values());

        // Fetch additional data (doctor/patient names)
        if (doctorId) {
            // Get patient info for each conversation
            const patientIds = [...new Set(conversations.map(c => c.patientId))];
            if (patientIds.length > 0) {
                const { data: patients } = await supabaseAdmin
                    .from('patients')
                    .select('id, name, profile_image')
                    .in('id', patientIds);

                const patientsMap = new Map(patients?.map(p => [p.id, p]) || []);

                return NextResponse.json(conversations.map(conv => ({
                    ...conv,
                    patientName: patientsMap.get(conv.patientId)?.name || 'Paciente',
                    patientImage: patientsMap.get(conv.patientId)?.profile_image
                })));
            }
        } else if (patientId) {
            // Get doctor info for each conversation
            const doctorIds = [...new Set(conversations.map(c => c.doctorId))];
            if (doctorIds.length > 0) {
                const { data: doctors } = await supabaseAdmin
                    .from('doctors')
                    .select('id, name, specialty, profile_image')
                    .in('id', doctorIds);

                const doctorsMap = new Map(doctors?.map(d => [d.id, d]) || []);

                return NextResponse.json(conversations.map(conv => ({
                    ...conv,
                    doctorName: doctorsMap.get(conv.doctorId)?.name || 'Doctor',
                    doctorSpecialty: doctorsMap.get(conv.doctorId)?.specialty,
                    doctorImage: doctorsMap.get(conv.doctorId)?.profile_image
                })));
            }
        }

        return NextResponse.json(conversations);
    } catch (error) {
        console.error('Error in GET /api/chat/conversations:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

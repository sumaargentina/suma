
import { NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { appointmentId } = body;

        if (!appointmentId) {
            return NextResponse.json({ error: 'Appointment ID required' }, { status: 400 });
        }

        console.log('📨 Sending confirmation via API for:', appointmentId);
        await notificationService.sendAppointmentConfirmation(appointmentId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('❌ Error sending notification:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

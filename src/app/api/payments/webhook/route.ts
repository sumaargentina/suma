import { NextResponse } from 'next/server';
import { mercadoPagoService } from '@/lib/payments/mercadopago-service';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(request: Request) {
    try {
        // 1. Obtener parámetros del webhook
        const url = new URL(request.url);
        const type = url.searchParams.get('type');
        const topic = url.searchParams.get('topic');
        const id = url.searchParams.get('id') || url.searchParams.get('data.id');

        console.log(`🔔 Webhook received: ${type || topic} ID: ${id}`);

        if (type === 'payment' || topic === 'payment') {
            if (!id) return NextResponse.json({ error: 'No ID provided' }, { status: 400 });

            // 2. Consultar estado del pago en MercadoPago
            const payment = await mercadoPagoService.getPayment(id);

            if (!payment) {
                console.error('❌ Payment not found in MP');
                return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
            }

            console.log(`💰 Payment status: ${payment.status} | Ref: ${payment.external_reference}`);

            // 3. Si el pago está aprobado, actualizar la cita
            if (payment.status === 'approved') {
                const appointmentId = payment.external_reference;

                if (appointmentId) {
                    // Actualizar DB
                    const { error } = await supabaseAdmin
                        .from('appointments')
                        .update({
                            payment_status: 'Pagado',
                            payment_method: 'mercadopago',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', appointmentId);

                    if (error) {
                        console.error('❌ Error updating appointment:', error);
                        throw error;
                    }

                    console.log('✅ Appointment updated to PAID');

                    // Enviar notificación de pago recibido
                    // (O confirmación si no se había enviado antes)
                    try {
                        // Buscar datos de la cita para el email
                        const { data: apt } = await supabaseAdmin
                            .from('appointments')
                            .select('*, patients(*)')
                            .eq('id', appointmentId)
                            .single();

                        if (apt && apt.patients) {
                            await notificationService.send({
                                email: apt.patients.email,
                                phone: apt.patients.phone,
                                subject: 'Pago Recibido - SUMA',
                                message: `Hemos recibido tu pago de $${payment.transaction_amount}. Tu cita está 100% confirmada.`,
                                type: 'payment_received',
                                userId: apt.patient_id
                            });
                        }
                    } catch (notifError) {
                        console.error('Warning: Failed to send payment notification', notifError);
                    }
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

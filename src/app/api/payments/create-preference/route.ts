import { NextResponse } from 'next/server';
import { mercadoPagoService } from '@/lib/payments/mercadopago-service';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { appointmentId, user } = body;

        if (!appointmentId || !user) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // 1. Obtener detalles de la cita
        const { data: appointment, error } = await supabaseAdmin
            .from('appointments')
            .select('*, doctors(*)')
            .eq('id', appointmentId)
            .single();

        if (error || !appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Validar que no esté pagada
        if (appointment.payment_status === 'Pagado') {
            return NextResponse.json({ error: 'Appointment already paid' }, { status: 400 });
        }

        const doctorName = appointment.doctors?.name || 'Médico SUMA';
        const title = `Consulta Médica - Dr. ${doctorName}`;
        const price = appointment.total_price;

        console.log(`💳 Creating preference for Appointment ${appointmentId}: $${price}`);

        // 2. Buscar integración de pago del doctor (Marketplace)
        const { data: integration } = await supabaseAdmin
            .from('doctor_integrations')
            .select('mp_access_token')
            .eq('doctor_id', appointment.doctor_id)
            .eq('provider', 'mercadopago')
            .eq('is_active', true)
            .single();

        let customAccessToken = undefined;
        let marketplaceFee = 0;

        if (integration?.mp_access_token) {
            console.log(`🔗 Using Doctor's MP Integration for Doctor: ${appointment.doctor_id}`);
            customAccessToken = integration.mp_access_token;

            // Calcular Comisión de Marketplace (Ej: 5%)
            // TODO: Mover porcentaje a configuración global
            const COMMISSION_PERCENTAGE = 0.05;
            marketplaceFee = Number(price) * COMMISSION_PERCENTAGE;
        }

        // 3. Crear preferencia en MercadoPago
        const preference = await mercadoPagoService.createPreference({
            items: [
                {
                    id: appointmentId,
                    title: title,
                    quantity: 1,
                    unit_price: Number(price),
                    currency_id: 'ARS',
                    description: `Cita: ${appointment.date} ${appointment.time}`
                }
            ],
            payer: {
                name: user.name.split(' ')[0] || 'Paciente',
                surname: user.name.split(' ').slice(1).join(' ') || '.',
                email: user.email,
            },
            external_reference: appointmentId,
            metadata: {
                appointment_id: appointmentId,
                patient_id: user.id
            }
        }, customAccessToken, marketplaceFee);

        return NextResponse.json({
            preferenceId: preference.id,
            initPoint: preference.init_point, // Use init_point for redirect
            sandboxInitPoint: preference.sandbox_init_point
        });

    } catch (error) {
        console.error('❌ Error in payment/preference:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';

// Función para convertir camelCase a snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = obj[key];
        }
    }
    return result;
};

export async function PATCH(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(request, ['patient', 'doctor', 'clinic', 'laboratory', 'secretary', 'admin']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('APPOINTMENT_UPDATE_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const { id, data } = await request.json();

        console.log('📝 Update appointment request - ID:', id, 'User:', user.id, 'Role:', user.role);

        if (!id) {
            return NextResponse.json(
                { error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json(
                { error: 'Update data is required' },
                { status: 400 }
            );
        }

        // 🔐 Verificar que la cita existe y el usuario tiene acceso
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('patient_id, doctor_id')
            .eq('id', id)
            .single();

        console.log('📝 Appointment lookup - Found:', !!appointment, 'Error:', fetchError?.message);

        if (fetchError || !appointment) {
            console.error('❌ Appointment not found:', id, 'Error:', fetchError);
            return NextResponse.json(
                { error: 'Cita no encontrada' },
                { status: 404 }
            );
        }

        // Verificar permisos (simplificado)
        const canAccess =
            user.role === 'admin' ||
            user.role === 'clinic' ||
            user.role === 'laboratory' ||
            user.role === 'secretary' ||
            (user.role === 'patient' && appointment.patient_id === user.id) ||
            (user.role === 'doctor' && appointment.doctor_id === user.id);

        console.log('📝 Access check - Can access:', canAccess, 'Patient ID:', appointment.patient_id, 'User ID:', user.id);

        if (!canAccess) {
            logSecurityEvent('APPOINTMENT_UPDATE_FORBIDDEN', {
                userId: user.id,
                appointmentId: id,
                reason: 'User does not have access'
            });
            return NextResponse.json(
                { error: 'No tienes permisos para modificar esta cita' },
                { status: 403 }
            );
        }

        // Convertir a snake_case para la base de datos
        const dataWithFlags: Record<string, unknown> = { ...toSnakeCase(data) };

        // Si se está marcando la asistencia, el paciente necesita ser notificado
        if ('attendance' in data) {
            dataWithFlags.read_by_patient = false;
        }

        // Si se marca como Pagado, registrar fecha de pago y congelar tasa de cambio del día
        if (data.paymentStatus === 'Pagado') {
            if (!dataWithFlags.paid_at) {
                dataWithFlags.paid_at = new Date().toISOString();
            }
            // Si no viene la tasa o monto en moneda local congelado, obtener la tasa del día de la configuración
            if (!dataWithFlags.exchange_rate || !dataWithFlags.amount_in_local_currency) {
                try {
                    const { data: settingsRow } = await supabaseAdmin
                        .from('settings')
                        .select('data')
                        .eq('id', 'main')
                        .maybeSingle();

                    const settingsData = settingsRow?.data || {};
                    const rateOfTheDay = Number(settingsData.bcvRate) || 65.50;

                    let totalUSD = Number(data.totalPrice || data.amountInUSD);
                    if (!totalUSD || isNaN(totalUSD)) {
                        const { data: apptRow } = await supabaseAdmin
                            .from('appointments')
                            .select('total_price, amount_in_usd')
                            .eq('id', id)
                            .maybeSingle();
                        totalUSD = Number(apptRow?.total_price || apptRow?.amount_in_usd || 0);
                    }

                    dataWithFlags.exchange_rate = rateOfTheDay;
                    dataWithFlags.amount_in_usd = totalUSD;
                    dataWithFlags.amount_in_local_currency = Math.round(totalUSD * rateOfTheDay * 100) / 100;
                } catch (rateErr) {
                    console.warn('⚠️ Could not automatically freeze exchange rate on payment confirmation:', rateErr);
                }
            }
        }

        logSecurityEvent('APPOINTMENT_UPDATE', {
            userId: user.id,
            appointmentId: id,
            changes: Object.keys(data)
        });

        console.log('📝 Updating appointment:', id, 'with data:', dataWithFlags);

        let { error } = await supabaseAdmin
            .from('appointments')
            .update(dataWithFlags)
            .eq('id', id);

        if (error && error.code === '42703') {
            console.warn('⚠️ Some currency columns do not exist yet in appointments table. Retrying update with base columns...');
            const newCols = [
                'currency', 'payment_currency', 'exchange_rate',
                'amount_in_usd', 'amount_in_local_currency', 'paid_at', 'payment_account_details'
            ];
            const fallbackData = { ...dataWithFlags };
            newCols.forEach(col => delete fallbackData[col]);

            const retryResult = await supabaseAdmin
                .from('appointments')
                .update(fallbackData)
                .eq('id', id);

            error = retryResult.error;
        }

        if (error) {
            console.error('❌ Error updating appointment:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to update appointment' },
                { status: 500 }
            );
        }

        console.log('✅ Appointment updated successfully:', id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('❌ Server error updating appointment:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

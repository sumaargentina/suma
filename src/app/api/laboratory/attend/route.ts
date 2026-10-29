import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * POST /api/laboratory/attend
 * Registra que un paciente que llegó al laboratorio SUMA (incluso sin cita previa, solo dictando su cédula)
 * fue atendido ahorita para realizarle los exámenes que le mandó a hacer directamente el médico.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            orderId,
            orderNumber,
            patientId,
            patientName,
            patientCedula,
            patientPhone,
            doctorId,
            doctorName,
            studies,
            diagnosis,
            laboratoryId,
            laboratoryName,
            paymentMethod = 'efectivo',
            paymentStatus = 'Pagado',
            totalPrice = 0,
            notes = ''
        } = body;

        if (!laboratoryId) {
            return NextResponse.json(
                { error: 'Se requiere el identificador del laboratorio.' },
                { status: 400 }
            );
        }

        if (!patientId && !patientName) {
            return NextResponse.json(
                { error: 'Se requieren los datos del paciente para registrar la atención.' },
                { status: 400 }
            );
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const todayDate = format(now, 'yyyy-MM-dd');
        const currentTime = format(now, 'HH:mm');

        const attendanceStamp = `[Atendido en mostrador sin cita el ${now.toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })} en ${laboratoryName || 'Laboratorio SUMA'}]`;
        const combinedNotes = [attendanceStamp, notes].filter(Boolean).join(' — ');

        let updatedOrder = null;

        // 1. Verificar si la orden ya existe en laboratory_orders
        if (orderId) {
            const { data: existingOrder } = await supabaseAdmin
                .from('laboratory_orders')
                .select('id, laboratory_notes, status, results_available')
                .eq('id', orderId)
                .maybeSingle();

            if (existingOrder) {
                const prevNotes = existingOrder.laboratory_notes ? `${existingOrder.laboratory_notes}\n` : '';
                const nextStatus = existingOrder.results_available ? 'completed' : 'in_progress';

                const { data: upd, error: updErr } = await supabaseAdmin
                    .from('laboratory_orders')
                    .update({
                        status: nextStatus,
                        laboratory_id: laboratoryId,
                        scheduled_date: nowIso,
                        laboratory_notes: `${prevNotes}${combinedNotes}`.trim(),
                        updated_at: nowIso
                    })
                    .eq('id', orderId)
                    .select()
                    .single();

                if (!updErr && upd) {
                    updatedOrder = upd;
                }
            }
        }

        // Si la orden provenía directamente de medical_records (aún no tenía fila en laboratory_orders) o no se encontró por ID
        if (!updatedOrder && patientId) {
            const effectiveOrderNumber = orderNumber || `SUMA-LAB-${Date.now().toString().slice(-6)}`;

            // Buscar por order_number primero para no duplicar
            const { data: byOrderNum } = await supabaseAdmin
                .from('laboratory_orders')
                .select('id, laboratory_notes, results_available')
                .eq('order_number', effectiveOrderNumber)
                .maybeSingle();

            if (byOrderNum) {
                const prevNotes = byOrderNum.laboratory_notes ? `${byOrderNum.laboratory_notes}\n` : '';
                const { data: upd } = await supabaseAdmin
                    .from('laboratory_orders')
                    .update({
                        status: byOrderNum.results_available ? 'completed' : 'in_progress',
                        laboratory_id: laboratoryId,
                        scheduled_date: nowIso,
                        laboratory_notes: `${prevNotes}${combinedNotes}`.trim(),
                        updated_at: nowIso
                    })
                    .eq('id', byOrderNum.id)
                    .select()
                    .single();
                updatedOrder = upd;
            } else if (doctorId) {
                const { data: ins, error: insErr } = await supabaseAdmin
                    .from('laboratory_orders')
                    .insert([{
                        doctor_id: doctorId,
                        patient_id: patientId,
                        laboratory_id: laboratoryId,
                        order_number: effectiveOrderNumber,
                        studies: [{ name: studies || 'Exámenes indicados por el médico' }],
                        diagnosis: diagnosis || '',
                        clinical_indications: studies || '',
                        status: 'in_progress',
                        scheduled_date: nowIso,
                        results_available: false,
                        laboratory_notes: combinedNotes,
                        valid_from: nowIso,
                        created_at: nowIso,
                        updated_at: nowIso
                    }])
                    .select()
                    .single();

                if (!insErr && ins) {
                    updatedOrder = ins;
                }
            }
        }

        // 2. Registrar automáticamente en appointments del laboratorio como "Atendido" (Walk-in / Sin Cita)
        // para que quede reflejado en la Agenda del Día y en las métricas del Laboratorio
        let createdAppointment = null;
        try {
            const appointmentPayload: Record<string, any> = {
                laboratory_id: laboratoryId,
                patient_id: patientId || laboratoryId,
                patient_name: patientName || 'Paciente SUMA',
                patient_phone: patientPhone || null,
                doctor_name: doctorName ? `Dr(a). ${doctorName}` : null,
                service_name: studies ? String(studies).slice(0, 180) : 'Exámenes de Laboratorio (Orden Médica)',
                date: todayDate,
                time: currentTime,
                total_price: Number(totalPrice) || 0,
                consultation_fee: Number(totalPrice) || 0,
                payment_method: paymentMethod || 'efectivo',
                payment_status: paymentStatus || 'Pagado',
                attendance: 'Atendido',
                patient_confirmation_status: 'Confirmada',
                reason: `Atendido sin cita por Cédula (${patientCedula || 'S/C'}) — Orden: ${orderNumber || 'Médica'}${doctorName ? ` • Dr(a). ${doctorName}` : ''}`,
                created_at: nowIso
            };

            const { data: apptData, error: apptErr } = await supabaseAdmin
                .from('appointments')
                .insert([appointmentPayload])
                .select()
                .single();

            if (!apptErr && apptData) {
                createdAppointment = apptData;
            }
        } catch (apptEx) {
            console.warn('Nota no bloqueante al registrar cita walk-in de laboratorio:', apptEx);
        }

        return NextResponse.json({
            success: true,
            message: 'Paciente marcado como atendido ahorita exitosamente.',
            attendedAt: nowIso,
            order: updatedOrder,
            appointment: createdAppointment
        });

    } catch (error: any) {
        console.error('Error en POST /api/laboratory/attend:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno al registrar la atención en laboratorio' },
            { status: 500 }
        );
    }
}

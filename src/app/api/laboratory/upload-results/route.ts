import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            orderId,
            orderNumber,
            patientId,
            doctorId,
            studies,
            diagnosis,
            laboratoryId,
            laboratoryName,
            resultsSummary,
            resultsUrl,
            fileName,
            fileType,
            fileSize,
            bioanalystName
        } = body;

        if (!patientId || (!resultsSummary && !resultsUrl)) {
            return NextResponse.json(
                { error: 'Debes proporcionar al menos un resumen o un archivo de resultados y el ID del paciente.' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const bioNote = bioanalystName ? `\n\n[Bioanalista/Responsable: ${bioanalystName} - ${laboratoryName || 'Laboratorio'}]` : '';
        const finalNotes = (resultsSummary || '') + bioNote;

        // 1. Si existe orderId en laboratory_orders, actualizarlo
        let updatedOrder = null;
        if (orderId) {
            const { data: existingOrder } = await supabaseAdmin
                .from('laboratory_orders')
                .select('id')
                .eq('id', orderId)
                .maybeSingle();

            if (existingOrder) {
                const { data: updateRes, error: updateErr } = await supabaseAdmin
                    .from('laboratory_orders')
                    .update({
                        status: 'completed',
                        results_available: true,
                        results_url: resultsUrl || null,
                        laboratory_notes: finalNotes,
                        laboratory_id: laboratoryId || null,
                        completed_date: now,
                        results_uploaded_at: now,
                        updated_at: now
                    })
                    .eq('id', orderId)
                    .select()
                    .single();

                if (updateErr) {
                    console.error('Error actualizando laboratory_orders:', updateErr);
                } else {
                    updatedOrder = updateRes;
                }
            } else {
                // Puede ser que orderId provenga de un medical_record_id
                // Crear una orden completada directamente en laboratory_orders
                const insertPayload: Record<string, any> = {
                    patient_id: patientId,
                    order_number: orderNumber || `SUMA-LAB-${Date.now().toString().slice(-6)}`,
                    studies: [{ name: studies || fileName || 'Estudios de Laboratorio' }],
                    diagnosis: diagnosis || '',
                    clinical_indications: studies || '',
                    status: 'completed',
                    results_available: true,
                    results_url: resultsUrl || null,
                    laboratory_notes: finalNotes,
                    laboratory_id: laboratoryId || null,
                    completed_date: now,
                    results_uploaded_at: now,
                    valid_from: now
                };
                if (doctorId) {
                    insertPayload.doctor_id = doctorId;
                }
                const { data: insertRes, error: insertErr } = await supabaseAdmin
                    .from('laboratory_orders')
                    .insert([insertPayload])
                    .select()
                    .single();

                if (insertErr) {
                    console.error('Error creando laboratory_order tras carga:', insertErr);
                } else {
                    updatedOrder = insertRes;
                }
            }
        }

        // 2. Guardar en medical_attachments para que aparezca directamente en la Galería de Archivos del Paciente y Doctor
        let attachment = null;
        if (resultsUrl) {
            const { data: attData, error: attError } = await supabaseAdmin
                .from('medical_attachments')
                .insert([{
                    patient_id: patientId,
                    uploader_id: laboratoryId || patientId,
                    file_name: fileName || `Resultados de Laboratorio - ${new Date().toLocaleDateString('es-ES')}`,
                    file_url: resultsUrl,
                    file_type: fileType || 'image/jpeg',
                    file_size: fileSize || 0,
                    category: 'lab_result',
                    description: finalNotes.trim()
                }])
                .select()
                .single();

            if (attError) {
                console.error('Error guardando en medical_attachments:', attError);
            } else {
                attachment = attData;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Resultados de laboratorio guardados y vinculados exitosamente al historial del paciente.',
            order: updatedOrder,
            attachment
        });

    } catch (error: any) {
        console.error('Error cargando resultados de laboratorio:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

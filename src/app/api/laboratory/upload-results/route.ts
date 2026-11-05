import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
            category,
            bioanalystName
        } = body;

        if (!patientId || (!resultsSummary && !resultsUrl)) {
            return NextResponse.json(
                { error: 'Debes proporcionar al menos un resumen o un archivo de resultados y el ID del paciente.' },
                { status: 400 }
            );
        }

        const now = new Date().toISOString();
        const labTag = laboratoryName ? `Laboratorio: ${laboratoryName}` : 'Laboratorio SUMA';
        const bioNote = bioanalystName
            ? `\n\n[Bioanalista/Responsable: ${bioanalystName} - ${labTag}]`
            : `\n\n[Subido por ${labTag}]`;
        const finalNotes = ((resultsSummary || '').trim() + bioNote).trim();

        const safeLabId = laboratoryId && UUID_REGEX.test(String(laboratoryId)) ? String(laboratoryId) : null;
        const safeDocId = doctorId && UUID_REGEX.test(String(doctorId)) ? String(doctorId) : null;

        // 1. Si existe orderId en laboratory_orders, actualizarlo; si no existe, crear la orden completada si aplica
        let updatedOrder = null;
        if (orderId && UUID_REGEX.test(String(orderId))) {
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
                        laboratory_id: safeLabId,
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
            }
        }

        if (!updatedOrder) {
            const insertPayload: Record<string, any> = {
                patient_id: patientId,
                order_number: orderNumber || `SUMA-LAB-${Date.now().toString().slice(-6)}`,
                studies: [{ name: studies || fileName || 'Estudios de Laboratorio' }],
                diagnosis: diagnosis || '',
                clinical_indications: studies || fileName || '',
                status: 'completed',
                results_available: true,
                results_url: resultsUrl || null,
                laboratory_notes: finalNotes,
                laboratory_id: safeLabId,
                completed_date: now,
                results_uploaded_at: now,
                valid_from: now
            };
            if (safeDocId) {
                insertPayload.doctor_id = safeDocId;
            }
            const { data: insertRes, error: insertErr } = await supabaseAdmin
                .from('laboratory_orders')
                .insert([insertPayload])
                .select()
                .single();

            if (insertErr) {
                console.warn('Nota al registrar laboratory_order tras carga:', insertErr.message);
            } else {
                updatedOrder = insertRes;
            }
        }

        // 2. Guardar en medical_attachments para que aparezca directamente en la Galería de Archivos de la Historia del Paciente
        let attachment = null;
        if (resultsUrl) {
            const resolvedCategory =
                category && ['lab_result', 'imaging', 'prescription', 'before_after_photo', 'general'].includes(category)
                    ? category
                    : 'lab_result';

            const resolvedFileType =
                fileType ||
                (resultsUrl.toLowerCase().endsWith('.pdf')
                    ? 'application/pdf'
                    : resultsUrl.toLowerCase().endsWith('.webp')
                    ? 'image/webp'
                    : 'image/jpeg');

            const { data: attData, error: attError } = await supabaseAdmin
                .from('medical_attachments')
                .insert([{
                    patient_id: patientId,
                    uploader_id: safeLabId || patientId,
                    file_name: fileName || studies || `Resultados de Laboratorio - ${new Date().toLocaleDateString('es-ES')}`,
                    file_url: resultsUrl,
                    file_type: resolvedFileType,
                    file_size: Number(fileSize) || 0,
                    category: resolvedCategory,
                    description: finalNotes
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
            message: 'Resultados y archivos guardados y vinculados exitosamente a la historia del paciente.',
            order: updatedOrder,
            attachment
        });

    } catch (error: any) {
        console.error('Error cargando resultados de laboratorio:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/patient-files?patientId=...
 * Obtiene todos los archivos adjuntos (medical_attachments) y resultados de laboratorio (laboratory_orders)
 * de un paciente usando supabaseAdmin para garantizar que el médico, clínica, laboratorio y paciente
 * puedan visualizarlos sin bloqueos de RLS.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const patientId = searchParams.get('patientId') || searchParams.get('patient_id');

        if (!patientId) {
            return NextResponse.json({ error: 'Se requiere el ID del paciente (patientId).' }, { status: 400 });
        }

        const [attachmentsRes, labOrdersRes] = await Promise.all([
            supabaseAdmin
                .from('medical_attachments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false }),
            supabaseAdmin
                .from('laboratory_orders')
                .select(`
                    *,
                    laboratories ( id, name, phone, city ),
                    doctors ( id, name, specialty )
                `)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
        ]);

        const attachments = attachmentsRes.data || [];
        const labOrders = labOrdersRes.data || [];

        // Recolectar uploader_ids para identificar si fueron subidos por un doctor, laboratorio o clínica
        const uploaderIds = Array.from(
            new Set(
                attachments
                    .map((a: any) => a.uploader_id)
                    .filter((id: any) => typeof id === 'string' && UUID_REGEX.test(id))
            )
        ) as string[];

        const uploaderMap: Record<string, { name: string; role: 'doctor' | 'laboratory' | 'clinic' | 'patient' }> = {};

        if (uploaderIds.length > 0) {
            const [docsRes, labsRes, clinicsRes] = await Promise.all([
                supabaseAdmin.from('doctors').select('id, name').in('id', uploaderIds),
                supabaseAdmin.from('laboratories').select('id, name').in('id', uploaderIds),
                supabaseAdmin.from('clinics').select('id, name').in('id', uploaderIds),
            ]);

            (docsRes.data || []).forEach((d: any) => {
                uploaderMap[d.id] = { name: `Dr(a). ${d.name}`, role: 'doctor' };
            });
            (labsRes.data || []).forEach((l: any) => {
                uploaderMap[l.id] = { name: l.name, role: 'laboratory' };
            });
            (clinicsRes.data || []).forEach((c: any) => {
                uploaderMap[c.id] = { name: c.name, role: 'clinic' };
            });
        }

        const unifiedFiles: any[] = [];

        // 1. Procesar medical_attachments
        for (const att of attachments) {
            const uploaderInfo = uploaderMap[att.uploader_id];
            const isFromLab =
                uploaderInfo?.role === 'laboratory' ||
                att.category === 'lab_result' ||
                (att.description && att.description.toLowerCase().includes('laboratorio'));

            // Buscar si hay una orden de laboratorio con el mismo results_url para enriquecer datos
            const matchingOrder = labOrders.find(
                (o: any) => o.results_url && att.file_url && o.results_url === att.file_url
            );

            const labName =
                (uploaderInfo?.role === 'laboratory' ? uploaderInfo.name : undefined) ||
                matchingOrder?.laboratories?.name ||
                undefined;

            const doctorName =
                (uploaderInfo?.role === 'doctor' ? uploaderInfo.name : undefined) ||
                (matchingOrder?.doctors?.name ? `Dr(a). ${matchingOrder.doctors.name}` : undefined);

            unifiedFiles.push({
                id: att.id,
                title: att.file_name || 'Archivo Adjunto',
                url: att.file_url || '',
                type: att.file_type || (att.file_url?.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/webp'),
                fileSize: att.file_size || 0,
                category: att.category || (isFromLab ? 'lab_result' : 'general'),
                description: att.description || matchingOrder?.laboratory_notes || '',
                createdAt: att.created_at,
                source: isFromLab ? 'laboratory' : (uploaderInfo?.role || 'attachment'),
                uploaderName: uploaderInfo?.name || labName || doctorName || 'Sistema SUMA',
                uploaderRole: uploaderInfo?.role || (isFromLab ? 'laboratory' : 'doctor'),
                laboratoryName: labName,
                doctorName,
                orderNumber: matchingOrder?.order_number || undefined,
            });
        }

        // 2. Procesar laboratory_orders con resultados disponibles que aún no estén en unifiedFiles
        for (const order of labOrders) {
            if (!order.results_available && !order.results_url && !order.laboratory_notes) continue;

            const alreadyInList =
                order.results_url && unifiedFiles.some((f) => f.url && f.url === order.results_url);

            if (!alreadyInList && (order.results_url || order.laboratory_notes)) {
                let studiesName = 'Estudios de Laboratorio';
                if (Array.isArray(order.studies) && order.studies.length > 0) {
                    studiesName = order.studies
                        .map((s: any) => (typeof s === 'string' ? s : s.name || s.title || ''))
                        .filter(Boolean)
                        .join(', ');
                } else if (typeof order.studies === 'string' && order.studies.trim()) {
                    studiesName = order.studies;
                } else if (order.clinical_indications) {
                    studiesName = order.clinical_indications;
                }

                const isPdf = order.results_url?.toLowerCase().endsWith('.pdf');
                const isWebp = order.results_url?.toLowerCase().endsWith('.webp');

                unifiedFiles.push({
                    id: order.id,
                    title: studiesName,
                    url: order.results_url || '',
                    type: isPdf ? 'application/pdf' : isWebp ? 'image/webp' : 'image/jpeg',
                    fileSize: 0,
                    category: 'lab_result',
                    description: order.laboratory_notes || '',
                    createdAt: order.completed_date || order.results_uploaded_at || order.updated_at || order.created_at,
                    source: 'laboratory',
                    uploaderName: order.laboratories?.name || 'Laboratorio SUMA',
                    uploaderRole: 'laboratory',
                    laboratoryName: order.laboratories?.name || 'Laboratorio SUMA',
                    doctorName: order.doctors?.name ? `Dr(a). ${order.doctors.name}` : undefined,
                    orderNumber: order.order_number || undefined,
                });
            }
        }

        // Ordenar del más reciente al más antiguo
        unifiedFiles.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

        return NextResponse.json({
            files: unifiedFiles,
            labOrders
        });
    } catch (error: any) {
        console.error('Error en GET /api/patient-files:', error);
        return NextResponse.json(
            { error: error.message || 'Error al obtener archivos del paciente' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/patient-files
 * Registra un nuevo archivo en la historia del paciente (subido por el médico, clínica o laboratorio).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            patientId,
            recordId,
            uploaderId,
            uploaderName,
            uploaderRole,
            fileName,
            fileUrl,
            fileType,
            fileSize,
            category = 'general',
            description = ''
        } = body;

        if (!patientId || !fileUrl) {
            return NextResponse.json(
                { error: 'Se requieren patientId y fileUrl para guardar el archivo.' },
                { status: 400 }
            );
        }

        const validCategories = ['lab_result', 'imaging', 'prescription', 'before_after_photo', 'general'];
        const normalizedCategory = validCategories.includes(category) ? category : 'general';

        const safeUploaderId =
            uploaderId && UUID_REGEX.test(String(uploaderId))
                ? String(uploaderId)
                : String(patientId);

        const roleLabel =
            uploaderRole === 'laboratory'
                ? 'Laboratorio'
                : uploaderRole === 'clinic'
                ? 'Clínica'
                : 'Dr(a).';

        const attributionSuffix = uploaderName
            ? `\n\n[Subido por ${roleLabel}: ${uploaderName}]`
            : '';

        const finalDescription = `${(description || '').trim()}${attributionSuffix}`.trim();

        const insertPayload: Record<string, any> = {
            patient_id: patientId,
            uploader_id: safeUploaderId,
            file_name: fileName || `Archivo Clínico - ${new Date().toLocaleDateString('es-ES')}`,
            file_url: fileUrl,
            file_type: fileType || (fileUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/webp'),
            file_size: Number(fileSize) || 0,
            category: normalizedCategory,
            description: finalDescription
        };

        if (recordId && UUID_REGEX.test(String(recordId))) {
            insertPayload.record_id = recordId;
        }

        const { data, error } = await supabaseAdmin
            .from('medical_attachments')
            .insert([insertPayload])
            .select()
            .single();

        if (error) {
            console.error('Error insertando en medical_attachments:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            attachment: data
        });
    } catch (error: any) {
        console.error('Error en POST /api/patient-files:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno al guardar archivo del paciente' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/patient-files?id=...
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de archivo requerido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('medical_attachments')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error en DELETE /api/patient-files:', error);
        return NextResponse.json({ error: error.message || 'Error al eliminar archivo' }, { status: 500 });
    }
}

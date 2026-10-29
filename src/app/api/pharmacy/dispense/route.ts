import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            recordId,
            pharmacyId,
            pharmacyName,
            branchName,
            city,
            pharmacistName,
            pharmacistLicense,
            notes,
            medicationsDelivered
        } = body;

        if (!recordId) {
            return NextResponse.json({ error: 'ID de récipe requerido' }, { status: 400 });
        }

        if (!pharmacyId) {
            return NextResponse.json({ error: 'Identificador de la farmacia requerido' }, { status: 400 });
        }

        // 1. Consultar estado actual del récipe
        const { data: record, error: fetchError } = await supabaseAdmin
            .from('medical_records')
            .select('id, prescription, prescription_expires_at, recipe_status, dispensed_by_pharmacy_name, dispensed_at')
            .eq('id', recordId)
            .maybeSingle();

        if (fetchError) {
            console.error('Error al verificar récipe para dispensar:', fetchError);
            return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 });
        }

        if (!record) {
            return NextResponse.json({ error: 'Récipe médico no encontrado' }, { status: 404 });
        }

        // 2. Comprobar si ya fue suministrado (CONTROL ANTI-DOBLE DISPENSACIÓN)
        if (record.dispensed_at || record.recipe_status === 'dispensed') {
            const formattedDate = record.dispensed_at 
                ? new Date(record.dispensed_at).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
                : 'fecha previa';

            return NextResponse.json({
                error: `⛔ YA NO SE PUEDE ENTREGAR MÁS ESTE MEDICAMENTO: Este récipe ya fue entregado en "${record.dispensed_by_pharmacy_name || 'otra farmacia aliada'}" el ${formattedDate}. Por tratarse de medicamentos delicados bajo récipe, está prohibida su doble entrega.`,
                alreadyDispensed: true,
                dispensedBy: record.dispensed_by_pharmacy_name,
                dispensedAt: record.dispensed_at
            }, { status: 409 });
        }

        // 3. Comprobar si está vencido
        if (record.prescription_expires_at) {
            const expiry = new Date(record.prescription_expires_at);
            if (expiry.getTime() < Date.now()) {
                const formattedExpiry = expiry.toLocaleDateString('es-VE');
                return NextResponse.json({
                    error: `⚠️ El récipe médico expiró el ${formattedExpiry}. No se puede suministrar medicamentos con un récipe vencido. Solicite al paciente renovarlo con su médico tratante.`,
                    expired: true
                }, { status: 400 });
            }
        }

        // 4. Formatear nombre representativo de la farmacia y sucursal
        let fullDispenserName = pharmacyName || 'Farmacia Aliada';
        if (branchName) {
            fullDispenserName += ` - Sucursal ${branchName}`;
        }
        if (city) {
            fullDispenserName += ` (${city})`;
        }

        const now = new Date().toISOString();

        const notesParts: string[] = [];
        if (Array.isArray(medicationsDelivered) && medicationsDelivered.length > 0) {
            notesParts.push(`Medicamentos entregados: ${medicationsDelivered.join(' | ')}`);
        }
        if (pharmacistName) {
            notesParts.push(`Atendido por: ${pharmacistName}${pharmacistLicense ? ` (Mat: ${pharmacistLicense})` : ''}`);
        }
        if (notes) {
            notesParts.push(notes);
        }
        const finalDispensationNotes = notesParts.length > 0 ? notesParts.join(' — ') : null;

        // 5. Actualizar el registro médico a 'dispensed'
        const { error: updateError } = await supabaseAdmin
            .from('medical_records')
            .update({
                recipe_status: 'dispensed',
                dispensed_by_pharmacy_id: pharmacyId,
                dispensed_by_pharmacy_name: fullDispenserName,
                dispensed_at: now,
                dispensation_notes: finalDispensationNotes
            })
            .eq('id', recordId);

        if (updateError) {
            console.error('Error al actualizar registro médico a suministrado:', updateError);
            return NextResponse.json({ error: 'Error al registrar el suministro en el récipe' }, { status: 500 });
        }

        // 6. Incrementar contador de récipes despachados en la farmacia
        try {
            const { data: currentPharm } = await supabaseAdmin
                .from('pharmacies')
                .select('total_prescriptions_filled')
                .eq('id', pharmacyId)
                .maybeSingle();

            const currentCount = currentPharm?.total_prescriptions_filled || 0;

            await supabaseAdmin
                .from('pharmacies')
                .update({
                    total_prescriptions_filled: currentCount + 1,
                    updated_at: now
                })
                .eq('id', pharmacyId);
        } catch (pharmCountErr) {
            console.warn('No se pudo incrementar total_prescriptions_filled:', pharmCountErr);
        }

        // 7. Registrar en el historial de dispensación para auditoría
        try {
            await supabaseAdmin
                .from('prescription_dispensation_history')
                .insert({
                    prescription_id: recordId,
                    pharmacy_id: pharmacyId,
                    pharmacy_name: fullDispenserName,
                    branch_name: branchName || null,
                    medications_dispensed: Array.isArray(medicationsDelivered) ? medicationsDelivered : [record.prescription || ''],
                    pharmacist_name: pharmacistName || 'Farmacéutico en mostrador',
                    pharmacist_license: pharmacistLicense || 'N/A',
                    notes: finalDispensationNotes,
                    dispensed_at: now,
                    created_at: now
                });
        } catch (auditErr) {
            console.warn('No se pudo insertar en prescription_dispensation_history:', auditErr);
        }

        return NextResponse.json({
            success: true,
            message: 'Medicamentos suministrados y récipe bloqueado exitosamente',
            dispensedAt: now,
            dispensedBy: fullDispenserName
        });

    } catch (error: any) {
        console.error('Error en dispensación de récipe:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

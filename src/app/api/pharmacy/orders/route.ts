import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function toCamel(row: Record<string, any>) {
    if (!row) return row;
    const out: Record<string, any> = {};
    for (const k in row) {
        const camelK = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        out[camelK] = row[k];
    }
    return out;
}

// GET /api/pharmacy/orders?pharmacyId=...&doctorId=...&patientId=...&mode=chronic_refills
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pharmacyId = searchParams.get('pharmacyId');
        const doctorId = searchParams.get('doctorId');
        const patientId = searchParams.get('patientId');
        const mode = searchParams.get('mode');

        if (mode === 'chronic_refills') {
            let ordQuery = supabaseAdmin
                .from('pharmacy_recipe_orders')
                .select('*')
                .eq('is_chronic_treatment', true)
                .order('next_refill_date', { ascending: true });

            if (pharmacyId) ordQuery = ordQuery.eq('pharmacy_id', pharmacyId);

            let recQuery = supabaseAdmin
                .from('medical_records')
                .select('*')
                .eq('is_chronic_treatment', true)
                .order('next_refill_date', { ascending: true });

            if (pharmacyId) recQuery = recQuery.eq('dispensed_by_pharmacy_id', pharmacyId);

            const [{ data: chronicOrders }, { data: chronicRecords }] = await Promise.all([
                ordQuery,
                recQuery,
            ]);

            return NextResponse.json({
                orders: (chronicOrders || []).map(toCamel),
                records: (chronicRecords || []).map(toCamel),
            });
        }

        let query = supabaseAdmin
            .from('pharmacy_recipe_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (pharmacyId) query = query.eq('pharmacy_id', pharmacyId);
        if (doctorId) query = query.eq('doctor_id', doctorId);
        if (patientId) query = query.eq('patient_id', patientId);

        const { data: orders, error } = await query;
        if (error) throw error;

        return NextResponse.json((orders || []).map(toCamel));
    } catch (err: any) {
        console.error('Error in GET /api/pharmacy/orders:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/pharmacy/orders - Paciente solicita Cotizar o Apartar Récipe en 1 Clic (Mostrador o Delivery)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pharmacyId = body.pharmacyId || body.pharmacy_id;
        const patientName = body.patientName || body.patient_name || 'Paciente SUMA';

        if (!pharmacyId) {
            return NextResponse.json({ error: 'pharmacyId es obligatorio' }, { status: 400 });
        }

        const isChronic = Boolean(body.isChronicTreatment ?? body.is_chronic_treatment);
        const refillDays = Number(body.refillIntervalDays || 30);
        const nextRefillDate = isChronic
            ? new Date(Date.now() + (refillDays - 5) * 86400000).toISOString().split('T')[0]
            : null;

        const now = new Date().toISOString();
        const insertPayload = {
            recipe_id: body.recipeId || null,
            recipe_code: body.recipeCode || null,
            pharmacy_id: pharmacyId,
            doctor_id: body.doctorId || null,
            patient_id: body.patientId || null,
            patient_name: String(patientName).trim(),
            patient_cedula: body.patientCedula || null,
            patient_phone: body.patientPhone || null,
            delivery_type: body.deliveryType === 'delivery' ? 'delivery' : 'pickup',
            delivery_address: body.deliveryAddress || null,
            prescription_text: body.prescriptionText || null,
            matched_items: Array.isArray(body.matchedItems) ? body.matchedItems : [],
            coupon_code: body.couponCode || null,
            discount_percentage: body.discountPercentage ? Number(body.discountPercentage) : 0,
            status: 'pending_quote',
            quoted_total_usd: body.quotedTotalUsd ? Number(body.quotedTotalUsd) : null,
            patient_notes: body.patientNotes || null,
            is_chronic_treatment: isChronic,
            refill_interval_days: refillDays,
            next_refill_date: nextRefillDate,
            created_at: now,
            updated_at: now,
        };

        const { data: order, error } = await supabaseAdmin
            .from('pharmacy_recipe_orders')
            .insert([insertPayload])
            .select()
            .single();

        if (error) throw error;

        // Incrementar orders_count en la alianza entre el médico y la farmacia si existe
        if (body.doctorId && pharmacyId) {
            const { data: link } = await supabaseAdmin
                .from('doctor_pharmacy_sponsorships')
                .select('id, orders_count')
                .eq('doctor_id', body.doctorId)
                .eq('pharmacy_id', pharmacyId)
                .maybeSingle();

            if (link) {
                await supabaseAdmin
                    .from('doctor_pharmacy_sponsorships')
                    .update({ orders_count: (link.orders_count || 0) + 1 })
                    .eq('id', link.id);
            }
        }

        const camelOrder = toCamel(order);
        return NextResponse.json({
            ...camelOrder,
            success: true,
            order: camelOrder,
            message: 'Tu solicitud de cotización y reserva fue enviada a la farmacia.',
        });
    } catch (err: any) {
        console.error('Error in POST /api/pharmacy/orders:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/pharmacy/orders - Farmacia responde con cotización, marca listo o despacha (y descuenta stock SUMA)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de pedido requerido' }, { status: 400 });
        }

        const { data: existingOrder } = await supabaseAdmin
            .from('pharmacy_recipe_orders')
            .select('*')
            .eq('id', id)
            .single();

        if (!existingOrder) {
            return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
        }

        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (body.status !== undefined) updates.status = body.status;
        if (body.quotedTotalUsd !== undefined) {
            updates.quoted_total_usd = body.quotedTotalUsd === '' || body.quotedTotalUsd === null ? null : Number(body.quotedTotalUsd);
        }
        if (body.quotedTotalBs !== undefined) {
            updates.quoted_total_bs = body.quotedTotalBs === '' || body.quotedTotalBs === null ? null : Number(body.quotedTotalBs);
        }
        if (body.pharmacyNotes !== undefined) updates.pharmacy_notes = body.pharmacyNotes;
        if (body.isChronicTreatment !== undefined) {
            updates.is_chronic_treatment = Boolean(body.isChronicTreatment);
            if (body.isChronicTreatment && !existingOrder.next_refill_date) {
                const days = Number(body.refillIntervalDays || existingOrder.refill_interval_days || 30);
                updates.next_refill_date = new Date(Date.now() + (days - 5) * 86400000).toISOString().split('T')[0];
            }
        }
        if (body.nextRefillDate !== undefined) updates.next_refill_date = body.nextRefillDate;

        // Si el pedido pasa a 'completed' (entregado) por primera vez, descontar las unidades solicitadas del stock_quantity dispuesto para SUMA
        if (body.status === 'completed' && existingOrder.status !== 'completed') {
            const matchedItems = Array.isArray(existingOrder.matched_items) ? existingOrder.matched_items : [];
            for (const item of matchedItems) {
                const prodId = item.id || item.productId;
                const qtyToDeduct = Math.max(1, Number(item.quantity || 1));
                if (prodId) {
                    const { data: prod } = await supabaseAdmin
                        .from('pharmacy_products')
                        .select('id, stock_quantity, is_available')
                        .eq('id', prodId)
                        .maybeSingle();

                    if (prod && prod.stock_quantity !== null && prod.stock_quantity !== undefined) {
                        const nextQty = Math.max(0, Number(prod.stock_quantity) - qtyToDeduct);
                        await supabaseAdmin
                            .from('pharmacy_products')
                            .update({
                                stock_quantity: nextQty,
                                is_available: nextQty > 0,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('id', prod.id);
                    }
                }
            }
        }

        const { data: updated, error } = await supabaseAdmin
            .from('pharmacy_recipe_orders')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const camelOrder = toCamel(updated);
        return NextResponse.json({
            ...camelOrder,
            success: true,
            order: camelOrder,
        });
    } catch (err: any) {
        console.error('Error in PATCH /api/pharmacy/orders:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

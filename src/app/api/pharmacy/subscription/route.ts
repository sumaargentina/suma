import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function toCamel(row: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const k in row) {
        const camelK = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        out[camelK] = row[k];
    }
    return out;
}

// GET /api/pharmacy/subscription?pharmacyId=...
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pharmacyId = searchParams.get('pharmacyId');

        let query = supabaseAdmin
            .from('pharmacy_payments')
            .select('*')
            .order('created_at', { ascending: false });

        if (pharmacyId) {
            query = query.eq('pharmacy_id', pharmacyId);
        }

        const { data: paymentsData, error } = await query;
        if (error) throw error;

        if (pharmacyId) {
            const { data: pharm } = await supabaseAdmin
                .from('pharmacies')
                .select('id, name, chain_name, branch_name, city, sponsorship_plan_status, sponsorship_plan_fee, sponsorship_next_payment_date, discount_percentage, free_months, free_trial_ends_at, agreement_notes')
                .eq('id', pharmacyId)
                .maybeSingle();

            return NextResponse.json({
                pharmacy: pharm || null,
                payments: (paymentsData || []).map(toCamel),
            });
        }

        return NextResponse.json((paymentsData || []).map(toCamel));
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/pharmacy/subscription - Reportar o activar pago de $200 USD/mes del Módulo Premium B2B
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pharmacyId = body.pharmacyId || body.pharmacy_id;
        const pharmacyName = body.pharmacyName || body.pharmacy_name || 'Farmacia';
        const amount = body.amount !== undefined ? Number(body.amount) : 200;
        const paymentMethod = body.paymentMethod || body.payment_method || 'transferencia';
        const transactionId = body.transactionId || body.transaction_id || `PHARM-${Date.now()}`;
        const paymentProofUrl = body.paymentProofUrl || body.payment_proof_url || null;
        const autoApprove = Boolean(body.autoApprove);

        if (!pharmacyId) {
            return NextResponse.json({ error: 'pharmacyId es requerido' }, { status: 400 });
        }

        const today = new Date().toISOString().split('T')[0];
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const status = autoApprove ? 'Paid' : 'Pending';
        const planStatus = autoApprove ? 'active' : 'pending_verification';

        const { data: payment, error: payErr } = await supabaseAdmin
            .from('pharmacy_payments')
            .insert([{
                pharmacy_id: pharmacyId,
                pharmacy_name: pharmacyName,
                amount,
                date: today,
                status,
                payment_method: paymentMethod,
                transaction_id: transactionId,
                payment_proof_url: paymentProofUrl,
                notes: body.notes || 'Suscripción Mensual Módulo Alianzas Médicas y Publicidad ($200/mes)',
            }])
            .select()
            .single();

        if (payErr) throw payErr;

        await supabaseAdmin
            .from('pharmacies')
            .update({
                sponsorship_plan_status: planStatus,
                sponsorship_plan_fee: amount,
                sponsorship_next_payment_date: nextMonth,
                updated_at: new Date().toISOString(),
            })
            .eq('id', pharmacyId);

        return NextResponse.json({
            success: true,
            payment: toCamel(payment),
            sponsorshipPlanStatus: planStatus,
            planStatus,
            nextPaymentDate: nextMonth,
            message: autoApprove
                ? 'Tu Membresía B2B ($200/mes) ha sido activada. Ya puedes hacer Match y negociar con médicos.'
                : 'Comprobante recibido. El equipo de SUMA validará tu pago en breve.',
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/pharmacy/subscription - Aprobar/rechazar pago o activar/suspender Plan B2B ($200/mes) desde Admin
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, status, pharmacyId, action, planStatus } = body;

        // Acción directa desde Admin para activar/desactivar plan B2B de una farmacia
        if (action === 'toggle_plan' && pharmacyId) {
            const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const targetStatus = planStatus || 'active';
            const { data: pharmUpdated, error: pharmErr } = await supabaseAdmin
                .from('pharmacies')
                .update({
                    sponsorship_plan_status: targetStatus,
                    sponsorship_plan_fee: 200,
                    sponsorship_next_payment_date: targetStatus === 'active' ? nextMonth : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', pharmacyId)
                .select()
                .single();

            if (pharmErr) throw pharmErr;
            return NextResponse.json({
                success: true,
                pharmacy: toCamel(pharmUpdated),
            });
        }

        if (!id || !status) {
            return NextResponse.json({ error: 'id y status son requeridos' }, { status: 400 });
        }

        const { data: updated, error } = await supabaseAdmin
            .from('pharmacy_payments')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        const targetPharmId = pharmacyId || updated?.pharmacy_id;
        if (targetPharmId) {
            const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            await supabaseAdmin
                .from('pharmacies')
                .update({
                    sponsorship_plan_status: status === 'Paid' ? 'active' : 'inactive',
                    sponsorship_next_payment_date: status === 'Paid' ? nextMonth : null,
                })
                .eq('id', targetPharmId);
        }

        return NextResponse.json({
            success: true,
            payment: toCamel(updated),
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

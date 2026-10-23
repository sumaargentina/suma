import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendSellerCommissionPaidEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
}

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
}

export async function GET(request: NextRequest) {
    try {
        const sellerId = request.nextUrl.searchParams.get('sellerId');
        let query = supabaseAdmin.from('seller_payments').select('*').order('payment_date', { ascending: false });

        if (sellerId) {
            query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching seller_payments:', error);
            return NextResponse.json([], { status: 200 });
        }

        const payments = (data || []).map(item => toCamelCase(item as Record<string, unknown>));
        return NextResponse.json(payments);
    } catch (error: any) {
        console.error('Error in GET /api/seller-payments:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Acción especial: sincronizar comisiones pendientes a partir de pagos de médicos aprobados ('Paid')
        if (body.action === 'sync_commissions') {
            const [
                { data: paidDocPayments },
                { data: doctors },
                { data: sellers },
                { data: existingSellerPayments },
            ] = await Promise.all([
                supabaseAdmin.from('doctor_payments').select('*').eq('status', 'Paid'),
                supabaseAdmin.from('doctors').select('id, name, seller_id').not('seller_id', 'is', null),
                supabaseAdmin.from('sellers').select('id, name, commission_rate'),
                supabaseAdmin.from('seller_payments').select('*'),
            ]);

            const doctorMap = new Map((doctors || []).map(d => [d.id, d]));
            const sellerMap = new Map((sellers || []).map(s => [s.id, s]));
            let createdOrUpdated = 0;

            for (const dp of paidDocPayments || []) {
                const doc = doctorMap.get(dp.doctor_id);
                if (!doc || !doc.seller_id) continue;
                const seller = sellerMap.get(doc.seller_id);
                if (!seller) continue;

                const rate = Number(seller.commission_rate ?? 0.2);
                const paymentAmount = Number(dp.amount ?? 0);
                const commissionAmount = Math.round(paymentAmount * rate * 100) / 100;
                if (commissionAmount <= 0) continue;

                const payDateObj = dp.date ? new Date(dp.date + 'T00:00:00') : new Date();
                const rawPeriod = format(payDateObj, 'LLLL yyyy', { locale: es });
                const period = rawPeriod.charAt(0).toUpperCase() + rawPeriod.slice(1);

                // Verificar si este pago recurrente específico del médico (dp.id) ya fue incluido en alguna comisión de la vendedora
                const sellerPaymentsList = (existingSellerPayments || []).filter(
                    sp => sp.seller_id === seller.id
                );

                const alreadyAccounted = sellerPaymentsList.some(sp => {
                    const inc = Array.isArray(sp.included_doctors) ? sp.included_doctors : [];
                    return inc.some((d: any) =>
                        d.doctorPaymentId
                            ? d.doctorPaymentId === dp.id
                            : (d.id === doc.id && String(sp.period || '').toLowerCase() === period.toLowerCase())
                    );
                });

                if (alreadyAccounted) continue;

                const pendingForPeriod = sellerPaymentsList.find(
                    sp => sp.status === 'pending' && String(sp.period || '').toLowerCase() === period.toLowerCase()
                );
                const newDocEntry = {
                    id: doc.id,
                    name: doc.name,
                    commissionAmount,
                    doctorPaymentId: dp.id,
                    paymentDate: dp.date,
                    paymentAmount,
                };

                if (pendingForPeriod) {
                    const currentInc = Array.isArray(pendingForPeriod.included_doctors)
                        ? pendingForPeriod.included_doctors
                        : [];
                    const updatedInc = [...currentInc, newDocEntry];
                    const updatedAmount = Math.round((Number(pendingForPeriod.amount || 0) + commissionAmount) * 100) / 100;

                    await supabaseAdmin
                        .from('seller_payments')
                        .update({
                            amount: updatedAmount,
                            included_doctors: updatedInc,
                            read_by_seller: false,
                        })
                        .eq('id', pendingForPeriod.id);

                    pendingForPeriod.included_doctors = updatedInc;
                    pendingForPeriod.amount = updatedAmount;
                    createdOrUpdated++;
                } else {
                    const { data: inserted } = await supabaseAdmin
                        .from('seller_payments')
                        .insert([{
                            seller_id: seller.id,
                            payment_date: new Date().toISOString().split('T')[0],
                            amount: commissionAmount,
                            period,
                            included_doctors: [newDocEntry],
                            payment_proof_url: '',
                            transaction_id: '',
                            status: 'pending',
                            read_by_seller: false,
                        }])
                        .select('*')
                        .single();

                    if (inserted && existingSellerPayments) {
                        existingSellerPayments.push(inserted);
                    }
                    createdOrUpdated++;
                }
            }

            return NextResponse.json({ success: true, createdOrUpdated });
        }

        const dataWithDefaults = {
            ...toSnakeCase(body as Record<string, unknown>),
            status: body.status || 'pending',
            read_by_seller: false,
        };

        const { data, error } = await supabaseAdmin
            .from('seller_payments')
            .insert([dataWithDefaults])
            .select('*')
            .single();

        if (error) {
            console.error('Error creating seller_payment:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>), { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/seller-payments:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const body = await request.json();
        const id = searchParams.get('id') || body.id;

        if (!id) {
            return NextResponse.json({ error: 'Payment ID required' }, { status: 400 });
        }

        const { data: previousPayment } = await supabaseAdmin
            .from('seller_payments')
            .select('status, seller_id, amount, period, transaction_id')
            .eq('id', id)
            .maybeSingle();

        const updatePayload = { ...body };
        delete updatePayload.id;
        const snakeCaseData = toSnakeCase(updatePayload as Record<string, unknown>);

        const { data, error } = await supabaseAdmin
            .from('seller_payments')
            .update(snakeCaseData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating seller_payment:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (body.status === 'paid' && previousPayment?.status !== 'paid' && data?.seller_id) {
            Promise.resolve(
                supabaseAdmin
                    .from('sellers')
                    .select('name, email')
                    .eq('id', data.seller_id)
                    .maybeSingle()
            )
                .then(({ data: sellerInfo }) => {
                    if (sellerInfo?.email) {
                        sendSellerCommissionPaidEmail({
                            sellerEmail: sellerInfo.email,
                            sellerName: sellerInfo.name,
                            amount: Number(data.amount || 0),
                            period: String(data.period || ''),
                            transactionId: String(data.transaction_id || body.transactionId || ''),
                        }).catch((err) => console.error('Error sending seller commission paid email:', err));
                    }
                })
                .catch(() => {});
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>));
    } catch (error: any) {
        console.error('Error in PATCH /api/seller-payments:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

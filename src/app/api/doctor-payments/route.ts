import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { sendSellerCommissionGeneratedEmail } from '@/lib/email';

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
        const doctorId = request.nextUrl.searchParams.get('doctorId');
        let query = supabaseAdmin.from('doctor_payments').select('*').order('date', { ascending: false });

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching doctor_payments:', error);
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json((data || []).map(item => toCamelCase(item as Record<string, unknown>)));
    } catch (error: any) {
        console.error('Error in GET /api/doctor-payments:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const dataWithDefaults = {
            ...toSnakeCase(body as Record<string, unknown>),
            read_by_admin: false,
            read_by_doctor: false,
        };

        const { data, error } = await supabaseAdmin
            .from('doctor_payments')
            .insert([dataWithDefaults])
            .select('*')
            .single();

        if (error) {
            console.error('Error creating doctor_payment:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>), { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/doctor-payments:', error);
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

        // Fetch existing payment before updating
        const { data: existingPayment } = await supabaseAdmin
            .from('doctor_payments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        const updatePayload: Record<string, unknown> = {
            status: body.status,
            read_by_doctor: false,
        };

        const { data: updatedPayment, error } = await supabaseAdmin
            .from('doctor_payments')
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating doctor_payment:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Si el pago pasa a 'Paid', generar comisión automáticamente para la vendedora que refirió al médico
        if (body.status === 'Paid' && existingPayment?.status !== 'Paid' && updatedPayment?.doctor_id) {
            try {
                const { data: doctor } = await supabaseAdmin
                    .from('doctors')
                    .select('id, name, seller_id')
                    .eq('id', updatedPayment.doctor_id)
                    .maybeSingle();

                if (doctor?.seller_id) {
                    const { data: seller } = await supabaseAdmin
                        .from('sellers')
                        .select('id, name, email, commission_rate')
                        .eq('id', doctor.seller_id)
                        .maybeSingle();

                    if (seller) {
                        const rate = Number(seller.commission_rate ?? 0.2);
                        const paymentAmount = Number(updatedPayment.amount ?? 0);
                        const commissionAmount = Math.round(paymentAmount * rate * 100) / 100;

                        if (commissionAmount > 0) {
                            const payDateObj = updatedPayment.date
                                ? new Date(updatedPayment.date + 'T00:00:00')
                                : new Date();
                            const rawPeriod = format(payDateObj, 'LLLL yyyy', { locale: es });
                            const period = rawPeriod.charAt(0).toUpperCase() + rawPeriod.slice(1);

                            // Consultar todos los pagos de esta vendedora para verificar si este pago puntual del médico ya fue comisionado
                            const { data: sellerAllPayments } = await supabaseAdmin
                                .from('seller_payments')
                                .select('*')
                                .eq('seller_id', seller.id);

                            const alreadyAccounted = (sellerAllPayments || []).some(sp => {
                                const inc = Array.isArray(sp.included_doctors) ? sp.included_doctors : [];
                                return inc.some((d: any) =>
                                    d.doctorPaymentId
                                        ? d.doctorPaymentId === updatedPayment.id
                                        : (d.id === doctor.id && String(sp.period || '').toLowerCase() === period.toLowerCase())
                                );
                            });

                            if (!alreadyAccounted) {
                                const existingPending = (sellerAllPayments || []).find(
                                    sp => sp.status === 'pending' && String(sp.period || '').toLowerCase() === period.toLowerCase()
                                );

                                const newDocEntry = {
                                    id: doctor.id,
                                    name: doctor.name,
                                    commissionAmount,
                                    doctorPaymentId: updatedPayment.id,
                                    paymentDate: updatedPayment.date,
                                    paymentAmount,
                                };

                                if (existingPending) {
                                    const currentIncluded = Array.isArray(existingPending.included_doctors)
                                        ? existingPending.included_doctors
                                        : [];
                                    const updatedIncluded = [...currentIncluded, newDocEntry];
                                    const updatedAmount = Math.round((Number(existingPending.amount || 0) + commissionAmount) * 100) / 100;
                                    await supabaseAdmin
                                        .from('seller_payments')
                                        .update({
                                            amount: updatedAmount,
                                            included_doctors: updatedIncluded,
                                            read_by_seller: false,
                                        })
                                        .eq('id', existingPending.id);
                                } else {
                                    await supabaseAdmin
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
                                        }]);
                                }

                                if (seller.email) {
                                    sendSellerCommissionGeneratedEmail({
                                        sellerEmail: seller.email,
                                        sellerName: seller.name,
                                        doctorName: doctor.name,
                                        commissionAmount,
                                        period,
                                    }).catch((err) => console.error('Error sending seller commission email:', err));
                                }
                            }
                        }
                    }
                }
            } catch (commErr) {
                console.error('Error auto-generating seller commission:', commErr);
            }
        }

        return NextResponse.json(toCamelCase(updatedPayment as Record<string, unknown>));
    } catch (error: any) {
        console.error('Error in PATCH /api/doctor-payments:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

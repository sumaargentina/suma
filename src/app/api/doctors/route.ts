import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendDoctorVerifiedEmail, sendSellerDoctorVerifiedEmail } from '@/lib/email';

// Convert camelCase to snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

// Convert snake_case to camelCase
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        let query = supabaseAdmin
            .from('doctors')
            .select('*');

        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.order('name');
        }

        const { data, error } = await query;

        if (error) {
            console.error('Database error fetching doctors:', error);
            return NextResponse.json([], { status: 200 });
        }

        const doctors = (data || []).map(d => {
            const mapped = toCamelCase(d as Record<string, unknown>);
            const resolvedPhone = (mapped.whatsapp as string) || (mapped.phone as string) || '';
            if (!mapped.whatsapp && resolvedPhone) mapped.whatsapp = resolvedPhone;
            if (!mapped.phone && resolvedPhone) mapped.phone = resolvedPhone;
            return mapped;
        });
        return NextResponse.json(doctors);
    } catch (error: any) {
        console.error('Error in GET /api/doctors:', error);
        return NextResponse.json([], { status: 200 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const body = await req.json();

        if (!id) {
            return NextResponse.json({ error: 'Doctor ID required' }, { status: 400 });
        }

        const snakeCaseData = toSnakeCase(body);
        if (snakeCaseData.whatsapp && !snakeCaseData.phone) {
            snakeCaseData.phone = snakeCaseData.whatsapp;
        } else if (snakeCaseData.phone && !snakeCaseData.whatsapp) {
            snakeCaseData.whatsapp = snakeCaseData.phone;
        }
        const isVerifying = snakeCaseData.verification_status === 'verified';

        // Sincronizar el estado del Consultorio Privado según pago/mensualidad:
        // Si se activa la suscripción o el estado del médico, habilitar su consultorio privado
        if (snakeCaseData.subscription_status === 'active') {
            snakeCaseData.status = 'active';
            snakeCaseData.is_clinic_employee = false;
        } else if (snakeCaseData.status === 'active' && snakeCaseData.subscription_status === undefined) {
            snakeCaseData.subscription_status = 'active';
            snakeCaseData.is_clinic_employee = false;
        } else if (snakeCaseData.status === 'inactive' && snakeCaseData.subscription_status === undefined) {
            snakeCaseData.subscription_status = 'inactive';
        }

        let previousDoctor: {
            id: string;
            name: string;
            email: string;
            specialty?: string;
            medical_license?: string;
            verification_status?: string;
            seller_id?: string | null;
        } | null = null;

        if (isVerifying) {
            const { data: currentDoc } = await supabaseAdmin
                .from('doctors')
                .select('id, name, email, specialty, medical_license, verification_status, seller_id')
                .eq('id', id)
                .maybeSingle();
            previousDoctor = currentDoc;
        }

        const { error } = await supabaseAdmin
            .from('doctors')
            .update(snakeCaseData)
            .eq('id', id);

        if (error) {
            console.error('Error updating doctor:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        let verificationEmailSent = false;
        if (isVerifying && previousDoctor && previousDoctor.verification_status !== 'verified' && previousDoctor.email) {
            try {
                const emailRes = await sendDoctorVerifiedEmail({
                    email: previousDoctor.email,
                    name: previousDoctor.name,
                    specialty: (snakeCaseData.specialty as string) || previousDoctor.specialty,
                    medicalLicense: (snakeCaseData.medical_license as string) || previousDoctor.medical_license,
                });
                verificationEmailSent = Boolean(emailRes.success);
            } catch (emailErr) {
                console.error('Error sending doctor verified email:', emailErr);
            }

            if (previousDoctor.seller_id) {
                Promise.resolve(
                    supabaseAdmin
                        .from('sellers')
                        .select('name, email')
                        .eq('id', previousDoctor.seller_id)
                        .maybeSingle()
                )
                    .then(({ data: sellerInfo }) => {
                        if (sellerInfo?.email && previousDoctor) {
                            sendSellerDoctorVerifiedEmail({
                                sellerEmail: sellerInfo.email,
                                sellerName: sellerInfo.name,
                                doctorName: previousDoctor.name,
                                specialty: (snakeCaseData.specialty as string) || previousDoctor.specialty,
                            }).catch((err) => console.error('Error sending seller doctor verified email:', err));
                        }
                    })
                    .catch(() => {});
            }
        }

        return NextResponse.json({ success: true, verificationEmailSent });
    } catch (error: any) {
        console.error('Error in PATCH /api/doctors:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

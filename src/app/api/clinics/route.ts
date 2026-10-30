import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sendRoleWelcomeEmail } from '@/lib/email';

// Force dynamic to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        let query = supabaseAdmin
            .from('clinics')
            .select('*');

        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.order('name');
        }

        const { data: clinics, error } = await query;

        if (error) {
            console.error('Database error fetching clinics:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!clinics) {
            return NextResponse.json([]);
        }

        // Convert to camelCase
        const camelCaseClinics = clinics.map((clinic: any) => ({
            id: clinic.id,
            name: clinic.name,
            adminEmail: clinic.admin_email || clinic.email,
            email: clinic.email || clinic.admin_email,
            slug: clinic.slug,
            phone: clinic.phone,
            whatsapp: clinic.whatsapp,
            website: clinic.website,
            description: clinic.description,
            rif: clinic.rif,
            legalName: clinic.legal_name,
            country: clinic.country || 'VE',
            state: clinic.state,
            sector: clinic.sector,
            address: clinic.address,
            city: clinic.city,
            lat: clinic.lat,
            lng: clinic.lng,
            logoUrl: clinic.logo_url,
            bannerImage: clinic.banner_image,
            status: clinic.status,
            plan: clinic.plan,
            billingCycle: clinic.billing_cycle,
            billingMonths: clinic.billing_months || 1,
            institutionType: clinic.institution_type || (clinic.plan === 'hospital_gratuito' ? 'public_hospital' : 'private_clinic'),
            verificationStatus: clinic.verification_status,
            subscriptionStatus: clinic.subscription_status,
            subscriptionFee: clinic.subscription_fee ? Number(clinic.subscription_fee) : 0,
            lastPaymentDate: clinic.last_payment_date,
            nextPaymentDate: clinic.next_payment_date,
            rating: clinic.rating,
            reviewCount: clinic.review_count,
            createdAt: clinic.created_at,
            acceptedInsurances: clinic.accepted_insurances,
            paymentSettings: clinic.payment_settings,
            coupons: clinic.coupons || [],
        }));

        return NextResponse.json(camelCaseClinics, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error: any) {
        console.error('Unexpected error in GET /api/clinics:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const name = (body.name || '').trim();
        const targetEmail = (body.adminEmail || body.email || '').trim().toLowerCase();
        const rawPassword = body.password || '';

        if (!name || !targetEmail || !rawPassword) {
            return NextResponse.json(
                { error: 'Nombre, correo electrónico y contraseña son obligatorios.' },
                { status: 400 }
            );
        }

        // Verificar si ya existe una clínica con este correo administrador
        const { data: existingByEmail } = await supabaseAdmin
            .from('clinics')
            .select('id')
            .ilike('admin_email', targetEmail)
            .limit(1);

        if (existingByEmail && existingByEmail.length > 0) {
            return NextResponse.json(
                { error: 'Ya existe una clínica o institución registrada con este correo electrónico.' },
                { status: 400 }
            );
        }

        const hashedPassword = rawPassword.startsWith('$2')
            ? rawPassword
            : await bcrypt.hash(rawPassword, 10);

        const baseSlug = (body.slug || name)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        const { data: existingBySlug } = await supabaseAdmin
            .from('clinics')
            .select('id')
            .eq('slug', baseSlug)
            .limit(1);

        const slug = (existingBySlug && existingBySlug.length > 0)
            ? `${baseSlug}-${Date.now().toString().slice(-4)}`
            : baseSlug;

        const isHospital = body.plan === 'hospital_gratuito' || body.institutionType === 'public_hospital';
        const billingMonths = isHospital ? 12 : (Number(body.billingMonths) || (body.billingCycle === 'annual' ? 12 : 1));
        const subscriptionStatus = body.subscriptionStatus || 'active';

        let lastPaymentDate = body.lastPaymentDate || null;
        let nextPaymentDate = body.nextPaymentDate || null;
        if (!isHospital && subscriptionStatus === 'active' && !nextPaymentDate) {
            const now = new Date();
            lastPaymentDate = now.toISOString().split('T')[0];
            const next = new Date(now);
            next.setMonth(next.getMonth() + billingMonths);
            nextPaymentDate = next.toISOString().split('T')[0];
        }

        const insertData: Record<string, any> = {
            name,
            admin_email: targetEmail,
            email: body.email ? body.email.trim().toLowerCase() : targetEmail,
            password: hashedPassword,
            phone: body.phone || null,
            whatsapp: body.whatsapp || body.phone || null,
            website: body.website || null,
            rif: body.rif || null,
            legal_name: body.legalName || body.legal_name || null,
            city: body.city || null,
            state: body.state || null,
            sector: body.sector || null,
            country: body.country || 'VE',
            address: body.address || null,
            description: body.description || null,
            plan: isHospital ? 'hospital_gratuito' : (body.plan || 'integral'),
            billing_cycle: isHospital ? 'free' : (body.billingCycle || (billingMonths === 12 ? 'annual' : 'monthly')),
            billing_months: billingMonths,
            institution_type: isHospital ? 'public_hospital' : 'private_clinic',
            subscription_fee: isHospital ? 0 : (Number(body.subscriptionFee) || 0),
            subscription_status: subscriptionStatus,
            last_payment_date: lastPaymentDate,
            next_payment_date: nextPaymentDate,
            slug,
            status: body.status || 'active',
            verification_status: body.verificationStatus || 'verified',
            logo_url: body.logoUrl || null,
            banner_image: body.bannerImage || null,
        };

        const { data, error } = await supabaseAdmin
            .from('clinics')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Supabase error creating clinic:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Enviar correo de bienvenida a la clínica (no bloqueante)
        sendRoleWelcomeEmail({
            email: targetEmail,
            name,
            role: 'clinic',
        }).catch((err) => console.error('Error sending clinic welcome email:', err));

        return NextResponse.json({ success: true, id: data.id, clinic: data }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating clinic:', error);
        return NextResponse.json({ error: error.message || 'No se pudo crear la clínica' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        // Validación de credenciales críticas para operación de administración
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY.includes('placeholder')) {
            console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing or invalid.');
            return NextResponse.json({
                error: 'Configuration Error',
                details: 'Falta la variable SUPABASE_SERVICE_ROLE_KEY en Vercel. Configúrala en Project Settings > Environment Variables.'
            }, { status: 500 });
        }

        const { searchParams } = new URL(request.url);
        const body = await request.json();
        const id = searchParams.get('id') || body.id;

        if (!id) {
            return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
        }

        // Manual mapping to snake_case for critical fields
        const dbData: Record<string, any> = {};
        if (body.name !== undefined) dbData.name = body.name;
        if (body.phone !== undefined) dbData.phone = body.phone;
        if (body.description !== undefined) dbData.description = body.description;
        if (body.logoUrl !== undefined) dbData.logo_url = body.logoUrl;
        if (body.bannerImage !== undefined) dbData.banner_image = body.bannerImage;
        if (body.country !== undefined) dbData.country = body.country;
        if (body.state !== undefined) dbData.state = body.state;
        if (body.sector !== undefined) dbData.sector = body.sector;
        if (body.address !== undefined) dbData.address = body.address;
        if (body.city !== undefined) dbData.city = body.city;
        if (body.paymentSettings !== undefined) dbData.payment_settings = body.paymentSettings;
        if (body.coupons !== undefined) dbData.coupons = body.coupons;
        if (body.slug !== undefined) dbData.slug = body.slug;
        if (body.status !== undefined) dbData.status = body.status;
        if (body.whatsapp !== undefined) dbData.whatsapp = body.whatsapp;
        if (body.website !== undefined) dbData.website = body.website;
        if (body.rif !== undefined) dbData.rif = body.rif;
        if (body.legalName !== undefined) dbData.legal_name = body.legalName;
        if (body.adminEmail !== undefined) dbData.admin_email = body.adminEmail;
        if (body.acceptedInsurances !== undefined) dbData.accepted_insurances = body.acceptedInsurances;
        if (body.verificationStatus !== undefined) dbData.verification_status = body.verificationStatus;
        if (body.subscriptionStatus !== undefined) dbData.subscription_status = body.subscriptionStatus;
        if (body.subscriptionFee !== undefined) dbData.subscription_fee = Number(body.subscriptionFee) || 0;
        if (body.lastPaymentDate !== undefined) dbData.last_payment_date = body.lastPaymentDate || null;
        if (body.nextPaymentDate !== undefined) dbData.next_payment_date = body.nextPaymentDate || null;
        if (body.plan !== undefined) dbData.plan = body.plan;
        if (body.billingCycle !== undefined) dbData.billing_cycle = body.billingCycle;
        if (body.billingMonths !== undefined) dbData.billing_months = Number(body.billingMonths) || 1;
        if (body.institutionType !== undefined) dbData.institution_type = body.institutionType;
        if (body.email !== undefined) dbData.email = body.email;
        if (body.lat !== undefined && body.lat !== '') dbData.lat = Number(body.lat);
        if (body.lng !== undefined && body.lng !== '') dbData.lng = Number(body.lng);

        // Sincronizar status y subscription_status cuando se desactiva por falta de pago o se reactiva
        if (body.status === 'inactive' && body.subscriptionStatus === undefined) {
            dbData.subscription_status = 'inactive';
        } else if (body.subscriptionStatus === 'inactive' && body.status === undefined) {
            dbData.status = 'inactive';
        } else if (body.status === 'active' && body.subscriptionStatus === undefined) {
            dbData.subscription_status = 'active';
        }

        // Handle password change - hash it before saving
        if (body.password && body.password.trim()) {
            dbData.password = await bcrypt.hash(body.password, 10);
        }

        const { error } = await supabaseAdmin
            .from('clinics')
            .update(dbData)
            .eq('id', id);

        if (error) {
            console.error('Supabase error updating clinic:', error);
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating clinic:', error);
        return NextResponse.json({ error: 'Failed to update clinic', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de clínica requerido' }, { status: 400 });
        }

        // Limpiar referencias en cascada antes de eliminar la clínica
        await Promise.allSettled([
            supabaseAdmin.from('doctors').update({ clinic_id: null }).eq('clinic_id', id),
            supabaseAdmin.from('appointments').update({ clinic_id: null, clinic_service_id: null }).eq('clinic_id', id),
            supabaseAdmin.from('doctor_workspaces').delete().eq('clinic_id', id),
            supabaseAdmin.from('secretaries').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_services').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_branches').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_specialties').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_payments').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_expenses').delete().eq('clinic_id', id),
            supabaseAdmin.from('clinic_patient_messages').delete().eq('clinic_id', id),
        ]);

        const { error } = await supabaseAdmin
            .from('clinics')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting clinic:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Clínica eliminada exitosamente' });
    } catch (error: any) {
        console.error('Error in DELETE /api/clinics:', error);
        return NextResponse.json({ error: error.message || 'Error al eliminar la clínica' }, { status: 500 });
    }
}

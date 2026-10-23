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
            verificationStatus: clinic.verification_status,
            rating: clinic.rating,
            reviewCount: clinic.review_count,
            createdAt: clinic.created_at,
            acceptedInsurances: clinic.accepted_insurances,
            paymentSettings: clinic.payment_settings,
            coupons: clinic.coupons || [],
        }));

        return NextResponse.json(camelCaseClinics);
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

        const hashedPassword = rawPassword.startsWith('$2')
            ? rawPassword
            : await bcrypt.hash(rawPassword, 10);

        const slug = body.slug || (
            name
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4)
        );

        const insertData: Record<string, any> = {
            name,
            admin_email: targetEmail,
            email: body.email ? body.email.trim().toLowerCase() : targetEmail,
            password: hashedPassword,
            phone: body.phone || null,
            whatsapp: body.whatsapp || body.phone || null,
            city: body.city || null,
            state: body.state || null,
            country: body.country || 'VE',
            address: body.address || null,
            description: body.description || null,
            plan: body.plan || 'integral',
            billing_cycle: body.billingCycle || 'monthly',
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
        if (body.adminEmail !== undefined) dbData.admin_email = body.adminEmail;
        if (body.acceptedInsurances !== undefined) dbData.accepted_insurances = body.acceptedInsurances;
        if (body.verificationStatus !== undefined) dbData.verification_status = body.verificationStatus;
        if (body.plan !== undefined) dbData.plan = body.plan;
        if (body.billingCycle !== undefined) dbData.billing_cycle = body.billingCycle;
        if (body.email !== undefined) dbData.email = body.email;
        if (body.lat !== undefined) dbData.lat = body.lat;
        if (body.lng !== undefined) dbData.lng = body.lng;

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

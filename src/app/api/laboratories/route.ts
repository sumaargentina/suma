import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeCountryCode, isSameCountry } from '@/lib/geo-data';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

const toCamelCase = (item: Record<string, any>) => {
    const camel: Record<string, any> = {};
    for (const key in item) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        camel[camelKey] = item[key];
    }
    // Normalize email/adminEmail
    if (camel.adminEmail && !camel.email) {
        camel.email = camel.adminEmail;
    }
    camel.country = normalizeCountryCode(camel.country || 'VE');
    return camel;
};

// Generar slug amigable a partir del nombre
const generateSlug = (name: string): string => {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
};

// GET /api/laboratories - Obtener laboratorios (o uno por ID/slug, o filtrados por país)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const slug = searchParams.get('slug');
        const countryFilter = searchParams.get('country');

        let query = supabaseAdmin.from('laboratories').select('*');

        if (id) {
            query = query.eq('id', id);
            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            if (!data) return NextResponse.json({ error: 'Laboratorio no encontrado' }, { status: 404 });
            return NextResponse.json(toCamelCase(data));
        }

        if (slug) {
            query = query.eq('slug', slug);
            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            if (!data) return NextResponse.json({ error: 'Laboratorio no encontrado' }, { status: 404 });
            return NextResponse.json(toCamelCase(data));
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;

        let formatted = (data || []).map(toCamelCase);
        if (countryFilter && countryFilter !== 'ALL' && countryFilter !== 'all') {
            formatted = formatted.filter(l => isSameCountry(l.country, countryFilter));
        }
        return NextResponse.json(formatted);
    } catch (err: any) {
        console.error('Error in GET /api/laboratories:', err);
        return NextResponse.json({ error: err.message || 'Error al obtener laboratorios' }, { status: 500 });
    }
}

// POST /api/laboratories - Registro de nuevo laboratorio (Por Admin o desde el Portal Público)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name,
            legalName,
            legal_name,
            rif,
            licenseNumber,
            license_number,
            regentName,
            regent_name,
            regentLicense,
            regent_license,
            contactName,
            contact_name,
            contactRole,
            contact_role,
            adminEmail,
            email,
            password,
            phone,
            whatsapp,
            country,
            city,
            state,
            sector,
            address,
            description,
            plan = 'integral',
            billingCycle = 'monthly',
            billingMonths = 1,
            subscriptionFee = 50,
            discountPercentage = 0,
            freeMonths = 0,
            logoUrl,
            bannerImage,
            lat,
            lng,
            acceptedInsurances,
            paymentSettings,
            isPublicRegistration
        } = body;

        const targetEmail = (adminEmail || email || '').trim().toLowerCase();

        if (!name || !targetEmail || !password) {
            return NextResponse.json({
                error: 'Nombre, correo electrónico del administrador y contraseña son obligatorios.'
            }, { status: 400 });
        }

        // Verificar unicidad de correo en todas las tablas
        const collections = ['doctors', 'sellers', 'patients', 'clinics', 'secretaries', 'pharmacies', 'laboratories'];
        for (const col of collections) {
            const emailCol = (col === 'clinics' || col === 'laboratories') ? 'admin_email' : 'email';
            const { data: existing } = await supabaseAdmin
                .from(col)
                .select('id')
                .eq(emailCol, targetEmail)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({
                    error: `El correo "${targetEmail}" ya está registrado en la plataforma.`
                }, { status: 409 });
            }
        }

        // Generar slug base
        const baseSlug = generateSlug(name);
        let uniqueSlug = baseSlug;
        let counter = 1;

        while (true) {
            const { data: existingSlug } = await supabaseAdmin
                .from('laboratories')
                .select('id')
                .eq('slug', uniqueSlug)
                .maybeSingle();

            if (!existingSlug) break;
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        const now = new Date().toISOString();

        const insertData: Record<string, any> = {
            name: name.trim(),
            legal_name: (legalName || legal_name || name).trim(),
            rif: (rif || '').trim() || null,
            license_number: (licenseNumber || license_number || rif || '').trim() || null,
            regent_name: (regentName || regent_name || '').trim() || null,
            regent_license: (regentLicense || regent_license || '').trim() || null,
            contact_name: (contactName || contact_name || '').trim() || null,
            contact_role: (contactRole || contact_role || '').trim() || null,
            slug: uniqueSlug,
            admin_email: targetEmail,
            email: targetEmail,
            password: hashedPassword,
            phone: phone ? phone.trim() : null,
            whatsapp: whatsapp ? whatsapp.trim() : (phone ? phone.trim() : null),
            country: normalizeCountryCode(country || 'VE'),
            city: city ? city.trim() : null,
            state: state ? state.trim() : null,
            sector: sector ? sector.trim() : null,
            address: address ? address.trim() : null,
            description: description ? description.trim() : null,
            logo_url: logoUrl || null,
            banner_image: bannerImage || null,
            plan: plan || 'integral',
            billing_cycle: billingCycle || (Number(billingMonths) === 12 ? 'annual' : 'monthly'),
            billing_months: Number(billingMonths || 1),
            subscription_fee: Number(subscriptionFee || 50),
            discount_percentage: Number(discountPercentage || 0),
            free_months: Number(freeMonths || 0),
            status: 'active',
            verification_status: isPublicRegistration ? 'pending' : 'verified',
            subscription_status: isPublicRegistration ? 'pending_payment' : 'active',
            accepted_insurances: acceptedInsurances || [],
            payment_settings: paymentSettings || {
                cash: { enabled: true, description: 'Pago en taquilla en efectivo (USD o Bs. a tasa BCV)' },
                pagoMovil: { enabled: false },
                transfer: { enabled: false }
            },
            lat: lat || null,
            lng: lng || null,
            created_at: now
        };

        const { data, error } = await supabaseAdmin
            .from('laboratories')
            .insert([insertData])
            .select()
            .single();

        if (error) {
            console.error('Error inserting laboratory:', error);
            throw error;
        }

        if (isPublicRegistration) {
            try {
                await supabaseAdmin.from('admin_notifications').insert({
                    type: 'new_doctor',
                    title: 'Nuevo Laboratorio Clínico Registrado',
                    message: `El laboratorio "${name.trim()}" (${city || 'Venezuela'}) se ha registrado en el Plan Integral ($50/mes a BCV - Ciclo ${billingMonths} mes/es).`,
                    read: false,
                    created_at: now,
                    link: '/admin/dashboard?view=laboratories'
                });
            } catch {
                // Non-blocking
            }
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            laboratory: toCamelCase(data)
        });
    } catch (err: any) {
        console.error('Error in POST /api/laboratories:', err);
        return NextResponse.json({ error: err.message || 'Error al crear laboratorio' }, { status: 500 });
    }
}

// PATCH /api/laboratories - Actualizar laboratorio
export async function PATCH(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        const body = await request.json();
        const targetId = id || body.id;

        if (!targetId) {
            return NextResponse.json({ error: 'Laboratory ID is required' }, { status: 400 });
        }

        const updateData: Record<string, any> = {};

        if (body.name !== undefined) updateData.name = body.name.trim();
        if (body.legalName !== undefined) updateData.legal_name = body.legalName;
        if (body.rif !== undefined) updateData.rif = body.rif;
        if (body.licenseNumber !== undefined) updateData.license_number = body.licenseNumber;
        if (body.regentName !== undefined) updateData.regent_name = body.regentName;
        if (body.regentLicense !== undefined) updateData.regent_license = body.regentLicense;
        if (body.contactName !== undefined) updateData.contact_name = body.contactName;
        if (body.contactRole !== undefined) updateData.contact_role = body.contactRole;
        if (body.phone !== undefined) updateData.phone = body.phone?.trim() || null;
        if (body.whatsapp !== undefined) updateData.whatsapp = body.whatsapp?.trim() || null;
        if (body.website !== undefined) updateData.website = body.website?.trim() || null;
        if (body.description !== undefined) updateData.description = body.description;
        if (body.address !== undefined) updateData.address = body.address;
        if (body.city !== undefined) updateData.city = body.city;
        if (body.state !== undefined) updateData.state = body.state;
        if (body.sector !== undefined) updateData.sector = body.sector;
        if (body.country !== undefined) updateData.country = normalizeCountryCode(body.country);
        if (body.status !== undefined) updateData.status = body.status;
        if (body.verificationStatus !== undefined) updateData.verification_status = body.verificationStatus;
        if (body.subscriptionStatus !== undefined) updateData.subscription_status = body.subscriptionStatus;
        if (body.plan !== undefined) updateData.plan = body.plan;
        if (body.billingCycle !== undefined) updateData.billing_cycle = body.billingCycle;
        if (body.billingMonths !== undefined) updateData.billing_months = Number(body.billingMonths);
        if (body.subscriptionFee !== undefined) updateData.subscription_fee = Number(body.subscriptionFee);
        if (body.discountPercentage !== undefined) updateData.discount_percentage = Number(body.discountPercentage);
        if (body.freeMonths !== undefined) updateData.free_months = Number(body.freeMonths);
        if (body.acceptedInsurances !== undefined || body.accepted_insurances !== undefined) {
            updateData.accepted_insurances = body.acceptedInsurances ?? body.accepted_insurances;
        }
        if (body.paymentSettings !== undefined || body.payment_settings !== undefined) {
            updateData.payment_settings = body.paymentSettings ?? body.payment_settings;
        }
        if (body.coupons !== undefined) updateData.coupons = body.coupons;
        if (body.logoUrl !== undefined) updateData.logo_url = body.logoUrl;
        if (body.bannerImage !== undefined) updateData.banner_image = body.bannerImage;
        if (body.lat !== undefined) updateData.lat = body.lat;
        if (body.lng !== undefined) updateData.lng = body.lng;

        if (body.adminEmail !== undefined) {
            updateData.admin_email = body.adminEmail.toLowerCase().trim();
            updateData.email = body.adminEmail.toLowerCase().trim();
        }

        if (body.password && body.password.trim()) {
            updateData.password = await bcrypt.hash(body.password.trim(), 10);
        }

        const { data, error } = await supabaseAdmin
            .from('laboratories')
            .update(updateData)
            .eq('id', targetId)
            .select()
            .single();

        if (error) {
            console.error('Error updating laboratory:', error);
            throw error;
        }

        return NextResponse.json({
            success: true,
            laboratory: toCamelCase(data)
        });
    } catch (err: any) {
        console.error('Error in PATCH /api/laboratories:', err);
        return NextResponse.json({ error: err.message || 'Error al actualizar laboratorio' }, { status: 500 });
    }
}

// DELETE /api/laboratories - Eliminar laboratorio
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Laboratory ID is required' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('laboratories')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting laboratory:', error);
            throw error;
        }

        return NextResponse.json({ success: true, message: 'Laboratorio eliminado correctamente' });
    } catch (err: any) {
        console.error('Error in DELETE /api/laboratories:', err);
        return NextResponse.json({ error: err.message || 'Error al eliminar laboratorio' }, { status: 500 });
    }
}

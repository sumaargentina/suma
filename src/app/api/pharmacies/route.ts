import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeCountryCode, isSameCountry } from '@/lib/geo-data';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET /api/pharmacies - Lista todas las farmacias (opcionalmente filtradas por país)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const countryFilter = searchParams.get('country');

        const { data, error } = await supabaseAdmin
            .from('pharmacies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pharmacies:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Convertir snake_case a camelCase y normalizar código de país
        let formatted = (data || []).map((item) => {
            const camel: any = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                camel[camelKey] = item[key];
            }
            camel.country = normalizeCountryCode(camel.country || 'VE');
            return camel;
        });

        if (countryFilter && countryFilter !== 'ALL' && countryFilter !== 'all') {
            formatted = formatted.filter(p => isSameCountry(p.country, countryFilter));
        }

        return NextResponse.json(formatted);
    } catch (err: any) {
        console.error('Error in GET /api/pharmacies:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/pharmacies - Registra una nueva farmacia (por Admin o Solicitud de Afiliación desde el Portal)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            name,
            email,
            password,
            phone,
            whatsapp,
            licenseNumber: rawLic,
            license_number,
            rif,
            legalName,
            legal_name,
            regentName,
            regent_name,
            regentLicense,
            regent_license,
            contactName,
            contact_name,
            contactRole,
            contact_role,
            requestedPlan,
            requested_plan,
            address,
            city,
            state,
            sector,
            postalCode,
            country,
            isChain,
            chainName,
            branchName,
            is24Hours,
            deliveryAvailable,
            openingHours,
            status,
            isPublicApplication,
            discountPercentage,
            freeMonths,
            agreementNotes
        } = body;

        const licenseNumber = rawLic || license_number || rif;
        const effectivePassword = password && password.trim()
            ? password.trim()
            : Math.random().toString(36).slice(-8) + 'Suma1!';

        if (!name || !email || !licenseNumber || !address || !city) {
            return NextResponse.json({ 
                error: 'Nombre comercial, correo electrónico, RIF/Permiso Sanitario, dirección y ciudad son obligatorios' 
            }, { status: 400 });
        }

        const lowerEmail = email.toLowerCase().trim();

        // Verificar si el correo ya existe en cualquier tabla de usuarios
        const collections = ['doctors', 'sellers', 'patients', 'clinics', 'secretaries', 'pharmacies', 'laboratories'];
        for (const col of collections) {
            const emailCol = (col === 'clinics' || col === 'laboratories') ? 'admin_email' : 'email';
            const { data: existing } = await supabaseAdmin
                .from(col)
                .select('id')
                .eq(emailCol, lowerEmail)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ error: `El correo "${lowerEmail}" ya está registrado en el sistema.` }, { status: 409 });
            }
        }

        const now = new Date().toISOString();
        const hashedPassword = await bcrypt.hash(effectivePassword, 10);
        const isPendingRequest = Boolean(isPublicApplication) || status === 'pending';

        const parsedFreeMonths = Number(freeMonths || 0);
        const parsedDiscount = Math.min(100, Math.max(0, Number(discountPercentage || 0)));
        const effectiveFee = Math.round(200 * (1 - parsedDiscount / 100) * 100) / 100;

        let freeTrialEndsAt: string | null = null;
        if (parsedFreeMonths > 0) {
            const d = new Date();
            d.setMonth(d.getMonth() + parsedFreeMonths);
            freeTrialEndsAt = d.toISOString();
        }

        const insertData: any = {
            name: name.trim(),
            email: lowerEmail,
            password: hashedPassword,
            phone: phone ? phone.trim() : null,
            whatsapp: whatsapp ? whatsapp.trim() : (phone ? phone.trim() : null),
            license_number: licenseNumber.trim(),
            rif: (rif || licenseNumber).trim(),
            legal_name: (legalName || legal_name || name).trim(),
            regent_name: (regentName || regent_name || '').trim() || null,
            regent_license: (regentLicense || regent_license || '').trim() || null,
            contact_name: (contactName || contact_name || '').trim() || null,
            contact_role: (contactRole || contact_role || '').trim() || null,
            requested_plan: requestedPlan || requested_plan || 'free',
            address: address.trim(),
            city: city.trim(),
            state: state ? state.trim() : 'Monagas',
            postal_code: postalCode || '6201',
            country: normalizeCountryCode(country || 'VE'),
            is_chain: Boolean(isChain),
            chain_name: isChain && chainName ? chainName.trim() : null,
            branch_name: isChain && branchName ? branchName.trim() : null,
            is_24_hours: Boolean(is24Hours),
            delivery_available: Boolean(deliveryAvailable),
            opening_hours: openingHours || null,
            status: isPendingRequest ? 'pending' : (status || 'active'),
            verified: !isPendingRequest,
            logo_url: body.logoUrl || body.logo_url || null,
            banner_url: body.bannerUrl || body.banner_url || body.bannerImage || null,
            discount_percentage: parsedDiscount,
            free_months: parsedFreeMonths,
            free_trial_ends_at: freeTrialEndsAt,
            agreement_notes: agreementNotes ? agreementNotes.trim() : null,
            sponsorship_plan_fee: effectiveFee,
            sponsorship_plan_status: parsedFreeMonths > 0 ? 'active' : (body.sponsorshipPlanStatus || 'inactive'),
            sponsorship_next_payment_date: freeTrialEndsAt || null,
            total_prescriptions_filled: 0,
            created_at: now,
            updated_at: now,
            verified_at: isPendingRequest ? null : now
        };

        const { data, error } = await supabaseAdmin
            .from('pharmacies')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('Error insertando farmacia:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Si es una solicitud pública, crear notificación para el Super Admin
        if (isPendingRequest) {
            try {
                await supabaseAdmin.from('admin_notifications').insert({
                    type: 'new_doctor',
                    title: 'Nueva Solicitud de Farmacia',
                    message: `La farmacia "${name.trim()}" (${city.trim()}) ha enviado una solicitud oficial de afiliación (${(requestedPlan || 'free') === 'b2b' ? 'Interesada en Plan B2B $200/mes' : 'Plan Gratuito'}).`,
                    read: false,
                    created_at: now,
                    link: '/admin/dashboard?view=pharmacies'
                });
            } catch {
                // Non-blocking notification
            }
        }

        const camelResult: any = {};
        for (const key in data) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            camelResult[camelKey] = data[key];
        }

        return NextResponse.json({
            success: true,
            id: data.id,
            pharmacy: camelResult,
            message: isPendingRequest
                ? 'Solicitud de afiliación enviada exitosamente. El administrador de SUMA verificará los datos oficiales de la empresa.'
                : 'Farmacia registrada exitosamente'
        }, { status: 201 });

    } catch (err: any) {
        console.error('Error in POST /api/pharmacies:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT /api/pharmacies - Actualiza una farmacia existente (Datos Oficiales, Aprobación y Convenios B2B)
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...updateFields } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID de farmacia requerido' }, { status: 400 });
        }

        const snakeData: any = {
            updated_at: new Date().toISOString()
        };

        if (updateFields.name !== undefined) snakeData.name = updateFields.name;
        if (updateFields.email !== undefined) snakeData.email = updateFields.email.toLowerCase().trim();
        if (updateFields.password !== undefined && updateFields.password.trim()) {
            snakeData.password = await bcrypt.hash(updateFields.password.trim(), 10);
        }
        if (updateFields.phone !== undefined) snakeData.phone = updateFields.phone;
        if (updateFields.licenseNumber !== undefined) snakeData.license_number = updateFields.licenseNumber;
        if (updateFields.rif !== undefined) snakeData.rif = updateFields.rif;
        if (updateFields.legalName !== undefined) snakeData.legal_name = updateFields.legalName;
        if (updateFields.legal_name !== undefined) snakeData.legal_name = updateFields.legal_name;
        if (updateFields.regentName !== undefined) snakeData.regent_name = updateFields.regentName;
        if (updateFields.regent_name !== undefined) snakeData.regent_name = updateFields.regent_name;
        if (updateFields.regentLicense !== undefined) snakeData.regent_license = updateFields.regentLicense;
        if (updateFields.regent_license !== undefined) snakeData.regent_license = updateFields.regent_license;
        if (updateFields.contactName !== undefined) snakeData.contact_name = updateFields.contactName;
        if (updateFields.contact_name !== undefined) snakeData.contact_name = updateFields.contact_name;
        if (updateFields.contactRole !== undefined) snakeData.contact_role = updateFields.contactRole;
        if (updateFields.contact_role !== undefined) snakeData.contact_role = updateFields.contact_role;
        if (updateFields.requestedPlan !== undefined) snakeData.requested_plan = updateFields.requestedPlan;
        if (updateFields.address !== undefined) snakeData.address = updateFields.address;
        if (updateFields.city !== undefined) snakeData.city = updateFields.city;
        if (updateFields.state !== undefined) snakeData.state = updateFields.state;
        if (updateFields.country !== undefined) snakeData.country = normalizeCountryCode(updateFields.country);
        if (updateFields.isChain !== undefined) snakeData.is_chain = Boolean(updateFields.isChain);
        if (updateFields.chainName !== undefined) snakeData.chain_name = updateFields.chainName;
        if (updateFields.branchName !== undefined) snakeData.branch_name = updateFields.branchName;
        if (updateFields.status !== undefined) {
            snakeData.status = updateFields.status;
            if (updateFields.status === 'active') {
                snakeData.verified = true;
                snakeData.verified_at = new Date().toISOString();
            }
        }
        if (updateFields.verified !== undefined) snakeData.verified = Boolean(updateFields.verified);
        if (updateFields.latitude !== undefined) snakeData.latitude = updateFields.latitude;
        if (updateFields.longitude !== undefined) snakeData.longitude = updateFields.longitude;
        if (updateFields.is24Hours !== undefined) snakeData.is_24_hours = Boolean(updateFields.is24Hours);
        if (updateFields.openingHours !== undefined) snakeData.opening_hours = updateFields.openingHours;
        if (updateFields.postalCode !== undefined) snakeData.postal_code = updateFields.postalCode;
        if (updateFields.logoUrl !== undefined) snakeData.logo_url = updateFields.logoUrl;
        if (updateFields.logo_url !== undefined) snakeData.logo_url = updateFields.logo_url;
        if (updateFields.bannerUrl !== undefined) snakeData.banner_url = updateFields.bannerUrl;
        if (updateFields.banner_url !== undefined) snakeData.banner_url = updateFields.banner_url;
        if (updateFields.bannerImage !== undefined) snakeData.banner_url = updateFields.bannerImage;
        if (updateFields.whatsapp !== undefined) snakeData.whatsapp = updateFields.whatsapp;
        if (updateFields.promotionalTagline !== undefined) snakeData.promotional_tagline = updateFields.promotionalTagline;
        if (updateFields.promotional_tagline !== undefined) snakeData.promotional_tagline = updateFields.promotional_tagline;
        if (updateFields.deliveryAvailable !== undefined) snakeData.delivery_available = Boolean(updateFields.deliveryAvailable);
        if (updateFields.delivery_available !== undefined) snakeData.delivery_available = Boolean(updateFields.delivery_available);

        // Convenios B2B ($200/mes a BCV con Descuento % y Meses Gratis)
        if (updateFields.discountPercentage !== undefined || updateFields.discount_percentage !== undefined) {
            const rawDiscount = updateFields.discountPercentage ?? updateFields.discount_percentage ?? 0;
            const parsedDiscount = Math.min(100, Math.max(0, Number(rawDiscount)));
            snakeData.discount_percentage = parsedDiscount;
            snakeData.sponsorship_plan_fee = Math.round(200 * (1 - parsedDiscount / 100) * 100) / 100;
        }
        if (updateFields.freeMonths !== undefined || updateFields.free_months !== undefined) {
            const parsedFreeMonths = Math.max(0, Number(updateFields.freeMonths ?? updateFields.free_months ?? 0));
            snakeData.free_months = parsedFreeMonths;
            if (parsedFreeMonths > 0) {
                const endsAt = new Date();
                endsAt.setMonth(endsAt.getMonth() + parsedFreeMonths);
                snakeData.free_trial_ends_at = endsAt.toISOString();
                snakeData.sponsorship_plan_status = 'active';
                snakeData.sponsorship_next_payment_date = endsAt.toISOString();
            } else if (updateFields.freeTrialEndsAt === null) {
                snakeData.free_trial_ends_at = null;
            }
        }
        if (updateFields.freeTrialEndsAt !== undefined) snakeData.free_trial_ends_at = updateFields.freeTrialEndsAt;
        if (updateFields.agreementNotes !== undefined) snakeData.agreement_notes = updateFields.agreementNotes;
        if (updateFields.agreement_notes !== undefined) snakeData.agreement_notes = updateFields.agreement_notes;

        if (updateFields.sponsorshipPlanStatus !== undefined) snakeData.sponsorship_plan_status = updateFields.sponsorshipPlanStatus;
        if (updateFields.sponsorship_plan_status !== undefined) snakeData.sponsorship_plan_status = updateFields.sponsorship_plan_status;
        if (updateFields.sponsorshipPlanFee !== undefined) snakeData.sponsorship_plan_fee = updateFields.sponsorshipPlanFee;
        if (updateFields.sponsorshipNextPaymentDate !== undefined) snakeData.sponsorship_next_payment_date = updateFields.sponsorshipNextPaymentDate;

        const { data, error } = await supabaseAdmin
            .from('pharmacies')
            .update(snakeData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error actualizando farmacia:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const camelResult: any = {};
        for (const key in data) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            camelResult[camelKey] = data[key];
        }

        return NextResponse.json({
            success: true,
            pharmacy: camelResult,
            message: 'Farmacia actualizada exitosamente'
        });

    } catch (err: any) {
        console.error('Error in PUT /api/pharmacies:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export const PATCH = PUT;

// DELETE /api/pharmacies - Elimina una farmacia
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de farmacia requerido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('pharmacies')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error eliminando farmacia:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Farmacia eliminada exitosamente' });
    } catch (err: any) {
        console.error('Error in DELETE /api/pharmacies:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeCountryCode, isSameCountry } from '@/lib/geo-data';
import bcrypt from 'bcryptjs';
import { sendRoleWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Calcula la tarifa base mensual según el nivel de plan corporativo
function resolvePlanBaseFeeUsd(planTier?: string | null): { fee: number; maxBranches: number } {
    switch (planTier) {
        case 'corporate_5':
            return { fee: 450, maxBranches: 5 };
        case 'corporate_15':
            return { fee: 900, maxBranches: 15 };
        case 'corporate_unlimited':
            return { fee: 1600, maxBranches: 50 };
        case 'inherited_from_hq':
            return { fee: 0, maxBranches: 1 };
        case 'independent':
        default:
            return { fee: 200, maxBranches: 1 };
    }
}

// GET /api/pharmacies - Lista todas las farmacias (con jerarquía Casa Matriz <-> Sucursales y herencia de planes)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const countryFilter = searchParams.get('country');
        const parentIdFilter = searchParams.get('parentId');

        const { data, error } = await supabaseAdmin
            .from('pharmacies')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching pharmacies:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rawRows = data || [];
        const byId = new Map<string, any>();
        for (const r of rawRows) {
            byId.set(r.id, r);
        }

        // Contar sucursales por cada Casa Matriz
        const branchesByHq = new Map<string, any[]>();
        for (const r of rawRows) {
            if (r.parent_pharmacy_id) {
                const list = branchesByHq.get(r.parent_pharmacy_id) || [];
                list.push(r);
                branchesByHq.set(r.parent_pharmacy_id, list);
            }
        }

        // Convertir snake_case a camelCase, normalizar país y heredar estado de plan desde Casa Matriz
        let formatted = rawRows.map((item) => {
            const camel: any = {};
            for (const key in item) {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                camel[camelKey] = item[key];
            }
            camel.country = normalizeCountryCode(camel.country || 'VE');

            const parentRow = item.parent_pharmacy_id ? byId.get(item.parent_pharmacy_id) : null;
            if (parentRow) {
                camel.parentHeadquartersName = parentRow.chain_name || parentRow.name;
                camel.parentHeadquartersStatus = parentRow.status;
                camel.chainName = camel.chainName || parentRow.chain_name || parentRow.name;
                camel.logoUrl = camel.logoUrl || parentRow.logo_url || null;
                camel.bannerUrl = camel.bannerUrl || parentRow.banner_url || null;

                // Si la Casa Matriz cubre el plan de sus sucursales y la sucursal está aprobada por la Matriz
                const hqCovers = parentRow.covers_branches_plan !== false;
                const branchApproved = (item.branch_approval_status || 'approved') === 'approved';
                if (hqCovers && branchApproved && parentRow.sponsorship_plan_status === 'active') {
                    camel.sponsorshipPlanStatus = 'active';
                    camel.sponsorship_plan_status = 'active';
                    camel.planCoveredByHq = true;
                }
            }

            if (item.is_headquarters) {
                const myBranches = branchesByHq.get(item.id) || [];
                camel.branchesCount = myBranches.length;
                camel.approvedBranchesCount = myBranches.filter(
                    b => (b.branch_approval_status || 'approved') === 'approved'
                ).length;
                camel.pendingBranchesCount = myBranches.filter(
                    b => b.branch_approval_status === 'pending_hq'
                ).length;
            }

            return camel;
        });

        if (parentIdFilter) {
            formatted = formatted.filter(p => p.parentPharmacyId === parentIdFilter || p.id === parentIdFilter);
        }

        if (countryFilter && countryFilter !== 'ALL' && countryFilter !== 'all') {
            formatted = formatted.filter(p => isSameCountry(p.country, countryFilter));
        }

        return NextResponse.json(formatted);
    } catch (err: any) {
        console.error('Error in GET /api/pharmacies:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/pharmacies - Registra una nueva farmacia (Independiente, Casa Matriz o Sucursal Vinculada)
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
            isHeadquarters: rawIsHq,
            parentPharmacyId: rawParentId,
            franchiseCodeInput,
            createdByHeadquartersId,
            planTier: rawPlanTier,
            coversBranchesPlan: rawCoversBranches,
            is24Hours,
            deliveryAvailable,
            openingHours,
            status,
            isPublicApplication,
            discountPercentage,
            freeMonths,
            agreementNotes
        } = body;

        const licenseNumber = rawLic || license_number || rif || `RIF-${Date.now().toString().slice(-6)}`;
        const effectivePassword = password && password.trim()
            ? password.trim()
            : Math.random().toString(36).slice(-8) + 'Suma1!';

        if (!name || !email || !city) {
            return NextResponse.json({ 
                error: 'Nombre comercial, correo electrónico y ciudad son obligatorios' 
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
                .limit(1)
                .maybeSingle();

            if (existing) {
                return NextResponse.json({ error: `El correo "${lowerEmail}" ya está registrado en el sistema. Cada sucursal debe tener su propio correo de acceso.` }, { status: 409 });
            }
        }

        // Resolver Jerarquía: ¿Independiente, Casa Matriz o Sucursal Hija?
        let isHeadquarters = Boolean(rawIsHq);
        let parentPharmacyRow: any = null;
        let branchApprovalStatus: 'approved' | 'pending_hq' = 'approved';

        // Caso A: La propia Casa Matriz está creando una sucursal desde su panel
        if (createdByHeadquartersId) {
            const { data: hqRow } = await supabaseAdmin
                .from('pharmacies')
                .select('*')
                .eq('id', createdByHeadquartersId)
                .maybeSingle();

            if (!hqRow) {
                return NextResponse.json({ error: 'No se encontró la Casa Matriz indicada.' }, { status: 404 });
            }
            parentPharmacyRow = hqRow;
            isHeadquarters = false;
            branchApprovalStatus = 'approved';
        }
        // Caso B: Registro externo indicando que es sucursal de una cadena existente
        else if (Boolean(isChain) && !isHeadquarters) {
            const cleanCode = (franchiseCodeInput || '').trim().toUpperCase();
            if (cleanCode) {
                const { data: hqByCode } = await supabaseAdmin
                    .from('pharmacies')
                    .select('*')
                    .ilike('franchise_code', cleanCode)
                    .maybeSingle();

                if (!hqByCode) {
                    return NextResponse.json(
                        { error: `El Código Corporativo de Franquicia "${cleanCode}" no es válido. Solicítalo a la Administración Principal (Casa Matriz) de tu farmacia.` },
                        { status: 400 }
                    );
                }
                parentPharmacyRow = hqByCode;
                branchApprovalStatus = 'approved';
            } else if (rawParentId) {
                const { data: hqById } = await supabaseAdmin
                    .from('pharmacies')
                    .select('*')
                    .eq('id', rawParentId)
                    .maybeSingle();
                parentPharmacyRow = hqById || null;
                // Sin código corporativo queda pendiente de que la Casa Matriz confirme que es una sucursal real
                branchApprovalStatus = 'pending_hq';
            } else if (chainName && chainName.trim()) {
                // Buscar si ya existe una Casa Matriz con ese nombre de cadena
                const { data: existingHq } = await supabaseAdmin
                    .from('pharmacies')
                    .select('*')
                    .ilike('chain_name', chainName.trim())
                    .eq('is_headquarters', true)
                    .maybeSingle();

                if (existingHq) {
                    parentPharmacyRow = existingHq;
                    branchApprovalStatus = 'pending_hq';
                } else {
                    // Si aún no existe Casa Matriz de esa cadena, esta primera sede se registra como la Casa Matriz Principal
                    isHeadquarters = true;
                    branchApprovalStatus = 'approved';
                }
            }
        }

        const now = new Date().toISOString();
        const hashedPassword = await bcrypt.hash(effectivePassword, 10);
        const isPendingRequest =
            (!createdByHeadquartersId && (Boolean(isPublicApplication) || status === 'pending')) ||
            branchApprovalStatus === 'pending_hq';

        const effectiveChainName = parentPharmacyRow
            ? (parentPharmacyRow.chain_name || parentPharmacyRow.name)
            : (Boolean(isChain) || isHeadquarters) && chainName
              ? chainName.trim()
              : null;

        let effectivePlanTier = rawPlanTier || (isHeadquarters ? 'corporate_5' : 'independent');
        if (parentPharmacyRow) {
            effectivePlanTier = parentPharmacyRow.covers_branches_plan !== false ? 'inherited_from_hq' : 'independent';
        }

        const { fee: baseTierFee, maxBranches: defaultMaxBranches } = resolvePlanBaseFeeUsd(effectivePlanTier);
        const parsedFreeMonths = Number(freeMonths || 0);
        const parsedDiscount = Math.min(100, Math.max(0, Number(discountPercentage || 0)));
        const effectiveFee = Math.round(baseTierFee * (1 - parsedDiscount / 100) * 100) / 100;

        let freeTrialEndsAt: string | null = null;
        if (parsedFreeMonths > 0) {
            const d = new Date();
            d.setMonth(d.getMonth() + parsedFreeMonths);
            freeTrialEndsAt = d.toISOString();
        }

        // Generar código único de franquicia si es Casa Matriz
        const generatedFranchiseCode = isHeadquarters
            ? (body.franchiseCode ||
                `SUMA-HQ-${(effectiveChainName || name)
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .toUpperCase()
                    .slice(0, 6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`)
            : null;

        const inheritedActivePlan =
            parentPharmacyRow &&
            parentPharmacyRow.covers_branches_plan !== false &&
            branchApprovalStatus === 'approved' &&
            parentPharmacyRow.sponsorship_plan_status === 'active';

        const insertData: any = {
            name: name.trim(),
            email: lowerEmail,
            password: hashedPassword,
            phone: phone ? phone.trim() : null,
            whatsapp: whatsapp ? whatsapp.trim() : (phone ? phone.trim() : null),
            license_number: licenseNumber.trim(),
            rif: (rif || parentPharmacyRow?.rif || licenseNumber).trim(),
            legal_name: (legalName || legal_name || parentPharmacyRow?.legal_name || name).trim(),
            regent_name: (regentName || regent_name || '').trim() || null,
            regent_license: (regentLicense || regent_license || '').trim() || null,
            contact_name: (contactName || contact_name || '').trim() || null,
            contact_role: (contactRole || contact_role || '').trim() || null,
            requested_plan: requestedPlan || requested_plan || (inheritedActivePlan ? 'b2b' : 'free'),
            address: (address || city || '').trim(),
            city: city.trim(),
            state: state ? state.trim() : 'Monagas',
            postal_code: postalCode || '6201',
            country: normalizeCountryCode(country || parentPharmacyRow?.country || 'VE'),
            is_chain: Boolean(isChain) || isHeadquarters || Boolean(parentPharmacyRow),
            chain_name: effectiveChainName,
            branch_name: branchName ? branchName.trim() : (isHeadquarters ? 'Sede Principal (Casa Matriz)' : null),
            is_headquarters: isHeadquarters,
            parent_pharmacy_id: parentPharmacyRow ? parentPharmacyRow.id : null,
            franchise_code: generatedFranchiseCode,
            branch_approval_status: branchApprovalStatus,
            plan_tier: effectivePlanTier,
            max_branches_included: isHeadquarters ? (Number(body.maxBranchesIncluded) || defaultMaxBranches) : 1,
            covers_branches_plan: isHeadquarters ? (rawCoversBranches !== undefined ? Boolean(rawCoversBranches) : true) : false,
            is_24_hours: Boolean(is24Hours),
            delivery_available: Boolean(deliveryAvailable),
            opening_hours: openingHours || null,
            status: createdByHeadquartersId ? 'active' : (isPendingRequest ? 'pending' : (status || 'active')),
            verified: createdByHeadquartersId ? true : !isPendingRequest,
            logo_url: body.logoUrl || body.logo_url || parentPharmacyRow?.logo_url || null,
            banner_url: body.bannerUrl || body.banner_url || body.bannerImage || parentPharmacyRow?.banner_url || null,
            discount_percentage: parsedDiscount,
            free_months: parsedFreeMonths,
            free_trial_ends_at: freeTrialEndsAt,
            agreement_notes: agreementNotes ? agreementNotes.trim() : null,
            sponsorship_plan_fee: effectiveFee,
            sponsorship_plan_status: inheritedActivePlan
                ? 'active'
                : parsedFreeMonths > 0
                  ? 'active'
                  : (body.sponsorshipPlanStatus || 'inactive'),
            sponsorship_next_payment_date: freeTrialEndsAt || parentPharmacyRow?.sponsorship_next_payment_date || null,
            total_prescriptions_filled: 0,
            created_at: now,
            updated_at: now,
            verified_at: (createdByHeadquartersId || !isPendingRequest) ? now : null
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

        // Enviar correo de bienvenida a la farmacia (no bloqueante)
        sendRoleWelcomeEmail({
            email: lowerEmail,
            name: name.trim(),
            role: 'pharmacy',
            extraData: (!password || !password.trim()) ? { tempPassword: effectivePassword } : {},
        }).catch((err) => console.error('Error enviando correo de bienvenida a farmacia:', err));

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
        if (updateFields.isHeadquarters !== undefined) snakeData.is_headquarters = Boolean(updateFields.isHeadquarters);
        if (updateFields.is_headquarters !== undefined) snakeData.is_headquarters = Boolean(updateFields.is_headquarters);
        if (updateFields.parentPharmacyId !== undefined) snakeData.parent_pharmacy_id = updateFields.parentPharmacyId;
        if (updateFields.parent_pharmacy_id !== undefined) snakeData.parent_pharmacy_id = updateFields.parent_pharmacy_id;
        if (updateFields.franchiseCode !== undefined) snakeData.franchise_code = updateFields.franchiseCode;
        if (updateFields.franchise_code !== undefined) snakeData.franchise_code = updateFields.franchise_code;
        if (updateFields.branchApprovalStatus !== undefined) {
            snakeData.branch_approval_status = updateFields.branchApprovalStatus;
            if (updateFields.branchApprovalStatus === 'approved') {
                snakeData.status = 'active';
                snakeData.verified = true;
                snakeData.verified_at = new Date().toISOString();
            }
        }
        if (updateFields.branch_approval_status !== undefined) {
            snakeData.branch_approval_status = updateFields.branch_approval_status;
        }
        if (updateFields.planTier !== undefined || updateFields.plan_tier !== undefined) {
            const tier = updateFields.planTier ?? updateFields.plan_tier;
            snakeData.plan_tier = tier;
            const { fee: tierBaseFee, maxBranches: tierMax } = resolvePlanBaseFeeUsd(tier);
            if (updateFields.maxBranchesIncluded === undefined && updateFields.max_branches_included === undefined) {
                snakeData.max_branches_included = tierMax;
            }
            const discountVal = Number(updateFields.discountPercentage ?? updateFields.discount_percentage ?? 0);
            snakeData.sponsorship_plan_fee = Math.round(tierBaseFee * (1 - Math.min(100, Math.max(0, discountVal)) / 100) * 100) / 100;
        }
        if (updateFields.maxBranchesIncluded !== undefined) snakeData.max_branches_included = Number(updateFields.maxBranchesIncluded);
        if (updateFields.max_branches_included !== undefined) snakeData.max_branches_included = Number(updateFields.max_branches_included);
        if (updateFields.coversBranchesPlan !== undefined) snakeData.covers_branches_plan = Boolean(updateFields.coversBranchesPlan);
        if (updateFields.covers_branches_plan !== undefined) snakeData.covers_branches_plan = Boolean(updateFields.covers_branches_plan);
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

        // Convenios B2B (con Descuento % y Meses Gratis según el Plan Corporativo o Independiente)
        if (updateFields.discountPercentage !== undefined || updateFields.discount_percentage !== undefined) {
            const rawDiscount = updateFields.discountPercentage ?? updateFields.discount_percentage ?? 0;
            const parsedDiscount = Math.min(100, Math.max(0, Number(rawDiscount)));
            snakeData.discount_percentage = parsedDiscount;
            const { data: currentPh } = await supabaseAdmin.from('pharmacies').select('plan_tier').eq('id', id).maybeSingle();
            const tier = snakeData.plan_tier || currentPh?.plan_tier || 'independent';
            const { fee: baseFee } = resolvePlanBaseFeeUsd(tier);
            snakeData.sponsorship_plan_fee = Math.round(baseFee * (1 - parsedDiscount / 100) * 100) / 100;
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

        // Si esta farmacia es Casa Matriz y cubre el plan de sus sucursales, propagar el estado del plan a sus sucursales aprobadas
        if (data?.is_headquarters) {
            const covers = data.covers_branches_plan !== false;
            await supabaseAdmin
                .from('pharmacies')
                .update({
                    sponsorship_plan_status: covers ? (data.sponsorship_plan_status || 'inactive') : 'inactive',
                    plan_tier: covers ? 'inherited_from_hq' : 'independent',
                    updated_at: new Date().toISOString()
                })
                .eq('parent_pharmacy_id', data.id)
                .eq('branch_approval_status', 'approved');
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

// DELETE /api/pharmacies - Elimina una farmacia y limpia sus referencias
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de farmacia requerido' }, { status: 400 });
        }

        // Limpiar referencias en cascada antes de eliminar la farmacia
        await Promise.allSettled([
            supabaseAdmin
                .from('medical_records')
                .update({ dispensed_by_pharmacy_id: null, dispensed_by_pharmacy_name: null })
                .eq('dispensed_by_pharmacy_id', id),
            supabaseAdmin
                .from('prescription_dispensation_history')
                .delete()
                .eq('pharmacy_id', id),
            supabaseAdmin
                .from('pharmacy_recipe_orders')
                .delete()
                .eq('pharmacy_id', id),
            supabaseAdmin
                .from('doctor_pharmacy_sponsorships')
                .delete()
                .eq('pharmacy_id', id),
            supabaseAdmin
                .from('pharmacy_products')
                .delete()
                .eq('pharmacy_id', id),
            supabaseAdmin
                .from('pharmacy_subscription_payments')
                .delete()
                .eq('pharmacy_id', id),
        ]);

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

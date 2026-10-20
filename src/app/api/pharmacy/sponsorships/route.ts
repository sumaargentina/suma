import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeCountryCode, isSameCountry } from '@/lib/geo-data';

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

async function enrichSingleSponsorship(row: any) {
    if (!row) return null;
    const camel = toCamel(row);
    const [docRes, pharmRes, dispensedCountRes, ordersCountRes] = await Promise.all([
        row.doctor_id
            ? supabaseAdmin
                  .from('doctors')
                  .select('id, name, email, specialty, country, city, state, phone, whatsapp, profile_image, rating, review_count, medical_license, sponsorship_conditions')
                  .eq('id', row.doctor_id)
                  .maybeSingle()
            : Promise.resolve({ data: null }),
        row.pharmacy_id
            ? supabaseAdmin
                  .from('pharmacies')
                  .select('id, name, email, phone, whatsapp, address, country, city, state, is_chain, chain_name, branch_name, is_24_hours, logo_url, banner_url, latitude, longitude, promotional_tagline, delivery_available, sponsorship_plan_status')
                  .eq('id', row.pharmacy_id)
                  .maybeSingle()
            : Promise.resolve({ data: null }),
        row.doctor_id && row.pharmacy_id
            ? supabaseAdmin
                  .from('medical_records')
                  .select('id', { count: 'exact', head: true })
                  .eq('doctor_id', row.doctor_id)
                  .eq('dispensed_by_pharmacy_id', row.pharmacy_id)
            : Promise.resolve({ count: 0 }),
        row.doctor_id && row.pharmacy_id
            ? supabaseAdmin
                  .from('pharmacy_recipe_orders')
                  .select('id', { count: 'exact', head: true })
                  .eq('doctor_id', row.doctor_id)
                  .eq('pharmacy_id', row.pharmacy_id)
            : Promise.resolve({ count: 0 }),
    ]);

    return {
        ...camel,
        dispensedRecipesCount: dispensedCountRes.count || 0,
        ordersCount: Math.max(Number(camel.ordersCount || 0), ordersCountRes.count || 0),
        doctor: docRes.data ? toCamel(docRes.data) : null,
        pharmacy: pharmRes.data ? toCamel(pharmRes.data) : null,
    };
}

// GET /api/pharmacy/sponsorships
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');
        const pharmacyId = searchParams.get('pharmacyId');
        const countryParam = searchParams.get('country');
        const city = searchParams.get('city');
        const mode = searchParams.get('mode'); // 'directory' | 'recipe' | 'admin'

        // Resolver el país activo para aislamiento estricto Multi-País
        let targetCountry = countryParam ? normalizeCountryCode(countryParam) : null;
        if (!targetCountry && doctorId) {
            const { data: dRow } = await supabaseAdmin.from('doctors').select('country').eq('id', doctorId).maybeSingle();
            if (dRow?.country) targetCountry = normalizeCountryCode(dRow.country);
        }
        if (!targetCountry && pharmacyId) {
            const { data: pRow } = await supabaseAdmin.from('pharmacies').select('country').eq('id', pharmacyId).maybeSingle();
            if (pRow?.country) targetCountry = normalizeCountryCode(pRow.country);
        }
        const activeCountry = targetCountry || 'VE';

        // MODO 1: Directorio B2B (Explorar Médicos con patrocinio habilitado y Farmacias activas DEL MISMO PAÍS)
        if (mode === 'directory') {
            let docQuery = supabaseAdmin
                .from('doctors')
                .select('id, name, email, specialty, country, city, state, phone, whatsapp, profile_image, rating, review_count, medical_license, accepts_pharmacy_sponsorships, sponsorship_conditions, status')
                .eq('accepts_pharmacy_sponsorships', true)
                .eq('status', 'active')
                .order('rating', { ascending: false });

            if (city && city !== 'all' && city !== 'Todas') {
                docQuery = docQuery.ilike('city', `%${city}%`);
            }

            let pharmQuery = supabaseAdmin
                .from('pharmacies')
                .select('id, name, email, phone, whatsapp, address, country, city, state, sector, is_chain, chain_name, branch_name, is_24_hours, logo_url, banner_url, latitude, longitude, rating, verified, status, sponsorship_plan_status, promotional_tagline, delivery_available')
                .eq('status', 'active')
                .order('name', { ascending: true });

            if (city && city !== 'all' && city !== 'Todas') {
                pharmQuery = pharmQuery.ilike('city', `%${city}%`);
            }

            const [{ data: doctorsData, error: docErr }, { data: pharmaciesData, error: pharmErr }] = await Promise.all([
                docQuery,
                pharmQuery,
            ]);

            if (docErr) throw docErr;
            if (pharmErr) throw pharmErr;

            // Aislamiento estricto por País: un médico o farmacia de AR solo ve contrapartes de AR; VE solo de VE
            const countryFilteredDoctors = (doctorsData || [])
                .filter(d => isSameCountry(d.country, activeCountry))
                .map(toCamel);
            const countryFilteredPharmacies = (pharmaciesData || [])
                .filter(p => isSameCountry(p.country, activeCountry))
                .map(toCamel);

            return NextResponse.json({
                country: activeCountry,
                doctors: countryFilteredDoctors,
                pharmacies: countryFilteredPharmacies,
            });
        }

        // MODO 2: Consulta para el Récipe Médico del Paciente (Aislado estrictamente por País del Médico/Paciente)
        if (mode === 'recipe') {
            const [activeLinksRes, allPharmaciesRes, allProductsRes] = await Promise.all([
                doctorId
                    ? supabaseAdmin
                          .from('doctor_pharmacy_sponsorships')
                          .select('*')
                          .eq('doctor_id', doctorId)
                          .eq('status', 'active')
                    : Promise.resolve({ data: [] as any[] }),
                supabaseAdmin
                    .from('pharmacies')
                    .select('*')
                    .eq('status', 'active')
                    .order('name', { ascending: true }),
                supabaseAdmin
                    .from('pharmacy_products')
                    .select('*')
                    .order('is_promotion', { ascending: false }),
            ]);

            const activeLinks = activeLinksRes.data || [];
            // Filtrar farmacias estrictamente por el país activo (VE, AR, CO, etc.)
            const allPharmsCamel: any[] = (allPharmaciesRes.data || [])
                .filter(p => isSameCountry(p.country, activeCountry))
                .map(toCamel);
            const allProdsCamel: any[] = (allProductsRes.data || []).map(toCamel);

            // Agrupar productos por farmacia
            const productsByPharmacy = new Map<string, any[]>();
            for (const prod of allProdsCamel) {
                const pid = prod.pharmacyId;
                if (!productsByPharmacy.has(pid)) productsByPharmacy.set(pid, []);
                productsByPharmacy.get(pid)!.push(prod);
            }

            // Incrementar impresiones ROI en segundo plano para las alianzas activas de este médico
            if (activeLinks.length > 0) {
                for (const link of activeLinks) {
                    supabaseAdmin
                        .from('doctor_pharmacy_sponsorships')
                        .update({ impressions_count: (link.impressions_count || 0) + 1 })
                        .eq('id', link.id)
                        .then(() => {});
                }
            }

            const linkByPharmacyId = new Map<string, any>();
            const linkByChainName = new Map<string, any>();

            for (const link of activeLinks) {
                if (link.pharmacy_id) {
                    linkByPharmacyId.set(link.pharmacy_id, link);
                }
                if (link.scope_type === 'national' && link.chain_name) {
                    linkByChainName.set(String(link.chain_name).toLowerCase().trim(), link);
                }
            }

            for (const p of allPharmsCamel) {
                if (linkByPharmacyId.has(p.id) && p.chainName) {
                    const link = linkByPharmacyId.get(p.id);
                    if (link?.scope_type === 'national') {
                        linkByChainName.set(String(p.chainName).toLowerCase().trim(), link);
                    }
                }
            }

            const recommendedPharmacies = allPharmsCamel
                .filter(p => {
                    if (linkByPharmacyId.has(p.id)) return true;
                    const cName = String(p.chainName || '').toLowerCase().trim();
                    if (cName && linkByChainName.has(cName)) return true;
                    return false;
                })
                .map(p => {
                    const cName = String(p.chainName || '').toLowerCase().trim();
                    const link = linkByPharmacyId.get(p.id) || (cName ? linkByChainName.get(cName) : null);
                    return {
                        ...p,
                        isDoctorRecommended: true,
                        sponsorshipId: link?.id || null,
                        sponsorshipScope: link?.scope_type || 'city',
                        hasPatientCoupon: Boolean(link?.has_patient_coupon),
                        couponCode: link?.coupon_code || null,
                        couponDiscountPercent: link?.coupon_discount_percent ? Number(link.coupon_discount_percent) : 0,
                        couponDescription: link?.coupon_description || null,
                        sponsorship: link ? toCamel(link) : null,
                        products: productsByPharmacy.get(p.id) || [],
                    };
                });

            const recommendedIds = new Set(recommendedPharmacies.map(p => p.id));

            const cityPharmacies = allPharmsCamel
                .filter(p => !recommendedIds.has(p.id))
                .filter(p => {
                    if (!city) return true;
                    return String(p.city || '').toLowerCase().includes(city.toLowerCase());
                })
                .map(p => ({
                    ...p,
                    isDoctorRecommended: false,
                    products: productsByPharmacy.get(p.id) || [],
                }));

            return NextResponse.json({
                country: activeCountry,
                recommended: recommendedPharmacies,
                recommendedPharmacies,
                cityPharmacies,
                allPharmacies: allPharmsCamel.map(p => ({
                    ...p,
                    products: productsByPharmacy.get(p.id) || [],
                })),
            });
        }

        // MODO 3: Listar solicitudes, matches y alianzas (con métricas ROI)
        let query = supabaseAdmin
            .from('doctor_pharmacy_sponsorships')
            .select('*')
            .order('updated_at', { ascending: false });

        if (doctorId) {
            query = query.eq('doctor_id', doctorId);
        }
        if (pharmacyId) {
            query = query.eq('pharmacy_id', pharmacyId);
        }

        const { data: sponsorships, error } = await query;
        if (error) throw error;

        const docIds = Array.from(new Set((sponsorships || []).map(s => s.doctor_id).filter(Boolean)));
        const pharmIds = Array.from(new Set((sponsorships || []).map(s => s.pharmacy_id).filter(Boolean)));

        const [docsRes, pharmsRes, dispensedRes, ordersRes] = await Promise.all([
            docIds.length > 0
                ? supabaseAdmin.from('doctors').select('id, name, email, specialty, country, city, state, phone, whatsapp, profile_image, rating, review_count, medical_license, sponsorship_conditions').in('id', docIds)
                : Promise.resolve({ data: [] as any[] }),
            pharmIds.length > 0
                ? supabaseAdmin.from('pharmacies').select('id, name, email, phone, whatsapp, address, country, city, state, is_chain, chain_name, branch_name, is_24_hours, logo_url, banner_url, latitude, longitude, promotional_tagline, delivery_available, sponsorship_plan_status').in('id', pharmIds)
                : Promise.resolve({ data: [] as any[] }),
            pharmIds.length > 0
                ? supabaseAdmin.from('medical_records').select('id, doctor_id, dispensed_by_pharmacy_id').in('dispensed_by_pharmacy_id', pharmIds)
                : Promise.resolve({ data: [] as any[] }),
            pharmIds.length > 0
                ? supabaseAdmin.from('pharmacy_recipe_orders').select('id, doctor_id, pharmacy_id').in('pharmacy_id', pharmIds)
                : Promise.resolve({ data: [] as any[] }),
        ]);

        const docMap = new Map((docsRes.data || []).map(d => [d.id, toCamel(d)]));
        const pharmMap = new Map((pharmsRes.data || []).map(p => [p.id, toCamel(p)]));

        const enriched = (sponsorships || []).map(item => {
            const camel = toCamel(item);
            const dispensedCount = (dispensedRes.data || []).filter(
                r => r.doctor_id === item.doctor_id && r.dispensed_by_pharmacy_id === item.pharmacy_id
            ).length;
            const ordersCountFromTable = (ordersRes.data || []).filter(
                o => o.doctor_id === item.doctor_id && o.pharmacy_id === item.pharmacy_id
            ).length;

            return {
                ...camel,
                dispensedRecipesCount: dispensedCount,
                ordersCount: Math.max(Number(camel.ordersCount || 0), ordersCountFromTable),
                doctor: docMap.get(item.doctor_id) || null,
                pharmacy: pharmMap.get(item.pharmacy_id) || null,
            };
        });

        return NextResponse.json(enriched);
    } catch (err: any) {
        console.error('Error in GET /api/pharmacy/sponsorships:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/pharmacy/sponsorships - Enviar solicitud de Patrocinio / Alianza
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const doctorId = body.doctorId || body.doctor_id;
        const pharmacyId = body.pharmacyId || body.pharmacy_id;
        const initiatedBy = body.initiatedBy || body.initiated_by; // 'doctor' | 'pharmacy'
        const scopeType = body.scopeType || body.scope_type || 'city';
        const targetCity = body.targetCity || body.target_city || null;
        const chainName = body.chainName || body.chain_name || null;
        const initialMessage = body.initialMessage || body.message || '';

        if (!doctorId || !pharmacyId || !initiatedBy) {
            return NextResponse.json({ error: 'doctorId, pharmacyId e initiatedBy son obligatorios' }, { status: 400 });
        }

        // Validación estricta Multi-País: El médico y la farmacia deben pertenecer al mismo país
        const [{ data: docRow }, { data: pharmRow }] = await Promise.all([
            supabaseAdmin.from('doctors').select('id, country').eq('id', doctorId).maybeSingle(),
            supabaseAdmin.from('pharmacies').select('id, country').eq('id', pharmacyId).maybeSingle(),
        ]);

        if (docRow && pharmRow && !isSameCountry(docRow.country, pharmRow.country)) {
            return NextResponse.json(
                { error: `No se pueden crear alianzas entre diferentes países (${normalizeCountryCode(docRow.country)} vs ${normalizeCountryCode(pharmRow.country)}).` },
                { status: 400 }
            );
        }

        const pendingStatusForRecipient = initiatedBy === 'pharmacy' ? 'pending_doctor' : 'pending_pharmacy';

        const { data: existing } = await supabaseAdmin
            .from('doctor_pharmacy_sponsorships')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('pharmacy_id', pharmacyId)
            .maybeSingle();

        const now = new Date().toISOString();

        if (existing) {
            const isPendingOpposite =
                (existing.status === 'pending' || existing.status === 'pending_doctor' || existing.status === 'pending_pharmacy') &&
                existing.initiated_by !== initiatedBy;

            if (isPendingOpposite) {
                const currentMessages = Array.isArray(existing.messages) ? existing.messages : [];
                currentMessages.push({
                    id: `msg-${Date.now()}`,
                    sender: initiatedBy,
                    senderRole: initiatedBy,
                    senderName: body.senderName || (initiatedBy === 'doctor' ? 'Médico' : 'Farmacia'),
                    text: initialMessage || '¡Hola! He aceptado la solicitud. ¡Hicimos Match! Podemos negociar los términos de la recomendación por aquí.',
                    timestamp: now,
                });

                const { data: matched, error: matchErr } = await supabaseAdmin
                    .from('doctor_pharmacy_sponsorships')
                    .update({
                        status: 'matched',
                        messages: currentMessages,
                        updated_at: now,
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (matchErr) throw matchErr;
                const enriched = await enrichSingleSponsorship(matched);
                return NextResponse.json({
                    ...enriched,
                    success: true,
                    matched: true,
                    sponsorship: enriched,
                    message: '¡Match confirmado! Se ha habilitado la ventana de negociación.',
                });
            }

            if (existing.status === 'rejected' || existing.status === 'paused') {
                const { data: reopened, error: reErr } = await supabaseAdmin
                    .from('doctor_pharmacy_sponsorships')
                    .update({
                        status: pendingStatusForRecipient,
                        initiated_by: initiatedBy,
                        scope_type: scopeType,
                        target_city: targetCity,
                        chain_name: chainName,
                        updated_at: now,
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (reErr) throw reErr;
                const enriched = await enrichSingleSponsorship(reopened);
                return NextResponse.json({
                    ...enriched,
                    success: true,
                    sponsorship: enriched,
                });
            }

            const enriched = await enrichSingleSponsorship(existing);
            return NextResponse.json({
                ...enriched,
                success: true,
                alreadyExists: true,
                sponsorship: enriched,
                message: 'Ya existe una solicitud o alianza con este usuario.',
            });
        }

        const initialMessages = initialMessage
            ? [{
                id: `msg-${Date.now()}`,
                sender: initiatedBy,
                senderRole: initiatedBy,
                senderName: body.senderName || (initiatedBy === 'doctor' ? 'Médico' : 'Farmacia'),
                text: initialMessage,
                timestamp: now,
            }]
            : [];

        const { data, error } = await supabaseAdmin
            .from('doctor_pharmacy_sponsorships')
            .insert([{
                doctor_id: doctorId,
                pharmacy_id: pharmacyId,
                initiated_by: initiatedBy,
                status: pendingStatusForRecipient,
                scope_type: scopeType,
                target_city: targetCity,
                chain_name: chainName,
                agreement_type: body.agreementType || null,
                agreement_value: body.agreementValue || null,
                agreement_notes: body.agreementNotes || null,
                has_patient_coupon: Boolean(body.hasPatientCoupon),
                coupon_code: body.couponCode || null,
                coupon_discount_percent: body.couponDiscountPercent ? Number(body.couponDiscountPercent) : 0,
                coupon_description: body.couponDescription || null,
                messages: initialMessages,
                unread_by_doctor: initiatedBy === 'pharmacy' ? 1 : 0,
                unread_by_pharmacy: initiatedBy === 'doctor' ? 1 : 0,
                created_at: now,
                updated_at: now,
            }])
            .select()
            .single();

        if (error) throw error;

        const enriched = await enrichSingleSponsorship(data);
        return NextResponse.json({
            ...enriched,
            success: true,
            sponsorship: enriched,
            message: 'Solicitud enviada exitosamente.',
        });
    } catch (err: any) {
        console.error('Error in POST /api/pharmacy/sponsorships:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/pharmacy/sponsorships - Toggle Doctor Visibility, Aceptar Match, Chat, Cupones, Activar Alianza o Trackear Métrica ROI
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, action } = body;

        // Caso Especial 1: Médico habilita/deshabilita su interruptor de patrocinios B2B
        if (action === 'toggle_doctor_sponsorship') {
            const doctorId = body.doctorId || body.doctor_id;
            if (!doctorId) {
                return NextResponse.json({ error: 'doctorId requerido' }, { status: 400 });
            }
            const { data: docUpdated, error: docUpdErr } = await supabaseAdmin
                .from('doctors')
                .update({
                    accepts_pharmacy_sponsorships: Boolean(body.acceptsPharmacySponsorships),
                    sponsorship_conditions: body.sponsorshipConditions ?? null,
                })
                .eq('id', doctorId)
                .select('id, name, accepts_pharmacy_sponsorships, sponsorship_conditions')
                .single();

            if (docUpdErr) throw docUpdErr;
            return NextResponse.json({
                success: true,
                doctor: toCamel(docUpdated),
            });
        }

        // Caso Especial 2: Registrar métrica ROI (card_click, whatsapp_click, impression)
        if (action === 'track_metric') {
            if (!id) {
                return NextResponse.json({ success: false, message: 'No sponsorship id' });
            }
            const { data: curr } = await supabaseAdmin
                .from('doctor_pharmacy_sponsorships')
                .select('id, impressions_count, card_clicks_count, whatsapp_clicks_count, orders_count')
                .eq('id', id)
                .maybeSingle();

            if (curr) {
                const metric = body.metric;
                const metricUpdates: Record<string, any> = {};
                if (metric === 'impression') metricUpdates.impressions_count = (curr.impressions_count || 0) + 1;
                if (metric === 'card_click') metricUpdates.card_clicks_count = (curr.card_clicks_count || 0) + 1;
                if (metric === 'whatsapp_click') metricUpdates.whatsapp_clicks_count = (curr.whatsapp_clicks_count || 0) + 1;
                if (metric === 'order') metricUpdates.orders_count = (curr.orders_count || 0) + 1;

                if (Object.keys(metricUpdates).length > 0) {
                    const { data: updatedMetric } = await supabaseAdmin
                        .from('doctor_pharmacy_sponsorships')
                        .update(metricUpdates)
                        .eq('id', id)
                        .select('id, impressions_count, card_clicks_count, whatsapp_clicks_count, orders_count')
                        .single();
                    return NextResponse.json({ success: true, ...(updatedMetric ? toCamel(updatedMetric) : {}) });
                }
            }
            return NextResponse.json({ success: true, ...(curr ? toCamel(curr) : {}) });
        }

        if (!id) {
            return NextResponse.json({ error: 'ID de alianza requerido' }, { status: 400 });
        }

        const { data: current, error: fetchErr } = await supabaseAdmin
            .from('doctor_pharmacy_sponsorships')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchErr || !current) {
            return NextResponse.json({ error: 'Alianza no encontrada' }, { status: 404 });
        }

        const now = new Date().toISOString();
        const messages = Array.isArray(current.messages) ? [...current.messages] : [];
        const updates: Record<string, any> = { updated_at: now };
        const actorRole: 'doctor' | 'pharmacy' = body.actorRole || body.sender || 'doctor';

        const applyAgreementAndCouponFields = () => {
            if (body.scopeType !== undefined) updates.scope_type = body.scopeType;
            if (body.targetCity !== undefined) updates.target_city = body.targetCity;
            if (body.chainName !== undefined) updates.chain_name = body.chainName;
            if (body.agreementType !== undefined) updates.agreement_type = body.agreementType;
            if (body.agreementValue !== undefined) updates.agreement_value = body.agreementValue;
            if (body.agreementNotes !== undefined) updates.agreement_notes = body.agreementNotes;
            if (body.hasPatientCoupon !== undefined) updates.has_patient_coupon = Boolean(body.hasPatientCoupon);
            if (body.couponCode !== undefined) updates.coupon_code = body.couponCode ? String(body.couponCode).trim().toUpperCase() : null;
            if (body.couponDiscountPercent !== undefined) {
                updates.coupon_discount_percent = body.couponDiscountPercent === '' || body.couponDiscountPercent === null ? 0 : Number(body.couponDiscountPercent);
            }
            if (body.couponDescription !== undefined) updates.coupon_description = body.couponDescription;
        };

        if (action === 'accept_match') {
            updates.status = 'matched';
            messages.push({
                id: `msg-${Date.now()}`,
                sender: actorRole,
                senderRole: 'system',
                senderName: body.senderName || 'Sistema SUMA',
                text: body.text || '🤝 ¡Solicitud aceptada! Hicieron Match. Ahora pueden negociar los términos de la recomendación, definir si incluirán un cupón para los pacientes y activar la alianza.',
                timestamp: now,
            });
            updates.messages = messages;
        } else if (action === 'send_message') {
            const msgText = body.messageText || body.text;
            if (!msgText || !String(msgText).trim()) {
                return NextResponse.json({ error: 'El mensaje no puede estar vacío' }, { status: 400 });
            }
            messages.push({
                id: `msg-${Date.now()}`,
                sender: actorRole,
                senderRole: actorRole,
                senderName: body.senderName || (actorRole === 'doctor' ? 'Médico' : 'Farmacia'),
                text: String(msgText).trim(),
                timestamp: now,
            });
            updates.messages = messages;
            if (actorRole === 'doctor') {
                updates.unread_by_pharmacy = (current.unread_by_pharmacy || 0) + 1;
                updates.unread_by_doctor = 0;
            } else {
                updates.unread_by_doctor = (current.unread_by_doctor || 0) + 1;
                updates.unread_by_pharmacy = 0;
            }
        } else if (action === 'update_terms') {
            applyAgreementAndCouponFields();
            const couponSummary = body.hasPatientCoupon
                ? ` | 🎟️ Cupón Paciente: ${body.couponCode || 'ACTIVO'} (${body.couponDiscountPercent || 0}% Dto.)`
                : ' | Sin cupón para paciente';

            messages.push({
                id: `msg-${Date.now()}`,
                sender: actorRole,
                senderRole: 'system',
                senderName: body.senderName || 'Propuesta Comercial',
                text: `📋 Términos actualizados por ${body.senderName || actorRole}: ${body.agreementValue || 'Acuerdo comercial'} (${body.scopeType === 'national' ? 'Alcance Nacional' : `Ciudad: ${body.targetCity || 'Local'}`})${couponSummary}`,
                timestamp: now,
            });
            updates.messages = messages;
        } else if (action === 'activate_alliance') {
            updates.status = 'active';
            updates.doctor_approved_activation = true;
            updates.pharmacy_approved_activation = true;
            applyAgreementAndCouponFields();

            const couponSummary = updates.has_patient_coupon || current.has_patient_coupon
                ? ` con cupón ${updates.coupon_code || current.coupon_code || ''} (${updates.coupon_discount_percent ?? current.coupon_discount_percent ?? 0}% Dto.)`
                : '';

            messages.push({
                id: `msg-${Date.now()}`,
                sender: actorRole,
                senderRole: 'system',
                senderName: body.senderName || 'Alianza SUMA',
                text: `🚀 ¡Alianza Comercial ACTIVADA${couponSummary}! A partir de ahora, esta farmacia aparece recomendada en todos los récipes emitidos por el médico.`,
                timestamp: now,
            });
            updates.messages = messages;
        } else if (action === 'pause_alliance') {
            updates.status = 'matched';
            messages.push({
                id: `msg-${Date.now()}`,
                sender: actorRole,
                senderRole: 'system',
                senderName: body.senderName || 'Sistema',
                text: '⏸️ La recomendación en récipes fue pausada temporalmente y volvió a sala de negociación.',
                timestamp: now,
            });
            updates.messages = messages;
        } else if (action === 'reject') {
            updates.status = 'rejected';
        } else if (action === 'mark_read') {
            const reader = body.actorRole || body.reader;
            if (reader === 'doctor') updates.unread_by_doctor = 0;
            if (reader === 'pharmacy') updates.unread_by_pharmacy = 0;
        }

        const { data: updated, error: updErr } = await supabaseAdmin
            .from('doctor_pharmacy_sponsorships')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (updErr) throw updErr;

        const enriched = await enrichSingleSponsorship(updated);
        return NextResponse.json({
            ...enriched,
            success: true,
            sponsorship: enriched,
        });
    } catch (err: any) {
        console.error('Error in PATCH /api/pharmacy/sponsorships:', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

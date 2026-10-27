import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCampaignDoctorInvitationEmail } from '@/lib/email';
import type { HealthCampaignStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

function mapDoctorRow(row: Record<string, any>) {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        doctorEmail: row.doctor_email,
        doctorSpecialty: row.doctor_specialty,
        doctorProfileImage: row.doctor_profile_image,
        status: row.status,
        readByDoctor: Boolean(row.read_by_doctor),
        invitedAt: row.invited_at,
        respondedAt: row.responded_at,
    };
}

function mapRegistrationRow(row: Record<string, any>) {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        patientId: row.patient_id,
        name: row.name,
        cedula: row.cedula,
        email: row.email,
        phone: row.phone,
        age: row.age,
        gender: row.gender,
        interestSpecialty: row.interest_specialty,
        notes: row.notes,
        paymentMethod: row.payment_method,
        paymentReference: row.payment_reference,
        amountPaid: row.amount_paid !== null && row.amount_paid !== undefined ? Number(row.amount_paid) : 0,
        ticketCode: row.ticket_code || null,
        spotNumber: row.spot_number !== null && row.spot_number !== undefined ? Number(row.spot_number) : null,
        status: row.status,
        createdAt: row.created_at,
    };
}

function mapAttendanceRow(row: Record<string, any>) {
    return {
        id: row.id,
        campaignId: row.campaign_id,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        specialty: row.specialty,
        patientId: row.patient_id,
        isRegisteredPatient: Boolean(row.is_registered_patient),
        patientName: row.patient_name,
        patientCedula: row.patient_cedula,
        patientEmail: row.patient_email,
        patientPhone: row.patient_phone,
        patientAge: row.patient_age,
        patientGender: row.patient_gender,
        demographicGroup: row.demographic_group,
        symptoms: row.symptoms,
        diagnosis: row.diagnosis,
        evaluation: row.evaluation,
        treatmentPlan: row.treatment_plan,
        prescription: row.prescription,
        requestedStudies: row.requested_studies,
        hasPrescription: Boolean(row.has_prescription),
        medicalRecordId: row.medical_record_id,
        amountPaid: row.amount_paid !== null && row.amount_paid !== undefined ? Number(row.amount_paid) : 0,
        paymentStatus: row.payment_status || 'free',
        paymentMethod: row.payment_method,
        paymentReference: row.payment_reference,
        emailSent: Boolean(row.email_sent),
        attendedAt: row.attended_at,
    };
}

function computeCampaignStats(
    attendances: ReturnType<typeof mapAttendanceRow>[],
    registrations: ReturnType<typeof mapRegistrationRow>[]
): HealthCampaignStats {
    let hombres = 0;
    let mujeres = 0;
    let ninos = 0;
    let totalWithPrescription = 0;
    let totalRegisteredInSuma = 0;
    let totalRevenue = 0;

    const specialtyMap = new Map<string, { count: number; withPrescription: number }>();
    const doctorMap = new Map<string, { doctorId: string; doctorName: string; specialty: string; attendedCount: number; prescriptionCount: number }>();

    for (const att of attendances) {
        const group = (att.demographicGroup || '').toLowerCase();
        if (group === 'nino' || group === 'niño' || group === 'nina' || group === 'niña' || (typeof att.patientAge === 'number' && att.patientAge < 18)) {
            ninos++;
        } else if (group === 'hombre' || (att.patientGender || '').toLowerCase() === 'hombre' || (att.patientGender || '').toLowerCase() === 'masculino') {
            hombres++;
        } else {
            mujeres++;
        }

        if (att.hasPrescription) {
            totalWithPrescription++;
        }
        if (att.isRegisteredPatient) {
            totalRegisteredInSuma++;
        }
        if (typeof att.amountPaid === 'number' && att.amountPaid > 0) {
            totalRevenue += att.amountPaid;
        }

        const specKey = att.specialty || 'Medicina General';
        const prevSpec = specialtyMap.get(specKey) || { count: 0, withPrescription: 0 };
        prevSpec.count++;
        if (att.hasPrescription) prevSpec.withPrescription++;
        specialtyMap.set(specKey, prevSpec);

        const docKey = att.doctorId || att.doctorName;
        const prevDoc = doctorMap.get(docKey) || {
            doctorId: att.doctorId,
            doctorName: att.doctorName,
            specialty: specKey,
            attendedCount: 0,
            prescriptionCount: 0,
        };
        prevDoc.attendedCount++;
        if (att.hasPrescription) prevDoc.prescriptionCount++;
        doctorMap.set(docKey, prevDoc);
    }

    const bySpecialty = Array.from(specialtyMap.entries())
        .map(([specialty, val]) => ({ specialty, count: val.count, withPrescription: val.withPrescription }))
        .sort((a, b) => b.count - a.count);

    const byDoctor = Array.from(doctorMap.values()).sort((a, b) => b.attendedCount - a.attendedCount);
    const topDoctor = byDoctor.length > 0 ? byDoctor[0] : null;

    return {
        totalAttended: attendances.length,
        totalPreRegistered: registrations.length,
        totalWithPrescription,
        totalRegisteredInSuma,
        totalGuests: Math.max(0, attendances.length - totalRegisteredInSuma),
        totalRevenue,
        demographics: {
            hombres,
            mujeres,
            ninos,
        },
        bySpecialty,
        byDoctor,
        topDoctor,
    };
}

async function resolveOrganizerAccounts(organizerId: string, organizerRole: string) {
    try {
        if (organizerRole === 'doctor') {
            const { data: doc } = await supabaseAdmin
                .from('doctors')
                .select('name, cedula, phone, whatsapp, bank_details')
                .eq('id', organizerId)
                .maybeSingle();
            if (doc && Array.isArray(doc.bank_details) && doc.bank_details.length > 0) {
                return doc.bank_details.map((b: any) => ({
                    currency: b.currency || 'VES',
                    bank: b.bank || '',
                    accountType: b.accountType || 'Transferencia / Pago Móvil',
                    accountHolder: b.accountHolder || doc.name || '',
                    idNumber: b.idNumber || doc.cedula || '',
                    accountNumber: b.accountNumber || '',
                    phone: b.phone || doc.phone || doc.whatsapp || '',
                    notes: b.description || '',
                }));
            }
        } else if (organizerRole === 'clinic') {
            const { data: clinic } = await supabaseAdmin
                .from('clinics')
                .select('name, rif, phone, payment_settings')
                .eq('id', organizerId)
                .maybeSingle();
            if (clinic) {
                const ps = clinic.payment_settings || {};
                const list: any[] = [];
                if (ps.pagoMovil?.enabled || ps.pagoMovil?.bank) {
                    list.push({
                        currency: 'VES',
                        bank: ps.pagoMovil.bank || 'Pago Móvil Clínica',
                        accountType: 'Pago Móvil',
                        accountHolder: clinic.name || '',
                        idNumber: ps.pagoMovil.idNumber || clinic.rif || '',
                        accountNumber: ps.pagoMovil.phone || clinic.phone || '',
                        phone: ps.pagoMovil.phone || clinic.phone || '',
                    });
                }
                if (ps.transfer?.enabled || ps.transfer?.bank) {
                    list.push({
                        currency: 'VES',
                        bank: ps.transfer.bank || 'Transferencia Clínica',
                        accountType: ps.transfer.accountType || 'Transferencia Bancaria',
                        accountHolder: ps.transfer.accountHolder || clinic.name || '',
                        idNumber: ps.transfer.idNumber || clinic.rif || '',
                        accountNumber: ps.transfer.accountNumber || '',
                        phone: clinic.phone || '',
                    });
                }
                if (ps.zelle?.enabled || ps.zelle?.email) {
                    list.push({
                        currency: 'USD',
                        bank: 'Zelle',
                        accountType: 'Zelle USD',
                        accountHolder: ps.zelle.holder || clinic.name || '',
                        idNumber: clinic.rif || '',
                        accountNumber: ps.zelle.email || '',
                        phone: clinic.phone || '',
                    });
                }
                if (list.length > 0) return list;
            }
        } else if (organizerRole === 'laboratory') {
            const { data: lab } = await supabaseAdmin
                .from('laboratories')
                .select('name, rif, phone, payment_settings')
                .eq('id', organizerId)
                .maybeSingle();
            if (lab) {
                const ps = lab.payment_settings || {};
                const list: any[] = [];
                if (ps.pagoMovil?.enabled || ps.pagoMovil?.bank) {
                    list.push({
                        currency: 'VES',
                        bank: ps.pagoMovil.bank || 'Pago Móvil Laboratorio',
                        accountType: 'Pago Móvil',
                        accountHolder: lab.name || '',
                        idNumber: ps.pagoMovil.idNumber || lab.rif || '',
                        accountNumber: ps.pagoMovil.phone || lab.phone || '',
                        phone: ps.pagoMovil.phone || lab.phone || '',
                    });
                }
                if (ps.transfer?.enabled || ps.transfer?.bank) {
                    list.push({
                        currency: 'VES',
                        bank: ps.transfer.bank || 'Transferencia Laboratorio',
                        accountType: ps.transfer.accountType || 'Transferencia Bancaria',
                        accountHolder: ps.transfer.accountHolder || lab.name || '',
                        idNumber: ps.transfer.idNumber || lab.rif || '',
                        accountNumber: ps.transfer.accountNumber || '',
                        phone: lab.phone || '',
                    });
                }
                if (list.length > 0) return list;
            }
        }
    } catch {
        // ignore
    }
    return [];
}

function mapCampaignRow(
    row: Record<string, any>,
    doctors: ReturnType<typeof mapDoctorRow>[],
    registrations: ReturnType<typeof mapRegistrationRow>[],
    attendances: ReturnType<typeof mapAttendanceRow>[]
) {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        organizerId: row.organizer_id,
        organizerRole: row.organizer_role,
        organizerName: row.organizer_name,
        organizerLogo: row.organizer_logo,
        campaignType: row.campaign_type || 'free',
        pricingMode: row.pricing_mode || 'per_event',
        priceAmount: row.price_amount !== null && row.price_amount !== undefined ? Number(row.price_amount) : 0,
        specialtyPrices: row.specialty_prices && typeof row.specialty_prices === 'object' ? row.specialty_prices : {},
        priceInfo: row.price_info,
        paymentAccountSource: row.payment_account_source || 'organizer',
        paymentDetails: row.payment_details && typeof row.payment_details === 'object' ? row.payment_details : null,
        capacityMode: row.capacity_mode || 'unlimited',
        maxCapacity: row.max_capacity !== null && row.max_capacity !== undefined ? Number(row.max_capacity) : null,
        specialties: Array.isArray(row.specialties) ? row.specialties : [],
        startDate: row.start_date,
        endDate: row.end_date,
        startTime: row.start_time || '08:00',
        endTime: row.end_time || '16:00',
        country: row.country || 'VE',
        state: row.state,
        city: row.city,
        sector: row.sector,
        address: row.address,
        coverImage: row.cover_image,
        galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : [],
        status: row.status || 'upcoming',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        doctors,
        registrations,
        attendances,
        stats: computeCampaignStats(attendances, registrations),
    };
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const organizerId = searchParams.get('organizerId');
        const organizerRole = searchParams.get('organizerRole');
        const organizerAccounts = searchParams.get('organizerAccounts') === 'true';
        const doctorId = searchParams.get('doctorId');
        const publicOnly = searchParams.get('publicOnly') === 'true';

        if (organizerAccounts && organizerId && organizerRole) {
            const accounts = await resolveOrganizerAccounts(organizerId, organizerRole);
            return NextResponse.json({ accounts });
        }

        if (id) {
            const { data: campaign, error } = await supabaseAdmin
                .from('health_campaigns')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            if (!campaign) {
                return NextResponse.json({ error: 'Jornada de salud no encontrada' }, { status: 404 });
            }

            const [docsRes, regsRes, attsRes] = await Promise.all([
                supabaseAdmin.from('health_campaign_doctors').select('*').eq('campaign_id', id).order('invited_at', { ascending: true }),
                supabaseAdmin.from('health_campaign_registrations').select('*').eq('campaign_id', id).order('created_at', { ascending: false }),
                supabaseAdmin.from('health_campaign_attendances').select('*').eq('campaign_id', id).order('attended_at', { ascending: false }),
            ]);

            const mapped = mapCampaignRow(
                campaign,
                (docsRes.data || []).map(mapDoctorRow),
                (regsRes.data || []).map(mapRegistrationRow),
                (attsRes.data || []).map(mapAttendanceRow)
            );
            return NextResponse.json(mapped);
        }

        let campaignIdsFilter: string[] | null = null;
        if (doctorId) {
            const { data: docLinks } = await supabaseAdmin
                .from('health_campaign_doctors')
                .select('campaign_id')
                .eq('doctor_id', doctorId);

            const invitedIds = (docLinks || []).map((d: any) => d.campaign_id);

            const { data: ownCampaigns } = await supabaseAdmin
                .from('health_campaigns')
                .select('id')
                .eq('organizer_id', doctorId);

            const ownIds = (ownCampaigns || []).map((c: any) => c.id);
            campaignIdsFilter = Array.from(new Set([...invitedIds, ...ownIds]));

            if (campaignIdsFilter.length === 0) {
                return NextResponse.json([]);
            }
        }

        let query = supabaseAdmin
            .from('health_campaigns')
            .select('*')
            .order('start_date', { ascending: false });

        if (organizerId && !doctorId) {
            query = query.eq('organizer_id', organizerId);
        }
        if (campaignIdsFilter) {
            query = query.in('id', campaignIdsFilter);
        }
        if (publicOnly) {
            query = query.neq('status', 'cancelled');
        }

        const { data: campaigns, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const allIds = (campaigns || []).map((c: any) => c.id);
        if (allIds.length === 0) {
            return NextResponse.json([]);
        }

        const [docsRes, regsRes, attsRes] = await Promise.all([
            supabaseAdmin.from('health_campaign_doctors').select('*').in('campaign_id', allIds),
            supabaseAdmin.from('health_campaign_registrations').select('*').in('campaign_id', allIds).order('created_at', { ascending: false }),
            supabaseAdmin.from('health_campaign_attendances').select('*').in('campaign_id', allIds).order('attended_at', { ascending: false }),
        ]);

        const docsByCampaign = new Map<string, ReturnType<typeof mapDoctorRow>[]>();
        for (const d of docsRes.data || []) {
            const list = docsByCampaign.get(d.campaign_id) || [];
            list.push(mapDoctorRow(d));
            docsByCampaign.set(d.campaign_id, list);
        }

        const regsByCampaign = new Map<string, ReturnType<typeof mapRegistrationRow>[]>();
        for (const r of regsRes.data || []) {
            const list = regsByCampaign.get(r.campaign_id) || [];
            list.push(mapRegistrationRow(r));
            regsByCampaign.set(r.campaign_id, list);
        }

        const attsByCampaign = new Map<string, ReturnType<typeof mapAttendanceRow>[]>();
        for (const a of attsRes.data || []) {
            const list = attsByCampaign.get(a.campaign_id) || [];
            list.push(mapAttendanceRow(a));
            attsByCampaign.set(a.campaign_id, list);
        }

        const result = (campaigns || []).map((c: any) =>
            mapCampaignRow(
                c,
                docsByCampaign.get(c.id) || [],
                regsByCampaign.get(c.id) || [],
                attsByCampaign.get(c.id) || []
            )
        );

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Error in GET /api/health-campaigns:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            title,
            description,
            organizerId,
            organizerRole,
            organizerName,
            organizerLogo,
            campaignType = 'free',
            pricingMode = 'per_event',
            priceAmount = 0,
            specialtyPrices = {},
            priceInfo = '',
            paymentAccountSource = 'organizer',
            paymentDetails = null,
            capacityMode = 'unlimited',
            maxCapacity = null,
            specialties = [],
            startDate,
            endDate,
            startTime = '08:00',
            endTime = '16:00',
            country = 'VE',
            state = '',
            city = '',
            sector = '',
            address = '',
            coverImage = '',
            galleryImages = [],
            status = 'upcoming',
            invitedDoctors = [],
        } = body;

        if (!title || !organizerId || !organizerRole || !organizerName || !startDate) {
            return NextResponse.json(
                { error: 'Título, organizador y fecha de inicio son obligatorios.' },
                { status: 400 }
            );
        }

        let finalPaymentDetails = paymentDetails || {};
        if (campaignType === 'paid' && paymentAccountSource === 'organizer' && (!finalPaymentDetails || !finalPaymentDetails.bank)) {
            const orgAccounts = await resolveOrganizerAccounts(organizerId, organizerRole);
            if (orgAccounts.length > 0) {
                finalPaymentDetails = orgAccounts[0];
            }
        }

        const { data: createdCampaign, error: createErr } = await supabaseAdmin
            .from('health_campaigns')
            .insert([
                {
                    title: title.trim(),
                    description: description || '',
                    organizer_id: organizerId,
                    organizer_role: organizerRole,
                    organizer_name: organizerName,
                    organizer_logo: organizerLogo || null,
                    campaign_type: campaignType,
                    pricing_mode: campaignType === 'paid' ? pricingMode : 'per_event',
                    price_amount: campaignType === 'paid' ? Number(priceAmount) || 0 : 0,
                    specialty_prices: campaignType === 'paid' && specialtyPrices ? specialtyPrices : {},
                    price_info: priceInfo || null,
                    payment_account_source: campaignType === 'paid' ? paymentAccountSource : 'organizer',
                    payment_details: campaignType === 'paid' ? finalPaymentDetails : {},
                    capacity_mode: capacityMode === 'limited' ? 'limited' : 'unlimited',
                    max_capacity: capacityMode === 'limited' && Number(maxCapacity) > 0 ? Number(maxCapacity) : null,
                    specialties: Array.isArray(specialties) ? specialties : [],
                    start_date: startDate,
                    end_date: endDate || startDate,
                    start_time: startTime,
                    end_time: endTime,
                    country,
                    state,
                    city,
                    sector,
                    address,
                    cover_image: coverImage || (Array.isArray(galleryImages) && galleryImages[0]) || null,
                    gallery_images: Array.isArray(galleryImages) ? galleryImages : [],
                    status,
                },
            ])
            .select('*')
            .single();

        if (createErr || !createdCampaign) {
            console.error('Error creating health campaign:', createErr);
            return NextResponse.json({ error: createErr?.message || 'No se pudo crear la jornada' }, { status: 500 });
        }

        const doctorsToInsert: Record<string, any>[] = [];

        // Si el organizador es médico y no está aún en la lista, añadirlo automáticamente como aceptado
        const invitedList: {
            doctorId: string;
            doctorName: string;
            doctorEmail?: string;
            doctorSpecialty?: string;
            doctorProfileImage?: string;
        }[] = Array.isArray(invitedDoctors) ? [...invitedDoctors] : [];

        if (organizerRole === 'doctor' && !invitedList.some(d => d.doctorId === organizerId)) {
            const { data: selfDoc } = await supabaseAdmin
                .from('doctors')
                .select('id, name, email, specialty, profile_image')
                .eq('id', organizerId)
                .maybeSingle();

            if (selfDoc) {
                invitedList.unshift({
                    doctorId: selfDoc.id,
                    doctorName: selfDoc.name,
                    doctorEmail: selfDoc.email,
                    doctorSpecialty: selfDoc.specialty,
                    doctorProfileImage: selfDoc.profile_image,
                });
            }
        }

        for (const doc of invitedList) {
            if (!doc.doctorId) continue;
            const isSelfOrganizer = organizerRole === 'doctor' && doc.doctorId === organizerId;
            doctorsToInsert.push({
                campaign_id: createdCampaign.id,
                doctor_id: doc.doctorId,
                doctor_name: doc.doctorName || 'Médico SUMA',
                doctor_email: doc.doctorEmail || null,
                doctor_specialty: doc.doctorSpecialty || 'Medicina General',
                doctor_profile_image: doc.doctorProfileImage || null,
                status: isSelfOrganizer ? 'accepted' : 'pending',
                read_by_doctor: isSelfOrganizer ? true : false,
                responded_at: isSelfOrganizer ? new Date().toISOString() : null,
            });
        }

        let insertedDoctors: ReturnType<typeof mapDoctorRow>[] = [];
        if (doctorsToInsert.length > 0) {
            const { data: docRows } = await supabaseAdmin
                .from('health_campaign_doctors')
                .upsert(doctorsToInsert, { onConflict: 'campaign_id,doctor_id' })
                .select('*');

            insertedDoctors = (docRows || []).map(mapDoctorRow);

            // Enviar correo de invitación a cada médico invitado (excepto si es el mismo creador)
            for (const docRow of doctorsToInsert) {
                if (docRow.status === 'pending' && docRow.doctor_email) {
                    sendCampaignDoctorInvitationEmail({
                        doctorEmail: docRow.doctor_email,
                        doctorName: docRow.doctor_name,
                        campaignTitle: createdCampaign.title,
                        organizerName: createdCampaign.organizer_name,
                        startDate: createdCampaign.start_date,
                        startTime: createdCampaign.start_time,
                        endTime: createdCampaign.end_time,
                        city: createdCampaign.city,
                        address: createdCampaign.address,
                        campaignType: createdCampaign.campaign_type,
                    }).catch(err => console.error('Error sending campaign invitation email:', err));
                }
            }
        }

        return NextResponse.json(
            mapCampaignRow(createdCampaign, insertedDoctors, [], []),
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error in POST /api/health-campaigns:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, id, campaignId } = body;
        const targetCampaignId = id || campaignId;

        // 1. Médico acepta o rechaza invitación a la Jornada
        if (action === 'respond_invitation') {
            const { doctorId, status } = body;
            if (!targetCampaignId || !doctorId || !['accepted', 'declined'].includes(status)) {
                return NextResponse.json({ error: 'Datos de respuesta inválidos' }, { status: 400 });
            }

            const { data, error } = await supabaseAdmin
                .from('health_campaign_doctors')
                .update({
                    status,
                    read_by_doctor: true,
                    responded_at: new Date().toISOString(),
                })
                .eq('campaign_id', targetCampaignId)
                .eq('doctor_id', doctorId)
                .select('*')
                .maybeSingle();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, invitation: data ? mapDoctorRow(data) : null });
        }

        // 2. Actualizar datos generales de la Jornada
        if (!targetCampaignId) {
            return NextResponse.json({ error: 'ID de jornada requerido' }, { status: 400 });
        }

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (body.title !== undefined) updatePayload.title = body.title;
        if (body.description !== undefined) updatePayload.description = body.description;
        if (body.campaignType !== undefined) updatePayload.campaign_type = body.campaignType;
        if (body.pricingMode !== undefined) updatePayload.pricing_mode = body.pricingMode;
        if (body.priceAmount !== undefined) updatePayload.price_amount = Number(body.priceAmount) || 0;
        if (body.specialtyPrices !== undefined) updatePayload.specialty_prices = body.specialtyPrices || {};
        if (body.priceInfo !== undefined) updatePayload.price_info = body.priceInfo;
        if (body.paymentAccountSource !== undefined) updatePayload.payment_account_source = body.paymentAccountSource;
        if (body.paymentDetails !== undefined) updatePayload.payment_details = body.paymentDetails || {};
        if (body.capacityMode !== undefined) updatePayload.capacity_mode = body.capacityMode === 'limited' ? 'limited' : 'unlimited';
        if (body.maxCapacity !== undefined) updatePayload.max_capacity = body.capacityMode === 'limited' && Number(body.maxCapacity) > 0 ? Number(body.maxCapacity) : null;
        if (body.specialties !== undefined) updatePayload.specialties = body.specialties;
        if (body.startDate !== undefined) updatePayload.start_date = body.startDate;
        if (body.endDate !== undefined) updatePayload.end_date = body.endDate;
        if (body.startTime !== undefined) updatePayload.start_time = body.startTime;
        if (body.endTime !== undefined) updatePayload.end_time = body.endTime;
        if (body.country !== undefined) updatePayload.country = body.country;
        if (body.state !== undefined) updatePayload.state = body.state;
        if (body.city !== undefined) updatePayload.city = body.city;
        if (body.sector !== undefined) updatePayload.sector = body.sector;
        if (body.address !== undefined) updatePayload.address = body.address;
        if (body.coverImage !== undefined) updatePayload.cover_image = body.coverImage;
        if (body.galleryImages !== undefined) updatePayload.gallery_images = body.galleryImages;
        if (body.status !== undefined) updatePayload.status = body.status;

        const { data: updatedCampaign, error: updateErr } = await supabaseAdmin
            .from('health_campaigns')
            .update(updatePayload)
            .eq('id', targetCampaignId)
            .select('*')
            .single();

        if (updateErr) {
            return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }

        // Si se enviaron médicos invitados adicionales, sincronizarlos sin pisar el estatus de los ya existentes
        if (Array.isArray(body.invitedDoctors)) {
            const { data: existingDocs } = await supabaseAdmin
                .from('health_campaign_doctors')
                .select('*')
                .eq('campaign_id', targetCampaignId);

            const existingMap = new Map<string, any>();
            for (const ed of existingDocs || []) {
                existingMap.set(ed.doctor_id, ed);
            }

            const newToInsert: Record<string, any>[] = [];
            const incomingIds = new Set<string>();

            for (const doc of body.invitedDoctors) {
                if (!doc.doctorId) continue;
                incomingIds.add(doc.doctorId);
                if (!existingMap.has(doc.doctorId)) {
                    const isSelfOrganizer = updatedCampaign.organizer_role === 'doctor' && doc.doctorId === updatedCampaign.organizer_id;
                    newToInsert.push({
                        campaign_id: targetCampaignId,
                        doctor_id: doc.doctorId,
                        doctor_name: doc.doctorName || 'Médico SUMA',
                        doctor_email: doc.doctorEmail || null,
                        doctor_specialty: doc.doctorSpecialty || 'Medicina General',
                        doctor_profile_image: doc.doctorProfileImage || null,
                        status: isSelfOrganizer ? 'accepted' : 'pending',
                        read_by_doctor: isSelfOrganizer ? true : false,
                        responded_at: isSelfOrganizer ? new Date().toISOString() : null,
                    });
                }
            }

            // Eliminar médicos que fueron quitados por el organizador
            const idsToRemove = Array.from(existingMap.keys()).filter(dId => !incomingIds.has(dId));
            if (idsToRemove.length > 0) {
                await supabaseAdmin
                    .from('health_campaign_doctors')
                    .delete()
                    .eq('campaign_id', targetCampaignId)
                    .in('doctor_id', idsToRemove);
            }

            if (newToInsert.length > 0) {
                await supabaseAdmin
                    .from('health_campaign_doctors')
                    .insert(newToInsert);

                for (const docRow of newToInsert) {
                    if (docRow.status === 'pending' && docRow.doctor_email) {
                        sendCampaignDoctorInvitationEmail({
                            doctorEmail: docRow.doctor_email,
                            doctorName: docRow.doctor_name,
                            campaignTitle: updatedCampaign.title,
                            organizerName: updatedCampaign.organizer_name,
                            startDate: updatedCampaign.start_date,
                            startTime: updatedCampaign.start_time,
                            endTime: updatedCampaign.end_time,
                            city: updatedCampaign.city,
                            address: updatedCampaign.address,
                            campaignType: updatedCampaign.campaign_type,
                        }).catch(() => {});
                    }
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in PATCH /api/health-campaigns:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const id = request.nextUrl.searchParams.get('id');
        if (!id) {
            return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('health_campaigns')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in DELETE /api/health-campaigns:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

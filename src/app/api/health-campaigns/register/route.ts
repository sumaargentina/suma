import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCampaignTicketEmail } from '@/lib/email';
import { hashPassword, verifyPassword, isPasswordHashed } from '@/lib/password-utils';

export const dynamic = 'force-dynamic';

function isCampaignExpired(row: {
    start_date?: string | null;
    end_date?: string | null;
    end_time?: string | null;
    status?: string | null;
}): boolean {
    if (row.status === 'completed' || row.status === 'cancelled') return true;
    const targetDate = (row.end_date || row.start_date || '').trim();
    if (!targetDate) return false;
    const rawTime = (row.end_time || '23:59').trim();
    const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? `${rawTime}:59` : '23:59:59';
    const expiryMs = Date.parse(`${targetDate}T${normalizedTime}-04:00`);
    if (Number.isNaN(expiryMs)) return false;
    return Date.now() > expiryMs;
}

// GET /api/health-campaigns/register?cedula=xxx&campaignId=xxx
// O bien: GET /api/health-campaigns/register?myRegistrations=true&patientId=xxx&cedula=xxx&email=xxx
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const myRegistrations = searchParams.get('myRegistrations') === 'true';
        const patientId = (searchParams.get('patientId') || '').trim();
        const rawCedula = (searchParams.get('cedula') || '').trim();
        const rawEmail = (searchParams.get('email') || '').trim().toLowerCase();
        const campaignId = searchParams.get('campaignId') || '';

        if (myRegistrations && (patientId || rawCedula || rawEmail)) {
            const orFilters: string[] = [];
            if (patientId) {
                orFilters.push(`patient_id.eq.${patientId}`);
            }
            const cleanDigits = rawCedula.replace(/\D/g, '');
            if (cleanDigits.length >= 5) {
                orFilters.push(`cedula.ilike.%${cleanDigits}%`);
            }
            if (rawEmail && rawEmail.includes('@')) {
                orFilters.push(`email.ilike.${rawEmail}`);
            }

            // Incluir cédulas de familiares registrados por este paciente
            if (patientId) {
                const { data: famRows } = await supabaseAdmin
                    .from('family_members')
                    .select('cedula')
                    .eq('patient_id', patientId);
                for (const fm of famRows || []) {
                    const fmDigits = String(fm.cedula || '').replace(/\D/g, '');
                    if (fmDigits.length >= 5) {
                        orFilters.push(`cedula.ilike.%${fmDigits}%`);
                    }
                }
            }

            if (orFilters.length === 0) {
                return NextResponse.json({ registrations: [] });
            }

            const { data: regRows, error: regErr } = await supabaseAdmin
                .from('health_campaign_registrations')
                .select('*')
                .or(orFilters.join(','))
                .order('created_at', { ascending: false });

            if (regErr || !regRows || regRows.length === 0) {
                return NextResponse.json({ registrations: [] });
            }

            // Deduplicar por id
            const uniqueRegsMap = new Map<string, any>();
            for (const r of regRows) {
                uniqueRegsMap.set(r.id, r);
            }
            const uniqueRegs = Array.from(uniqueRegsMap.values());
            const campaignIds = Array.from(new Set(uniqueRegs.map(r => r.campaign_id).filter(Boolean)));

            const [{ data: campRows }, { data: attRows }] = await Promise.all([
                supabaseAdmin
                    .from('health_campaigns')
                    .select('*')
                    .in('id', campaignIds),
                supabaseAdmin
                    .from('health_campaign_attendances')
                    .select('*')
                    .in('campaign_id', campaignIds),
            ]);

            const campMap = new Map<string, any>();
            for (const c of campRows || []) {
                campMap.set(c.id, c);
            }

            const enriched = uniqueRegs
                .map(reg => {
                    const camp = campMap.get(reg.campaign_id);
                    if (!camp) return null;
                    const expired = isCampaignExpired(camp);
                    const regDigits = String(reg.cedula || '').replace(/\D/g, '');
                    const matchingAttendances = (attRows || []).filter(a => {
                        if (a.campaign_id !== reg.campaign_id) return false;
                        if (reg.patient_id && a.patient_id === reg.patient_id && (!regDigits || String(a.patient_cedula || '').replace(/\D/g, '') === regDigits)) {
                            return true;
                        }
                        const attDigits = String(a.patient_cedula || '').replace(/\D/g, '');
                        return regDigits.length >= 5 && attDigits === regDigits;
                    });

                    return {
                        id: reg.id,
                        campaignId: reg.campaign_id,
                        patientId: reg.patient_id || null,
                        name: reg.name,
                        cedula: reg.cedula,
                        phone: reg.phone || null,
                        email: reg.email || null,
                        age: reg.age ?? null,
                        gender: reg.gender || null,
                        interestSpecialty: reg.interest_specialty || null,
                        spotNumber: reg.spot_number ? Number(reg.spot_number) : 1,
                        ticketCode: reg.ticket_code || `SUMA-TCK-${String(reg.spot_number || 1).padStart(3, '0')}`,
                        status: matchingAttendances.length > 0 ? 'attended' : (reg.status || 'registered'),
                        amountPaid: reg.amount_paid ? Number(reg.amount_paid) : 0,
                        paymentMethod: reg.payment_method || null,
                        paymentReference: reg.payment_reference || null,
                        createdAt: reg.created_at,
                        campaign: {
                            id: camp.id,
                            title: camp.title,
                            description: camp.description || '',
                            organizerName: camp.organizer_name,
                            organizerRole: camp.organizer_role,
                            campaignType: camp.campaign_type || 'free',
                            pricingMode: camp.pricing_mode || 'per_event',
                            priceAmount: Number(camp.price_amount || 0),
                            priceInfo: camp.price_info || null,
                            startDate: camp.start_date,
                            endDate: camp.end_date || null,
                            startTime: camp.start_time || '08:00',
                            endTime: camp.end_time || '16:00',
                            city: camp.city || '',
                            state: camp.state || '',
                            sector: camp.sector || '',
                            address: camp.address || '',
                            coverImage: camp.cover_image || null,
                            specialties: Array.isArray(camp.specialties) ? camp.specialties : [],
                            status: expired && camp.status !== 'cancelled' ? 'completed' : (camp.status || 'upcoming'),
                            isExpired: expired,
                        },
                        attendances: matchingAttendances.map(a => ({
                            id: a.id,
                            doctorName: a.doctor_name,
                            specialty: a.specialty,
                            diagnosis: a.diagnosis || null,
                            prescription: a.prescription || null,
                            medicalRecordId: a.medical_record_id || null,
                            attendedAt: a.attended_at,
                        })),
                    };
                })
                .filter(Boolean);

            return NextResponse.json({ registrations: enriched });
        }

        if (!rawCedula) {
            return NextResponse.json({ found: false });
        }

        const digitsOnly = rawCedula.replace(/\D/g, '');

        // 1. Buscar en tabla patients de SUMA
        let patientMatch: any = null;
        if (digitsOnly.length >= 4) {
            const { data: patients } = await supabaseAdmin
                .from('patients')
                .select('id, name, cedula, email, phone, age, gender')
                .or(`cedula.ilike.%${digitsOnly}%,cedula.eq.${rawCedula}`)
                .limit(5);

            if (patients && patients.length > 0) {
                patientMatch =
                    patients.find(p => (p.cedula || '').replace(/\D/g, '') === digitsOnly) ||
                    patients[0];
            }
        }

        // 2. Buscar en pre-registros del evento si hay campaignId (por cédula o por código de ticket SUMA-TCK-...)
        let preRegMatch: any = null;
        if (campaignId && (digitsOnly.length >= 1 || rawCedula.toUpperCase().startsWith('SUMA-TCK'))) {
            if (rawCedula.toUpperCase().startsWith('SUMA-TCK')) {
                const { data: ticketMatch } = await supabaseAdmin
                    .from('health_campaign_registrations')
                    .select('*')
                    .eq('campaign_id', campaignId)
                    .ilike('ticket_code', `%${rawCedula.trim()}%`)
                    .maybeSingle();
                if (ticketMatch) preRegMatch = ticketMatch;
            } else if (digitsOnly.length >= 4) {
                const { data: regs } = await supabaseAdmin
                    .from('health_campaign_registrations')
                    .select('*')
                    .eq('campaign_id', campaignId)
                    .or(`cedula.ilike.%${digitsOnly}%,cedula.eq.${rawCedula}`)
                    .limit(5);

                if (regs && regs.length > 0) {
                    preRegMatch =
                        regs.find(r => (r.cedula || '').replace(/\D/g, '') === digitsOnly) ||
                        regs[0];
                }
            }
        }

        if (!patientMatch && !preRegMatch) {
            return NextResponse.json({
                found: false,
                isRegisteredInSuma: false,
            });
        }

        const rawGender = (patientMatch?.gender || preRegMatch?.gender || '').toLowerCase();
        const ageVal = patientMatch?.age ?? preRegMatch?.age ?? null;
        let demographicGroup: 'hombre' | 'mujer' | 'nino' = 'mujer';
        if (rawGender === 'nino' || rawGender === 'niño' || rawGender === 'nina' || rawGender === 'niña' || (typeof ageVal === 'number' && ageVal < 18)) {
            demographicGroup = 'nino';
        } else if (rawGender.startsWith('m') || rawGender === 'hombre') {
            demographicGroup = 'hombre';
        } else {
            demographicGroup = 'mujer';
        }

        return NextResponse.json({
            found: true,
            isRegisteredInSuma: Boolean(patientMatch),
            patient: {
                id: patientMatch?.id || null,
                name: patientMatch?.name || preRegMatch?.name || '',
                cedula: patientMatch?.cedula || preRegMatch?.cedula || rawCedula,
                email: patientMatch?.email || preRegMatch?.email || '',
                phone: patientMatch?.phone || preRegMatch?.phone || '',
                age: ageVal,
                gender: rawGender.startsWith('m') || rawGender === 'hombre' ? 'hombre' : 'mujer',
                demographicGroup,
                interestSpecialty: preRegMatch?.interest_specialty || null,
                paymentMethod: preRegMatch?.payment_method || null,
                paymentReference: preRegMatch?.payment_reference || null,
                amountPaid: preRegMatch?.amount_paid ? Number(preRegMatch.amount_paid) : 0,
                ticketCode: preRegMatch?.ticket_code || null,
                spotNumber: preRegMatch?.spot_number ? Number(preRegMatch.spot_number) : null,
            },
        });
    } catch (error: any) {
        console.error('Error in GET /api/health-campaigns/register:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// POST /api/health-campaigns/register
// Registra u autentica obligatoriamente al paciente en SUMA y genera su Ticket Digital de la Jornada en un solo paso.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            campaignId,
            authMode = 'register', // 'existing_session' | 'login' | 'register'
            patientId: incomingPatientId,
            password,
            name,
            cedula,
            email,
            phone,
            age,
            gender = 'mujer',
            interestSpecialty,
            notes,
            paymentMethod,
            paymentReference,
            amountPaid,
        } = body;

        if (!campaignId) {
            return NextResponse.json(
                { error: 'El identificador de la jornada es obligatorio.' },
                { status: 400 }
            );
        }

        // 1. Consultar la jornada y validar que no haya culminado ni agotado cupos
        const [campRes, countRes] = await Promise.all([
            supabaseAdmin
                .from('health_campaigns')
                .select('id, title, organizer_name, start_date, end_date, start_time, end_time, country, state, city, address, capacity_mode, max_capacity, status')
                .eq('id', campaignId)
                .maybeSingle(),
            supabaseAdmin
                .from('health_campaign_registrations')
                .select('id, spot_number', { count: 'exact' })
                .eq('campaign_id', campaignId),
        ]);

        const campaignRow = campRes.data;
        if (!campaignRow) {
            return NextResponse.json({ error: 'Jornada de salud no encontrada.' }, { status: 404 });
        }

        if (isCampaignExpired(campaignRow)) {
            return NextResponse.json(
                {
                    error: 'Este evento o jornada de salud ya culminó según su fecha de cierre. No es posible tomar nuevos cupos.',
                    expired: true,
                },
                { status: 400 }
            );
        }

        // 2. Resolver o crear la cuenta oficial del paciente en SUMA
        let resolvedPatient: Record<string, any> | null = null;
        let isDoctorAccount = false;

        if (authMode === 'existing_session' && incomingPatientId) {
            const { data: patById } = await supabaseAdmin
                .from('patients')
                .select('*')
                .eq('id', incomingPatientId)
                .maybeSingle();

            if (patById) {
                resolvedPatient = patById;
                // Actualizar cédula o teléfono en su perfil SUMA si estaban vacíos
                const updates: Record<string, any> = {};
                if (!patById.cedula && cedula) updates.cedula = String(cedula).trim();
                if (!patById.phone && phone) updates.phone = String(phone).trim();
                if (patById.age === null && age) updates.age = Number(age);
                if (Object.keys(updates).length > 0) {
                    const { data: updatedPat } = await supabaseAdmin
                        .from('patients')
                        .update(updates)
                        .eq('id', patById.id)
                        .select('*')
                        .maybeSingle();
                    if (updatedPat) resolvedPatient = updatedPat;
                }
            }
        } else if (authMode === 'login') {
            const cleanLoginEmail = String(email || '').toLowerCase().trim();
            if (!cleanLoginEmail || !password) {
                return NextResponse.json(
                    { error: 'Ingresa tu correo electrónico y contraseña de SUMA para iniciar sesión y tomar tu cupo.' },
                    { status: 400 }
                );
            }

            const { data: patByEmail } = await supabaseAdmin
                .from('patients')
                .select('*')
                .ilike('email', cleanLoginEmail)
                .maybeSingle();

            if (patByEmail) {
                const passValid = isPasswordHashed(patByEmail.password || '')
                    ? await verifyPassword(String(password), patByEmail.password)
                    : patByEmail.password === String(password);

                if (!passValid) {
                    return NextResponse.json(
                        { error: 'Contraseña incorrecta. Verifica tu clave de SUMA e intenta de nuevo.' },
                        { status: 401 }
                    );
                }
                resolvedPatient = patByEmail;
            } else {
                // Verificar si es un médico iniciando sesión con su cuenta SUMA
                const { data: docByEmail } = await supabaseAdmin
                    .from('doctors')
                    .select('*')
                    .ilike('email', cleanLoginEmail)
                    .maybeSingle();

                if (!docByEmail) {
                    return NextResponse.json(
                        { error: 'No encontramos una cuenta en SUMA con ese correo. Selecciona "Crear mi Cuenta en SUMA" para registrarte.' },
                        { status: 404 }
                    );
                }

                const docPassValid = isPasswordHashed(docByEmail.password || '')
                    ? await verifyPassword(String(password), docByEmail.password)
                    : docByEmail.password === String(password);

                if (!docPassValid) {
                    return NextResponse.json(
                        { error: 'Contraseña incorrecta. Verifica tu clave de SUMA.' },
                        { status: 401 }
                    );
                }

                isDoctorAccount = true;
                // Crear o recuperar su perfil espejo de paciente
                const { data: mirrorPat } = await supabaseAdmin
                    .from('patients')
                    .upsert(
                        [
                            {
                                id: docByEmail.id,
                                name: docByEmail.name,
                                email: docByEmail.email.toLowerCase(),
                                password: docByEmail.password,
                                phone: docByEmail.phone || docByEmail.whatsapp || null,
                                cedula: docByEmail.cedula || null,
                                country: docByEmail.country || 'VE',
                                state: docByEmail.state || null,
                                city: docByEmail.city || null,
                                address: docByEmail.address || null,
                                profile_image: docByEmail.profile_image || null,
                                profile_completed: true,
                            },
                        ],
                        { onConflict: 'id' }
                    )
                    .select('*')
                    .maybeSingle();

                resolvedPatient = mirrorPat || docByEmail;
            }
        } else {
            // authMode === 'register': Registro directo en SUMA + Toma de Cupo
            const cleanName = String(name || '').trim();
            const cleanCedula = String(cedula || '').trim();
            const cleanEmail = String(email || '').toLowerCase().trim();
            const cleanPhone = String(phone || '').trim();
            const rawPass = String(password || '');

            if (!cleanName || !cleanCedula || !cleanEmail || !cleanPhone) {
                return NextResponse.json(
                    { error: 'Nombre completo, cédula, teléfono y correo electrónico son obligatorios para registrarte en SUMA y tomar tu cupo.' },
                    { status: 400 }
                );
            }

            if (rawPass.length < 6) {
                return NextResponse.json(
                    { error: 'Por favor crea una contraseña de al menos 6 caracteres para tu cuenta en SUMA.' },
                    { status: 400 }
                );
            }

            const digitsOnlyCedula = cleanCedula.replace(/\D/g, '');

            // Verificar si ya existe en patients por correo o por cédula
            const { data: existingByEmail } = await supabaseAdmin
                .from('patients')
                .select('*')
                .ilike('email', cleanEmail)
                .maybeSingle();

            let existingByCedula: any = null;
            if (!existingByEmail && digitsOnlyCedula.length >= 5) {
                const { data: cedMatches } = await supabaseAdmin
                    .from('patients')
                    .select('*')
                    .or(`cedula.eq.${cleanCedula},cedula.eq.${digitsOnlyCedula}`)
                    .limit(1);
                if (cedMatches && cedMatches.length > 0) {
                    existingByCedula = cedMatches[0];
                }
            }

            const existingPatient = existingByEmail || existingByCedula;

            if (existingPatient) {
                // Si ya existe y la contraseña coincide, iniciar su sesión automáticamente
                const passMatches = isPasswordHashed(existingPatient.password || '')
                    ? await verifyPassword(rawPass, existingPatient.password)
                    : existingPatient.password === rawPass;

                if (passMatches) {
                    resolvedPatient = existingPatient;
                } else {
                    return NextResponse.json(
                        {
                            error: `Ya tienes una cuenta registrada en SUMA (${existingPatient.email}). Selecciona "Ya tengo cuenta en SUMA" e ingresa tu contraseña para tomar tu cupo.`,
                            accountExists: true,
                            existingEmail: existingPatient.email,
                        },
                        { status: 409 }
                    );
                }
            } else {
                const hashedPassword = await hashPassword(rawPass);
                const parsedAge = age !== undefined && age !== '' && age !== null ? Number(age) : null;
                const mappedGender = gender === 'hombre' ? 'masculino' : gender === 'mujer' ? 'femenino' : null;

                const newPatientPayload: Record<string, any> = {
                    name: cleanName,
                    email: cleanEmail,
                    password: hashedPassword,
                    cedula: cleanCedula,
                    document_type: 'Cédula',
                    phone: cleanPhone,
                    age: parsedAge,
                    gender: mappedGender,
                    country: campaignRow.country || 'VE',
                    state: campaignRow.state || null,
                    city: campaignRow.city || null,
                    favorite_doctor_ids: [],
                    profile_completed: true,
                };

                const { data: createdPatient, error: createPatErr } = await supabaseAdmin
                    .from('patients')
                    .insert([newPatientPayload])
                    .select('*')
                    .maybeSingle();

                if (createPatErr || !createdPatient) {
                    console.error('Error creating SUMA patient during campaign registration:', createPatErr);
                    return NextResponse.json(
                        { error: createPatErr?.message || 'No se pudo crear tu cuenta en SUMA.' },
                        { status: 500 }
                    );
                }

                resolvedPatient = createdPatient;

                // Vincular récipes o atenciones previas si existían con su cédula
                if (digitsOnlyCedula.length >= 5) {
                    try {
                        await supabaseAdmin
                            .from('medical_records')
                            .update({ patient_id: createdPatient.id })
                            .is('patient_id', null)
                            .or(`guest_patient_cedula.eq.${cleanCedula},guest_patient_cedula.eq.${digitsOnlyCedula}`);

                        await supabaseAdmin
                            .from('health_campaign_attendances')
                            .update({ patient_id: createdPatient.id, is_registered_patient: true })
                            .is('patient_id', null)
                            .or(`patient_cedula.eq.${cleanCedula},patient_cedula.eq.${digitsOnlyCedula}`);
                    } catch {
                        // non-blocking
                    }
                }
            }
        }

        if (!resolvedPatient) {
            return NextResponse.json(
                { error: 'Debes iniciar sesión o registrarte en SUMA para tomar tu cupo en la jornada.' },
                { status: 401 }
            );
        }

        const finalName = String(name || resolvedPatient.name || '').trim();
        const finalCedula = String(cedula || resolvedPatient.cedula || '').trim();
        const finalEmail = String(email || resolvedPatient.email || '').toLowerCase().trim();
        const finalPhone = String(phone || resolvedPatient.phone || '').trim();
        const finalAge = age !== undefined && age !== '' && age !== null ? Number(age) : resolvedPatient.age ?? null;

        if (!finalName || !finalCedula) {
            return NextResponse.json(
                { error: 'Nombre y número de cédula son obligatorios para generar tu ticket.' },
                { status: 400 }
            );
        }

        const digitsOnly = finalCedula.replace(/\D/g, '');

        // 3. Verificar si esta persona (cédula) ya tiene su cupo reservado en esta misma jornada
        const { data: existingReg } = await supabaseAdmin
            .from('health_campaign_registrations')
            .select('id, ticket_code, spot_number')
            .eq('campaign_id', campaignId)
            .ilike('cedula', `%${digitsOnly || finalCedula}%`)
            .maybeSingle();

        const patientAccountResponse = {
            id: resolvedPatient.id,
            name: resolvedPatient.name,
            email: resolvedPatient.email,
            cedula: resolvedPatient.cedula || finalCedula,
            phone: resolvedPatient.phone || finalPhone,
            age: resolvedPatient.age ?? finalAge,
            gender: resolvedPatient.gender || null,
            country: resolvedPatient.country || 'VE',
            state: resolvedPatient.state || null,
            city: resolvedPatient.city || null,
            profileImage: resolvedPatient.profile_image || null,
            favoriteDoctorIds: resolvedPatient.favorite_doctor_ids || [],
            profileCompleted: true,
            role: 'patient' as const,
            isDoctorAccount,
        };

        if (existingReg) {
            // Asegurar que el registro tenga vinculado el patient_id
            await supabaseAdmin
                .from('health_campaign_registrations')
                .update({ patient_id: resolvedPatient.id })
                .eq('id', existingReg.id);

            return NextResponse.json({
                success: true,
                alreadyRegistered: true,
                id: existingReg.id,
                ticketCode: existingReg.ticket_code,
                spotNumber: existingReg.spot_number,
                isRegisteredInSuma: true,
                patientAccount: patientAccountResponse,
                patientName: finalName,
                patientCedula: finalCedula,
                message: 'Ya tenías tu cupo reservado en esta jornada de salud. ¡Aquí tienes tu ticket!',
            });
        }

        // 4. Verificar límite de cupos y asignar el siguiente número de cupo
        const currentRegs = countRes.data || [];
        const currentCount = countRes.count ?? currentRegs.length;

        if (
            campaignRow.capacity_mode === 'limited' &&
            typeof campaignRow.max_capacity === 'number' &&
            campaignRow.max_capacity > 0 &&
            currentCount >= campaignRow.max_capacity
        ) {
            return NextResponse.json(
                {
                    error: `Lo sentimos, los ${campaignRow.max_capacity} cupos disponibles para esta jornada de salud ya se han agotado.`,
                    soldOut: true,
                },
                { status: 400 }
            );
        }

        const maxSpotSoFar = currentRegs.reduce(
            (maxVal: number, r: any) => (typeof r.spot_number === 'number' && r.spot_number > maxVal ? r.spot_number : maxVal),
            currentCount
        );
        const spotNumber = maxSpotSoFar + 1;
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const ticketCode = `SUMA-TCK-${String(spotNumber).padStart(3, '0')}-${randomSuffix}`;

        const { data, error } = await supabaseAdmin
            .from('health_campaign_registrations')
            .insert([
                {
                    campaign_id: campaignId,
                    patient_id: resolvedPatient.id,
                    name: finalName,
                    cedula: finalCedula,
                    email: finalEmail || null,
                    phone: finalPhone || null,
                    age: finalAge,
                    gender,
                    interest_specialty: interestSpecialty || null,
                    notes: notes || null,
                    payment_method: paymentMethod || null,
                    payment_reference: paymentReference || null,
                    amount_paid: amountPaid !== undefined && amountPaid !== null ? Number(amountPaid) || 0 : 0,
                    ticket_code: ticketCode,
                    spot_number: spotNumber,
                    status: 'registered',
                },
            ])
            .select('*')
            .single();

        if (error) {
            console.error('Error registering for campaign:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 5. Enviar Ticket Digital de Entrada por correo electrónico
        if (finalEmail) {
            sendCampaignTicketEmail({
                patientEmail: finalEmail,
                patientName: finalName,
                patientCedula: finalCedula,
                ticketCode,
                spotNumber,
                campaignId,
                campaignTitle: campaignRow.title || 'Jornada de Salud SUMA',
                organizerName: campaignRow.organizer_name || 'SUMA Salud',
                startDate: campaignRow.start_date || '',
                startTime: campaignRow.start_time || '08:00',
                endTime: campaignRow.end_time || '16:00',
                locationText: [campaignRow.city, campaignRow.state, campaignRow.address].filter(Boolean).join(', '),
                interestSpecialty: interestSpecialty || null,
            }).catch(err => console.error('Error sending campaign ticket email:', err));
        }

        return NextResponse.json(
            {
                success: true,
                id: data.id,
                ticketCode,
                spotNumber,
                isRegisteredInSuma: true,
                patientAccount: patientAccountResponse,
                patientName: finalName,
                patientCedula: finalCedula,
                message: `¡Cuenta SUMA activa y Cupo #${String(spotNumber).padStart(3, '0')} (${ticketCode}) confirmado!`,
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Error in POST /api/health-campaigns/register:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

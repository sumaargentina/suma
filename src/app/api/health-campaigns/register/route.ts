import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCampaignTicketEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/health-campaigns/register?cedula=xxx&campaignId=xxx
// Busca rápidamente por cédula si el paciente ya existe en SUMA o si se pre-anotó en el evento
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const rawCedula = (searchParams.get('cedula') || '').trim();
        const campaignId = searchParams.get('campaignId') || '';

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
// Permite que cualquier persona confirme su asistencia desde el link público del evento
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            campaignId,
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

        if (!campaignId || !name || !cedula) {
            return NextResponse.json(
                { error: 'Nombre, cédula e identificador del evento son obligatorios.' },
                { status: 400 }
            );
        }

        const digitsOnly = String(cedula).replace(/\D/g, '');

        // Verificar si ya se anotó en esta misma jornada
        const { data: existingReg } = await supabaseAdmin
            .from('health_campaign_registrations')
            .select('id, ticket_code, spot_number')
            .eq('campaign_id', campaignId)
            .ilike('cedula', `%${digitsOnly || cedula}%`)
            .maybeSingle();

        if (existingReg) {
            return NextResponse.json({
                success: true,
                alreadyRegistered: true,
                id: existingReg.id,
                ticketCode: existingReg.ticket_code,
                spotNumber: existingReg.spot_number,
                message: 'Ya tenías tu cupo reservado en esta jornada de salud. ¡Aquí tienes tu ticket!',
            });
        }

        // Consultar la jornada para verificar límite de cupos y asignar el siguiente número de cupo
        const [campRes, countRes] = await Promise.all([
            supabaseAdmin
                .from('health_campaigns')
                .select('id, title, organizer_name, start_date, start_time, end_time, city, state, address, capacity_mode, max_capacity')
                .eq('id', campaignId)
                .maybeSingle(),
            supabaseAdmin
                .from('health_campaign_registrations')
                .select('id, spot_number', { count: 'exact' })
                .eq('campaign_id', campaignId),
        ]);

        const campaignRow = campRes.data;
        const currentRegs = countRes.data || [];
        const currentCount = countRes.count ?? currentRegs.length;

        if (
            campaignRow &&
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

        // Verificar si ya es paciente de SUMA
        let existingPatientId: string | null = null;
        if (digitsOnly.length >= 4) {
            const { data: pMatch } = await supabaseAdmin
                .from('patients')
                .select('id')
                .ilike('cedula', `%${digitsOnly}%`)
                .maybeSingle();
            if (pMatch) existingPatientId = pMatch.id;
        }
        if (!existingPatientId && email) {
            const { data: pByEmail } = await supabaseAdmin
                .from('patients')
                .select('id')
                .eq('email', String(email).toLowerCase().trim())
                .maybeSingle();
            if (pByEmail) existingPatientId = pByEmail.id;
        }

        const { data, error } = await supabaseAdmin
            .from('health_campaign_registrations')
            .insert([
                {
                    campaign_id: campaignId,
                    patient_id: existingPatientId,
                    name: String(name).trim(),
                    cedula: String(cedula).trim(),
                    email: email ? String(email).toLowerCase().trim() : null,
                    phone: phone ? String(phone).trim() : null,
                    age: age !== undefined && age !== '' && age !== null ? Number(age) : null,
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

        // Enviar Ticket Digital de Entrada por correo electrónico si indicó su email
        const cleanEmail = email ? String(email).toLowerCase().trim() : '';
        if (cleanEmail && campaignRow) {
            sendCampaignTicketEmail({
                patientEmail: cleanEmail,
                patientName: String(name).trim(),
                patientCedula: String(cedula).trim(),
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

        return NextResponse.json({
            success: true,
            id: data.id,
            ticketCode,
            spotNumber,
            isRegisteredInSuma: Boolean(existingPatientId),
            message: `¡Tu Cupo #${String(spotNumber).padStart(3, '0')} (${ticketCode}) ha sido confirmado!`,
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/health-campaigns/register:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

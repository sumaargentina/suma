import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password-utils';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from '@/lib/utils';
import { sanitizeString, sanitizeEmail } from '@/lib/sanitize';
import { sendRoleWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            clinicId,
            doctorId,
            isExistingDoctor,
            dni,
            name,
            email,
            phone,
            profession,
            specialty,
            medicalLicense,
            password,
            profileImage,
            bannerImage,
        } = body;

        if (!clinicId) {
            return NextResponse.json({ error: 'Falta el ID de la clínica' }, { status: 400 });
        }

        // Fetch clinic details for custom_name, plan, and location defaults
        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from('clinics')
            .select('id, name, plan, city, state, country, address, sector, phone, whatsapp')
            .eq('id', clinicId)
            .single();

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'La clínica no existe' }, { status: 404 });
        }

        const isHospitalGratuito = clinic.plan === 'hospital_gratuito';
        const targetWorkspaceType = isHospitalGratuito ? 'public_hospital' : 'clinic';

        let targetDoctorId = doctorId;

        // Helper para vincular un médico existente a doctor_workspaces sin errores de duplicados
        const linkDoctorWorkspace = async (docId: string) => {
            const { data: existingWsRows } = await supabaseAdmin
                .from('doctor_workspaces')
                .select('id, status')
                .eq('doctor_id', docId)
                .eq('clinic_id', clinicId)
                .limit(1);

            const existingWs = existingWsRows && existingWsRows.length > 0 ? existingWsRows[0] : null;

            if (existingWs) {
                if (existingWs.status === 'active') {
                    return {
                        alreadyActive: true,
                        workspaceStatus: 'active',
                    };
                }
                const { error: updErr } = await supabaseAdmin
                    .from('doctor_workspaces')
                    .update({
                        status: 'active',
                        workspace_type: targetWorkspaceType,
                        custom_name: clinic.name,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existingWs.id);

                if (updErr) throw new Error(updErr.message);
                return {
                    alreadyActive: false,
                    workspaceStatus: 'active',
                };
            }

            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .insert([{
                    doctor_id: docId,
                    workspace_type: targetWorkspaceType,
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    consultation_fee: 0,
                    is_default: false,
                    status: 'active',
                }]);

            if (wsError) throw new Error(wsError.message);
            return {
                alreadyActive: false,
                workspaceStatus: 'active',
            };
        };

        // CASE 1: Linking an EXISTING doctor
        if (isExistingDoctor || targetDoctorId) {
            if (!targetDoctorId && (dni || email)) {
                const orParts: string[] = [];
                if (dni) {
                    const cleanDigits = String(dni).trim().replace(/\D/g, '');
                    orParts.push(`cedula.eq.${String(dni).trim()}`);
                    if (cleanDigits.length >= 5) {
                        orParts.push(`cedula.eq.${cleanDigits}`);
                        orParts.push(`cedula.eq.V-${cleanDigits}`);
                        orParts.push(`cedula.eq.E-${cleanDigits}`);
                        orParts.push(`cedula.eq.P-${cleanDigits}`);
                        orParts.push(`cedula.ilike.%${cleanDigits}%`);
                    }
                }
                if (email) {
                    orParts.push(`email.ilike.${String(email).trim().toLowerCase()}`);
                }

                if (orParts.length > 0) {
                    const { data: foundDocs } = await supabaseAdmin
                        .from('doctors')
                        .select('id, name, email')
                        .or(orParts.join(','))
                        .limit(1);

                    if (foundDocs && foundDocs.length > 0) {
                        targetDoctorId = foundDocs[0].id;
                    }
                }
            }

            if (!targetDoctorId) {
                return NextResponse.json({ error: 'No se encontró ningún médico en SUMA con ese DNI o Correo. Puedes registrarlo en la pestaña "Médico Nuevo".' }, { status: 404 });
            }

            const linkRes = await linkDoctorWorkspace(targetDoctorId);

            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: targetDoctorId,
                workspaceStatus: linkRes.workspaceStatus,
                message: linkRes.alreadyActive
                    ? 'El médico ya se encontraba activo en el equipo de tu institución.'
                    : '¡Médico de SUMA vinculado y activado exitosamente en tu institución!',
            });
        }

        // CASE 2: Registering a NEW doctor from clinic
        if (!name || !email || !dni || !specialty) {
            return NextResponse.json({ error: 'Todos los campos (DNI/Cédula, Nombre, Correo y Especialidad) son obligatorios.' }, { status: 400 });
        }

        const normalizedEmail = sanitizeEmail(email);
        const cleanDni = sanitizeString(dni).replace(/\D/g, '');
        const formattedCedula = String(dni).trim().toUpperCase().startsWith('V-') || String(dni).trim().toUpperCase().startsWith('E-') || String(dni).trim().toUpperCase().startsWith('P-')
            ? String(dni).trim().toUpperCase()
            : (cleanDni ? `V-${cleanDni}` : String(dni).trim());

        // Double-check if doctor with email or DNI already exists to avoid conflict
        const checkOrParts = [`email.ilike.${normalizedEmail}`];
        if (cleanDni.length >= 5) {
            checkOrParts.push(`cedula.eq.${cleanDni}`);
            checkOrParts.push(`cedula.eq.V-${cleanDni}`);
            checkOrParts.push(`cedula.eq.E-${cleanDni}`);
        }

        const { data: existingDocs } = await supabaseAdmin
            .from('doctors')
            .select('id, name, email, cedula')
            .or(checkOrParts.join(','))
            .limit(1);

        const existingDoc = existingDocs && existingDocs.length > 0 ? existingDocs[0] : null;

        if (existingDoc) {
            const linkRes = await linkDoctorWorkspace(existingDoc.id);

            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: existingDoc.id,
                workspaceStatus: linkRes.workspaceStatus,
                message: `El médico ${existingDoc.name} ya tenía cuenta en SUMA y ha sido vinculado directamente al equipo de tu institución.`,
            });
        }

        // Must provide provisional password for a brand new doctor
        if (!password) {
            return NextResponse.json({ error: 'Se requiere una contraseña provisional para el nuevo médico.' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);
        const joinDateArgentina = getCurrentDateInArgentina();
        const paymentDateArgentina = getPaymentDateInArgentina(new Date());
        const resolvedPhone = phone ? String(phone).trim() : (clinic.phone || clinic.whatsapp || '');

        const newDoctorPayload = {
            name: sanitizeString(name),
            email: normalizedEmail,
            cedula: formattedCedula,
            profession: profession ? sanitizeString(profession) : 'Médico',
            specialty: sanitizeString(specialty),
            medical_license: medicalLicense ? sanitizeString(medicalLicense) : null,
            city: clinic.city || 'Maturín',
            state: clinic.state || 'Monagas',
            country: clinic.country || 'VE',
            address: clinic.address || 'Sede Principal',
            sector: clinic.sector || '',
            phone: resolvedPhone,
            whatsapp: resolvedPhone,
            consultation_fee: 0,
            slot_duration: 30,
            password: hashedPassword,
            profile_image: profileImage || 'https://placehold.co/400x400.png',
            banner_image: bannerImage || 'https://placehold.co/1200x400.png',
            status: 'active',
            verification_status: 'verified',
            verified: true,
            read_by_admin: false,
            read_by_seller: false,
            is_clinic_employee: true,
            clinic_id: clinicId,
            join_date: joinDateArgentina,
            next_payment_date: paymentDateArgentina,
            subscription_status: 'inactive',
            rating: 0,
            review_count: 0,
            services: [],
            bank_details: [],
            coupons: [],
            expenses: [],
            schedule: {
                monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                friday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                saturday: { active: false, slots: [] },
                sunday: { active: false, slots: [] },
            },
        };

        const { data: createdDoctor, error: insertError } = await supabaseAdmin
            .from('doctors')
            .insert([newDoctorPayload])
            .select()
            .single();

        if (insertError || !createdDoctor) {
            console.error('Error creating new doctor:', insertError);
            return NextResponse.json({ error: 'Error al registrar médico: ' + (insertError?.message || 'Desconocido') }, { status: 500 });
        }

        // Enviar correo de bienvenida al nuevo médico (no bloqueante)
        sendRoleWelcomeEmail({
            email: normalizedEmail,
            name: createdDoctor.name,
            role: 'doctor',
            extraData: {
                specialty: createdDoctor.specialty,
                verificationStatus: 'verified',
                tempPassword: password,
                clinicName: clinic.name,
            },
        }).catch((err) => console.error('Error enviando correo de bienvenida a médico afiliado:', err));

        // Create both workspaces: Private (inactive until doctor pays SUMA) and Clinic/Hospital (active immediately)
        await supabaseAdmin
            .from('doctor_workspaces')
            .insert([
                {
                    doctor_id: createdDoctor.id,
                    workspace_type: 'private',
                    custom_name: 'Mi Consultorio Privado',
                    role_in_workplace: 'owner',
                    can_manage_finances: true,
                    can_manage_schedule: true,
                    is_default: false,
                    status: 'active',
                },
                {
                    doctor_id: createdDoctor.id,
                    workspace_type: targetWorkspaceType,
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    consultation_fee: 0,
                    is_default: true,
                    status: 'active',
                }
            ]);

        return NextResponse.json({
            success: true,
            isNew: true,
            doctorId: createdDoctor.id,
            workspaceStatus: 'active',
            message: `¡Médico ${createdDoctor.name} registrado en SUMA y vinculado exitosamente a ${clinic.name}!`,
        });

    } catch (error: any) {
        console.error('Exception in POST /api/clinics/doctors/affiliate:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');
        const doctorId = searchParams.get('doctorId');

        if (!clinicId || !doctorId) {
            return NextResponse.json({ error: 'Faltan parámetros (clinicId, doctorId)' }, { status: 400 });
        }

        // 1. Marcar como inactivo el espacio de trabajo del médico con esta clínica/hospital
        const { error: wsError } = await supabaseAdmin
            .from('doctor_workspaces')
            .update({
                status: 'inactive',
                is_default: false,
                updated_at: new Date().toISOString(),
            })
            .eq('doctor_id', doctorId)
            .eq('clinic_id', clinicId);

        if (wsError) {
            console.error('Error unlinking doctor workspace:', wsError);
            return NextResponse.json({ error: 'Error al desvincular espacio de trabajo: ' + wsError.message }, { status: 500 });
        }

        // 2. Si el registro en doctors tenía este clinic_id directo, limpiarlo para que no siga apareciendo en la clínica
        const { data: docRecord } = await supabaseAdmin
            .from('doctors')
            .select('id, clinic_id')
            .eq('id', doctorId)
            .maybeSingle();

        if (docRecord && docRecord.clinic_id === clinicId) {
            await supabaseAdmin
                .from('doctors')
                .update({
                    clinic_id: null,
                    is_clinic_employee: false,
                })
                .eq('id', doctorId);
        }

        // 3. Garantizar que el médico tenga su consultorio privado activo para que su cuenta personal en SUMA siga funcionando
        const { data: privateWs } = await supabaseAdmin
            .from('doctor_workspaces')
            .select('id, status')
            .eq('doctor_id', doctorId)
            .eq('workspace_type', 'private')
            .maybeSingle();

        if (!privateWs) {
            await supabaseAdmin
                .from('doctor_workspaces')
                .insert([{
                    doctor_id: doctorId,
                    workspace_type: 'private',
                    custom_name: 'Mi Consultorio Privado',
                    role_in_workplace: 'owner',
                    can_manage_finances: true,
                    can_manage_schedule: true,
                    is_default: true,
                    status: 'active',
                }]);
        } else if (privateWs.status !== 'active') {
            await supabaseAdmin
                .from('doctor_workspaces')
                .update({ status: 'active', is_default: true })
                .eq('id', privateWs.id);
        }

        return NextResponse.json({
            success: true,
            message: 'El médico ha sido desvinculado de la institución exitosamente. Su cuenta personal en SUMA y el historial de atenciones se mantienen intactos.',
        });
    } catch (error: any) {
        console.error('Exception in DELETE /api/clinics/doctors/affiliate:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

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
            specialty,
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

        // CASE 1: Linking an EXISTING doctor
        if (isExistingDoctor || targetDoctorId) {
            if (!targetDoctorId && dni) {
                const { data: foundDoc } = await supabaseAdmin
                    .from('doctors')
                    .select('id, name, email')
                    .eq('cedula', dni.trim())
                    .maybeSingle();

                if (foundDoc) {
                    targetDoctorId = foundDoc.id;
                }
            }

            if (!targetDoctorId) {
                return NextResponse.json({ error: 'No se encontró el médico especificado para vincular.' }, { status: 404 });
            }

            // Check if workspace affiliation already exists
            const { data: existingWs } = await supabaseAdmin
                .from('doctor_workspaces')
                .select('id, status')
                .eq('doctor_id', targetDoctorId)
                .eq('clinic_id', clinicId)
                .maybeSingle();

            if (existingWs) {
                if (existingWs.status === 'active') {
                    return NextResponse.json({
                        success: true,
                        isNew: false,
                        doctorId: targetDoctorId,
                        workspaceStatus: 'active',
                        message: 'El médico ya se encuentra activo y validado en tu equipo.',
                    });
                }
                await supabaseAdmin
                    .from('doctor_workspaces')
                    .update({
                        status: 'pending_invitation',
                        workspace_type: targetWorkspaceType,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingWs.id);

                return NextResponse.json({
                    success: true,
                    isNew: false,
                    doctorId: targetDoctorId,
                    workspaceStatus: 'pending_invitation',
                    message: 'Se ha reenviado la invitación al médico para que valide su integración a tu espacio de trabajo.',
                });
            }

            // Insert new clinic/hospital workspace for this doctor (pending doctor validation)
            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .insert([{
                    doctor_id: targetDoctorId,
                    workspace_type: targetWorkspaceType,
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    consultation_fee: 0,
                    is_default: false,
                    status: 'pending_invitation',
                }]);

            if (wsError) {
                console.error('Error creating doctor workspace:', wsError);
                return NextResponse.json({ error: 'Error al vincular el médico a la clínica: ' + wsError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: targetDoctorId,
                workspaceStatus: 'pending_invitation',
                message: 'Invitación enviada al médico. Deberá validarla desde su Espacio de Trabajo en SUMA para quedar activo en tu sede.',
            });
        }

        // CASE 2: Registering a NEW doctor from clinic
        if (!name || !email || !dni || !specialty) {
            return NextResponse.json({ error: 'Todos los campos (DNI, Nombre, Correo y Especialidad) son obligatorios.' }, { status: 400 });
        }

        const normalizedEmail = sanitizeEmail(email);
        const cleanDni = sanitizeString(dni).replace(/\D/g, '');

        // Double-check if doctor with email or DNI already exists to avoid conflict
        const { data: existingDoc } = await supabaseAdmin
            .from('doctors')
            .select('id, name, email, cedula')
            .or(`email.eq.${normalizedEmail},cedula.eq.${cleanDni}`)
            .maybeSingle();

        if (existingDoc) {
            // Already exists! Send workspace invitation for validation
            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .upsert([{
                    doctor_id: existingDoc.id,
                    workspace_type: targetWorkspaceType,
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    consultation_fee: 0,
                    is_default: false,
                    status: 'pending_invitation',
                }]);

            if (wsError) {
                return NextResponse.json({ error: 'Error al vincular: ' + wsError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: existingDoc.id,
                workspaceStatus: 'pending_invitation',
                message: `El médico ${existingDoc.name} ya tenía cuenta en SUMA. Se le ha enviado la invitación para validar su integración a tu espacio de trabajo.`,
            });
        }

        // Must provide provisional password for a brand new doctor
        if (!password) {
            return NextResponse.json({ error: 'Se requiere una contraseña provisional para el nuevo médico.' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);
        const joinDateArgentina = getCurrentDateInArgentina();
        const paymentDateArgentina = getPaymentDateInArgentina(new Date());

        const newDoctorPayload = {
            name: sanitizeString(name),
            email: normalizedEmail,
            cedula: cleanDni,
            specialty: sanitizeString(specialty),
            city: clinic.city || 'Maturín',
            state: clinic.state || 'Monagas',
            country: clinic.country || 'VE',
            address: clinic.address || '',
            sector: clinic.sector || '',
            phone: clinic.phone || '',
            whatsapp: clinic.whatsapp || '',
            consultation_fee: 0,
            slot_duration: 30,
            password: hashedPassword,
            profile_image: profileImage || 'https://placehold.co/400x400.png',
            banner_image: bannerImage || 'https://placehold.co/1200x400.png',
            status: 'active',
            verification_status: 'pending',
            read_by_admin: false,
            read_by_seller: false,
            is_clinic_employee: true,
            clinic_id: clinicId,
            join_date: joinDateArgentina,
            next_payment_date: paymentDateArgentina,
            subscription_status: 'active',
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
                verificationStatus: 'pending',
                tempPassword: password,
                clinicName: clinic.name,
            },
        }).catch((err) => console.error('Error enviando correo de bienvenida a médico afiliado:', err));

        // Create both workspaces: Private (active) and Clinic/Hospital (pending doctor validation)
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
                    is_default: true,
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
                    is_default: false,
                    status: 'pending_invitation',
                }
            ]);

        return NextResponse.json({
            success: true,
            isNew: true,
            doctorId: createdDoctor.id,
            workspaceStatus: 'pending_invitation',
            message: `Médico ${createdDoctor.name} registrado en SUMA. Al iniciar sesión deberá validar su integración a tu espacio de trabajo.`,
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

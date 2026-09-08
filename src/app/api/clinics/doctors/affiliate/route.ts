import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password-utils';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from '@/lib/utils';
import { sanitizeString, sanitizeEmail } from '@/lib/sanitize';

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

        // Fetch clinic details for custom_name
        const { data: clinic, error: clinicError } = await supabaseAdmin
            .from('clinics')
            .select('id, name')
            .eq('id', clinicId)
            .single();

        if (clinicError || !clinic) {
            return NextResponse.json({ error: 'La clínica no existe' }, { status: 404 });
        }

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
                if (existingWs.status !== 'active') {
                    await supabaseAdmin
                        .from('doctor_workspaces')
                        .update({ status: 'active', updated_at: new Date().toISOString() })
                        .eq('id', existingWs.id);
                }
                return NextResponse.json({
                    success: true,
                    isNew: false,
                    doctorId: targetDoctorId,
                    message: 'El médico ya estaba vinculado y ha sido reactivado en tu equipo.',
                });
            }

            // Insert new clinic workspace for this doctor
            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .insert([{
                    doctor_id: targetDoctorId,
                    workspace_type: 'clinic',
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    is_default: false,
                    status: 'active',
                }]);

            if (wsError) {
                console.error('Error creating doctor workspace:', wsError);
                return NextResponse.json({ error: 'Error al vincular el médico a la clínica: ' + wsError.message }, { status: 500 });
            }

            // If the doctor has specialty specified for this clinic and doesn't have one, update or keep
            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: targetDoctorId,
                message: 'Médico vinculado exitosamente a tu clínica. Podrá acceder con su misma cuenta de SUMA.',
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
            // Already exists! Link them automatically without password requirement
            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .upsert([{
                    doctor_id: existingDoc.id,
                    workspace_type: 'clinic',
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    is_default: false,
                    status: 'active',
                }]);

            if (wsError) {
                return NextResponse.json({ error: 'Error al vincular: ' + wsError.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                isNew: false,
                doctorId: existingDoc.id,
                message: `El médico ${existingDoc.name} ya tenía cuenta en SUMA y ha sido vinculado directamente a tu clínica.`,
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
            password: hashedPassword,
            profile_image: profileImage || 'https://placehold.co/400x400.png',
            banner_image: bannerImage || 'https://placehold.co/1200x400.png',
            status: 'active',
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

        // Create both workspaces: Private and Clinic
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
                    workspace_type: 'clinic',
                    clinic_id: clinicId,
                    custom_name: clinic.name,
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    is_default: false,
                    status: 'active',
                }
            ]);

        return NextResponse.json({
            success: true,
            isNew: true,
            doctorId: createdDoctor.id,
            message: `Médico ${createdDoctor.name} registrado y vinculado exitosamente a tu clínica.`,
        });

    } catch (error: any) {
        console.error('Exception in POST /api/clinics/doctors/affiliate:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

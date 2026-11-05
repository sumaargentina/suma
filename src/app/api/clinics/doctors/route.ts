import { getClinicDoctors } from '@/lib/supabaseService';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const clinicId = searchParams.get('clinicId');

        if (!clinicId) {
            return NextResponse.json({ error: 'Missing clinic ID' }, { status: 400 });
        }

        const doctors = await getClinicDoctors(clinicId);
        return NextResponse.json(doctors);
    } catch (error: any) {
        console.error('API Error fetching clinic doctors:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const {
            clinicId,
            doctorId,
            schedule,
            services,
            consultationFee,
            slotDuration,
            acceptedInsurances,
            medicalLicense,
            profileImage,
            bannerImage,
            name,
            email,
            cedula,
            phone,
            whatsapp,
            profession,
            specialty,
            password,
            status,
        } = body;

        if (!clinicId || !doctorId) {
            return NextResponse.json({ error: 'clinicId and doctorId are required' }, { status: 400 });
        }

        // 1. Obtener información de la clínica y del médico
        const [{ data: clinic }, { data: docRecord }, { data: existingWsRows }] = await Promise.all([
            supabaseAdmin.from('clinics').select('id, name, plan').eq('id', clinicId).maybeSingle(),
            supabaseAdmin.from('doctors').select('id, clinic_id, is_clinic_employee, medical_license, profile_image, banner_image').eq('id', doctorId).maybeSingle(),
            supabaseAdmin.from('doctor_workspaces').select('id, status').eq('doctor_id', doctorId).eq('clinic_id', clinicId).limit(1),
        ]);

        if (!docRecord) {
            return NextResponse.json({ error: 'Médico no encontrado' }, { status: 404 });
        }

        const wsUpdatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (schedule !== undefined) wsUpdatePayload.schedule = schedule;
        if (services !== undefined) wsUpdatePayload.services = Array.isArray(services) ? services : [];
        if (consultationFee !== undefined) wsUpdatePayload.consultation_fee = Number(consultationFee || 0);
        if (slotDuration !== undefined) wsUpdatePayload.slot_duration = Number(slotDuration || 30);
        if (acceptedInsurances !== undefined) wsUpdatePayload.accepted_insurances = Array.isArray(acceptedInsurances) ? acceptedInsurances : [];

        const existingWs = existingWsRows && existingWsRows.length > 0 ? existingWsRows[0] : null;
        const targetWorkspaceType = clinic?.plan === 'hospital_gratuito' ? 'public_hospital' : 'clinic';

        if (existingWs) {
            const { error: wsError } = await supabaseAdmin
                .from('doctor_workspaces')
                .update(wsUpdatePayload)
                .eq('id', existingWs.id);

            if (wsError) {
                console.error('Error updating doctor_workspaces for clinic:', wsError);
                return NextResponse.json({ error: wsError.message }, { status: 500 });
            }
        } else {
            const { error: wsInsertErr } = await supabaseAdmin
                .from('doctor_workspaces')
                .insert([{
                    doctor_id: doctorId,
                    clinic_id: clinicId,
                    workspace_type: targetWorkspaceType,
                    custom_name: clinic?.name || 'Clínica',
                    role_in_workplace: 'staff_doctor',
                    can_manage_finances: false,
                    can_manage_schedule: true,
                    status: 'active',
                    is_default: Boolean(docRecord.is_clinic_employee && docRecord.clinic_id === clinicId),
                    consultation_fee: consultationFee !== undefined ? Number(consultationFee || 0) : 0,
                    slot_duration: slotDuration !== undefined ? Number(slotDuration || 30) : 30,
                    schedule: schedule || null,
                    services: Array.isArray(services) ? services : [],
                    accepted_insurances: Array.isArray(acceptedInsurances) ? acceptedInsurances : [],
                }]);

            if (wsInsertErr) {
                console.error('Error inserting doctor_workspaces for clinic:', wsInsertErr);
                return NextResponse.json({ error: wsInsertErr.message }, { status: 500 });
            }
        }

        // 2. Si el médico es empleado exclusivo creado por esta clínica (o para campos de perfil básicos), sincronizar con doctors
        // IMPORTANTE: Si es un médico independiente de SUMA, NO sobrescribimos sus servicios, precios ni horarios de su consultorio privado
        const isExclusiveClinicDoctor = docRecord.clinic_id === clinicId && Boolean(docRecord.is_clinic_employee);
        const doctorUpdatePayload: Record<string, any> = {};

        if (isExclusiveClinicDoctor) {
            if (schedule !== undefined) doctorUpdatePayload.schedule = schedule;
            if (services !== undefined) doctorUpdatePayload.services = Array.isArray(services) ? services : [];
            if (consultationFee !== undefined) doctorUpdatePayload.consultation_fee = Number(consultationFee || 0);
            if (slotDuration !== undefined) doctorUpdatePayload.slot_duration = Number(slotDuration || 30);
            if (acceptedInsurances !== undefined) doctorUpdatePayload.accepted_insurances = Array.isArray(acceptedInsurances) ? acceptedInsurances : [];
            if (status !== undefined) doctorUpdatePayload.status = status;
            if (name !== undefined) doctorUpdatePayload.name = name;
            if (email !== undefined) doctorUpdatePayload.email = email;
            if (cedula !== undefined) doctorUpdatePayload.cedula = cedula;
            if (phone !== undefined) {
                doctorUpdatePayload.phone = phone;
                doctorUpdatePayload.whatsapp = whatsapp || phone;
            }
            if (profession !== undefined) doctorUpdatePayload.profession = profession;
            if (specialty !== undefined) doctorUpdatePayload.specialty = specialty;
            if (password !== undefined) doctorUpdatePayload.password = password;
            if (medicalLicense !== undefined) doctorUpdatePayload.medical_license = medicalLicense;
            if (profileImage !== undefined) doctorUpdatePayload.profile_image = profileImage;
            if (bannerImage !== undefined) doctorUpdatePayload.banner_image = bannerImage;
        } else {
            // Médico independiente vinculado a la clínica: solo completar licencia o foto si no tenía o si fue editada explícitamente
            if (medicalLicense && !docRecord.medical_license) {
                doctorUpdatePayload.medical_license = medicalLicense;
            }
            if (profileImage && (!docRecord.profile_image || docRecord.profile_image.includes('placehold.co'))) {
                doctorUpdatePayload.profile_image = profileImage;
            }
            if (bannerImage && (!docRecord.banner_image || docRecord.banner_image.includes('placehold.co'))) {
                doctorUpdatePayload.banner_image = bannerImage;
            }
        }

        if (Object.keys(doctorUpdatePayload).length > 0) {
            await supabaseAdmin
                .from('doctors')
                .update(doctorUpdatePayload)
                .eq('id', doctorId);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('API Error in PATCH /api/clinics/doctors:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendCampaignAttendanceEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// POST /api/health-campaigns/attend
// Registra la atención en vivo de un paciente durante la Jornada de Salud (sin cita previa),
// genera su récipe / informe médico verificable con QR y le envía el correo electrónico correspondiente.
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            campaignId,
            doctorId,
            doctorName,
            specialty,
            patientName,
            patientCedula,
            patientEmail,
            patientPhone,
            patientAge,
            patientGender = 'mujer',
            demographicGroup,
            symptoms = '',
            diagnosis = '',
            evaluation = '',
            treatmentPlan = '',
            prescription = '',
            requestedStudies = '',
            amountPaid = 0,
            paymentStatus = 'free',
            paymentMethod = '',
            paymentReference = '',
        } = body;

        if (!campaignId || !doctorId || !patientName || !patientCedula) {
            return NextResponse.json(
                { error: 'La jornada, el médico, el nombre del paciente y su cédula son obligatorios.' },
                { status: 400 }
            );
        }

        // 1. Obtener información de la jornada
        const { data: campaign } = await supabaseAdmin
            .from('health_campaigns')
            .select('id, title, organizer_name')
            .eq('id', campaignId)
            .maybeSingle();

        const campaignTitle = campaign?.title || 'Jornada de Salud SUMA';
        const organizerName = campaign?.organizer_name || 'SUMA Salud';

        // Asegurar que el médico que está pasando la consulta figure como participante confirmado en la jornada
        try {
            const { data: docInfo } = await supabaseAdmin
                .from('doctors')
                .select('id, name, email, specialty, profile_image')
                .eq('id', doctorId)
                .maybeSingle();

            if (docInfo) {
                await supabaseAdmin
                    .from('health_campaign_doctors')
                    .upsert(
                        {
                            campaign_id: campaignId,
                            doctor_id: docInfo.id,
                            doctor_name: doctorName || docInfo.name || 'Médico SUMA',
                            doctor_email: docInfo.email || null,
                            doctor_specialty: specialty || docInfo.specialty || 'Medicina General',
                            doctor_profile_image: docInfo.profile_image || null,
                            status: 'accepted',
                            read_by_doctor: true,
                            responded_at: new Date().toISOString(),
                        },
                        { onConflict: 'campaign_id,doctor_id' }
                    );
            }
        } catch {
            // Non-blocking
        }

        // 2. Verificar si el paciente YA está registrado en SUMA (por cédula o por correo)
        const digitsOnly = String(patientCedula).replace(/\D/g, '');
        const cleanEmail = patientEmail ? String(patientEmail).toLowerCase().trim() : '';

        let matchedPatient: { id: string; name: string; email?: string; cedula?: string } | null = null;

        if (digitsOnly.length >= 4) {
            const { data: byCedula } = await supabaseAdmin
                .from('patients')
                .select('id, name, email, cedula')
                .or(`cedula.ilike.%${digitsOnly}%,cedula.eq.${patientCedula}`)
                .limit(5);

            if (byCedula && byCedula.length > 0) {
                matchedPatient =
                    byCedula.find(p => (p.cedula || '').replace(/\D/g, '') === digitsOnly) ||
                    byCedula[0];
            }
        }

        if (!matchedPatient && cleanEmail) {
            const { data: byEmail } = await supabaseAdmin
                .from('patients')
                .select('id, name, email, cedula')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (byEmail) {
                matchedPatient = byEmail;
            }
        }

        const isRegisteredPatient = Boolean(matchedPatient?.id);
        const resolvedPatientId = matchedPatient?.id || null;

        // 3. Determinar grupo demográfico (hombre | mujer | nino)
        const parsedAge = patientAge !== undefined && patientAge !== '' && patientAge !== null ? Number(patientAge) : null;
        let finalDemographic: 'hombre' | 'mujer' | 'nino' = 'mujer';
        if (demographicGroup === 'nino' || (parsedAge !== null && !Number.isNaN(parsedAge) && parsedAge < 18)) {
            finalDemographic = 'nino';
        } else if (demographicGroup === 'hombre' || String(patientGender).toLowerCase() === 'hombre' || String(patientGender).toLowerCase() === 'masculino') {
            finalDemographic = 'hombre';
        } else {
            finalDemographic = 'mujer';
        }

        const cleanPrescription = prescription ? String(prescription).trim() : '';
        const cleanStudies = requestedStudies ? String(requestedStudies).trim() : '';
        const hasPrescription = Boolean(cleanPrescription.length > 0);

        // 4. Crear registro en medical_records para que:
        //    - Si ya es usuario registrado en SUMA: quede guardado en su historial médico y récipe dentro de su plataforma.
        //    - Si NO está registrado aún: tenga igual su link verificable /ver-recipe/[id] y /ver-informe/[id] con QR, y si luego se registra se vincule automáticamente.
        //    - Nota: record_type debe ser 'consultation' para cumplir con el check constraint medical_records_record_type_check.
        let medicalRecordId: string | null = null;
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const { data: createdRecord, error: recordErr } = await supabaseAdmin
                .from('medical_records')
                .insert([
                    {
                        patient_id: resolvedPatientId,
                        doctor_id: doctorId,
                        campaign_id: campaignId,
                        guest_patient_name: String(patientName).trim(),
                        guest_patient_cedula: String(patientCedula).trim(),
                        guest_patient_email: cleanEmail || null,
                        guest_patient_phone: patientPhone ? String(patientPhone).trim() : null,
                        visit_date: new Date().toISOString(),
                        record_type: 'consultation',
                        reason_for_visit: `Jornada de Salud: ${campaignTitle}`,
                        symptoms: symptoms || null,
                        diagnosis: diagnosis || evaluation || `Atención en ${campaignTitle}`,
                        evaluation: evaluation || diagnosis || null,
                        treatment_plan: treatmentPlan || cleanPrescription || 'Cumplir indicaciones según pauta médica.',
                        prescription: cleanPrescription || null,
                        requested_studies: cleanStudies || null,
                        medical_report: [
                            `Atención realizada en la Jornada de Salud "${campaignTitle}" organizada por ${organizerName}.`,
                            evaluation ? `Evaluación: ${evaluation}` : '',
                            diagnosis ? `Diagnóstico: ${diagnosis}` : '',
                            treatmentPlan ? `Indicaciones: ${treatmentPlan}` : '',
                        ].filter(Boolean).join('\n\n'),
                        recipe_status: hasPrescription ? 'active' : null,
                        prescription_expires_at: hasPrescription ? expiresAt.toISOString() : null,
                        notes: `Jornada de Salud: ${campaignTitle} (${organizerName})`,
                    },
                ])
                .select('id')
                .single();

            if (!recordErr && createdRecord) {
                medicalRecordId = createdRecord.id;
                const generatedRecipeCode = `SUMA-REC-${createdRecord.id.slice(0, 8).toUpperCase()}`;
                await supabaseAdmin
                    .from('medical_records')
                    .update({ recipe_code: generatedRecipeCode })
                    .eq('id', createdRecord.id);
            } else if (recordErr) {
                console.warn('Warning creating medical_record for campaign attendance:', recordErr);
            }
        } catch (recEx) {
            console.warn('Exception creating medical_record for campaign:', recEx);
        }

        // 5. Guardar la atención en health_campaign_attendances (para estadísticas e historial de la jornada)
        const { data: attendance, error: attErr } = await supabaseAdmin
            .from('health_campaign_attendances')
            .insert([
                {
                    campaign_id: campaignId,
                    doctor_id: doctorId,
                    doctor_name: doctorName || 'Médico SUMA',
                    specialty: specialty || 'Medicina General',
                    patient_id: resolvedPatientId,
                    is_registered_patient: isRegisteredPatient,
                    patient_name: String(patientName).trim(),
                    patient_cedula: String(patientCedula).trim(),
                    patient_email: cleanEmail || null,
                    patient_phone: patientPhone ? String(patientPhone).trim() : null,
                    patient_age: parsedAge,
                    patient_gender: finalDemographic === 'hombre' ? 'hombre' : 'mujer',
                    demographic_group: finalDemographic,
                    symptoms: symptoms || null,
                    diagnosis: diagnosis || null,
                    evaluation: evaluation || null,
                    treatment_plan: treatmentPlan || null,
                    prescription: cleanPrescription || null,
                    requested_studies: cleanStudies || null,
                    has_prescription: hasPrescription,
                    medical_record_id: medicalRecordId,
                    amount_paid: Number(amountPaid) || 0,
                    payment_status: paymentStatus || 'free',
                    payment_method: paymentMethod || null,
                    payment_reference: paymentReference || null,
                    email_sent: Boolean(cleanEmail),
                },
            ])
            .select('*')
            .single();

        if (attErr) {
            console.error('Error inserting campaign attendance:', attErr);
            return NextResponse.json({ error: attErr.message }, { status: 500 });
        }

        // Si se solicitaron estudios de laboratorio y el paciente está registrado, crear orden en laboratory_orders
        if (cleanStudies && resolvedPatientId) {
            try {
                const orderIdSource = medicalRecordId || attendance.id;
                const orderNumber = `SUMA-LAB-${orderIdSource.slice(0, 8).toUpperCase()}`;
                await supabaseAdmin.from('laboratory_orders').insert([
                    {
                        doctor_id: doctorId,
                        patient_id: resolvedPatientId,
                        order_number: orderNumber,
                        studies: [{ name: cleanStudies }],
                        diagnosis: diagnosis || evaluation || `Atención en ${campaignTitle}`,
                        clinical_indications: cleanStudies,
                        doctor_notes: treatmentPlan || null,
                        status: 'pending',
                        results_available: false,
                        valid_from: new Date().toISOString(),
                        valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                ]);
            } catch (labErr) {
                console.warn('Warning creating laboratory_order for campaign attendance:', labErr);
            }
        }

        // 6. Si estaba en la lista de pre-inscritos de la jornada, marcarlo como 'attended'
        if (digitsOnly.length >= 4) {
            await supabaseAdmin
                .from('health_campaign_registrations')
                .update({ status: 'attended', patient_id: resolvedPatientId })
                .eq('campaign_id', campaignId)
                .ilike('cedula', `%${digitsOnly}%`);
        }

        const effectiveVerifyId = medicalRecordId || attendance.id;

        // 7. Enviar correo electrónico al paciente con su participación, récipe y botón (Plataforma SUMA o Registro en SUMA)
        let emailSentSuccess = false;
        if (cleanEmail) {
            try {
                const emailRes = await sendCampaignAttendanceEmail({
                    patientEmail: cleanEmail,
                    patientName: String(patientName).trim(),
                    patientCedula: String(patientCedula).trim(),
                    patientPhone: patientPhone ? String(patientPhone).trim() : null,
                    campaignTitle,
                    organizerName,
                    doctorName: doctorName || 'Médico SUMA',
                    specialty: specialty || 'Medicina General',
                    diagnosis,
                    evaluation,
                    treatmentPlan,
                    prescription: cleanPrescription,
                    requestedStudies: cleanStudies,
                    medicalRecordId: effectiveVerifyId,
                    isRegisteredPatient,
                });
                emailSentSuccess = Boolean(emailRes.success);
            } catch (emailErr) {
                console.error('Error sending campaign attendance email:', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            attendanceId: attendance.id,
            medicalRecordId: effectiveVerifyId,
            isRegisteredPatient,
            emailSent: emailSentSuccess,
            recipeUrl: `/ver-recipe/${effectiveVerifyId}`,
            reportUrl: `/ver-informe/${effectiveVerifyId}`,
        }, { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/health-campaigns/attend:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

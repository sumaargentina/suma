'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { format } from 'date-fns';
import { hashPassword } from '@/lib/password-utils';
import type { Service } from '@/lib/types';
import { sendWalkInWelcomeEmail } from '@/lib/email';
import { roundPrice } from '@/lib/validation-utils';

export async function createWalkInAppointmentAction(data: {
    doctorId?: string;
    doctorName: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    patientDNI?: string;
    services: Service[];
    totalPrice: number;
    consultationFee: number;
    paymentMethod: 'efectivo' | 'transferencia' | 'mercadopago';
    office?: string;
    consultationType?: 'presencial' | 'online';
    clinicServiceId?: string;
}) {
    try {
        // 1. Verificar si el paciente ya existe (por DNI o Email)
        let existingPatient = null;

        if (data.patientDNI) {
            const { data: byDNI } = await supabaseAdmin
                .from('patients')
                .select('*')
                .eq('cedula', data.patientDNI)
                .maybeSingle(); // Usar maybeSingle para evitar error si no existe
            if (byDNI) existingPatient = byDNI;
        }

        if (!existingPatient) {
            const { data: byEmail } = await supabaseAdmin
                .from('patients')
                .select('*')
                .eq('email', data.patientEmail.toLowerCase())
                .maybeSingle();
            if (byEmail) existingPatient = byEmail;
        }

        let patientId: string;
        let isNewPatient = false;

        if (existingPatient) {
            patientId = existingPatient.id;
            console.log('✅ Paciente existente encontrado:', patientId);
        } else {
            // Verificar email en otras tablas solo si estamos creando uno nuevo
            const lowerEmail = data.patientEmail.toLowerCase();
            // ... (rest of logic)

            // Verificar en doctors
            const { data: existingDoctor } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('email', lowerEmail)
                .maybeSingle();

            if (existingDoctor) {
                return {
                    success: false,
                    error: 'Este correo electrónico ya está registrado como médico. Use otro email o busque el paciente existente.',
                };
            }

            // Verificar en sellers
            const { data: existingSeller } = await supabaseAdmin
                .from('sellers')
                .select('id')
                .eq('email', lowerEmail)
                .maybeSingle();

            if (existingSeller) {
                return {
                    success: false,
                    error: 'Este correo electrónico ya está registrado como vendedora. Use otro email.',
                };
            }

            // Verificar en admins
            const { data: existingAdmin } = await supabaseAdmin
                .from('admins')
                .select('id')
                .eq('email', lowerEmail)
                .maybeSingle();

            if (existingAdmin) {
                return {
                    success: false,
                    error: 'Este correo electrónico ya está registrado como administrador. Use otro email.',
                };
            }

            // Crear nuevo paciente
            const tempPassword = 'Suma..00';
            const hashedPassword = await hashPassword(tempPassword);
            const newPatient = {
                name: data.patientName,
                email: data.patientEmail.toLowerCase(),
                password: hashedPassword,
                phone: data.patientPhone || null,
                cedula: data.patientDNI || null,
                // document_type eliminado porque no existe en la tabla patients
                age: null,
                gender: null,
                city: null,
                profile_image: '',
                profile_completed: false,
                favorite_doctor_ids: [data.doctorId],
            };

            const { data: createdPatient, error: createError } = await supabaseAdmin
                .from('patients')
                .insert([newPatient])
                .select()
                .single();

            if (createError) throw createError;
            patientId = createdPatient.id;
            isNewPatient = true;
            console.log('✅ Nuevo paciente creado:', patientId);

            // Enviar correo de bienvenida
            try {
                await sendWalkInWelcomeEmail(data.patientEmail, data.patientName, tempPassword);
                console.log('📧 Correo de bienvenida enviado a:', data.patientEmail);
            } catch (emailError) {
                console.error('❌ Error enviando correo de bienvenida:', emailError);
            }
        }

        // 2. Crear la cita
        const now = new Date();
        const appointment = {
            patient_id: patientId,
            patient_name: data.patientName,
            doctor_id: data.doctorId || null,
            clinic_service_id: data.clinicServiceId || null,
            doctor_name: data.doctorName,
            date: format(now, 'yyyy-MM-dd'),
            time: format(now, 'HH:mm'),
            services: data.services,
            total_price: roundPrice(data.totalPrice),
            consultation_fee: roundPrice(data.consultationFee),
            payment_method: data.paymentMethod,
            payment_status: 'Pagado',
            payment_proof: null,
            attendance: 'Atendido',
            patient_confirmation_status: 'Confirmada',
            clinical_notes: 'Paciente walk-in (sin cita previa)',
            prescription: '',
            messages: [],
            read_by_doctor: true,
            read_by_patient: false,
            unread_messages_by_doctor: 0,
            unread_messages_by_patient: 0,
            doctor_address: data.office, // Guardamos el consultorio en doctor_address
            consultation_type: data.consultationType || 'presencial',
        };

        const { data: createdAppointment, error: appointmentError } = await supabaseAdmin
            .from('appointments')
            .insert([appointment])
            .select()
            .single();

        if (appointmentError) throw appointmentError;

        console.log('✅ Cita walk-in creada:', createdAppointment.id);

        return {
            success: true,
            patientId,
            appointmentId: createdAppointment.id,
            isNewPatient,
        };
    } catch (error: any) {
        console.error('❌ Error creating walk-in appointment:', error);
        return {
            success: false,
            error: error.message || 'Error desconocido',
            details: JSON.stringify(error)
        };
    }
}

export async function sendMessageAction(appointmentId: string, message: { sender: 'doctor' | 'patient', text: string }) {
    try {
        // 1. Obtener mensajes actuales
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('messages, unread_messages_by_patient, unread_messages_by_doctor')
            .eq('id', appointmentId)
            .single();

        if (fetchError) throw fetchError;

        const currentMessages = (appointment.messages as any[]) || [];
        const newMessage = {
            id: crypto.randomUUID(),
            ...message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedMessages = [...currentMessages, newMessage];

        // 2. Actualizar mensajes y contadores
        const updateData: any = {
            messages: updatedMessages,
            last_message_timestamp: newMessage.timestamp
        };

        if (message.sender === 'doctor') {
            updateData.unread_messages_by_patient = (appointment.unread_messages_by_patient || 0) + 1;
            updateData.read_by_patient = false;
            updateData.read_by_doctor = true;
        } else {
            updateData.unread_messages_by_doctor = (appointment.unread_messages_by_doctor || 0) + 1;
            updateData.read_by_doctor = false;
            updateData.read_by_patient = true;
        }

        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId);

        if (updateError) throw updateError;

        return { success: true, message: newMessage };
    } catch (error: any) {
        console.error('Error sending message:', error);
        return { success: false, error: error.message };
    }
}

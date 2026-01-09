/**
 * =====================================================
 * NOTIFICATION SERVICE - MULTI-CHANNEL
 * =====================================================
 * Servicio unificado para enviar notificaciones por:
 * - WhatsApp (via Twilio)
 * - Email (via Resend)
 * - Push Notifications (Web Push API)
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import { whatsappService } from './whatsapp-service';
import { emailService } from './email-service';
import { pushService } from './push-service';
import { supabaseAdmin } from '../supabase-admin';

// =====================================================
// TYPES
// =====================================================

export type NotificationChannel = 'whatsapp' | 'email' | 'push' | 'all';

export interface NotificationPayload {
    // Recipients
    userId?: string;
    email?: string;
    phone?: string;

    // Content
    subject: string;
    message: string;
    htmlMessage?: string; // For email

    // Metadata
    type: NotificationType;
    appointmentId?: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';

    // Channels
    channels?: NotificationChannel[];

    // Scheduling
    scheduleFor?: Date;
}

export type NotificationType =
    | 'appointment_confirmation'
    | 'appointment_reminder_24h'
    | 'appointment_reminder_2h'
    | 'appointment_cancelled'
    | 'appointment_rescheduled'
    | 'payment_received'
    | 'payment_pending'
    | 'prescription_ready'
    | 'lab_results_ready'
    | 'account_created'
    | 'password_reset'
    | 'custom';

export interface NotificationResult {
    success: boolean;
    channel: NotificationChannel;
    messageId?: string;
    error?: string;
    deliveredAt?: Date;
}

export interface NotificationLog {
    id: string;
    userId?: string;
    type: NotificationType;
    channels: NotificationChannel[];
    results: NotificationResult[];
    payload: NotificationPayload;
    createdAt: Date;
    deliveredAt?: Date;
}

// =====================================================
// NOTIFICATION SERVICE CLASS
// =====================================================

class NotificationService {
    /**
     * Send notification through specified channels
     */
    async send(payload: NotificationPayload): Promise<NotificationResult[]> {
        const channels = payload.channels || ['email']; // Default to email
        const results: NotificationResult[] = [];

        console.log('📤 Sending notification:', {
            type: payload.type,
            channels,
            priority: payload.priority || 'normal',
        });

        // Determine which channels to use
        if (channels.includes('all')) {
            // Send to all available channels
            if (payload.phone) {
                results.push(await this.sendWhatsApp(payload));
            }
            if (payload.email) {
                results.push(await this.sendEmail(payload));
            }
            if (payload.userId) {
                results.push(await this.sendPush(payload));
            }
        } else {
            // Send to specific channels
            for (const channel of channels) {
                switch (channel) {
                    case 'whatsapp':
                        if (payload.phone) {
                            results.push(await this.sendWhatsApp(payload));
                        }
                        break;
                    case 'email':
                        if (payload.email) {
                            results.push(await this.sendEmail(payload));
                        }
                        break;
                    case 'push':
                        if (payload.userId) {
                            results.push(await this.sendPush(payload));
                        }
                        break;
                }
            }
        }

        // Log notification
        await this.logNotification(payload, results);

        return results;
    }

    /**
     * Send WhatsApp message
     */
    private async sendWhatsApp(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            if (!payload.phone) {
                return {
                    success: false,
                    channel: 'whatsapp',
                    error: 'No phone number provided',
                };
            }

            const result = await whatsappService.send({
                to: payload.phone,
                message: payload.message,
            });

            return {
                success: result.success,
                channel: 'whatsapp',
                messageId: result.messageId,
                error: result.error,
                deliveredAt: result.success ? new Date() : undefined,
            };
        } catch (error) {
            console.error('❌ WhatsApp notification error:', error);
            return {
                success: false,
                channel: 'whatsapp',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send Email
     */
    private async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            if (!payload.email) {
                return {
                    success: false,
                    channel: 'email',
                    error: 'No email provided',
                };
            }

            const result = await emailService.send({
                to: payload.email,
                subject: payload.subject,
                text: payload.message,
                html: payload.htmlMessage || this.generateEmailHTML(payload),
            });

            return {
                success: result.success,
                channel: 'email',
                messageId: result.messageId,
                error: result.error,
                deliveredAt: result.success ? new Date() : undefined,
            };
        } catch (error) {
            console.error('❌ Email notification error:', error);
            return {
                success: false,
                channel: 'email',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send Push Notification
     */
    private async sendPush(payload: NotificationPayload): Promise<NotificationResult> {
        try {
            if (!payload.userId) {
                return {
                    success: false,
                    channel: 'push',
                    error: 'No user ID provided',
                };
            }

            const result = await pushService.send({
                userId: payload.userId,
                title: payload.subject,
                body: payload.message,
                data: {
                    type: payload.type,
                    appointmentId: payload.appointmentId,
                },
            });

            return {
                success: result.success,
                channel: 'push',
                error: result.error,
                deliveredAt: result.success ? new Date() : undefined,
            };
        } catch (error) {
            console.error('❌ Push notification error:', error);
            return {
                success: false,
                channel: 'push',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Log notification to database
     */
    private async logNotification(
        payload: NotificationPayload,
        results: NotificationResult[]
    ): Promise<void> {
        try {
            await supabaseAdmin.from('notification_logs').insert({
                user_id: payload.userId,
                type: payload.type,
                channels: payload.channels || ['email'],
                results: results,
                payload: payload,
                created_at: new Date().toISOString(),
                delivered_at: results.some(r => r.success) ? new Date().toISOString() : null,
            });
        } catch (error) {
            console.error('❌ Error logging notification:', error);
        }
    }

    /**
     * Generate HTML for email
     */
    private generateEmailHTML(payload: NotificationPayload): string {
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 16px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SUMA</h1>
              <p>Sistema Unificado de Medicina Avanzada</p>
            </div>
            <div class="content">
              <h2>${payload.subject}</h2>
              <p>${payload.message.replace(/\n/g, '<br>')}</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SUMA. Todos los derechos reservados.</p>
              <p>Este es un mensaje automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    }

    /**
     * Send appointment reminder
     */
    async sendAppointmentReminder(
        appointmentId: string,
        hoursBeforeq: number
    ): Promise<NotificationResult[]> {
        try {
            // Get appointment details
            const { data: appointment, error } = await supabaseAdmin
                .from('appointments')
                .select('*, patients(*), doctors(*)')
                .eq('id', appointmentId)
                .single();

            if (error || !appointment) {
                throw new Error('Appointment not found');
            }

            const patient = appointment.patients;
            const doctor = appointment.doctors;

            // Determine notification type
            const type = hoursBeforeq === 24
                ? 'appointment_reminder_24h'
                : 'appointment_reminder_2h';

            // Format message
            const message = `
Recordatorio de Cita - SUMA

${hoursBeforeq === 24 ? '📅 Mañana' : '⏰ En 2 horas'} tienes tu cita:

👨‍⚕️ Doctor: ${doctor.name}
📍 Lugar: ${appointment.doctor_address || appointment.consultation_type === 'online' ? 'Videollamada' : 'Consultorio'}
🕐 Hora: ${appointment.time}
📅 Fecha: ${appointment.date}

${appointment.consultation_type === 'online' ? '💻 Recibirás el link de la videollamada antes de la cita.' : ''}

¿Necesitas cancelar o reprogramar? Contáctanos.
      `.trim();

            return await this.send({
                userId: patient.id,
                email: patient.email,
                phone: patient.phone,
                subject: `Recordatorio: Cita con Dr. ${doctor.name}`,
                message,
                type,
                appointmentId,
                priority: hoursBeforeq === 2 ? 'high' : 'normal',
                channels: ['whatsapp', 'push'],
            });
        } catch (error) {
            console.error('❌ Error sending appointment reminder:', error);
            return [];
        }
    }

    /**
     * Send appointment confirmation
     */
    async sendAppointmentConfirmation(appointmentId: string): Promise<NotificationResult[]> {
        try {
            const { data: appointment, error } = await supabaseAdmin
                .from('appointments')
                .select('*, patients(*), doctors(*)')
                .eq('id', appointmentId)
                .single();

            if (error || !appointment) {
                throw new Error('Appointment not found');
            }

            const patient = appointment.patients;
            const doctor = appointment.doctors;
            let familyMember = null;
            let patientName = patient.name;

            // Fetch family member if exists
            // Supabase returns snake_case columns by default via supabaseAdmin
            if (appointment.family_member_id) {
                const { data: fm } = await supabaseAdmin
                    .from('family_members')
                    .select('*')
                    .eq('id', appointment.family_member_id)
                    .single();

                if (fm) {
                    familyMember = fm;
                    patientName = `${fm.first_name} ${fm.last_name}`;
                }
            }

            const message = `
¡Cita Confirmada! ✅

Tu cita ha sido agendada exitosamente:

👤 Paciente: ${patientName}
👨‍⚕️ Doctor: ${doctor.name}
📍 Lugar: ${appointment.doctor_address || appointment.consultation_type === 'online' ? 'Videollamada' : 'Consultorio'}
🕐 Hora: ${appointment.time}
📅 Fecha: ${appointment.date}
💰 Monto: $${appointment.total_price}

${appointment.consultation_type === 'online' ? '💻 Recibirás el link de la videollamada antes de la cita.' : ''}
Te enviaremos recordatorios antes de tu cita.

¡Nos vemos pronto!
      `.trim();

            const results: NotificationResult[] = [];

            // 1. Send to Account Holder (Patient)
            const holderResults = await this.send({
                userId: patient.id,
                email: patient.email,
                phone: patient.phone,
                subject: `Cita Confirmada para ${patientName} - SUMA`,
                message,
                type: 'appointment_confirmation',
                appointmentId,
                priority: 'normal',
                channels: ['email', 'whatsapp', 'push'],
            });
            results.push(...holderResults);

            // 2. Send to Family Member (if has email)
            if (familyMember && familyMember.email) {
                console.log(`📧 Sending copy to family member: ${familyMember.email}`);
                const fmResults = await this.send({
                    email: familyMember.email,
                    // If they have a phone, we could also send whatsapp, but let's stick to email for now to avoid spam/cost
                    // phone: familyMember.phone, 
                    subject: `Tu Cita Confirmada - SUMA`,
                    message,
                    type: 'appointment_confirmation',
                    appointmentId,
                    priority: 'normal',
                    channels: ['email'],
                });
                results.push(...fmResults);
            }

            return results;
        } catch (error) {
            console.error('❌ Error sending appointment confirmation:', error);
            return [];
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;

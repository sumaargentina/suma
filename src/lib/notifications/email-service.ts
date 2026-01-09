/**
 * =====================================================
 * EMAIL SERVICE - RESEND
 * =====================================================
 * Servicio para enviar emails transaccionales usando Resend
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import { Resend } from 'resend';

// =====================================================
// TYPES
// =====================================================

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'SUMA <noreply@suma.com.ar>';

// Initialize Resend
let resendClient: Resend | null = null;

if (RESEND_API_KEY) {
  resendClient = new Resend(RESEND_API_KEY);
} else {
  console.warn('⚠️ Resend API key not configured. Email notifications will not work.');
}

// =====================================================
// EMAIL SERVICE CLASS
// =====================================================

class EmailService {
  /**
   * Send email
   */
  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      if (!resendClient) {
        return {
          success: false,
          error: 'Resend client not initialized. Check API key.',
        };
      }

      console.log('📧 Sending email to:', message.to);

      const result = await resendClient.emails.send({
        from: message.from || DEFAULT_FROM,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        reply_to: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments as any,
      } as any);

      if (result.error) {
        throw new Error(result.error.message);
      }

      console.log('✅ Email sent successfully:', result.data?.id);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('❌ Email send error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(data: {
    to: string;
    patientName: string;
    doctorName: string;
    date: string;
    time: string;
    location: string;
    totalPrice: number;
  }): Promise<EmailResult> {
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
      .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
      .header p { margin: 8px 0 0; opacity: 0.9; }
      .content { padding: 40px 30px; }
      .success-icon { font-size: 48px; text-align: center; margin-bottom: 20px; }
      .info-box { background: #f9fafb; border-left: 4px solid #2563eb; padding: 20px; margin: 24px 0; border-radius: 6px; }
      .info-row { display: flex; margin: 12px 0; }
      .info-label { font-weight: 600; min-width: 100px; color: #4b5563; }
      .info-value { color: #1f2937; }
      .price-box { background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }
      .price-label { font-size: 14px; color: #1e40af; font-weight: 600; text-transform: uppercase; }
      .price-value { font-size: 32px; color: #1e40af; font-weight: 700; margin-top: 8px; }
      .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
      .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
      .footer p { margin: 8px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>SUMA</h1>
        <p>Sistema Unificado de Medicina Avanzada</p>
      </div>
      
      <div class="content">
        <div class="success-icon">✅</div>
        <h2 style="text-align: center; color: #1f2937; margin: 0 0 10px;">¡Cita Confirmada!</h2>
        <p style="text-align: center; color: #6b7280; margin: 0 0 30px;">Hola ${data.patientName}, tu cita ha sido agendada exitosamente.</p>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">👨‍⚕️ Médico:</span>
            <span class="info-value">${data.doctorName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">📅 Fecha:</span>
            <span class="info-value">${data.date}</span>
          </div>
          <div class="info-row">
            <span class="info-label">🕐 Hora:</span>
            <span class="info-value">${data.time}</span>
          </div>
          <div class="info-row">
            <span class="info-label">📍 Lugar:</span>
            <span class="info-value">${data.location}</span>
          </div>
        </div>
        
        <div class="price-box">
          <div class="price-label">Monto Total</div>
          <div class="price-value">$${data.totalPrice.toLocaleString('es-AR')}</div>
        </div>
        
        <p style="color: #4b5563; line-height: 1.8;">
          <strong>📲 Recordatorios:</strong><br>
          Te enviaremos recordatorios automáticos 24 horas y 2 horas antes de tu cita.
        </p>
        
        <p style="color: #4b5563; line-height: 1.8;">
          <strong>❓ ¿Necesitas cancelar o reprogramar?</strong><br>
          Accede a tu panel de paciente o contáctanos.
        </p>
        
        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Ver Mi Panel</a>
        </div>
      </div>
      
      <div class="footer">
        <p><strong>SUMA</strong> - Sistema Unificado de Medicina Avanzada</p>
        <p>© ${new Date().getFullYear()} Todos los derechos reservados</p>
        <p style="font-size: 12px; margin-top: 16px;">Este es un mensaje automático, por favor no responder directamente a este email.</p>
      </div>
    </div>
  </body>
</html>
    `;

    return this.send({
      to: data.to,
      subject: `Cita Confirmada con Dr. ${data.doctorName} - SUMA`,
      html,
      text: `¡Cita Confirmada!\n\nMédico: ${data.doctorName}\nFecha: ${data.date}\nHora: ${data.time}\nLugar: ${data.location}\nMonto: $${data.totalPrice}`,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(data: {
    to: string;
    name: string;
    resetLink: string;
  }): Promise<EmailResult> {
    const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: #ffffff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
      .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>SUMA</h1>
      </div>
      <div class="content">
        <h2>Restablecer Contraseña</h2>
        <p>Hola <strong>${data.name}</strong>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <div style="text-align: center;">
          <a href="${data.resetLink}" class="button">Restablecer Contraseña</a>
        </div>
        <div class="warning">
          <p style="margin: 0;"><strong>⚠️ Importante:</strong> Este link expira en 1 hora. Si no solicitaste este cambio, ignora este email.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    return this.send({
      to: data.to,
      subject: 'Restablecer Contraseña - SUMA',
      html,
      text: `Hola ${data.name},\n\nRecibimos una solicitud para restablecer tu contraseña.\n\nHaz clic aquí: ${data.resetLink}\n\nEste link expira en 1 hora.`,
    });
  }

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;

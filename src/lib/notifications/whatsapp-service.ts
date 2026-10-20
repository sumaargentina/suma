/**
 * =====================================================
 * WHATSAPP SERVICE - TWILIO
 * =====================================================
 * Servicio para enviar mensajes de WhatsApp usando Twilio
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import twilio from 'twilio';

// =====================================================
// TYPES
// =====================================================

export interface WhatsAppMessage {
    to: string; // Phone number in format: +5491112345678
    message: string;
    mediaUrl?: string; // Optional image/document URL
}

export interface WhatsAppResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// =====================================================
// CONFIGURATION
// =====================================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio Sandbox

// Initialize Twilio client
let twilioClient: ReturnType<typeof twilio> | null = null;

if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
    console.warn('⚠️ Twilio credentials not configured. WhatsApp notifications will not work.');
}

// =====================================================
// WHATSAPP SERVICE CLASS
// =====================================================

class WhatsAppService {
    /**
     * Send WhatsApp message
     */
    async send(message: WhatsAppMessage): Promise<WhatsAppResult> {
        try {
            if (!twilioClient) {
                return {
                    success: false,
                    error: 'Twilio client not initialized. Check credentials.',
                };
            }

            // Format phone number
            const formattedPhone = this.formatPhoneNumber(message.to);

            console.log('📱 Sending WhatsApp to:', formattedPhone);

            // Send message
            const twilioMessage = await twilioClient.messages.create({
                body: message.message,
                from: TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:${formattedPhone}`,
                ...(message.mediaUrl && { mediaUrl: [message.mediaUrl] }),
            });

            console.log('✅ WhatsApp sent successfully:', twilioMessage.sid);

            return {
                success: true,
                messageId: twilioMessage.sid,
            };
        } catch (error) {
            console.error('❌ WhatsApp send error:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Send template message (for approved templates)
     */
    async sendTemplate(
        to: string,
        templateName: string,
        parameters: Record<string, string>
    ): Promise<WhatsAppResult> {
        try {
            if (!twilioClient) {
                return {
                    success: false,
                    error: 'Twilio client not initialized',
                };
            }

            const formattedPhone = this.formatPhoneNumber(to);

            // For WhatsApp Business API templates
            const twilioMessage = await twilioClient.messages.create({
                contentSid: templateName,
                contentVariables: JSON.stringify(parameters),
                from: TWILIO_WHATSAPP_NUMBER,
                to: `whatsapp:${formattedPhone}`,
            });

            return {
                success: true,
                messageId: twilioMessage.sid,
            };
        } catch (error) {
            console.error('❌ WhatsApp template error:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Format phone number to E.164 format
     * Input: 04141234567, 4141234567 or 584141234567
     * Output: +584141234567
     */
    private formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // If phone starts with local 0 (e.g. 0414...), strip leading 0
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }

        // Si es número móvil de Venezuela (10 dígitos: 414, 424, 412, 416, 426) o número corto local, anteponer 58
        if (!cleaned.startsWith('58') && (
            cleaned.startsWith('414') || 
            cleaned.startsWith('424') || 
            cleaned.startsWith('412') || 
            cleaned.startsWith('416') || 
            cleaned.startsWith('426') || 
            cleaned.length === 10
        )) {
            cleaned = '58' + cleaned;
        } else if (cleaned.length < 11 && !cleaned.startsWith('58') && !cleaned.startsWith('54') && !cleaned.startsWith('1')) {
            // Fallback por defecto a Venezuela (+58)
            cleaned = '58' + cleaned;
        }

        // Add + prefix
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }

    /**
     * Validate phone number format (E.164: 7 to 15 digits)
     */
    validatePhoneNumber(phone: string): boolean {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 7 && cleaned.length <= 15;
    }

    /**
     * Get message status
     */
    async getMessageStatus(messageId: string): Promise<string | null> {
        try {
            if (!twilioClient) return null;

            const message = await twilioClient.messages(messageId).fetch();
            return message.status;
        } catch (error) {
            console.error('❌ Error fetching message status:', error);
            return null;
        }
    }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
export default whatsappService;

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
     * Input: 1112345678 or 5491112345678
     * Output: +5491112345678
     */
    private formatPhoneNumber(phone: string): string {
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // If doesn't start with country code, assume Argentina (+54)
        if (!cleaned.startsWith('54')) {
            cleaned = '54' + cleaned;
        }

        // Add + prefix
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        return cleaned;
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone: string): boolean {
        const cleaned = phone.replace(/\D/g, '');
        // Argentina phone numbers: 54 + area code (2-4 digits) + number (6-8 digits)
        // Total: 10-13 digits
        return cleaned.length >= 10 && cleaned.length <= 13;
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

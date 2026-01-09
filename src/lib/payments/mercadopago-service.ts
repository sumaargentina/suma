/**
 * =====================================================
 * MERCADOPAGO SERVICE
 * =====================================================
 * Servicio para integración con MercadoPago
 * - Crear preferencias de pago
 * - Procesar webhooks
 * - Verificar pagos
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import MercadoPagoConfig, { Preference, Payment } from 'mercadopago';

// =====================================================
// CONFIGURATION
// =====================================================

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

// Initialize Client
let client: MercadoPagoConfig | null = null;
let preference: Preference | null = null;
let payment: Payment | null = null; // Corrected: Using Payment class directly if available or generic resource

if (MP_ACCESS_TOKEN) {
    client = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
    preference = new Preference(client);
    payment = new Payment(client);
    console.log('✅ MercadoPago client initialized');
} else {
    console.warn('⚠️ MP_ACCESS_TOKEN not configured. Payments will not work.');
}

// =====================================================
// TYPES
// =====================================================

export interface CheckoutItem {
    id: string;
    title: string;
    quantity: number;
    unit_price: number;
    currency_id: 'ARS';
    description?: string;
}

export interface PayerData {
    name: string;
    surname: string;
    email: string;
    phone?: {
        area_code: string;
        number: string;
    };
}

export interface PaymentPreferenceData {
    items: CheckoutItem[];
    payer: PayerData;
    external_reference: string; // Used to track appointment ID
    metadata?: Record<string, any>;
}

// =====================================================
// SERVICE CLASS
// =====================================================

class MercadoPagoService {
    /**
     * Create a checkout preference
     */
    async createPreference(data: PaymentPreferenceData, customAccessToken?: string, marketplaceFee?: number) {
        let currentPreference = preference;

        // Si hay token personalizado (Doctor conectado), creamos una instancia temporal
        if (customAccessToken) {
            const customClient = new MercadoPagoConfig({ accessToken: customAccessToken });
            currentPreference = new Preference(customClient);
        }

        if (!currentPreference) {
            // Fallback si no hay token global ni custom
            if (!customAccessToken) throw new Error('MercadoPago not initialized');
            // Si hay customAccessToken pero falló algo arriba (no debería pasar)
        }

        try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

            const body: any = {
                items: data.items,
                payer: {
                    email: data.payer.email,
                    name: data.payer.name,
                    surname: data.payer.surname,
                },
                external_reference: data.external_reference,
                metadata: data.metadata,
                back_urls: {
                    success: `${appUrl}/checkout/success?session_id=${data.external_reference}`,
                    failure: `${appUrl}/checkout/failure`,
                    pending: `${appUrl}/checkout/pending`,
                },
                auto_return: 'approved',
                payment_methods: {
                    excluded_payment_methods: [],
                    excluded_payment_types: [
                        { id: "ticket" } // Exclude cash payments if instant confirmation is needed (optional)
                    ],
                    installments: 6, // Max installments
                },
                statement_descriptor: "SUMA SALUD",
            };

            // Agregar comisión de marketplace si corresponde
            if (marketplaceFee && marketplaceFee > 0) {
                body.marketplace_fee = marketplaceFee;
            }

            const result = await currentPreference!.create({ body });

            return {
                id: result.id,
                init_point: result.init_point, // URL for production
                sandbox_init_point: result.sandbox_init_point, // URL for testing
            };
        } catch (error) {
            console.error('❌ Error creating MP preference:', error);
            throw error;
        }
    }

    /**
     * Get payment details
     */
    async getPayment(paymentId: string) {
        if (!payment) throw new Error('MercadoPago not initialized');

        try {
            return await payment.get({ id: paymentId });
        } catch (error) {
            console.error('❌ Error getting payment:', error);
            throw error;
        }
    }
}

export const mercadoPagoService = new MercadoPagoService();
export default mercadoPagoService;

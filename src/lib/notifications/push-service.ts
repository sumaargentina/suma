/**
 * =====================================================
 * PUSH NOTIFICATION SERVICE
 * =====================================================
 * Servicio para enviar Push Notifications usando Web Push API
 * 
 * @version 1.0.0
 * @date 2025-12-14
 */

import webpush from 'web-push';
import { supabaseAdmin } from '../supabase-admin';

// =====================================================
// TYPES
// =====================================================

export interface PushMessage {
    userId: string;
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, any>;
    actions?: PushAction[];
    tag?: string; // For grouping notifications
    requireInteraction?: boolean;
}

export interface PushAction {
    action: string;
    title: string;
    icon?: string;
}

export interface PushResult {
    success: boolean;
    error?: string;
    sentCount?: number;
}

export interface PushSubscription {
    userId: string;
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
    userAgent?: string;
    deviceInfo?: Record<string, any>;
}

// =====================================================
// CONFIGURATION
// =====================================================

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@suma.com.ar';

// Initialize Web Push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        VAPID_SUBJECT,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
} else {
    console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
}

// =====================================================
// PUSH SERVICE CLASS
// =====================================================

class PushService {
    /**
     * Send push notification to user
     */
    async send(message: PushMessage): Promise<PushResult> {
        try {
            // Get all subscriptions for this user
            const subscriptions = await this.getUserSubscriptions(message.userId);

            if (subscriptions.length === 0) {
                return {
                    success: false,
                    error: 'No push subscriptions found for user',
                    sentCount: 0,
                };
            }

            console.log(`📲 Sending push to ${subscriptions.length} device(s)`);

            // Create notification payload
            const payload = JSON.stringify({
                title: message.title,
                body: message.body,
                icon: message.icon || '/icon-192x192.png',
                badge: message.badge || '/badge-72x72.png',
                data: message.data || {},
                actions: message.actions || [],
                tag: message.tag,
                requireInteraction: message.requireInteraction || false,
                timestamp: Date.now(),
            });

            // Send to all subscriptions
            const results = await Promise.allSettled(
                subscriptions.map(sub =>
                    webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys,
                        },
                        payload
                    )
                )
            );

            // Count successful sends
            const successCount = results.filter(r => r.status === 'fulfilled').length;
            const failedCount = results.filter(r => r.status === 'rejected').length;

            // Remove invalid subscriptions
            if (failedCount > 0) {
                await this.removeInvalidSubscriptions(subscriptions, results);
            }

            console.log(`✅ Push sent: ${successCount} success, ${failedCount} failed`);

            return {
                success: successCount > 0,
                sentCount: successCount,
                error: failedCount > 0 ? `${failedCount} subscription(s) failed` : undefined,
            };
        } catch (error) {
            console.error('❌ Push notification error:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                sentCount: 0,
            };
        }
    }

    /**
     * Subscribe user to push notifications
     */
    async subscribe(subscription: PushSubscription): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if subscription already exists
            const { data: existing } = await supabaseAdmin
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', subscription.userId)
                .eq('endpoint', subscription.endpoint)
                .single();

            if (existing) {
                // Update existing subscription
                await supabaseAdmin
                    .from('push_subscriptions')
                    .update({
                        p256dh: subscription.keys.p256dh,
                        auth: subscription.keys.auth,
                        user_agent: subscription.userAgent,
                        device_info: subscription.deviceInfo,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
            } else {
                // Create new subscription
                await supabaseAdmin.from('push_subscriptions').insert({
                    user_id: subscription.userId,
                    endpoint: subscription.endpoint,
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                    user_agent: subscription.userAgent,
                    device_info: subscription.deviceInfo,
                });
            }

            console.log('✅ Push subscription saved for user:', subscription.userId);

            return { success: true };
        } catch (error) {
            console.error('❌ Error saving push subscription:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe(userId: string, endpoint: string): Promise<{ success: boolean }> {
        try {
            await supabaseAdmin
                .from('push_subscriptions')
                .delete()
                .eq('user_id', userId)
                .eq('endpoint', endpoint);

            console.log('✅ Push subscription removed');

            return { success: true };
        } catch (error) {
            console.error('❌ Error removing push subscription:', error);
            return { success: false };
        }
    }

    /**
     * Get all subscriptions for a user
     */
    private async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
        try {
            const { data, error } = await supabaseAdmin
                .from('push_subscriptions')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;

            return (data || []).map(sub => ({
                userId: sub.user_id,
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
                userAgent: sub.user_agent,
                deviceInfo: sub.device_info,
            }));
        } catch (error) {
            console.error('❌ Error fetching subscriptions:', error);
            return [];
        }
    }

    /**
     * Remove invalid subscriptions
     */
    private async removeInvalidSubscriptions(
        subscriptions: PushSubscription[],
        results: PromiseSettledResult<any>[]
    ): Promise<void> {
        try {
            const invalidEndpoints: string[] = [];

            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    const error = result.reason;
                    // Check if it's a 410 Gone (subscription expired)
                    if (error?.statusCode === 410 || error?.statusCode === 404) {
                        invalidEndpoints.push(subscriptions[index].endpoint);
                    }
                }
            });

            if (invalidEndpoints.length > 0) {
                await supabaseAdmin
                    .from('push_subscriptions')
                    .delete()
                    .in('endpoint', invalidEndpoints);

                console.log(`🗑️ Removed ${invalidEndpoints.length} invalid subscription(s)`);
            }
        } catch (error) {
            console.error('❌ Error removing invalid subscriptions:', error);
        }
    }

    /**
     * Generate VAPID keys (run once during setup)
     */
    static generateVapidKeys(): { publicKey: string; privateKey: string } {
        const vapidKeys = webpush.generateVAPIDKeys();
        return {
            publicKey: vapidKeys.publicKey,
            privateKey: vapidKeys.privateKey,
        };
    }
}

// Export singleton instance
export const pushService = new PushService();
export default pushService;

// Export helper to generate VAPID keys
export const generateVapidKeys = PushService.generateVapidKeys;

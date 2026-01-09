import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { notificationService } from '@/lib/notifications/notification-service';

export const dynamic = 'force-dynamic'; // Asegura que no se cachee

export async function GET(request: Request) {
    try {
        // 1. Verificar autorización (Simple Bearer token para seguridad básica)
        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            // Nota: Configura CRON_SECRET en tus variables de entorno con una clave segura
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('⏰ Starting notification processing...');

        // 2. Buscar notificaciones pendientes cuya hora ya llegó
        const { data: notifications, error } = await supabaseAdmin
            .from('scheduled_notifications')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .limit(50); // Procesar en lotes de 50 para evitar timeouts

        if (error) throw error;

        if (!notifications || notifications.length === 0) {
            return NextResponse.json({ message: 'No pending notifications' });
        }

        console.log(`📨 Processing ${notifications.length} notifications...`);

        const results = [];

        // 3. Procesar cada notificación
        for (const notification of notifications) {
            try {
                // Enviar usando el servicio de notificaciones
                // El payload ya debe tener toda la info necesaria
                const sendResults = await notificationService.send({
                    ...notification.payload,
                    userId: notification.user_id,
                    // Asegurarnos que los canales del scheduled coincidan
                    channels: notification.channels || ['email']
                });

                // Actualizar estado a 'executed'
                await supabaseAdmin
                    .from('scheduled_notifications')
                    .update({
                        status: 'executed',
                        executed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', notification.id);

                results.push({ id: notification.id, status: 'success', details: sendResults });

            } catch (err) {
                console.error(`❌ Error processing notification ${notification.id}:`, err);

                // Manejo de errores y reintentos
                const retryCount = (notification.retry_count || 0) + 1;
                const maxRetries = notification.max_retries || 3;

                if (retryCount >= maxRetries) {
                    // Marcar como fallido permanentemente
                    await supabaseAdmin
                        .from('scheduled_notifications')
                        .update({
                            status: 'failed',
                            error_message: err instanceof Error ? err.message : 'Unknown error',
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', notification.id);
                } else {
                    // Programar reintento (backoff simple)
                    // No cambiamos 'scheduled_for' para que se reintente en la próxima ejecución
                    // Pero incrementamos el contador
                    await supabaseAdmin
                        .from('scheduled_notifications')
                        .update({
                            retry_count: retryCount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', notification.id);
                }

                results.push({ id: notification.id, status: 'error', error: err });
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });

    } catch (error) {
        console.error('🔥 Cron job validation error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}

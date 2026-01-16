"use client";

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';

export function RealtimeNotifications() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        let channelName = '';
        let tableName = '';
        let filterColumn = '';

        // Determine table and filter based on role
        if (user.role === 'doctor') {
            tableName = 'doctor_notifications';
            filterColumn = 'doctor_id';
        } else if (user.role === 'patient') {
            tableName = 'patient_notifications';
            filterColumn = 'patient_id';
        } else if (user.role === 'seller') {
            tableName = 'seller_notifications';
            filterColumn = 'seller_id';
        } else if (user.role === 'clinic' || user.role === 'secretary') {
            tableName = 'clinic_notifications';
            filterColumn = 'clinic_id';
        } else if (user.role === 'admin' || user.role === 'superadmin') {
            tableName = 'admin_notifications';
            // Para admins, a menudo no filtramos por ID si la notificación es general,
            // pero si la tabla tiene user_id o admin_id podemos usarlo.
            // Asumiendo que admin_notifications son generales o para cualquier admin:
            // Si la tabla no tiene una columna específica para filtrar por ESTE admin, 
            // podríamos escuchar todos los cambios o filtrar por un campo común.
            // Por seguridad y simplicidad, si la tabla no tiene 'admin_id',
            // podríamos omitir el filtro filterColumn para escuchar todo, 
            // PERO Supabase requiere RLS.

            // Revisando patrones comunes: a veces es global.
            // Voy a asumir que queremos escuchar notificaciones no leídas o nuevas.
            // Si no hay filtro, escuchamos toda la tabla (respetando RLS).
            filterColumn = '';
        } else {
            return;
        }

        channelName = `realtime-notifications-${user.id}`;

        // Configurar suscripción
        const channelOptions: any = {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
        };

        // Solo agregar filtro si está definido
        if (filterColumn) {
            channelOptions.filter = `${filterColumn}=eq.${user.id}`;
        }

        console.log(`🔌 Conectando a notificaciones realtime para ${user.role} (${tableName})...`);

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                channelOptions,
                (payload) => {
                    console.log('🔔 Nueva notificación recibida:', payload);
                    const newNotification = payload.new as any;

                    // Show toast
                    toast({
                        title: newNotification.title,
                        description: newNotification.description,
                        action: (
                            <div className="flex items-center justify-center p-2 bg-primary/10 rounded-full">
                                <Bell className="h-4 w-4 text-primary" />
                            </div>
                        ),
                        onClick: () => {
                            if (newNotification.link) {
                                router.push(newNotification.link);
                            }
                        },
                        duration: 5000,
                    });

                    // Opcional: Disparar un evento para que el Header actualice el contador
                    window.dispatchEvent(new Event('notification-received'));
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Suscrito a notificaciones en tiempo real');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, toast, router]);

    return null; // This component doesn't render anything visual itself
}

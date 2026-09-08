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

    // Escuchar eventos globales de notificaciones para mostrar Toasts emergentes
    useEffect(() => {
        const handleToastNotification = (event: CustomEvent<{ title: string; description: string; link?: string }>) => {
            const data = event.detail;
            if (!data) return;

            toast({
                title: data.title,
                description: data.description,
                action: (
                    <div className="flex items-center justify-center p-2 bg-primary/10 rounded-full">
                        <Bell className="h-4 w-4 text-primary" />
                    </div>
                ),
                onClick: () => {
                    if (data.link) {
                        router.push(data.link);
                    }
                },
                duration: 5000,
            });
        };

        window.addEventListener('suma-notification-toast' as any, handleToastNotification);
        return () => {
            window.removeEventListener('suma-notification-toast' as any, handleToastNotification);
        };
    }, [toast, router]);

    // Suscripción Realtime para administradores a la tabla real admin_notifications
    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) return;

        const channel = supabase
            .channel(`realtime-admin-notifs`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'admin_notifications',
                },
                (payload) => {
                    const newNotification = payload.new as any;
                    toast({
                        title: newNotification.title || 'Nueva notificación administrativa',
                        description: newNotification.description || '',
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
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, toast, router]);

    return null;
}

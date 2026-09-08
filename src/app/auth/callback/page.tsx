"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

function CallbackHandler() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [statusMessage, setStatusMessage] = useState('Verificando credenciales de Google...');

    useEffect(() => {
        let isMounted = true;

        async function processOAuth() {
            try {
                const code = searchParams.get('code');
                const nextParam = searchParams.get('next');
                const roleParam = searchParams.get('role');
                const storedRole = typeof window !== 'undefined'
                    ? (sessionStorage.getItem('suma_intended_role') || localStorage.getItem('suma_intended_role'))
                    : null;
                const intendedRole = roleParam || storedRole || (nextParam && nextParam.includes('/doctor') ? 'doctor' : undefined);

                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('suma_intended_role');
                    localStorage.removeItem('suma_intended_role');
                }

                let googleUser = null;

                if (code) {
                    setStatusMessage('Autenticando con Google...');
                    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) {
                        console.error('❌ Error intercambiando código OAuth:', error);
                    } else if (data?.session?.user) {
                        googleUser = data.session.user;
                    }
                }

                // Si no se obtuvo del código, verificar si ya hay una sesión activa de Supabase
                if (!googleUser) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        googleUser = session.user;
                    }
                }

                if (!googleUser || !googleUser.email) {
                    console.error('❌ No se encontró usuario de Google autenticado');
                    if (isMounted) {
                        router.replace('/auth/login?error=auth_callback_error');
                    }
                    return;
                }

                setStatusMessage('Sincronizando cuenta y permisos en SUMA...');

                const syncResponse = await fetch('/api/auth/oauth-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: googleUser.email,
                        name: googleUser.user_metadata?.full_name || googleUser.user_metadata?.name || googleUser.email.split('@')[0],
                        avatar: googleUser.user_metadata?.avatar_url || googleUser.user_metadata?.picture || null,
                        id: googleUser.id,
                        intendedRole,
                    }),
                });

                const syncResult = await syncResponse.json();

                if (!syncResponse.ok || !syncResult.success) {
                    if (syncResult.error === 'secretary_no_google') {
                        if (isMounted) router.replace('/auth/login?error=secretary_no_google');
                    } else {
                        if (isMounted) router.replace('/auth/login?error=auth_callback_error');
                    }
                    return;
                }

                setStatusMessage('¡Bienvenido! Redirigiendo a tu panel...');

                // Guardar usuario en localStorage para sincronización inmediata de sesión
                if (syncResult.user) {
                    localStorage.setItem('user', JSON.stringify(syncResult.user));
                }

                const destination = nextParam || syncResult.redirectUrl || '/dashboard';

                // Redirigir al dashboard correspondiente
                window.location.href = destination;

            } catch (err) {
                console.error('❌ Error crítico en OAuth Callback:', err);
                if (isMounted) {
                    router.replace('/auth/login?error=auth_callback_error');
                }
            }
        }

        processOAuth();

        return () => {
            isMounted = false;
        };
    }, [searchParams, router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border border-slate-100 flex flex-col items-center">
                <div className="mb-6 flex items-center justify-center">
                    <Image
                        src="/images/logo_suma.png"
                        alt="SUMA Logo"
                        width={180}
                        height={60}
                        className="h-14 w-auto object-contain"
                        priority
                    />
                </div>

                <div className="relative flex items-center justify-center mb-5">
                    <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
                    <svg className="h-6 w-6 absolute" viewBox="0 0 24 24">
                        <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                    </svg>
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-1">
                    Conectando con Google
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                    {statusMessage}
                </p>
            </div>
        </div>
    );
}

export default function AuthCallbackPage() {
    return (
        <Suspense
            fallback={
                <div className="flex items-center justify-center min-h-screen bg-slate-50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <CallbackHandler />
        </Suspense>
    );
}

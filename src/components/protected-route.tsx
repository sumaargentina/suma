"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

type UserRole = 'patient' | 'doctor' | 'seller' | 'admin' | 'clinic' | 'secretary';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
    redirectTo?: string;
}

// Función para obtener el dashboard según el rol
function getDashboardByRole(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin/dashboard';
        case 'doctor':
            return '/doctor/dashboard';
        case 'seller':
            return '/seller/dashboard';
        case 'clinic':
            return '/clinic/dashboard';
        case 'secretary':
            return '/clinic/dashboard';
        case 'patient':
            return '/dashboard';
        default:
            return '/';
    }
}

export function ProtectedRoute({ children, allowedRoles, redirectTo }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            // Si no hay usuario, redirigir a login
            if (!user) {
                router.push(redirectTo || '/auth/login');
                return;
            }

            // Si el usuario no tiene el rol permitido, redirigir a su dashboard
            if (!allowedRoles.includes(user.role as UserRole)) {
                console.log(`🔒 Acceso denegado: rol ${user.role} no permitido en esta página`);
                router.push(getDashboardByRole(user.role));
            }
        }
    }, [user, loading, allowedRoles, router, redirectTo]);

    // Mostrar loading mientras se verifica la autenticación
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // Si no hay usuario o no tiene el rol correcto, no mostrar nada (se está redirigiendo)
    if (!user || !allowedRoles.includes(user.role as UserRole)) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                    <p className="text-muted-foreground">Redirigiendo...</p>
                </div>
            </div>
        );
    }

    // Usuario autenticado y con rol correcto
    return <>{children}</>;
}

// Hook personalizado para verificar permisos
export function useRequireAuth(allowedRoles: UserRole[]) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth/login');
        } else if (!loading && user && !allowedRoles.includes(user.role as UserRole)) {
            console.log(`🔒 Hook: Acceso denegado para rol ${user.role}`);
            router.push(getDashboardByRole(user.role));
        }
    }, [user, loading, allowedRoles, router]);

    return { user, loading, isAuthorized: user && allowedRoles.includes(user.role as UserRole) };
}


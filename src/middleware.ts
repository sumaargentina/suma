import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
    '/',
    '/auth/login',
    '/auth/register-patient',
    '/auth/register-doctor',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/find-a-doctor',
    '/doctors',
    '/about',
    '/contact',
    '/terms',
    '/privacy',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir acceso a archivos estáticos y API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // archivos con extensión
    ) {
        return NextResponse.next();
    }

    // Verificar si es una ruta pública
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    // Si es ruta pública, permitir acceso
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Para rutas protegidas, simplemente permitir el acceso
    // La protección real se hace en los componentes con ProtectedRoute
    // TODO: Implementar validación de JWT cuando el sistema de auth esté actualizado
    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

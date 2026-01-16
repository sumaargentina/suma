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
    '/clinica',
    '/landing-clinica',
];

// Headers de seguridad
const SECURITY_HEADERS = {
    // Prevenir clickjacking
    'X-Frame-Options': 'DENY',
    // Prevenir MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // XSS Protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir acceso a archivos estáticos y API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.') // archivos con extensión
    ) {
        const response = NextResponse.next();
        // Añadir headers de seguridad
        Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
            response.headers.set(key, value);
        });
        return response;
    }

    // Verificar si es una ruta pública
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    // Crear respuesta con headers de seguridad
    const response = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Si es ruta pública, permitir acceso
    if (isPublicRoute) {
        return response;
    }

    // Para rutas protegidas, verificar la cookie de sesión
    const sessionCookie = request.cookies.get('user_session');

    if (!sessionCookie) {
        // Si no hay sesión y no es ruta pública, redirigir a login
        // Pero permitir acceso para que el componente ProtectedRoute maneje la redirección
        // Esto evita problemas con rutas que pueden ser públicas o privadas según el contexto
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};


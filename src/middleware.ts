import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = [
    '/',
    '/auth/login',
    '/auth/register-patient',
    '/auth/register-doctor',
    '/auth/register-clinic',
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
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
};

// Función para aplicar headers de seguridad
function applySecurityHeaders(response: NextResponse): NextResponse {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        response.headers.set(key, value);
    });
    return response;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir acceso a archivos estáticos y API routes
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return applySecurityHeaders(NextResponse.next());
    }

    // Verificar si es una ruta pública
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname === route || pathname.startsWith(`${route}/`)
    );

    if (isPublicRoute) {
        return applySecurityHeaders(NextResponse.next());
    }

    // Para rutas protegidas, dejar pasar y que el componente ProtectedRoute 
    // maneje la autenticación del lado del cliente.
    // El middleware solo aplica headers de seguridad.
    // La verificación de roles se hace en ProtectedRoute porque el sistema
    // usa autenticación basada en estado de React, no cookies de sesión.

    return applySecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

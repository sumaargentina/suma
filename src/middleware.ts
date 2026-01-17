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

// Mapeo de rutas protegidas a roles permitidos
const PROTECTED_ROUTES: Record<string, string[]> = {
    '/admin': ['admin'],
    '/doctor': ['doctor'],
    '/seller': ['seller'],
    '/clinic': ['clinic', 'secretary'],
    '/dashboard': ['patient', 'doctor', 'seller', 'admin', 'clinic', 'secretary'],
};

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

// Función para obtener el rol del usuario desde la cookie
function getUserRoleFromCookie(request: NextRequest): string | null {
    try {
        const sessionCookie = request.cookies.get('user_session')?.value;
        if (!sessionCookie) return null;

        const decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf8'));
        return decoded.role || null;
    } catch {
        return null;
    }
}

// Función para obtener el dashboard por rol
function getDashboardByRole(role: string): string {
    switch (role) {
        case 'admin': return '/admin/dashboard';
        case 'doctor': return '/doctor/dashboard';
        case 'seller': return '/seller/dashboard';
        case 'clinic': return '/clinic/dashboard';
        case 'secretary': return '/clinic/dashboard';
        case 'patient': return '/dashboard';
        default: return '/';
    }
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

    // Obtener rol del usuario
    const userRole = getUserRoleFromCookie(request);

    // Si no hay sesión, redirigir a login
    if (!userRole) {
        const loginUrl = new URL('/auth/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Verificar permisos para rutas protegidas
    for (const [routePrefix, allowedRoles] of Object.entries(PROTECTED_ROUTES)) {
        if (pathname.startsWith(routePrefix)) {
            if (!allowedRoles.includes(userRole)) {
                // Redirigir al dashboard correspondiente
                console.log(`🔒 Middleware: ${userRole} intentó acceder a ${pathname}`);
                return NextResponse.redirect(new URL(getDashboardByRole(userRole), request.url));
            }
            break;
        }
    }

    return applySecurityHeaders(NextResponse.next());
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};

/**
 * SEGURIDAD: Utilidades de autenticación para API Routes
 * Este archivo proporciona funciones para verificar la sesión del usuario en las rutas API
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from './supabase-admin';

// Clave secreta para JWT
const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

// Tipos de roles permitidos
export type UserRole = 'patient' | 'doctor' | 'seller' | 'admin' | 'clinic' | 'secretary';

// Información del usuario autenticado
export interface AuthUser {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    clinicId?: string;
}

// Resultado de la verificación de autenticación
interface AuthResult {
    authenticated: boolean;
    user?: AuthUser;
    error?: string;
}

/**
 * Verifica la sesión del usuario desde las cookies (JWT token)
 * @param request - NextRequest object
 * @returns AuthResult con el usuario o error
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    try {
        // Obtener el token JWT desde las cookies
        const cookieStore = await cookies();
        const authToken = cookieStore.get('auth-token')?.value;

        if (!authToken) {
            return { authenticated: false, error: 'No hay sesión activa' };
        }

        try {
            // Verificar y decodificar el JWT
            const { payload } = await jwtVerify(authToken, JWT_SECRET);

            const userId = payload.userId as string;
            const role = payload.role as UserRole;
            const email = payload.email as string;
            const name = payload.name as string;

            if (!userId || !role) {
                return { authenticated: false, error: 'Token inválido' };
            }

            // Verificar que el usuario existe en la base de datos
            const tableName = getTableByRole(role);
            if (!tableName) {
                return { authenticated: false, error: 'Rol no válido' };
            }

            const { data: user, error } = await supabaseAdmin
                .from(tableName)
                .select('id, email, name')
                .eq('id', userId)
                .single();

            if (error || !user) {
                return { authenticated: false, error: 'Usuario no encontrado' };
            }

            return {
                authenticated: true,
                user: {
                    id: userId,
                    email: email || user.email,
                    role: role,
                    name: name || user.name,
                    clinicId: payload.clinicId as string | undefined
                }
            };
        } catch (jwtError) {
            console.error('JWT verification failed:', jwtError);
            return { authenticated: false, error: 'Token expirado o inválido' };
        }
    } catch (error) {
        console.error('Error verificando autenticación:', error);
        return { authenticated: false, error: 'Error de autenticación' };
    }
}

/**
 * Middleware que requiere autenticación
 * Usar en rutas API que necesitan usuario autenticado
 */
export async function requireAuth(
    request: NextRequest,
    allowedRoles?: UserRole[]
): Promise<{ user: AuthUser } | NextResponse> {
    const result = await verifyAuth(request);

    if (!result.authenticated || !result.user) {
        return NextResponse.json(
            { error: result.error || 'No autorizado' },
            { status: 401 }
        );
    }

    // Verificar roles permitidos
    if (allowedRoles && !allowedRoles.includes(result.user.role)) {
        return NextResponse.json(
            { error: 'No tienes permisos para esta acción' },
            { status: 403 }
        );
    }

    return { user: result.user };
}

/**
 * Verifica que el usuario tenga acceso a un recurso específico
 * @param user - Usuario autenticado
 * @param resourceOwnerId - ID del dueño del recurso
 * @param allowedRoles - Roles que pueden acceder a cualquier recurso
 */
export function canAccessResource(
    user: AuthUser,
    resourceOwnerId: string,
    allowedRoles: UserRole[] = ['admin']
): boolean {
    // Admins pueden acceder a todo
    if (allowedRoles.includes(user.role)) {
        return true;
    }

    // El usuario solo puede acceder a sus propios recursos
    return user.id === resourceOwnerId;
}

/**
 * Obtiene el nombre de la tabla según el rol
 */
function getTableByRole(role: UserRole): string | null {
    const tables: Record<UserRole, string> = {
        patient: 'patients',
        doctor: 'doctors',
        seller: 'sellers',
        admin: 'admins',
        clinic: 'clinics',
        secretary: 'clinic_secretaries'
    };
    return tables[role] || null;
}

/**
 * Helper para respuestas de error consistentes
 */
export function authError(message: string, status: number = 401): NextResponse {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Helper para logging de seguridad
 */
export function logSecurityEvent(event: string, details: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    console.log(`[SECURITY ${timestamp}] ${event}:`, JSON.stringify(details));
}

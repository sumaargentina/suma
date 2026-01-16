/**
 * SEGURIDAD: Utilidades de autenticación para API Routes
 * Este archivo proporciona funciones para verificar la sesión del usuario en las rutas API
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from './supabase-admin';

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
 * Verifica la sesión del usuario desde las cookies
 * @param request - NextRequest object
 * @returns AuthResult con el usuario o error
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
    try {
        // Obtener el token de sesión desde las cookies
        const cookieStore = await cookies();
        const sessionToken = cookieStore.get('user_session')?.value;

        if (!sessionToken) {
            return { authenticated: false, error: 'No hay sesión activa' };
        }

        // Decodificar el token (es un JSON base64)
        try {
            const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf8'));

            if (!decoded.id || !decoded.role) {
                return { authenticated: false, error: 'Token inválido' };
            }

            // Verificar que el usuario existe en la base de datos
            const tableName = getTableByRole(decoded.role);
            if (!tableName) {
                return { authenticated: false, error: 'Rol no válido' };
            }

            const { data: user, error } = await supabaseAdmin
                .from(tableName)
                .select('id, email, name')
                .eq('id', decoded.id)
                .single();

            if (error || !user) {
                return { authenticated: false, error: 'Usuario no encontrado' };
            }

            return {
                authenticated: true,
                user: {
                    id: decoded.id,
                    email: user.email,
                    role: decoded.role,
                    name: user.name,
                    clinicId: decoded.clinicId
                }
            };
        } catch {
            return { authenticated: false, error: 'Token corrupto' };
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

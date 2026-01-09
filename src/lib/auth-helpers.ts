import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export interface TokenPayload {
    userId: string;
    email: string;
    role: 'patient' | 'doctor' | 'seller' | 'admin';
    name: string;
}

/**
 * Verifica y decodifica el token JWT de las cookies
 * @param request - NextRequest object
 * @returns TokenPayload si el token es válido, null si no
 */
export async function verifyToken(request: NextRequest): Promise<TokenPayload | null> {
    try {
        const token = request.cookies.get('auth-token')?.value;

        if (!token) {
            return null;
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);

        // Validar que el payload tenga los campos requeridos
        if (
            typeof payload.userId === 'string' &&
            typeof payload.email === 'string' &&
            typeof payload.role === 'string' &&
            typeof payload.name === 'string'
        ) {
            return payload as unknown as TokenPayload;
        }

        return null;
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

/**
 * Verifica que el usuario tenga uno de los roles permitidos
 * @param request - NextRequest object
 * @param allowedRoles - Array de roles permitidos
 * @returns TokenPayload si tiene permiso, null si no
 */
export async function requireRole(
    request: NextRequest,
    allowedRoles: Array<'patient' | 'doctor' | 'seller' | 'admin'>
): Promise<TokenPayload | null> {
    const payload = await verifyToken(request);

    if (!payload) {
        return null;
    }

    if (!allowedRoles.includes(payload.role)) {
        return null;
    }

    return payload;
}

/**
 * Verifica que el usuario esté autenticado y sea el dueño del recurso
 * @param request - NextRequest object
 * @param resourceUserId - ID del usuario dueño del recurso
 * @returns TokenPayload si es el dueño o admin, null si no
 */
export async function requireOwnerOrAdmin(
    request: NextRequest,
    resourceUserId: string
): Promise<TokenPayload | null> {
    const payload = await verifyToken(request);

    if (!payload) {
        return null;
    }

    // Admin puede acceder a todo
    if (payload.role === 'admin') {
        return payload;
    }

    // El usuario debe ser el dueño del recurso
    if (payload.userId !== resourceUserId) {
        return null;
    }

    return payload;
}

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, email, role, name } = body;

        if (!userId || !email || !role) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Crear JWT token
        const token = await new SignJWT({ userId, email, role, name })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d') // Token válido por 7 días
            .sign(JWT_SECRET);

        // Crear respuesta con cookie HTTP-only
        const response = NextResponse.json({ success: true });

        response.cookies.set({
            name: 'auth-token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 días
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Error setting auth token:', error);
        return NextResponse.json(
            { error: 'Failed to set authentication token' },
            { status: 500 }
        );
    }
}

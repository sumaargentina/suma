import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ success: true });

    // Eliminar cookie de autenticación
    response.cookies.delete('auth-token');

    return response;
}

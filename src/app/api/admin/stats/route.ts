import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-helpers';

/**
 * Ejemplo de API route protegida solo para admins
 * GET /api/admin/stats
 */
export async function GET(request: NextRequest) {
    // Verificar que el usuario sea admin
    const user = await requireRole(request, ['admin']);

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized. Admin access required.' },
            { status: 401 }
        );
    }

    // Tu lógica aquí - el usuario es admin
    try {
        // Ejemplo: obtener estadísticas
        const stats = {
            totalDoctors: 0,
            totalPatients: 0,
            totalAppointments: 0,
            // ... más estadísticas
        };

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Ejemplo de API route protegida para crear recursos
 * POST /api/admin/stats
 */
export async function POST(request: NextRequest) {
    const user = await requireRole(request, ['admin']);

    if (!user) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();

        // Validar datos
        if (!body.data) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Tu lógica aquí

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { addClinicService } from '@/lib/supabaseService';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, detectInjection } from '@/lib/sanitize';

export async function POST(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo clínicas y admins pueden añadir servicios
        const authResult = await requireAuth(req, ['clinic', 'admin', 'secretary']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('CLINIC_SERVICE_ADD_UNAUTHORIZED', {
                ip: req.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const data = await req.json();

        // 🔐 SEGURIDAD: Verificar que la clínica o su secretaria solo añade servicios a sí misma
        const authorizedClinicId = user.clinicId || user.id;
        if ((user.role === 'clinic' || user.role === 'secretary') && data.clinicId !== authorizedClinicId) {
            logSecurityEvent('CLINIC_SERVICE_ADD_FORBIDDEN', {
                userId: user.id,
                attemptedClinicId: data.clinicId
            });
            return NextResponse.json(
                { error: 'No puedes añadir servicios a otra clínica' },
                { status: 403 }
            );
        }

        // 🔐 SEGURIDAD: Detectar inyección
        if (detectInjection(JSON.stringify(data))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Sanitizar
        const sanitizedData = {
            ...data,
            name: sanitizeString(data.name),
            description: sanitizeString(data.description),
            category: sanitizeString(data.category),
        };

        logSecurityEvent('CLINIC_SERVICE_ADDED', { userId: user.id, clinicId: data.clinicId });

        const result = await addClinicService(sanitizedData);
        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error adding service:', errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

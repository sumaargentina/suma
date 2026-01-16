import { NextRequest, NextResponse } from 'next/server';
import { updateClinicService, getClinicServiceById } from '@/lib/supabaseService';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, detectInjection } from '@/lib/sanitize';

export async function PATCH(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo clínicas y admins pueden actualizar servicios
        const authResult = await requireAuth(req, ['clinic', 'admin', 'secretary']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const data = await req.json();
        const { id, ...updateData } = data;

        if (!id) {
            return NextResponse.json({ error: 'Missing service ID' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar propiedad del servicio
        const service = await getClinicServiceById(id);
        if (service && user.role === 'clinic' && service.clinicId !== user.id) {
            logSecurityEvent('SERVICE_UPDATE_FORBIDDEN', {
                userId: user.id,
                serviceId: id,
                serviceClinicId: service.clinicId
            });
            return NextResponse.json({ error: 'No puedes modificar servicios de otra clínica' }, { status: 403 });
        }

        // 🔐 SEGURIDAD: Detectar inyección
        if (detectInjection(JSON.stringify(updateData))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Sanitizar datos
        const sanitizedData = {
            ...updateData,
            name: updateData.name ? sanitizeString(updateData.name) : undefined,
            description: updateData.description ? sanitizeString(updateData.description) : undefined,
            category: updateData.category ? sanitizeString(updateData.category) : undefined,
        };

        logSecurityEvent('SERVICE_UPDATED', { userId: user.id, serviceId: id });

        await updateClinicService(id, sanitizedData);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error updating service:', errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

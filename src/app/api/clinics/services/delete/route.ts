import { NextRequest, NextResponse } from 'next/server';
import { deleteClinicService, getClinicServiceById } from '@/lib/supabaseService';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';

export async function DELETE(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo clínicas y admins pueden eliminar servicios
        const authResult = await requireAuth(req, ['clinic', 'admin']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing service ID' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar propiedad del servicio
        const service = await getClinicServiceById(id);
        if (service && user.role === 'clinic' && service.clinicId !== user.id) {
            logSecurityEvent('SERVICE_DELETE_FORBIDDEN', {
                userId: user.id,
                serviceId: id,
                serviceClinicId: service.clinicId
            });
            return NextResponse.json({ error: 'No puedes eliminar servicios de otra clínica' }, { status: 403 });
        }

        logSecurityEvent('SERVICE_DELETED', { userId: user.id, serviceId: id });

        await deleteClinicService(id);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error deleting service:', errorMessage);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

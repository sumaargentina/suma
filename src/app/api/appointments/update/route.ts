import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';

// Función para convertir camelCase a snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            result[snakeKey] = obj[key];
        }
    }
    return result;
};

export async function PATCH(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(request, ['patient', 'doctor', 'clinic', 'secretary', 'admin']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('APPOINTMENT_UPDATE_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const { id, data } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Appointment ID is required' },
                { status: 400 }
            );
        }

        if (!data || Object.keys(data).length === 0) {
            return NextResponse.json(
                { error: 'Update data is required' },
                { status: 400 }
            );
        }

        // 🔐 SEGURIDAD: Verificar que el usuario tiene acceso a esta cita
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('patient_id, doctor_id, clinic_id')
            .eq('id', id)
            .single();

        if (fetchError || !appointment) {
            return NextResponse.json(
                { error: 'Cita no encontrada' },
                { status: 404 }
            );
        }

        // Verificar permisos
        const canAccess =
            user.role === 'admin' ||
            (user.role === 'patient' && appointment.patient_id === user.id) ||
            (user.role === 'doctor' && appointment.doctor_id === user.id) ||
            (user.role === 'clinic' && appointment.clinic_id === user.id) ||
            (user.role === 'secretary' && appointment.clinic_id === user.clinicId);

        if (!canAccess) {
            logSecurityEvent('APPOINTMENT_UPDATE_FORBIDDEN', {
                userId: user.id,
                appointmentId: id,
                reason: 'User does not have access to this appointment'
            });
            return NextResponse.json(
                { error: 'No tienes permisos para modificar esta cita' },
                { status: 403 }
            );
        }

        // Convertir a snake_case para la base de datos
        const dataWithFlags: Record<string, unknown> = { ...toSnakeCase(data) };

        // Si se está marcando la asistencia, el paciente necesita ser notificado
        if ('attendance' in data) {
            dataWithFlags.read_by_patient = false;
        }

        logSecurityEvent('APPOINTMENT_UPDATE', {
            userId: user.id,
            appointmentId: id,
            changes: Object.keys(data)
        });

        console.log('📝 Updating appointment:', id, 'with data:', dataWithFlags);

        const { error } = await supabaseAdmin
            .from('appointments')
            .update(dataWithFlags)
            .eq('id', id);

        if (error) {
            console.error('❌ Error updating appointment:', error);
            return NextResponse.json(
                { error: error.message || 'Failed to update appointment' },
                { status: 500 }
            );
        }

        console.log('✅ Appointment updated successfully:', id);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('❌ Server error updating appointment:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        );
    }
}

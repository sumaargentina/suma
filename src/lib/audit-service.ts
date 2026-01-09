import { supabase } from './supabase';

interface AuditLogEntry {
    userId?: string;
    email?: string;
    role?: string;
    action: string;
    details?: Record<string, unknown>;
    result: 'success' | 'error';
    message?: string;
}

/**
 * Registra una entrada en el log de auditoría
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
        // Obtener IP del cliente (en producción esto vendría del servidor)
        let ip: string | null = null;

        const { error } = await supabase
            .from('audit_logs')
            .insert({
                user_id: entry.userId || null,
                email: entry.email || null,
                role: entry.role || null,
                ip: ip,
                action: entry.action,
                details: entry.details || null,
                result: entry.result,
                message: entry.message || null,
                timestamp: new Date().toISOString()
            });

        if (error) {
            console.warn('Could not log audit event:', error.message);
        }
    } catch (err) {
        // Silenciar errores de auditoría para no afectar la experiencia del usuario
        console.warn('Audit logging failed:', err);
    }
}

// Acciones predefinidas para consistencia
export const AuditActions = {
    // Autenticación
    LOGIN_SUCCESS: 'auth.login.success',
    LOGIN_FAILED: 'auth.login.failed',
    LOGOUT: 'auth.logout',
    REGISTER_SUCCESS: 'auth.register.success',
    REGISTER_FAILED: 'auth.register.failed',
    PASSWORD_CHANGE: 'auth.password.change',

    // Perfil
    PROFILE_UPDATE: 'profile.update',
    PROFILE_IMAGE_UPDATE: 'profile.image.update',

    // Citas
    APPOINTMENT_CREATE: 'appointment.create',
    APPOINTMENT_CANCEL: 'appointment.cancel',
    APPOINTMENT_CONFIRM: 'appointment.confirm',
    APPOINTMENT_COMPLETE: 'appointment.complete',

    // Admin
    SETTINGS_UPDATE: 'admin.settings.update',
    CITY_ADD: 'admin.city.add',
    CITY_UPDATE: 'admin.city.update',
    CITY_DELETE: 'admin.city.delete',
    SPECIALTY_ADD: 'admin.specialty.add',
    SPECIALTY_UPDATE: 'admin.specialty.update',
    SPECIALTY_DELETE: 'admin.specialty.delete',
    COUPON_ADD: 'admin.coupon.add',
    COUPON_UPDATE: 'admin.coupon.update',
    COUPON_DELETE: 'admin.coupon.delete',

    // Doctores
    DOCTOR_STATUS_CHANGE: 'doctor.status.change',
    DOCTOR_SCHEDULE_UPDATE: 'doctor.schedule.update',

    // Soporte
    SUPPORT_TICKET_CREATE: 'support.ticket.create',
    SUPPORT_MESSAGE_SEND: 'support.message.send',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

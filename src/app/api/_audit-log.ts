/**
 * SEGURIDAD: Sistema de Audit Log
 * Registra todas las acciones importantes para auditoría y detección de incidentes
 */

import { supabaseAdmin } from '@/lib/supabase-admin';

export interface AuditLogEntry {
  userId: string;
  email?: string;
  role?: string;
  ip?: string;
  action: string;
  details?: unknown;
  result: 'success' | 'error';
  message?: string;
}

// Cache temporal para logs (envío en lote)
let logBuffer: AuditLogEntry[] = [];
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 30000; // 30 segundos

// Flush automático cada 30 segundos
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (logBuffer.length > 0) {
      flushLogs();
    }
  }, FLUSH_INTERVAL);
}

/**
 * Guarda un evento de auditoría
 */
export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const logEntry = {
      user_id: entry.userId,
      email: entry.email || null,
      role: entry.role || null,
      ip_address: entry.ip || null,
      action: entry.action,
      details: entry.details ? JSON.stringify(entry.details) : null,
      result: entry.result,
      message: entry.message || null,
      timestamp: new Date().toISOString(),
    };

    // Añadir al buffer
    logBuffer.push(entry);

    // Log inmediato a consola para depuración
    console.log(`[AUDIT ${entry.result.toUpperCase()}] ${entry.action}:`, {
      userId: entry.userId,
      ip: entry.ip,
      details: entry.details
    });

    // Flush si el buffer está lleno
    if (logBuffer.length >= BUFFER_SIZE) {
      await flushLogs();
    }

    // Intentar guardar en DB (no bloquear si falla)
    try {
      await supabaseAdmin
        .from('audit_logs')
        .insert([logEntry]);
    } catch (dbError) {
      // Si la tabla no existe o hay error, solo logear
      console.warn('Audit log DB save failed (table may not exist):', dbError);
    }

  } catch (error) {
    console.error('Error saving audit log:', error);
  }
}

/**
 * Flush de logs del buffer a la base de datos
 */
async function flushLogs(): Promise<void> {
  if (logBuffer.length === 0) return;

  const logsToFlush = [...logBuffer];
  logBuffer = [];

  try {
    const entries = logsToFlush.map(entry => ({
      user_id: entry.userId,
      email: entry.email || null,
      role: entry.role || null,
      ip_address: entry.ip || null,
      action: entry.action,
      details: entry.details ? JSON.stringify(entry.details) : null,
      result: entry.result,
      message: entry.message || null,
      timestamp: new Date().toISOString(),
    }));

    await supabaseAdmin
      .from('audit_logs')
      .insert(entries);

  } catch (error) {
    // En caso de error, devolver los logs al buffer
    logBuffer = [...logsToFlush, ...logBuffer];
    console.warn('Failed to flush audit logs to DB');
  }
}

/**
 * Acciones predefinidas de auditoría
 */
export const AuditActions = {
  // Auth
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',

  // Usuarios
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Citas
  APPOINTMENT_CREATED: 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED: 'APPOINTMENT_UPDATED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',

  // Registros médicos
  MEDICAL_RECORD_CREATED: 'MEDICAL_RECORD_CREATED',
  MEDICAL_RECORD_VIEWED: 'MEDICAL_RECORD_VIEWED',

  // Pagos
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',

  // Seguridad
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INJECTION_ATTEMPT: 'INJECTION_ATTEMPT',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
};
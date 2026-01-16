/**
 * SEGURIDAD: Utilidades de sanitización de inputs
 * Protección contra XSS, SQL Injection y otros ataques de inyección
 */

/**
 * Escapa caracteres HTML para prevenir XSS
 */
export function escapeHtml(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Elimina etiquetas HTML de un string
 */
export function stripHtml(str: string | null | undefined): string {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitiza un string para uso seguro
 * Elimina caracteres peligrosos y normaliza espacios
 */
export function sanitizeString(str: string | null | undefined): string {
    if (!str) return '';
    return str
        .replace(/<[^>]*>/g, '')           // Eliminar HTML
        .replace(/[<>'"`;(){}]/g, '')      // Eliminar caracteres peligrosos
        .replace(/\s+/g, ' ')              // Normalizar espacios
        .trim();
}

/**
 * Sanitiza un email
 */
export function sanitizeEmail(email: string | null | undefined): string {
    if (!email) return '';
    return email.toLowerCase().trim().replace(/[^a-z0-9@._-]/gi, '');
}

/**
 * Sanitiza un número de teléfono
 */
export function sanitizePhone(phone: string | null | undefined): string {
    if (!phone) return '';
    return phone.replace(/[^0-9+\-\s()]/g, '').trim();
}

/**
 * Sanitiza un ID (UUID)
 */
export function sanitizeId(id: string | null | undefined): string {
    if (!id) return '';
    // UUIDs solo contienen hex y guiones
    return id.replace(/[^a-f0-9-]/gi, '').toLowerCase();
}

/**
 * Valida que un string sea un UUID válido
 */
export function isValidUUID(str: string | null | undefined): boolean {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
}

/**
 * Sanitiza un objeto completo
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized as T;
}

/**
 * Valida y sanitiza datos de entrada para una cita
 */
export function sanitizeAppointmentData(data: Record<string, unknown>): Record<string, unknown> {
    return {
        ...data,
        patientName: sanitizeString(data.patientName as string),
        doctorName: sanitizeString(data.doctorName as string),
        patientPhone: sanitizePhone(data.patientPhone as string),
        doctorId: sanitizeId(data.doctorId as string),
        patientId: sanitizeId(data.patientId as string),
        clinicalNotes: stripHtml(data.clinicalNotes as string),
    };
}

/**
 * Lista de palabras/patrones peligrosos para detectar intentos de inyección
 */
const DANGEROUS_PATTERNS = [
    /(\b)(select|insert|update|delete|drop|union|exec|execute)(\b)/gi,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
];

/**
 * Detecta posibles intentos de inyección
 */
export function detectInjection(str: string | null | undefined): boolean {
    if (!str) return false;
    return DANGEROUS_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Valida y sanitiza un objeto, rechazando si contiene patrones peligrosos
 */
export function validateAndSanitize<T extends Record<string, unknown>>(
    obj: T
): { valid: boolean; data: T; threats: string[] } {
    const threats: string[] = [];

    const checkValue = (value: unknown, path: string) => {
        if (typeof value === 'string' && detectInjection(value)) {
            threats.push(`Posible inyección detectada en: ${path}`);
        }
        if (typeof value === 'object' && value !== null) {
            for (const [key, val] of Object.entries(value)) {
                checkValue(val, `${path}.${key}`);
            }
        }
    };

    for (const [key, value] of Object.entries(obj)) {
        checkValue(value, key);
    }

    return {
        valid: threats.length === 0,
        data: sanitizeObject(obj),
        threats
    };
}

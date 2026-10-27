import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getRateLimitKey } from '@/app/api/_rate-limit';
import { sanitizeString, sanitizeEmail, sanitizePhone, detectInjection } from '@/lib/sanitize';
import { logSecurityEvent } from '@/lib/auth-utils';

// Convert camelCase to snake_case for database fields
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Rate limiting para prevenir spam de registros
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitKey = getRateLimitKey(ip);
        const rateCheck = checkRateLimit(rateLimitKey, 'sensitive');

        if (!rateCheck.allowed) {
            logSecurityEvent('PATIENT_REGISTER_RATE_LIMITED', { ip });
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
                { status: 429 }
            );
        }

        const patientData = await request.json();

        // 🔐 SEGURIDAD: Detectar intentos de inyección
        const rawDataStr = JSON.stringify(patientData);
        if (detectInjection(rawDataStr)) {
            logSecurityEvent('PATIENT_REGISTER_INJECTION_ATTEMPT', { ip, data: rawDataStr.substring(0, 200) });
            return NextResponse.json(
                { error: 'Datos inválidos detectados' },
                { status: 400 }
            );
        }

        // 🔐 SEGURIDAD: Sanitizar datos de entrada
        const sanitizedData = {
            ...patientData,
            name: sanitizeString(patientData.name),
            email: sanitizeEmail(patientData.email),
            phone: sanitizePhone(patientData.phone),
            city: sanitizeString(patientData.city),
            cedula: sanitizeString(patientData.cedula),
        };

        console.log('API: Adding patient with data:', JSON.stringify(sanitizedData, null, 2));

        const snakeCaseData = toSnakeCase(sanitizedData);
        if ('favorited_doctor_ids' in snakeCaseData) {
            if (!('favorite_doctor_ids' in snakeCaseData)) {
                snakeCaseData.favorite_doctor_ids = snakeCaseData.favorited_doctor_ids;
            }
            delete snakeCaseData.favorited_doctor_ids;
        }
        if (typeof snakeCaseData.password === 'string' && !snakeCaseData.password.startsWith('$2')) {
            const { hashPassword } = await import('@/lib/password-utils');
            snakeCaseData.password = await hashPassword(snakeCaseData.password);
        }

        const { data, error } = await supabaseAdmin
            .from('patients')
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) {
            console.error('API: Error adding patient:', {
                code: error.code,
                message: error.message,
            });
            return NextResponse.json(
                { error: error.message || 'Failed to add patient' },
                { status: 400 }
            );
        }

        // Vincular automáticamente récipes o atenciones previas en Jornadas de Salud por cédula o correo
        try {
            if (sanitizedData.cedula) {
                const cleanCedula = sanitizedData.cedula.replace(/\D/g, '');
                await supabaseAdmin
                    .from('medical_records')
                    .update({ patient_id: data.id })
                    .is('patient_id', null)
                    .or(`guest_patient_cedula.eq.${sanitizedData.cedula},guest_patient_cedula.eq.${cleanCedula}`);

                await supabaseAdmin
                    .from('health_campaign_attendances')
                    .update({ patient_id: data.id, is_registered_patient: true })
                    .is('patient_id', null)
                    .or(`patient_cedula.eq.${sanitizedData.cedula},patient_cedula.eq.${cleanCedula}`);
            }
            if (sanitizedData.email) {
                await supabaseAdmin
                    .from('medical_records')
                    .update({ patient_id: data.id })
                    .is('patient_id', null)
                    .eq('guest_patient_email', sanitizedData.email.toLowerCase());

                await supabaseAdmin
                    .from('health_campaign_attendances')
                    .update({ patient_id: data.id, is_registered_patient: true })
                    .is('patient_id', null)
                    .eq('patient_email', sanitizedData.email.toLowerCase());
            }
        } catch (linkErr) {
            console.warn('API: Non-blocking warning linking prior campaign records:', linkErr);
        }

        logSecurityEvent('PATIENT_REGISTERED', { patientId: data.id, email: sanitizedData.email });
        console.log('API: Patient added successfully:', data.id);
        return NextResponse.json({ id: data.id });
    } catch (error) {
        console.error('API: Caught exception in addPatient:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

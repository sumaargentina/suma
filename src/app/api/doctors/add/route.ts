import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { checkRateLimit, getRateLimitKey } from '@/app/api/_rate-limit';
import { sanitizeString, sanitizeEmail, sanitizePhone, detectInjection } from '@/lib/sanitize';
import { logSecurityEvent } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Rate limiting para prevenir spam de registros
        const ip = request.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitKey = getRateLimitKey(ip);
        const rateCheck = checkRateLimit(rateLimitKey, 'sensitive');

        if (!rateCheck.allowed) {
            logSecurityEvent('DOCTOR_REGISTER_RATE_LIMITED', { ip });
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
                { status: 429 }
            );
        }

        const doctorData = await request.json();

        // 🔐 SEGURIDAD: Detectar intentos de inyección
        const rawDataStr = JSON.stringify(doctorData);
        if (detectInjection(rawDataStr)) {
            logSecurityEvent('DOCTOR_REGISTER_INJECTION_ATTEMPT', { ip, data: rawDataStr.substring(0, 200) });
            return NextResponse.json(
                { error: 'Datos inválidos detectados' },
                { status: 400 }
            );
        }

        // 🔐 SEGURIDAD: Sanitizar datos de entrada
        const sanitizedData = {
            ...doctorData,
            name: sanitizeString(doctorData.name),
            email: sanitizeEmail(doctorData.email),
            phone: sanitizePhone(doctorData.phone || doctorData.whatsapp),
            whatsapp: sanitizePhone(doctorData.whatsapp),
            address: sanitizeString(doctorData.address),
            city: sanitizeString(doctorData.city),
            sector: sanitizeString(doctorData.sector),
            specialty: sanitizeString(doctorData.specialty),
            description: sanitizeString(doctorData.description),
        };

        console.log('API: Received doctor data:', JSON.stringify(sanitizedData, null, 2));

        // Convertir camelCase a snake_case para Supabase
        const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
            const result: Record<string, unknown> = {};
            for (const key in obj) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                result[snakeKey] = obj[key];
            }
            return result;
        };

        const dataWithDefaults: Record<string, unknown> = {
            ...toSnakeCase(sanitizedData),
            read_by_admin: false,
            read_by_seller: false,
        };

        if ('insurances' in dataWithDefaults) {
            if (!('accepted_insurances' in dataWithDefaults)) {
                dataWithDefaults.accepted_insurances = dataWithDefaults.insurances;
            }
            delete dataWithDefaults.insurances;
        }

        if (typeof dataWithDefaults.password === 'string' && !dataWithDefaults.password.startsWith('$2')) {
            const { hashPassword } = await import('@/lib/password-utils');
            dataWithDefaults.password = await hashPassword(dataWithDefaults.password);
        }

        console.log('API: Inserting data:', JSON.stringify(dataWithDefaults, null, 2));

        const { data, error } = await supabaseAdmin
            .from('doctors')
            .insert([dataWithDefaults])
            .select()
            .single();

        if (error) {
            // Log the complete raw error for debugging
            console.error('API: RAW Supabase error object:', error);
            console.error('API: Stringified error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

            // Safely extract error details 
            const errorCode = error?.code || 'UNKNOWN';
            const errorMessage = error?.message || error?.hint || error?.details || '';

            console.error('API: Error code:', errorCode);
            console.error('API: Error message:', errorMessage);

            // Determine client-facing message
            let clientMessage = 'Error al registrar médico';

            if (errorCode === '42703') {
                clientMessage = 'Faltan columnas en la base de datos. Por favor ejecute la migración 009_update_doctors_patients_schema.sql';
            } else if (errorCode === '42P01') {
                clientMessage = 'La tabla de médicos no existe. Por favor ejecute las migraciones de base de datos.';
            } else if (errorCode === '23505') {
                clientMessage = 'Ya existe un registro con estos datos (email o cédula duplicados).';
            } else if (errorCode === '23502') {
                clientMessage = 'Faltan campos requeridos en el formulario.';
            } else if (errorMessage) {
                clientMessage = `Error de base de datos: ${errorMessage}`;
            }

            return NextResponse.json(
                { error: clientMessage, code: errorCode, details: errorMessage },
                { status: 500 }
            );
        }

        logSecurityEvent('DOCTOR_REGISTERED', { doctorId: data.id, email: sanitizedData.email });
        console.log('API: Doctor added successfully with ID:', data.id);
        return NextResponse.json({ id: data.id, success: true });
    } catch (error: unknown) {
        // Log full error details
        console.error('API: Exception caught:', error);
        if (error instanceof Error) {
            console.error('API: Error name:', error.name);
            console.error('API: Error message:', error.message);
            console.error('API: Error stack:', error.stack);
        }

        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        return NextResponse.json(
            { error: `Error interno del servidor: ${errorMessage}` },
            { status: 500 }
        );
    }
}

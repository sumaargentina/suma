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

        const dataWithDefaults = {
            ...toSnakeCase(sanitizedData),
            read_by_admin: false,
            read_by_seller: false,
        };

        console.log('API: Inserting data:', JSON.stringify(dataWithDefaults, null, 2));

        const { data, error } = await supabaseAdmin
            .from('doctors')
            .insert([dataWithDefaults])
            .select()
            .single();

        if (error) {
            console.error('API: Supabase error:', JSON.stringify({
                code: error.code,
                message: error.message,
            }, null, 2));

            // 🔐 SEGURIDAD: No exponer detalles internos de errores
            return NextResponse.json(
                { error: error.message || 'Failed to add doctor' },
                { status: 500 }
            );
        }

        logSecurityEvent('DOCTOR_REGISTERED', { doctorId: data.id, email: sanitizedData.email });
        console.log('API: Doctor added successfully with ID:', data.id);
        return NextResponse.json({ id: data.id, success: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API: Exception caught:', errorMessage);

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

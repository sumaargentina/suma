import { NextRequest, NextResponse } from 'next/server';
import { addClinic } from '@/lib/supabaseService';
import { checkRateLimit, getRateLimitKey } from '@/app/api/_rate-limit';
import { sanitizeString, sanitizeEmail, sanitizePhone, detectInjection } from '@/lib/sanitize';
import { logSecurityEvent } from '@/lib/auth-utils';

export async function POST(req: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Rate limiting para prevenir spam de registros
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const rateLimitKey = getRateLimitKey(ip);
        const rateCheck = checkRateLimit(rateLimitKey, 'sensitive');

        if (!rateCheck.allowed) {
            logSecurityEvent('CLINIC_REGISTER_RATE_LIMITED', { ip });
            return NextResponse.json(
                { error: 'Demasiados intentos. Intenta de nuevo en un minuto.' },
                { status: 429 }
            );
        }

        const data = await req.json();

        // 🔐 SEGURIDAD: Detectar intentos de inyección
        const rawDataStr = JSON.stringify(data);
        if (detectInjection(rawDataStr)) {
            logSecurityEvent('CLINIC_REGISTER_INJECTION_ATTEMPT', { ip });
            return NextResponse.json(
                { error: 'Datos inválidos detectados' },
                { status: 400 }
            );
        }

        // 🔐 SEGURIDAD: Sanitizar datos
        const sanitizedData = {
            ...data,
            name: sanitizeString(data.name),
            email: sanitizeEmail(data.email),
            phone: sanitizePhone(data.phone),
            address: sanitizeString(data.address),
            city: sanitizeString(data.city),
            description: sanitizeString(data.description),
        };

        const id = await addClinic(sanitizedData);

        logSecurityEvent('CLINIC_REGISTERED', { clinicId: id, email: sanitizedData.email });
        return NextResponse.json({ id });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error adding clinic:', errorMessage);
        return NextResponse.json({
            error: 'Internal Server Error'
        }, { status: 500 });
    }
}

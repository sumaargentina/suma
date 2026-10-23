import { NextRequest, NextResponse } from 'next/server';
import { addClinic } from '@/lib/supabaseService';
import { sanitizeString, sanitizeEmail, sanitizePhone } from '@/lib/sanitize';
import { logSecurityEvent } from '@/lib/auth-utils';
import { sendRoleWelcomeEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();

        const targetEmail = sanitizeEmail(data.adminEmail || data.email || '');

        const sanitizedData = {
            ...data,
            name: sanitizeString(data.name || ''),
            email: targetEmail,
            adminEmail: targetEmail,
            phone: data.phone ? sanitizePhone(data.phone) : '',
            address: data.address ? sanitizeString(data.address) : '',
            city: data.city ? sanitizeString(data.city) : '',
            description: data.description ? sanitizeString(data.description) : '',
        };

        const id = await addClinic(sanitizedData);

        // Enviar correo de bienvenida a la clínica (no bloqueante)
        sendRoleWelcomeEmail({
            email: sanitizedData.email,
            name: sanitizedData.name,
            role: 'clinic',
        }).catch((err) => console.error('API: Error sending clinic welcome email:', err));

        logSecurityEvent('CLINIC_REGISTERED', { clinicId: id, email: sanitizedData.email });
        return NextResponse.json({ id });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('API Error adding clinic:', errorMessage);
        return NextResponse.json({
            error: errorMessage || 'Error al registrar la clínica'
        }, { status: 500 });
    }
}

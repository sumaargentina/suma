import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, sanitizeEmail, detectInjection } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo clínicas y admins pueden añadir secretarias
        const authResult = await requireAuth(request, ['clinic', 'admin']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('SECRETARY_ADD_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const body = await request.json();
        const { name, email, password, clinicId, permissions, phone, country, state, city, sector, address } = body;

        // 🔐 SEGURIDAD: Verificar que la clínica solo añade secretarias a sí misma
        if (user.role === 'clinic' && clinicId !== user.id) {
            logSecurityEvent('SECRETARY_ADD_FORBIDDEN', {
                userId: user.id,
                attemptedClinicId: clinicId
            });
            return NextResponse.json(
                { error: 'No puedes añadir secretarias a otra clínica' },
                { status: 403 }
            );
        }

        // 🔐 SEGURIDAD: Detectar inyección
        if (detectInjection(JSON.stringify(body))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Sanitizar
        const sanitizedName = sanitizeString(name);
        const sanitizedEmail = sanitizeEmail(email);

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: sanitizedEmail,
            password,
            email_confirm: true,
            user_metadata: { role: 'secretary', full_name: sanitizedName }
        });

        if (authError) {
            console.error('Error creating Auth user:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
        }

        // 2. Insert into secretaries table linked by ID
        const { data, error } = await supabaseAdmin
            .from('secretaries')
            .insert([{
                id: authData.user.id,
                name: sanitizedName,
                email: sanitizedEmail,
                password: 'MANAGED_BY_AUTH',
                clinic_id: clinicId,
                permissions: permissions || ['agenda'],
                role: 'secretary',
                phone: phone ? sanitizeString(phone) : null,
                country: country || 'VE',
                state: state ? sanitizeString(state) : null,
                city: city ? sanitizeString(city) : null,
                sector: sector ? sanitizeString(sector) : null,
                address: address ? sanitizeString(address) : null,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            // Rollback Auth user if table insert fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        logSecurityEvent('SECRETARY_ADDED', {
            userId: user.id,
            clinicId,
            secretaryId: data.id
        });

        return NextResponse.json(data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

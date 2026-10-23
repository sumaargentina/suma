import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, sanitizeEmail, detectInjection } from '@/lib/sanitize';
import { hashPassword } from '@/lib/password-utils';
import { sendRoleWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

// GET /api/laboratories/secretaries?laboratoryId=...
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const laboratoryId = searchParams.get('laboratoryId');

    if (!laboratoryId) {
        return NextResponse.json({ error: 'Laboratory ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('secretaries')
            .select('*')
            .eq('laboratory_id', laboratoryId);

        if (error) throw error;

        const secretaries = (data || []).map(item => ({
            id: item.id,
            email: item.email,
            name: item.name,
            role: 'secretary',
            laboratoryId: item.laboratory_id,
            clinicId: item.clinic_id,
            permissions: item.permissions || [],
            phone: item.phone || '',
            country: item.country || 'VE',
            state: item.state || '',
            city: item.city || '',
            sector: item.sector || '',
            address: item.address || '',
            createdAt: item.created_at,
        }));

        return NextResponse.json(secretaries);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error fetching laboratory secretaries';
        console.error('Error fetching laboratory secretaries:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// POST /api/laboratories/secretaries
export async function POST(request: NextRequest) {
    try {
        const authResult = await requireAuth(request, ['laboratory', 'admin']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('LAB_SECRETARY_ADD_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const body = await request.json();
        const { name, email, password, laboratoryId: rawLabId, laboratory_id, permissions, phone, country, state, city, sector, address } = body;
        const laboratoryId = rawLabId || laboratory_id;

        if (!name || !email || !password || !laboratoryId) {
            return NextResponse.json(
                { error: 'Nombre, correo, contraseña y ID de laboratorio son obligatorios' },
                { status: 400 }
            );
        }

        // Verify the laboratory only adds secretaries to itself
        if (user.role === 'laboratory' && laboratoryId !== user.id) {
            logSecurityEvent('LAB_SECRETARY_ADD_FORBIDDEN', {
                userId: user.id,
                attemptedLabId: laboratoryId
            });
            return NextResponse.json(
                { error: 'No puedes añadir secretarias a otro laboratorio' },
                { status: 403 }
            );
        }

        if (detectInjection(JSON.stringify(body))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedEmail = sanitizeEmail(email);

        // Check if email already exists in secretaries
        const { data: existingSec } = await supabaseAdmin
            .from('secretaries')
            .select('id')
            .eq('email', sanitizedEmail)
            .maybeSingle();

        if (existingSec) {
            return NextResponse.json({ error: 'Ya existe un usuario con este correo electrónico.' }, { status: 409 });
        }

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: sanitizedEmail,
            password,
            email_confirm: true,
            user_metadata: {
                role: 'secretary',
                full_name: sanitizedName,
                laboratory_id: laboratoryId
            }
        });

        if (authError) {
            console.error('Error creating Auth user for lab secretary:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 });
        }

        const hashedPassword = await hashPassword(password);

        // 2. Insert into secretaries table linked by auth ID
        const { data, error } = await supabaseAdmin
            .from('secretaries')
            .insert([{
                id: authData.user.id,
                name: sanitizedName,
                email: sanitizedEmail,
                password: hashedPassword,
                laboratory_id: laboratoryId,
                permissions: permissions || ['agenda', 'samples', 'results'],
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

        // Enviar correo de bienvenida a la secretaria de laboratorio (no bloqueante)
        sendRoleWelcomeEmail({
            email: sanitizedEmail,
            name: sanitizedName,
            role: 'secretary',
            extraData: {
                tempPassword: password,
                laboratoryName: user.name,
            },
        }).catch((err) => console.error('Error enviando correo de bienvenida a secretaria de laboratorio:', err));

        logSecurityEvent('LAB_SECRETARY_ADDED', {
            userId: user.id,
            laboratoryId,
            secretaryId: data.id
        });

        return NextResponse.json({
            id: data.id,
            name: data.name,
            email: data.email,
            role: 'secretary',
            laboratoryId: data.laboratory_id,
            permissions: data.permissions || [],
            phone: data.phone || '',
            country: data.country || 'VE',
            state: data.state || '',
            city: data.city || '',
            sector: data.sector || '',
            address: data.address || '',
            createdAt: data.created_at,
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

// DELETE /api/laboratories/secretaries?id=...
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Secretary ID is required' }, { status: 400 });
    }

    try {
        const authResult = await requireAuth(request, ['laboratory', 'admin']);
        if (authResult instanceof NextResponse) {
            return authResult;
        }

        // 1. Delete Auth User first
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authError) {
            console.error('Error deleting Auth user:', authError);
        }

        // 2. Delete from secretaries table
        const { error } = await supabaseAdmin
            .from('secretaries')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error deleting laboratory secretary';
        console.error('Error deleting secretary:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

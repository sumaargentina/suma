import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, password, clinicId, permissions } = body;

        // 1. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: 'secretary', full_name: name }
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
                id: authData.user.id, // Use Auth ID as PK
                name,
                email,
                password: 'MANAGED_BY_AUTH', // Secure
                clinic_id: clinicId,
                permissions: permissions || ['agenda'],
                role: 'secretary',
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            // Rollback Auth user if table insert fails
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

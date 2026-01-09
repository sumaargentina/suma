import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('secretaries')
            .select('*')
            .eq('clinic_id', clinicId);

        if (error) throw error;

        const secretaries = (data || []).map(item => ({
            id: item.id,
            email: item.email,
            name: item.name,
            role: 'secretary',
            clinicId: item.clinic_id,
            permissions: item.permissions || []
        }));

        return NextResponse.json(secretaries);
    } catch (error: any) {
        console.error('Error fetching secretaries:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'Secretary ID is required' }, { status: 400 });
    }

    try {
        // 1. Delete Auth User first (this prevents login immediately)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (authError) {
            console.error('Error deleting Auth user:', authError);
            // Continue to delete from table just in case
        }

        // 2. Delete from secretaries table
        const { error } = await supabaseAdmin
            .from('secretaries')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting secretary:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

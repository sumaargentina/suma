
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            result[camelKey] = obj[key];
        }
    }
    return result;
};

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const clinicId = searchParams.get('clinicId');

    if (!clinicId) {
        return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('clinic_specialties')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('name');

        if (error) throw error;

        const camelData = data.map(item => toCamelCase(item));
        return NextResponse.json(camelData);
    } catch (error: any) {
        console.error('Error fetching specialties:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { clinicId, name } = body;

        if (!clinicId || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('clinic_specialties')
            .insert([{ clinic_id: clinicId, name }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(toCamelCase(data));
    } catch (error: any) {
        console.error('Error adding specialty:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        const { error } = await supabaseAdmin
            .from('clinic_specialties')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting specialty:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

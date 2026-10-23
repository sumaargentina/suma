import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { hashPassword } from '@/lib/password-utils';

export const dynamic = 'force-dynamic';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
}

// Helper function to convert camelCase to snake_case
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
}

// GET /api/sellers - Get all sellers, or by ?id=xxx, or by ?referralCode=xxx
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');
        const referralCode = searchParams.get('referralCode');

        if (id) {
            const { data, error } = await supabaseAdmin
                .from('sellers')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
                }
                console.error('Error fetching seller:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json(toCamelCase(data as Record<string, unknown>));
        }

        if (referralCode) {
            const { data, error } = await supabaseAdmin
                .from('sellers')
                .select('id, name, email, referral_code, country, state, city')
                .ilike('referral_code', referralCode.trim())
                .maybeSingle();

            if (error) {
                console.error('Error fetching seller by referralCode:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
            if (!data) {
                return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
            }
            return NextResponse.json(toCamelCase(data as Record<string, unknown>));
        }

        const { data, error } = await supabaseAdmin
            .from('sellers')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching sellers list:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const sellers = (data || []).map(item => toCamelCase(item as Record<string, unknown>));
        return NextResponse.json(sellers);
    } catch (error) {
        console.error('Error in GET /api/sellers:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/sellers - Create a new seller
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const snakeCaseData = toSnakeCase(body as Record<string, unknown>);

        if (typeof snakeCaseData.email === 'string') {
            snakeCaseData.email = snakeCaseData.email.toLowerCase().trim();
        }

        if (typeof snakeCaseData.password === 'string' && snakeCaseData.password && !snakeCaseData.password.startsWith('$2')) {
            snakeCaseData.password = await hashPassword(snakeCaseData.password);
        }

        const { data, error } = await supabaseAdmin
            .from('sellers')
            .insert([snakeCaseData])
            .select('*')
            .single();

        if (error) {
            console.error('Error creating seller:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>), { status: 201 });
    } catch (error: any) {
        console.error('Error in POST /api/sellers:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/sellers?id=xxx - Update an existing seller
export async function PATCH(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const body = await request.json();
        const id = searchParams.get('id') || body.id;

        if (!id) {
            return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
        }

        const updatePayload = { ...body };
        delete updatePayload.id;

        if (typeof updatePayload.password === 'string') {
            if (!updatePayload.password.trim()) {
                delete updatePayload.password;
            } else if (!updatePayload.password.startsWith('$2')) {
                updatePayload.password = await hashPassword(updatePayload.password.trim());
            }
        }

        const snakeCaseData = toSnakeCase(updatePayload as Record<string, unknown>);

        const { data, error } = await supabaseAdmin
            .from('sellers')
            .update(snakeCaseData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            console.error('Error updating seller:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>));
    } catch (error: any) {
        console.error('Error in PATCH /api/sellers:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/sellers?id=xxx - Delete a seller and unlink referred doctors/payments
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Seller ID is required' }, { status: 400 });
        }

        // Unlink referred doctors and delete seller_payments to prevent foreign key errors
        await Promise.allSettled([
            supabaseAdmin.from('doctors').update({ seller_id: null }).eq('seller_id', id),
            supabaseAdmin.from('seller_payments').delete().eq('seller_id', id),
        ]);

        const { error } = await supabaseAdmin
            .from('sellers')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting seller:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error in DELETE /api/sellers:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

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

// Convert snake_case to camelCase
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const lowerEmail = email.toLowerCase();

        // Check in admins table
        const { data, error } = await supabaseAdmin
            .from('admins')
            .select('*')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
            }
            console.error('Error finding admin:', error);
            return NextResponse.json(
                { error: 'Database error' },
                { status: 500 }
            );
        }

        if (!data) {
            return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
        }

        return NextResponse.json({
            ...toCamelCase(data as Record<string, unknown>),
            role: 'admin',
        });
    } catch (error) {
        console.error('Error finding admin:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

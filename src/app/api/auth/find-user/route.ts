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

        // Check in doctors, sellers, and patients tables
        const collections = [
            { name: 'doctors', role: 'doctor' },
            { name: 'sellers', role: 'seller' },
            { name: 'patients', role: 'patient' },
            { name: 'clinics', role: 'clinic' },
            { name: 'secretaries', role: 'secretary' },
        ];

        for (const { name, role } of collections) {
            // Clinics table uses 'admin_email' instead of 'email'
            const emailColumn = name === 'clinics' ? 'admin_email' : 'email';

            const { data, error } = await supabaseAdmin
                .from(name)
                .select('*')
                .eq(emailColumn, lowerEmail)
                .maybeSingle();

            if (data) {
                const camelCaseData = toCamelCase(data as Record<string, unknown>);
                // Normalize email field for clinics
                if (role === 'clinic' && camelCaseData.adminEmail) {
                    camelCaseData.email = camelCaseData.adminEmail;
                }
                return NextResponse.json({
                    ...camelCaseData,
                    role,
                });
            }
        }

        // User not found
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    } catch (error) {
        console.error('Error finding user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}


import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

// Convert snake_case to camelCase
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const lowerEmail = email.toLowerCase();

        const collections = [
            { name: 'doctors', role: 'doctor' },
            { name: 'sellers', role: 'seller' },
            { name: 'patients', role: 'patient' },
            { name: 'clinics', role: 'clinic' },
            { name: 'secretaries', role: 'secretary' },
        ];

        for (const { name, role } of collections) {
            // Use 'email' for all tables including clinics
            const { data } = await supabaseAdmin
                .from(name)
                .select('*')
                .eq('email', lowerEmail)
                .maybeSingle();

            if (data) {
                const camelCaseData = toCamelCase(data as Record<string, unknown>);
                return NextResponse.json({
                    ...camelCaseData,
                    role,
                });
            }
        }

        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    } catch (error: any) {
        console.error('Error finding user:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}

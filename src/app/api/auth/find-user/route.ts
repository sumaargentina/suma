
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
            { name: 'pharmacies', role: 'pharmacy' },
            { name: 'laboratories', role: 'laboratory' },
        ];

        for (const { name, role } of collections) {
            let query = supabaseAdmin.from(name).select('*');
            if (name === 'clinics' || name === 'laboratories') {
                query = query.or(`admin_email.eq.${lowerEmail},email.eq.${lowerEmail}`);
            } else {
                query = query.eq('email', lowerEmail);
            }

            const { data } = await query.maybeSingle();

            if (data) {
                const camelCaseData = toCamelCase(data as Record<string, unknown>);
                // Normalize email field for clinics and laboratories so login works consistently
                if ((role === 'clinic' || role === 'laboratory') && camelCaseData.adminEmail && !camelCaseData.email) {
                    camelCaseData.email = camelCaseData.adminEmail;
                }
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

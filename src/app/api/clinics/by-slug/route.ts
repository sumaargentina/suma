import { getClinicBySlug } from '@/lib/supabaseService';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get('slug');

        if (!slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        const clinic = await getClinicBySlug(slug);

        if (!clinic) {
            return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
        }

        return NextResponse.json(clinic);
    } catch (error: any) {
        console.error('API Error fetching clinic by slug:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

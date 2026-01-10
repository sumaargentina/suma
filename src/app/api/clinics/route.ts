import { supabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server';

// Force dynamic to ensure fresh data
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        let query = supabaseAdmin
            .from('clinics')
            .select('*');

        if (id) {
            query = query.eq('id', id);
        } else {
            query = query.order('name');
        }

        const { data: clinics, error } = await query;

        if (error) {
            console.error('Database error fetching clinics:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!clinics) {
            return NextResponse.json([]);
        }

        // Convert to camelCase
        const camelCaseClinics = clinics.map((clinic: any) => ({
            id: clinic.id,
            name: clinic.name,
            adminEmail: clinic.admin_email,
            email: clinic.email,
            slug: clinic.slug,
            phone: clinic.phone,
            whatsapp: clinic.whatsapp,
            website: clinic.website,
            description: clinic.description,
            address: clinic.address,
            city: clinic.city,
            logoUrl: clinic.logo_url,
            bannerImage: clinic.banner_image,
            status: clinic.status,
            plan: clinic.plan,
            billingCycle: clinic.billing_cycle,
            verificationStatus: clinic.verification_status,
            rating: clinic.rating,
            reviewCount: clinic.review_count,
            createdAt: clinic.created_at,
            acceptedInsurances: clinic.accepted_insurances,
            paymentSettings: clinic.payment_settings,
        }));

        return NextResponse.json(camelCaseClinics);
    } catch (error: any) {
        console.error('Unexpected error in GET /api/clinics:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Clinic ID is required' }, { status: 400 });
        }

        const body = await request.json();

        // Manual mapping to snake_case for critical fields
        const dbData: Record<string, any> = {};
        if (body.name !== undefined) dbData.name = body.name;
        if (body.phone !== undefined) dbData.phone = body.phone;
        if (body.description !== undefined) dbData.description = body.description;
        if (body.logoUrl !== undefined) dbData.logo_url = body.logoUrl;
        if (body.bannerImage !== undefined) dbData.banner_image = body.bannerImage;
        if (body.address !== undefined) dbData.address = body.address;
        if (body.city !== undefined) dbData.city = body.city;
        if (body.paymentSettings !== undefined) dbData.payment_settings = body.paymentSettings;
        if (body.slug !== undefined) dbData.slug = body.slug;
        if (body.status !== undefined) dbData.status = body.status;
        if (body.whatsapp !== undefined) dbData.whatsapp = body.whatsapp;
        if (body.website !== undefined) dbData.website = body.website;
        if (body.adminEmail !== undefined) dbData.admin_email = body.adminEmail;
        if (body.acceptedInsurances !== undefined) dbData.accepted_insurances = body.acceptedInsurances;
        if (body.verificationStatus !== undefined) dbData.verification_status = body.verificationStatus;
        if (body.plan !== undefined) dbData.plan = body.plan;

        const { error } = await supabaseAdmin
            .from('clinics')
            .update(dbData)
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating clinic:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

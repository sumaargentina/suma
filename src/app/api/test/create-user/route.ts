import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export async function POST(request: NextRequest) {
    try {
        const { email, password, name, role } = await request.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        let result;
        const userData = {
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
        };

        // Insert based on role
        if (role === 'patient') {
            result = await supabaseAdmin.from('patients').insert({
                ...userData,
                age: null,
                gender: null,
                phone: null,
                cedula: null,
                city: null,
                profile_image: null,
                favorite_doctor_ids: [],
                profile_completed: false,
            }).select().single();
        } else if (role === 'doctor') {
            result = await supabaseAdmin.from('doctors').insert({
                ...userData,
                specialty: 'Medicina General',
                city: 'Buenos Aires',
                address: 'Dirección de prueba',
                cedula: '',
                sector: '',
                rating: 0,
                review_count: 0,
                profile_image: 'https://placehold.co/400x400.png',
                banner_image: 'https://placehold.co/1200x400.png',
                ai_hint: 'doctor portrait',
                description: 'Doctor de prueba',
                services: [],
                bank_details: [],
                slot_duration: 30,
                consultation_fee: 5000,
                schedule: {
                    monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                    tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                    wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                    thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
                    friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
                    saturday: { active: false, slots: [] },
                    sunday: { active: false, slots: [] },
                },
                status: 'active',
                last_payment_date: '',
                whatsapp: '',
                lat: 0,
                lng: 0,
                join_date: new Date().toISOString(),
                subscription_status: 'active',
                next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                coupons: [],
                expenses: [],
                seller_id: null,
            }).select().single();
        } else if (role === 'admin') {
            result = await supabaseAdmin.from('admins').insert({
                ...userData,
                profile_image: 'https://placehold.co/400x400.png',
            }).select().single();
        } else {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        if (result.error) {
            console.error('Error creating test user:', result.error);
            return NextResponse.json({ error: result.error.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Test ${role} created successfully`,
            user: result.data,
            credentials: {
                email: email.toLowerCase(),
                password: password, // Return the plain password for testing
            }
        });
    } catch (error) {
        console.error('Error creating test user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

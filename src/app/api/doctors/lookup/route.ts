import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dni = searchParams.get('dni')?.trim();
        const email = searchParams.get('email')?.trim().toLowerCase();
        const clinicId = searchParams.get('clinicId');

        if (!dni && !email) {
            return NextResponse.json({ error: 'Debes proporcionar DNI o Email para buscar' }, { status: 400 });
        }

        let query = supabaseAdmin
            .from('doctors')
            .select('id, name, email, cedula, specialty, profile_image, banner_image, medical_license');

        if (dni && email) {
            query = query.or(`cedula.eq.${dni},email.eq.${email}`);
        } else if (dni) {
            query = query.eq('cedula', dni);
        } else if (email) {
            query = query.eq('email', email);
        }

        const { data: doctors, error } = await query.limit(1);

        if (error) {
            console.error('Error looking up doctor:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!doctors || doctors.length === 0) {
            return NextResponse.json({ found: false });
        }

        const doctor = doctors[0];

        // Check if already affiliated with the clinic
        let isAffiliated = false;
        if (clinicId) {
            const { data: ws } = await supabaseAdmin
                .from('doctor_workspaces')
                .select('id, status')
                .eq('doctor_id', doctor.id)
                .eq('clinic_id', clinicId)
                .eq('status', 'active')
                .maybeSingle();

            if (ws) {
                isAffiliated = true;
            }
        }

        return NextResponse.json({
            found: true,
            isAffiliated,
            doctor: {
                id: doctor.id,
                name: doctor.name,
                email: doctor.email,
                cedula: doctor.cedula,
                specialty: doctor.specialty,
                profileImage: doctor.profile_image,
                bannerImage: doctor.banner_image,
                medicalLicense: doctor.medical_license,
            }
        });
    } catch (error: any) {
        console.error('Exception in GET /api/doctors/lookup:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

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
            .select('id, name, email, cedula, phone, whatsapp, profession, specialty, profile_image, banner_image, medical_license');

        const orFilters: string[] = [];
        if (dni) {
            const digits = dni.replace(/\D/g, '');
            orFilters.push(`cedula.eq.${dni}`);
            if (digits.length >= 5) {
                orFilters.push(`cedula.eq.${digits}`);
                orFilters.push(`cedula.eq.V-${digits}`);
                orFilters.push(`cedula.eq.E-${digits}`);
                orFilters.push(`cedula.eq.P-${digits}`);
                orFilters.push(`cedula.ilike.%${digits}%`);
            }
        }
        if (email) {
            orFilters.push(`email.ilike.${email}`);
        }

        query = query.or(orFilters.join(','));

        const { data: doctors, error } = await query.limit(5);

        if (error) {
            console.error('Error looking up doctor:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!doctors || doctors.length === 0) {
            return NextResponse.json({ found: false });
        }

        const cleanDniDigits = dni ? dni.replace(/\D/g, '') : '';
        const doctor =
            doctors.find((d: any) => email && (d.email || '').toLowerCase() === email) ||
            doctors.find((d: any) => cleanDniDigits && (d.cedula || '').replace(/\D/g, '') === cleanDniDigits) ||
            doctors[0];

        // Check if already affiliated with the clinic
        let isAffiliated = false;
        if (clinicId) {
            const { data: wsRows } = await supabaseAdmin
                .from('doctor_workspaces')
                .select('id, status')
                .eq('doctor_id', doctor.id)
                .eq('clinic_id', clinicId)
                .in('status', ['active', 'pending_invitation'])
                .limit(1);

            if (wsRows && wsRows.length > 0) {
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
                phone: doctor.phone || doctor.whatsapp || '',
                profession: doctor.profession || 'Médico',
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

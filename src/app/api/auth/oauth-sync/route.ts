import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email: rawEmail, name: rawName, avatar, id: authUserId, intendedRole } = body;

        const email = (rawEmail || '').toLowerCase().trim();
        const name = rawName || email.split('@')[0] || 'Usuario';
        const profileImage = avatar || null;

        if (!email) {
            return NextResponse.json({ error: 'Correo no proporcionado por Google' }, { status: 400 });
        }

        console.log('🔑 OAuth Sync Request for:', email, 'Intended role:', intendedRole);

        // 1. Verificar si el correo pertenece a una secretaria (Secretarias NO usan Google)
        const { data: secretaryData } = await supabaseAdmin
            .from('secretaries')
            .select('id, name, email, clinic_id')
            .eq('email', email)
            .maybeSingle();

        if (secretaryData) {
            console.warn('⚠️ Intento de inicio de sesión con Google por secretaria:', email);
            return NextResponse.json({
                error: 'secretary_no_google',
                message: 'Las cuentas de secretaria deben ingresar con su correo y contraseña asignados por la clínica.'
            }, { status: 403 });
        }

        let userRole: 'clinic' | 'doctor' | 'seller' | 'patient' = 'patient';
        let userId = authUserId;
        let userName = name;
        let redirectUrl = '/dashboard';
        let fullUserData: any = null;

        // 2. Verificar si pertenece a una Clínica
        const { data: clinicData } = await supabaseAdmin
            .from('clinics')
            .select('id, name, email')
            .eq('email', email)
            .maybeSingle();

        if (clinicData) {
            userRole = 'clinic';
            userId = clinicData.id;
            userName = clinicData.name;
            redirectUrl = '/clinic/dashboard';
            fullUserData = { ...clinicData, role: 'clinic' };
        } else {
            // 3. Verificar si pertenece a un Médico
            const { data: doctorData } = await supabaseAdmin
                .from('doctors')
                .select('*')
                .eq('email', email)
                .maybeSingle();

            if (doctorData) {
                userRole = 'doctor';
                userId = doctorData.id;
                userName = doctorData.name;
                redirectUrl = (doctorData.onboarding_completed === false || doctorData.specialty === 'Pendiente' || !doctorData.medical_license)
                    ? '/doctor/dashboard?welcome=true'
                    : '/doctor/dashboard';
                fullUserData = { ...doctorData, role: 'doctor' };

                if (!doctorData.profile_image && profileImage) {
                    await supabaseAdmin
                        .from('doctors')
                        .update({ profile_image: profileImage })
                        .eq('id', doctorData.id);
                }
            } else if (intendedRole === 'doctor') {
                // Si el usuario solicitó explícitamente registrarse como Médico
                console.log('✨ Auto-registrando nuevo médico vía Google OAuth:', email);

                // Limpiar cualquier registro placeholder de paciente previo con Google
                await supabaseAdmin
                    .from('patients')
                    .delete()
                    .eq('email', email)
                    .eq('password', 'OAUTH_GOOGLE_USER');

                const defaultSchedule = {
                    monday: { enabled: true, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
                    tuesday: { enabled: true, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
                    wednesday: { enabled: true, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
                    thursday: { enabled: true, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
                    friday: { enabled: true, slots: ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'] },
                    saturday: { enabled: false, slots: [] },
                    sunday: { enabled: false, slots: [] },
                };

                const { data: newDoctor, error: insertDocError } = await supabaseAdmin
                    .from('doctors')
                    .insert({
                        name: userName,
                        email: email,
                        password: 'OAUTH_GOOGLE_USER',
                        profile_image: profileImage,
                        specialty: 'Pendiente',
                        city: 'Maturín',
                        address: 'Consultorio',
                        schedule: defaultSchedule,
                        consultation_fee: 0,
                        rating: 5.0,
                        review_count: 0,
                        status: 'active',
                        verification_status: 'verified',
                        onboarding_completed: false,
                        join_date: new Date().toISOString().split('T')[0],
                        created_at: new Date().toISOString()
                    })
                    .select('*')
                    .single();

                if (insertDocError || !newDoctor) {
                    console.error('❌ Error creando nuevo médico desde Google OAuth:', insertDocError);
                    return NextResponse.json({ error: 'Error al registrar médico' }, { status: 500 });
                }

                userRole = 'doctor';
                userId = newDoctor.id;
                userName = newDoctor.name;
                redirectUrl = '/doctor/dashboard?welcome=true';
                fullUserData = { ...newDoctor, role: 'doctor' };
            } else {
                // 4. Verificar si pertenece a un Vendedor (Seller)
                const { data: sellerData } = await supabaseAdmin
                    .from('sellers')
                    .select('id, name, email')
                    .eq('email', email)
                    .maybeSingle();

                if (sellerData) {
                    userRole = 'seller';
                    userId = sellerData.id;
                    userName = sellerData.name;
                    redirectUrl = '/seller/dashboard?view=referrals';
                    fullUserData = { ...sellerData, role: 'seller' };
                } else {
                    // 5. Verificar si pertenece a un Paciente ya registrado
                    const { data: patientData } = await supabaseAdmin
                        .from('patients')
                        .select('*')
                        .eq('email', email)
                        .maybeSingle();

                    if (patientData) {
                        userRole = 'patient';
                        userId = patientData.id;
                        userName = patientData.name;
                        redirectUrl = '/dashboard';
                        fullUserData = { ...patientData, role: 'patient' };

                        if (!patientData.profile_image && profileImage) {
                            await supabaseAdmin
                                .from('patients')
                                .update({ profile_image: profileImage })
                                .eq('id', patientData.id);
                        }
                    } else {
                        // 6. Si NO existe en ninguna tabla -> Auto-registro de Paciente
                        console.log('✨ Auto-registrando nuevo paciente vía Google OAuth:', email);
                        const { data: newPatient, error: insertError } = await supabaseAdmin
                            .from('patients')
                            .insert({
                                name: userName,
                                email: email,
                                password: 'OAUTH_GOOGLE_USER',
                                profile_image: profileImage,
                                profile_completed: false,
                                favorite_doctor_ids: [],
                                created_at: new Date().toISOString()
                            })
                            .select('*')
                            .single();

                        if (insertError || !newPatient) {
                            console.error('❌ Error creando nuevo paciente desde Google OAuth:', insertError);
                            return NextResponse.json({ error: 'Error al registrar paciente' }, { status: 500 });
                        }

                        userRole = 'patient';
                        userId = newPatient.id;
                        userName = newPatient.name;
                        redirectUrl = '/dashboard';
                        fullUserData = { ...newPatient, role: 'patient' };
                    }
                }
            }
        }

        // Crear token JWT para cookies httpOnly
        const token = await new SignJWT({
            userId,
            email,
            role: userRole,
            name: userName
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

        const response = NextResponse.json({
            success: true,
            user: fullUserData,
            role: userRole,
            redirectUrl
        });

        response.cookies.set({
            name: 'auth-token',
            value: token,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('❌ Error en /api/auth/oauth-sync:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

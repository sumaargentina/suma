
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

// POST - Crear registro médico
export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo médicos y admins pueden crear registros médicos
        const authResult = await requireAuth(request, ['doctor', 'admin', 'clinic']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('MEDICAL_RECORD_CREATE_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const body = await request.json();

        console.log('📝 API Recibida para crear registro:', body);

        // Validación básica
        if (!body.patient_id || !body.doctor_id || !body.diagnosis) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios' },
                { status: 400 }
            );
        }

        // 🔐 SEGURIDAD: Verificar que el doctor solo crea registros a su nombre
        if (user.role === 'doctor' && body.doctor_id !== user.id) {
            logSecurityEvent('MEDICAL_RECORD_CREATE_FORBIDDEN', {
                userId: user.id,
                attemptedDoctorId: body.doctor_id,
                reason: 'Doctor trying to create record for another doctor'
            });
            return NextResponse.json(
                { error: 'No puedes crear registros médicos a nombre de otro doctor' },
                { status: 403 }
            );
        }

        logSecurityEvent('MEDICAL_RECORD_CREATE', {
            userId: user.id,
            role: user.role,
            patientId: body.patient_id
        });

        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .insert([body])
            .select()
            .single();

        if (error) {
            console.error('❌ Error Supabase Admin:', error);
            return NextResponse.json(
                { error: error.message, details: error },
                { status: 500 }
            );
        }

        return NextResponse.json(data);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('💥 Error Servidor:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: errorMessage },
            { status: 500 }
        );
    }
}

// GET - Obtener registros médicos
export async function GET(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Requiere autenticación
        const authResult = await requireAuth(request, ['patient', 'doctor', 'admin', 'clinic']);

        if (authResult instanceof NextResponse) {
            return authResult;
        }

        const { user } = authResult;
        const { searchParams } = new URL(request.url);
        const patient_id = searchParams.get('patient_id');
        const family_member_id = searchParams.get('family_member_id');

        if (!patient_id && !family_member_id) {
            return NextResponse.json({ error: 'Patient ID or Family Member ID required' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Pacientes solo pueden ver sus propios registros
        if (user.role === 'patient' && patient_id && patient_id !== user.id) {
            logSecurityEvent('MEDICAL_RECORD_ACCESS_FORBIDDEN', {
                userId: user.id,
                attemptedPatientId: patient_id,
                reason: 'Patient trying to access another patient records'
            });
            return NextResponse.json(
                { error: 'No tienes permisos para ver estos registros' },
                { status: 403 }
            );
        }

        console.log(`🔎 API GET Records. Patient: ${patient_id}, FamilyMember: ${family_member_id}`);

        let query = supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                doctors ( name, specialty )
            `)
            .order('visit_date', { ascending: false });

        if (family_member_id) {
            query = query.eq('family_member_id', family_member_id);
        } else {
            query = query.eq('patient_id', patient_id).is('family_member_id', null);
        }

        const { data, error } = await query;

        if (data && data.length === 0) {
            console.warn('⚠️ No se encontraron registros.');
        }

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching records:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

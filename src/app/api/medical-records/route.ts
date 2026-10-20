
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

        // Asegurar que recipe_code y recipe_status estén definidos para la conexión con farmacia
        if (data && !data.recipe_code) {
            const generatedRecipeCode = `SUMA-REC-${data.id.slice(0, 8).toUpperCase()}`;
            const { data: updatedRecord } = await supabaseAdmin
                .from('medical_records')
                .update({
                    recipe_code: generatedRecipeCode,
                    recipe_status: data.recipe_status || 'active'
                })
                .eq('id', data.id)
                .select()
                .single();
            if (updatedRecord) {
                Object.assign(data, updatedRecord);
            }
        }

        // 🔬 Si el médico solicitó exámenes de laboratorio, crear automáticamente la orden en laboratory_orders
        if (body.requested_studies && typeof body.requested_studies === 'string' && body.requested_studies.trim()) {
            try {
                const orderNumber = `SUMA-LAB-${data.id.slice(0, 8).toUpperCase()}`;
                await supabaseAdmin.from('laboratory_orders').insert([{
                    doctor_id: body.doctor_id,
                    patient_id: body.patient_id,
                    appointment_id: body.appointment_id || null,
                    order_number: orderNumber,
                    studies: [{ name: body.requested_studies.trim() }],
                    diagnosis: body.diagnosis || '',
                    clinical_indications: body.requested_studies.trim(),
                    doctor_notes: body.treatment_plan || null,
                    status: 'pending',
                    results_available: false,
                    valid_from: new Date().toISOString(),
                    valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()
                }]);
                console.log('🔬 Orden de laboratorio creada exitosamente:', orderNumber);
            } catch (labErr) {
                console.warn('⚠️ Nota: error no bloqueante creando laboratory_order:', labErr);
            }
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
                doctors ( name, specialty, medical_license, signature_url, phone, whatsapp, address, city )
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

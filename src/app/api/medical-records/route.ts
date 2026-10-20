import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, logSecurityEvent } from '@/lib/auth-utils';

export const dynamic = 'force-dynamic';

const VALID_MEDICAL_RECORD_COLUMNS = new Set([
    'patient_id',
    'doctor_id',
    'appointment_id',
    'visit_date',
    'record_type',
    'reason_for_visit',
    'symptoms',
    'diagnosis',
    'treatment_plan',
    'notes',
    'vital_signs',
    'family_member_id',
    'evaluation',
    'requested_studies',
    'evolution',
    'prescription',
    'medical_report',
    'requires_rest',
    'rest_days',
    'rest_start_date',
    'rest_end_date',
    'rest_type',
    'rest_justification',
    'prescription_expires_at',
    'recipe_status',
    'dispensed_by_pharmacy_id',
    'dispensed_by_pharmacy_name',
    'dispensed_at',
    'dispensation_notes',
    'recipe_code',
    'visit_type',
    'weight',
    'height',
    'blood_pressure',
    'temperature',
    'heart_rate',
    'oxygen_saturation',
    'attachments',
    'digital_signature',
    'is_chronic_treatment',
    'refill_interval_days',
    'next_refill_date',
]);

const NULLABLE_DATE_OR_UUID_COLUMNS = new Set([
    'appointment_id',
    'family_member_id',
    'dispensed_by_pharmacy_id',
    'visit_date',
    'rest_start_date',
    'rest_end_date',
    'prescription_expires_at',
    'dispensed_at',
    'next_refill_date',
]);

// POST - Crear registro médico y récipe
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const authResult = await verifyAuth(request);

        let resolvedDoctorId = body.doctor_id;

        // Verificar que el doctor_id existe en la base de datos (o buscarlo por email si se envió doctor_email)
        if (resolvedDoctorId) {
            const { data: docById } = await supabaseAdmin
                .from('doctors')
                .select('id')
                .eq('id', resolvedDoctorId)
                .maybeSingle();

            if (!docById) {
                resolvedDoctorId = null;
            }
        }

        if (!resolvedDoctorId && (body.doctor_email || authResult.user?.email)) {
            const targetEmail = (body.doctor_email || authResult.user?.email || '').toLowerCase().trim();
            if (targetEmail) {
                const { data: docByEmail } = await supabaseAdmin
                    .from('doctors')
                    .select('id')
                    .eq('email', targetEmail)
                    .maybeSingle();
                if (docByEmail) {
                    resolvedDoctorId = docByEmail.id;
                }
            }
        }

        if (!resolvedDoctorId && authResult.authenticated && authResult.user?.role === 'doctor') {
            resolvedDoctorId = authResult.user.id;
        }

        // Validación básica
        const effectiveDiagnosis =
            (body.diagnosis || '').trim() ||
            (body.reason_for_visit || '').trim() ||
            (body.evaluation || '').trim();

        if (!body.patient_id || !resolvedDoctorId || !effectiveDiagnosis) {
            return NextResponse.json(
                { error: 'Faltan campos obligatorios (paciente, médico o diagnóstico/evaluación)' },
                { status: 400 }
            );
        }

        // Sanitizar columnas válidas y convertir strings vacíos en fechas/UUIDs a null
        const cleanInsert: Record<string, any> = {};
        for (const [key, val] of Object.entries(body)) {
            if (!VALID_MEDICAL_RECORD_COLUMNS.has(key)) continue;
            if (NULLABLE_DATE_OR_UUID_COLUMNS.has(key) && (val === '' || val === undefined)) {
                cleanInsert[key] = null;
            } else {
                cleanInsert[key] = val;
            }
        }

        cleanInsert.patient_id = body.patient_id;
        cleanInsert.doctor_id = resolvedDoctorId;
        cleanInsert.diagnosis = effectiveDiagnosis;
        cleanInsert.treatment_plan =
            (body.treatment_plan || '').trim() ||
            (body.prescription || '').trim() ||
            'Cumplir indicaciones según pauta médica.';

        if (!cleanInsert.visit_date) {
            cleanInsert.visit_date = new Date().toISOString();
        }
        if (!cleanInsert.recipe_status) {
            cleanInsert.recipe_status = 'active';
        }

        logSecurityEvent('MEDICAL_RECORD_CREATE', {
            userId: authResult.user?.id || resolvedDoctorId,
            role: authResult.user?.role || 'doctor',
            patientId: cleanInsert.patient_id,
        });

        const { data, error } = await supabaseAdmin
            .from('medical_records')
            .insert([cleanInsert])
            .select()
            .single();

        if (error) {
            console.error('❌ Error Supabase Admin al guardar historia médica:', error);
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
                    recipe_status: data.recipe_status || 'active',
                })
                .eq('id', data.id)
                .select()
                .single();
            if (updatedRecord) {
                Object.assign(data, updatedRecord);
            }
        }

        // 🔬 Si el médico solicitó exámenes de laboratorio, crear automáticamente la orden en laboratory_orders
        if (cleanInsert.requested_studies && typeof cleanInsert.requested_studies === 'string' && cleanInsert.requested_studies.trim()) {
            try {
                const orderNumber = `SUMA-LAB-${data.id.slice(0, 8).toUpperCase()}`;
                await supabaseAdmin.from('laboratory_orders').insert([{
                    doctor_id: cleanInsert.doctor_id,
                    patient_id: cleanInsert.patient_id,
                    appointment_id: cleanInsert.appointment_id || null,
                    order_number: orderNumber,
                    studies: [{ name: cleanInsert.requested_studies.trim() }],
                    diagnosis: cleanInsert.diagnosis || '',
                    clinical_indications: cleanInsert.requested_studies.trim(),
                    doctor_notes: cleanInsert.treatment_plan || null,
                    status: 'pending',
                    results_available: false,
                    valid_from: new Date().toISOString(),
                    valid_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
                }]);
            } catch (labErr) {
                console.warn('⚠️ Nota: error no bloqueante creando laboratory_order:', labErr);
            }
        }

        return NextResponse.json(data);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('💥 Error Servidor en POST /api/medical-records:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: errorMessage },
            { status: 500 }
        );
    }
}

// GET - Obtener registros médicos
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const patient_id = searchParams.get('patient_id');
        const family_member_id = searchParams.get('family_member_id');

        if (!patient_id && !family_member_id) {
            return NextResponse.json({ error: 'Patient ID or Family Member ID required' }, { status: 400 });
        }

        const authResult = await verifyAuth(request);
        if (authResult.authenticated && authResult.user?.role === 'patient' && patient_id && patient_id !== authResult.user.id) {
            return NextResponse.json(
                { error: 'No tienes permisos para ver estos registros' },
                { status: 403 }
            );
        }

        let query = supabaseAdmin
            .from('medical_records')
            .select(`
                *,
                doctors ( id, name, specialty, medical_license, signature_url, phone, whatsapp, address, city )
            `)
            .order('visit_date', { ascending: false });

        if (family_member_id) {
            query = query.eq('family_member_id', family_member_id);
        } else if (patient_id) {
            query = query.eq('patient_id', patient_id).is('family_member_id', null);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error fetching medical records:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

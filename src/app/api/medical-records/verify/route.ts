import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// GET /api/medical-records/verify?id=[id]
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID de récipe requerido' }, { status: 400 });
        }

        // Consultar registro médico con información del médico tratante
        const { data: record, error: recordError } = await supabaseAdmin
            .from('medical_records')
            .select(`
                id,
                patient_id,
                doctor_id,
                visit_date,
                diagnosis,
                prescription,
                treatment_plan,
                requested_studies,
                medical_report,
                requires_rest,
                rest_days,
                rest_start_date,
                rest_end_date,
                rest_type,
                rest_justification,
                evaluation,
                evolution,
                notes,
                created_at,
                doctors (
                    name,
                    specialty,
                    medical_license,
                    signature_url,
                    phone,
                    whatsapp,
                    address,
                    city
                )
            `)
            .eq('id', id)
            .maybeSingle();

        if (recordError) {
            console.error('Error al consultar récipe:', recordError);
            return NextResponse.json({ error: 'Error al consultar la base de datos' }, { status: 500 });
        }

        if (!record) {
            return NextResponse.json({ error: 'Récipe o Informe médico no encontrado o código inválido' }, { status: 404 });
        }

        // Consultar datos básicos del paciente
        let patientInfo: { name: string; cedula: string; email?: string } = {
            name: 'Paciente',
            cedula: 'N/A'
        };

        if (record.patient_id) {
            const { data: patient } = await supabaseAdmin
                .from('patients')
                .select('name, cedula, email')
                .eq('id', record.patient_id)
                .maybeSingle();

            if (patient) {
                patientInfo = {
                    name: patient.name || 'Paciente',
                    cedula: patient.cedula || 'N/A',
                    email: patient.email
                };
            }
        }

        const recipeCode = `SUMA-REC-${record.id.slice(0, 8).toUpperCase()}`;
        const reportCode = `SUMA-INF-${record.id.slice(0, 8).toUpperCase()}`;

        return NextResponse.json({
            success: true,
            verified: true,
            recipeCode,
            reportCode,
            record: {
                id: record.id,
                visitDate: record.visit_date || record.created_at,
                diagnosis: record.diagnosis,
                prescription: record.prescription,
                treatmentPlan: record.treatment_plan,
                requestedStudies: record.requested_studies,
                medicalReport: record.medical_report,
                requiresRest: Boolean(record.requires_rest),
                restDays: record.rest_days || 0,
                restStartDate: record.rest_start_date,
                restEndDate: record.rest_end_date,
                restType: record.rest_type || 'Absoluto',
                restJustification: record.rest_justification,
                evaluation: record.evaluation,
                evolution: record.evolution,
                createdAt: record.created_at
            },
            doctor: record.doctors || {
                name: 'Médico Tratante',
                specialty: 'Medicina General',
                medical_license: '',
                signature_url: null,
                phone: '',
                address: '',
                city: ''
            },
            patient: patientInfo
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error en verificación de récipe:', error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}

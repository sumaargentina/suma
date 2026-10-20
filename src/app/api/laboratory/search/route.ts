import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { query } = body;

        if (!query || typeof query !== 'string' || !query.trim()) {
            return NextResponse.json(
                { error: 'Debes ingresar un número de cédula o código de orden para buscar.' },
                { status: 400 }
            );
        }

        const cleanQuery = query.trim();

        // 1. Intentar buscar por Cédula de Paciente (soportando V-, E-, etc.)
        const numericCedula = cleanQuery.replace(/^[VvEeJjPp]-?/, '').trim();

        const { data: matchedPatients, error: patientError } = await supabaseAdmin
            .from('patients')
            .select('id, name, cedula, age, gender, phone, email, city, state')
            .or(`cedula.ilike.%${cleanQuery}%,cedula.ilike.%${numericCedula}%`)
            .limit(5);

        if (patientError) {
            console.error('Error buscando paciente por cédula en laboratorio:', patientError);
        }

        let patient = matchedPatients && matchedPatients.length > 0 ? matchedPatients[0] : null;
        let labOrders: any[] = [];
        let medicalRecordOrders: any[] = [];

        if (patient) {
            // Buscar órdenes registradas en laboratory_orders
            const { data: ordersData, error: ordersError } = await supabaseAdmin
                .from('laboratory_orders')
                .select(`
                    *,
                    doctors ( id, name, specialty, phone, whatsapp, medical_license, city )
                `)
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });

            if (ordersError) {
                console.error('Error buscando órdenes de laboratorio:', ordersError);
            } else if (ordersData) {
                labOrders = ordersData;
            }

            // También buscar registros médicos que tengan requested_studies
            const { data: recordsData, error: recordsError } = await supabaseAdmin
                .from('medical_records')
                .select(`
                    id,
                    patient_id,
                    doctor_id,
                    visit_date,
                    diagnosis,
                    requested_studies,
                    treatment_plan,
                    created_at,
                    doctors ( id, name, specialty, phone, whatsapp, medical_license, city )
                `)
                .eq('patient_id', patient.id)
                .not('requested_studies', 'is', null)
                .neq('requested_studies', '')
                .order('created_at', { ascending: false });

            if (recordsError) {
                console.error('Error buscando estudios en historial médico:', recordsError);
            } else if (recordsData) {
                medicalRecordOrders = recordsData;
            }
        } else {
            // 2. Si no encontró paciente por cédula, intentar por Código de Orden (ej. SUMA-LAB-XXXXXXXX o UUID)
            const cleanCode = cleanQuery.replace(/^SUMA-LAB-/i, '').trim();

            const isFullUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanCode);

            let orderQuery = supabaseAdmin
                .from('laboratory_orders')
                .select(`
                    *,
                    doctors ( id, name, specialty, phone, whatsapp, medical_license, city )
                `);

            if (isFullUuid) {
                orderQuery = orderQuery.or(`id.eq.${cleanCode},appointment_id.eq.${cleanCode}`);
            } else {
                const normalizedCode = cleanQuery.toUpperCase().startsWith('SUMA-LAB-')
                    ? cleanQuery.toUpperCase()
                    : `SUMA-LAB-${cleanQuery.toUpperCase()}`;
                orderQuery = orderQuery.or(`order_number.eq.${normalizedCode},order_number.ilike.%${cleanCode}%`);
            }

            const { data: orderData, error: orderError } = await orderQuery.limit(1).maybeSingle();

            if (orderError) {
                console.error('Error buscando orden de laboratorio por código:', orderError);
            } else if (orderData) {
                labOrders = [orderData];

                if (orderData.patient_id) {
                    const { data: foundPatient } = await supabaseAdmin
                        .from('patients')
                        .select('id, name, cedula, age, gender, phone, email, city, state')
                        .eq('id', orderData.patient_id)
                        .maybeSingle();

                    if (foundPatient) {
                        patient = foundPatient;
                    }
                }
            }
        }

        if (!patient && labOrders.length === 0 && medicalRecordOrders.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No se encontraron pacientes ni órdenes de laboratorio con los datos ingresados.',
                patient: null,
                orders: []
            });
        }

        // Unificar órdenes: evitar duplicados entre laboratory_orders y medical_records
        const formattedOrders: any[] = [];
        const seenOrderKeys = new Set<string>();

        // Primero procesar órdenes formales de laboratory_orders
        for (const order of labOrders) {
            const key = order.id;
            seenOrderKeys.add(key);

            let studiesText = '';
            if (Array.isArray(order.studies)) {
                studiesText = order.studies.map((s: any) => typeof s === 'string' ? s : (s.name || s.title || '')).filter(Boolean).join(', ');
            } else if (typeof order.studies === 'string') {
                studiesText = order.studies;
            }
            if (!studiesText && order.clinical_indications) {
                studiesText = order.clinical_indications;
            }

            formattedOrders.push({
                id: order.id,
                orderNumber: order.order_number || `SUMA-LAB-${order.id.slice(0, 8).toUpperCase()}`,
                patientId: order.patient_id,
                doctorId: order.doctor_id,
                doctor: order.doctors || {
                    name: 'Médico Tratante',
                    specialty: 'Especialista',
                    phone: '',
                    city: ''
                },
                date: order.created_at || order.valid_from,
                studies: studiesText || 'Estudios de Laboratorio Solicitados',
                diagnosis: order.diagnosis || '',
                clinicalIndications: order.clinical_indications || '',
                doctorNotes: order.doctor_notes || '',
                status: order.status || (order.results_available ? 'completed' : 'pending'),
                resultsAvailable: Boolean(order.results_available),
                resultsUrl: order.results_url || null,
                laboratoryNotes: order.laboratory_notes || '',
                completedDate: order.completed_date || order.results_uploaded_at || null,
                source: 'laboratory_orders'
            });
        }

        // Luego procesar medical_records que tengan requested_studies
        for (const rec of medicalRecordOrders) {
            const recCode = `SUMA-LAB-${rec.id.slice(0, 8).toUpperCase()}`;
            // Evitar duplicar si ya existe en laboratory_orders
            const alreadyExists = formattedOrders.some(
                o => o.orderNumber === recCode || (o.doctorId === rec.doctor_id && o.studies === rec.requested_studies)
            );

            if (!alreadyExists) {
                formattedOrders.push({
                    id: rec.id,
                    orderNumber: recCode,
                    patientId: rec.patient_id,
                    doctorId: rec.doctor_id,
                    doctor: rec.doctors || {
                        name: 'Médico Tratante',
                        specialty: 'Especialista',
                        phone: '',
                        city: ''
                    },
                    date: rec.visit_date || rec.created_at,
                    studies: rec.requested_studies,
                    diagnosis: rec.diagnosis || '',
                    clinicalIndications: rec.treatment_plan || '',
                    doctorNotes: rec.treatment_plan || '',
                    status: 'pending',
                    resultsAvailable: false,
                    resultsUrl: null,
                    laboratoryNotes: '',
                    completedDate: null,
                    source: 'medical_records'
                });
            }
        }

        // Obtener archivos adjuntos previos del paciente en category 'lab_result'
        let attachments: any[] = [];
        if (patient) {
            const { data: attData } = await supabaseAdmin
                .from('medical_attachments')
                .select('*')
                .eq('patient_id', patient.id)
                .order('created_at', { ascending: false });

            if (attData) {
                attachments = attData;
            }
        }

        return NextResponse.json({
            success: true,
            patient: patient ? {
                id: patient.id,
                name: patient.name,
                cedula: patient.cedula,
                age: patient.age,
                gender: patient.gender,
                phone: patient.phone,
                email: patient.email,
                city: patient.city,
                state: patient.state
            } : null,
            orders: formattedOrders,
            attachments
        });

    } catch (error: any) {
        console.error('Error buscando órdenes de laboratorio:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}

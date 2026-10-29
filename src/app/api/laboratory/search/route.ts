import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/laboratory/search?laboratoryId=...
 * Devuelve el historial de órdenes atendidas / completadas por este laboratorio
 * junto con los datos del médico que indicó los exámenes y del paciente.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const laboratoryId = searchParams.get('laboratoryId');

        if (!laboratoryId) {
            return NextResponse.json({ error: 'ID de laboratorio requerido' }, { status: 400 });
        }

        const { data: orders, error } = await supabaseAdmin
            .from('laboratory_orders')
            .select(`
                *,
                doctors ( id, name, specialty, phone, whatsapp, medical_license, city ),
                patients ( id, name, cedula, phone, city )
            `)
            .eq('laboratory_id', laboratoryId)
            .order('updated_at', { ascending: false })
            .limit(200);

        if (error) {
            console.error('Error consultando historial de órdenes del laboratorio:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = (orders || []).map((o: any) => {
            let studiesText = '';
            if (Array.isArray(o.studies)) {
                studiesText = o.studies
                    .map((s: any) => (typeof s === 'string' ? s : s.name || s.title || ''))
                    .filter(Boolean)
                    .join(', ');
            } else if (typeof o.studies === 'string') {
                studiesText = o.studies;
            }
            if (!studiesText && o.clinical_indications) {
                studiesText = o.clinical_indications;
            }

            return {
                id: o.id,
                orderNumber: o.order_number || `SUMA-LAB-${o.id.slice(0, 8).toUpperCase()}`,
                studies: studiesText || 'Estudios de Laboratorio',
                diagnosis: o.diagnosis || '',
                status: o.status || (o.results_available ? 'completed' : 'in_progress'),
                resultsAvailable: Boolean(o.results_available),
                resultsUrl: o.results_url || null,
                laboratoryNotes: o.laboratory_notes || '',
                attendedAt: o.scheduled_date || o.updated_at || o.created_at,
                completedDate: o.completed_date || o.results_uploaded_at || null,
                doctorId: o.doctors?.id || o.doctor_id || '',
                doctorName: o.doctors?.name || 'Médico Tratante',
                doctorSpecialty: o.doctors?.specialty || 'Medicina General',
                doctorLicense: o.doctors?.medical_license || '',
                patientId: o.patients?.id || o.patient_id || '',
                patientName: o.patients?.name || 'Paciente',
                patientCedula: o.patients?.cedula || 'N/A',
                patientPhone: o.patients?.phone || ''
            };
        });

        return NextResponse.json(formatted);
    } catch (error: any) {
        console.error('Error en GET /api/laboratory/search:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}

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
            // Intentar también buscar en medical_records por guest_patient_cedula (ej. pacientes atendidos en jornadas)
            if (numericCedula.length >= 4) {
                const { data: guestRecords } = await supabaseAdmin
                    .from('medical_records')
                    .select(`
                        id,
                        patient_id,
                        doctor_id,
                        visit_date,
                        diagnosis,
                        requested_studies,
                        treatment_plan,
                        guest_patient_name,
                        guest_patient_cedula,
                        guest_patient_phone,
                        guest_patient_email,
                        created_at,
                        doctors ( id, name, specialty, phone, whatsapp, medical_license, city )
                    `)
                    .or(`guest_patient_cedula.ilike.%${cleanQuery}%,guest_patient_cedula.ilike.%${numericCedula}%`)
                    .not('requested_studies', 'is', null)
                    .neq('requested_studies', '')
                    .order('created_at', { ascending: false });

                if (guestRecords && guestRecords.length > 0) {
                    medicalRecordOrders = guestRecords;
                    const firstGuest = guestRecords[0];
                    patient = {
                        id: firstGuest.patient_id || firstGuest.id,
                        name: firstGuest.guest_patient_name || 'Paciente SUMA',
                        cedula: firstGuest.guest_patient_cedula || cleanQuery,
                        age: null,
                        gender: null,
                        phone: firstGuest.guest_patient_phone || null,
                        email: firstGuest.guest_patient_email || null,
                        city: null,
                        state: null
                    };
                }
            }

            // 2. Si aún no encontró paciente por cédula, intentar por Código de Orden (ej. SUMA-LAB-XXXXXXXX o UUID)
            if (!patient && medicalRecordOrders.length === 0) {
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

        // Primero procesar órdenes formales de laboratory_orders
        for (const order of labOrders) {
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
                laboratoryId: order.laboratory_id || null,
                doctor: order.doctors || {
                    name: 'Médico Tratante',
                    specialty: 'Especialista',
                    medical_license: '',
                    phone: '',
                    city: ''
                },
                date: order.created_at || order.valid_from,
                studies: studiesText || 'Estudios de Laboratorio Solicitados',
                diagnosis: order.diagnosis || '',
                clinicalIndications: order.clinical_indications || '',
                doctorNotes: order.doctor_notes || '',
                status: order.results_available ? 'completed' : (order.status || 'pending'),
                resultsAvailable: Boolean(order.results_available),
                resultsUrl: order.results_url || null,
                laboratoryNotes: order.laboratory_notes || '',
                attendedAt: order.scheduled_date || null,
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
                    patientId: rec.patient_id || (patient ? patient.id : ''),
                    doctorId: rec.doctor_id,
                    laboratoryId: null,
                    doctor: rec.doctors || {
                        name: 'Médico Tratante',
                        specialty: 'Especialista',
                        medical_license: '',
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
                    attendedAt: null,
                    completedDate: null,
                    source: 'medical_records'
                });
            }
        }

        // Obtener archivos adjuntos previos del paciente en category 'lab_result'
        let attachments: any[] = [];
        if (patient?.id) {
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

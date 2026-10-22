import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { roundPrice } from '@/lib/validation-utils';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';

// Helper function to convert camelCase to snake_case
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

const VALID_APPOINTMENT_COLUMNS = new Set([
    'patient_id',
    'patient_name',
    'patient_phone',
    'doctor_id',
    'doctor_name',
    'doctor_address',
    'address_id',
    'clinic_id',
    'clinic_service_id',
    'laboratory_id',
    'laboratory_service_id',
    'service_name',
    'specialty',
    'clinical_reason',
    'office',
    'meeting_link',
    'date',
    'time',
    'services',
    'total_price',
    'consultation_fee',
    'payment_method',
    'payment_status',
    'payment_proof',
    'attendance',
    'patient_confirmation_status',
    'clinical_notes',
    'prescription',
    'messages',
    'read_by_patient',
    'read_by_doctor',
    'unread_messages_by_doctor',
    'unread_messages_by_patient',
    'last_message_timestamp',
    'created_at',
    'updated_at',
    'discount_amount',
    'applied_coupon',
    'consultation_type',
    'family_member_id',
    'booked_by_patient_id',
    'no_show_resolution',
    'refund_reason',
    'refund_date',
    'refund_amount',
    'rescheduled_from_date',
    'no_show_note',
    'currency',
    'payment_currency',
    'exchange_rate',
    'amount_in_usd',
    'amount_in_local_currency',
    'paid_at',
    'payment_account_details',
]);

const UUID_COLUMNS = new Set([
    'patient_id',
    'doctor_id',
    'clinic_id',
    'clinic_service_id',
    'laboratory_id',
    'laboratory_service_id',
    'family_member_id',
    'booked_by_patient_id',
]);

// POST /api/appointments/create - Create a new appointment
export async function POST(request: NextRequest) {
    try {
        const appointmentData = await request.json();

        // 🔐 SEGURIDAD: Verificar autenticación por cookie o fallback por ID de usuario válido
        const authResult = await requireAuth(request, ['patient', 'doctor', 'clinic', 'laboratory', 'secretary', 'admin']);
        let currentUserId = 'unknown';
        let currentUserRole = 'patient';

        if (!(authResult instanceof NextResponse)) {
            currentUserId = authResult.user.id;
            currentUserRole = authResult.user.role;
        } else {
            const candidatePatientId = appointmentData.bookedByPatientId || appointmentData.patientId;
            if (candidatePatientId) {
                currentUserId = candidatePatientId;
                currentUserRole = 'patient';
            } else if (appointmentData.doctorId) {
                currentUserId = appointmentData.doctorId;
                currentUserRole = 'doctor';
            } else if (appointmentData.clinicServiceId || appointmentData.laboratoryServiceId) {
                currentUserId = 'service-booking';
                currentUserRole = 'patient';
            } else {
                return authResult;
            }
        }

        logSecurityEvent('APPOINTMENT_CREATE_ATTEMPT', {
            userId: currentUserId,
            role: currentUserRole,
            doctorId: appointmentData.doctorId
        });

        // Validate required fields - need either doctorId, clinicServiceId, OR laboratoryServiceId
        const hasDoctorOrService = appointmentData.doctorId || appointmentData.clinicServiceId || appointmentData.laboratoryServiceId;
        if (!hasDoctorOrService || !appointmentData.date || !appointmentData.time) {
            return NextResponse.json(
                { error: 'Se requiere Doctor ID o Service ID, fecha y hora' },
                { status: 400 }
            );
        }

        // Check for duplicate appointments (excluding cancelled appointments)
        let duplicateQuery = supabaseAdmin
            .from('appointments')
            .select('id, attendance, patient_confirmation_status')
            .eq('date', appointmentData.date)
            .eq('time', appointmentData.time)
            .neq('attendance', 'Cancelada')
            .neq('patient_confirmation_status', 'Cancelada');

        if (appointmentData.doctorId) {
            duplicateQuery = duplicateQuery.eq('doctor_id', appointmentData.doctorId);
        } else if (appointmentData.clinicServiceId) {
            duplicateQuery = duplicateQuery.eq('clinic_service_id', appointmentData.clinicServiceId);
        } else if (appointmentData.laboratoryServiceId) {
            duplicateQuery = duplicateQuery.eq('laboratory_service_id', appointmentData.laboratoryServiceId);
        }

        const { data: existingAppointments, error: checkError } = await duplicateQuery;

        if (checkError) {
            console.error('Error checking for duplicates:', checkError);
            return NextResponse.json(
                { error: checkError.message },
                { status: 500 }
            );
        }

        if (existingAppointments && existingAppointments.length > 0) {
            const entityName = appointmentData.doctorName || appointmentData.serviceName || 'este servicio';
            return NextResponse.json(
                { error: `Ya existe una cita agendada para ${entityName} el ${appointmentData.date} a las ${appointmentData.time}. Por favor, selecciona otro horario.` },
                { status: 409 }
            );
        }

        // Auto-resolve clinic_id if booking with a clinic doctor or clinic service
        let resolvedClinicId = appointmentData.clinicId || null;
        if (!resolvedClinicId && appointmentData.doctorId) {
            const { data: docRow } = await supabaseAdmin
                .from('doctors')
                .select('clinic_id')
                .eq('id', appointmentData.doctorId)
                .maybeSingle();
            if (docRow?.clinic_id) {
                resolvedClinicId = docRow.clinic_id;
            }
        }
        if (!resolvedClinicId && appointmentData.clinicServiceId) {
            const { data: srvRow } = await supabaseAdmin
                .from('clinic_services')
                .select('clinic_id')
                .eq('id', appointmentData.clinicServiceId)
                .maybeSingle();
            if (srvRow?.clinic_id) {
                resolvedClinicId = srvRow.clinic_id;
            }
        }

        // Prepare data for insertion
        const rawSnake = toSnakeCase(appointmentData as Record<string, unknown>);
        if (rawSnake.doctor_specialty && !rawSnake.specialty) {
            rawSnake.specialty = rawSnake.doctor_specialty;
        }

        const dataWithFlags: Record<string, unknown> = {};

        for (const [key, val] of Object.entries(rawSnake)) {
            if (!VALID_APPOINTMENT_COLUMNS.has(key)) continue;
            if (UUID_COLUMNS.has(key)) {
                dataWithFlags[key] = (typeof val === 'string' && val.trim() !== '') ? val.trim() : null;
            } else {
                dataWithFlags[key] = val;
            }
        }

        if (resolvedClinicId) {
            dataWithFlags.clinic_id = resolvedClinicId;
        }

        // Garantizar que patient_id exista en public.patients (evita error de FK si quien agenda es un familiar o un médico/admin haciendo pruebas)
        const targetPatientId = (dataWithFlags.patient_id || dataWithFlags.booked_by_patient_id) as string | null;
        if (targetPatientId) {
            const { data: existingPatient } = await supabaseAdmin
                .from('patients')
                .select('id')
                .eq('id', targetPatientId)
                .maybeSingle();

            if (!existingPatient) {
                // Comprobar si booked_by_patient_id sí existe en patients
                const bookedById = dataWithFlags.booked_by_patient_id as string | null;
                const { data: bookedByPatient } = (bookedById && bookedById !== targetPatientId)
                    ? await supabaseAdmin.from('patients').select('id').eq('id', bookedById).maybeSingle()
                    : { data: null };

                if (bookedByPatient) {
                    dataWithFlags.family_member_id = dataWithFlags.family_member_id || targetPatientId;
                    dataWithFlags.patient_id = bookedByPatient.id;
                } else {
                    // Si es un médico/clínica/admin probando agendar cita con su propia sesión, buscar paciente por email o crear perfil espejo de paciente
                    const { data: docAsUser } = await supabaseAdmin
                        .from('doctors')
                        .select('id, name, email, phone, cedula, city')
                        .eq('id', targetPatientId)
                        .maybeSingle();

                    if (docAsUser?.email) {
                        const { data: patByEmail } = await supabaseAdmin
                            .from('patients')
                            .select('id')
                            .eq('email', docAsUser.email.toLowerCase())
                            .maybeSingle();

                        if (patByEmail) {
                            dataWithFlags.patient_id = patByEmail.id;
                            dataWithFlags.booked_by_patient_id = patByEmail.id;
                        } else {
                            const { data: createdPat } = await supabaseAdmin
                                .from('patients')
                                .insert({
                                    id: docAsUser.id,
                                    name: docAsUser.name || (dataWithFlags.patient_name as string) || 'Paciente',
                                    email: docAsUser.email.toLowerCase(),
                                    password: 'OAUTH_GOOGLE_USER',
                                    phone: docAsUser.phone || null,
                                    cedula: docAsUser.cedula || null,
                                    city: docAsUser.city || 'Maturín',
                                    profile_completed: true,
                                })
                                .select('id')
                                .maybeSingle();

                            if (createdPat) {
                                dataWithFlags.patient_id = createdPat.id;
                                dataWithFlags.booked_by_patient_id = createdPat.id;
                            }
                        }
                    }
                }
            }
        }

        dataWithFlags.total_price = roundPrice(Number(appointmentData.totalPrice) || 0);
        dataWithFlags.consultation_fee = roundPrice(Number(appointmentData.consultationFee) || 0);
        dataWithFlags.currency = appointmentData.currency || 'USD';
        dataWithFlags.payment_currency = appointmentData.paymentCurrency || 'USD';
        dataWithFlags.exchange_rate = appointmentData.exchangeRate || 1;
        dataWithFlags.amount_in_usd = appointmentData.amountInUSD !== undefined
            ? roundPrice(Number(appointmentData.amountInUSD))
            : roundPrice(Number(appointmentData.totalPrice) || 0);
        dataWithFlags.amount_in_local_currency = appointmentData.amountInLocalCurrency !== undefined
            ? appointmentData.amountInLocalCurrency
            : null;
        dataWithFlags.payment_account_details = appointmentData.paymentAccountDetails || null;
        dataWithFlags.paid_at = appointmentData.paymentStatus === 'Pagado' ? new Date().toISOString() : null;
        dataWithFlags.read_by_doctor = false;
        dataWithFlags.read_by_patient = true;

        // Insert appointment
        let { data, error } = await supabaseAdmin
            .from('appointments')
            .insert([dataWithFlags])
            .select()
            .single();

        if (error && error.code === '42703') {
            const newCols = [
                'currency', 'payment_currency', 'exchange_rate',
                'amount_in_usd', 'amount_in_local_currency', 'paid_at', 'payment_account_details'
            ];
            const fallbackData = { ...dataWithFlags };
            newCols.forEach(col => delete fallbackData[col]);

            const retryResult = await supabaseAdmin
                .from('appointments')
                .insert([fallbackData])
                .select()
                .single();

            data = retryResult.data;
            error = retryResult.error;
        }

        if (error) {
            console.error('Error creating appointment:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        // Send confirmation email via Gmail endpoint (non-blocking)
        try {
            const { data: patient } = data.patient_id ? await supabaseAdmin
                .from('patients')
                .select('email, name')
                .eq('id', data.patient_id)
                .maybeSingle() : { data: null };

            const { data: doctor } = data.doctor_id ? await supabaseAdmin
                .from('doctors')
                .select('name, specialty, address')
                .eq('id', data.doctor_id)
                .maybeSingle() : { data: null };

            if (patient?.email) {
                const emailPayload = {
                    email: patient.email,
                    name: patient.name || data.patient_name,
                    date: data.date,
                    time: data.time,
                    doctor: doctor?.name || data.doctor_name || data.service_name,
                    specialty: doctor?.specialty || data.specialty || 'Servicio Médico',
                    consultationFee: data.consultation_fee,
                    services: data.services || [],
                    totalPrice: data.total_price,
                    paymentMethod: data.payment_method,
                    discountAmount: data.discount_amount || 0,
                    appliedCoupon: data.applied_coupon || null,
                    consultationType: data.consultation_type || 'presencial',
                    address: doctor?.address || data.doctor_address || '',
                };

                fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-appointment-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailPayload),
                }).catch(() => {});
            }
        } catch (emailError) {
            console.warn('⚠️ Error sending confirmation email:', emailError);
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>));
    } catch (error: any) {
        console.error('Error in create appointment API:', error);
        return NextResponse.json(
            { error: error?.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

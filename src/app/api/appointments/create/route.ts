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

// POST /api/appointments/create - Create a new appointment
export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Verificar que el usuario está autenticado
        const authResult = await requireAuth(request, ['patient', 'doctor', 'clinic', 'secretary', 'admin']);

        // Si authResult es un NextResponse, significa que la autenticación falló
        if (authResult instanceof NextResponse) {
            logSecurityEvent('APPOINTMENT_CREATE_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const appointmentData = await request.json();

        // 🔐 SEGURIDAD: Log de la acción
        logSecurityEvent('APPOINTMENT_CREATE_ATTEMPT', {
            userId: user.id,
            role: user.role,
            doctorId: appointmentData.doctorId
        });

        console.log('📝 API: Creating appointment with data:', {
            doctorId: appointmentData.doctorId,
            doctorName: appointmentData.doctorName,
            clinicServiceId: appointmentData.clinicServiceId,
            date: appointmentData.date,
            time: appointmentData.time,
            patientName: appointmentData.patientName,
        });

        // Validate required fields - need either doctorId OR clinicServiceId
        const hasDoctorOrService = appointmentData.doctorId || appointmentData.clinicServiceId;
        if (!hasDoctorOrService || !appointmentData.date || !appointmentData.time) {
            return NextResponse.json(
                { error: 'Se requiere Doctor ID o Service ID, fecha y hora' },
                { status: 400 }
            );
        }

        // Check for duplicate appointments - use either doctorId or clinicServiceId
        let duplicateQuery = supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('date', appointmentData.date)
            .eq('time', appointmentData.time)
            .neq('attendance', 'Cancelada');

        if (appointmentData.doctorId) {
            duplicateQuery = duplicateQuery.eq('doctor_id', appointmentData.doctorId);
        } else if (appointmentData.clinicServiceId) {
            duplicateQuery = duplicateQuery.eq('clinic_service_id', appointmentData.clinicServiceId);
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
            console.log('❌ Duplicate appointment found');
            const entityName = appointmentData.doctorName || 'este servicio';
            return NextResponse.json(
                { error: `Ya existe una cita agendada para ${entityName} el ${appointmentData.date} a las ${appointmentData.time}. Por favor, selecciona otro horario.` },
                { status: 409 }
            );
        }

        // Prepare data for insertion
        const dataWithFlags = {
            ...toSnakeCase(appointmentData as Record<string, unknown>),
            total_price: roundPrice(appointmentData.totalPrice || 0),
            consultation_fee: roundPrice(appointmentData.consultationFee || 0),
            read_by_doctor: false,
            read_by_patient: true,
        };

        console.log('✅ API: Adding appointment to database');

        // Insert appointment
        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert([dataWithFlags])
            .select()
            .single();

        if (error) {
            console.error('Error creating appointment:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        console.log('✅ API: Appointment created successfully with ID:', data.id);

        // Send confirmation notification (email/WhatsApp/push)
        try {
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/notifications/confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId: data.id }),
            });

            if (notificationResponse.ok) {
                console.log('📧 Confirmation notification sent for appointment:', data.id);
            } else {
                console.warn('⚠️ Failed to send confirmation notification, but appointment was created');
            }
        } catch (notifError) {
            // Don't fail the appointment creation if notification fails
            console.warn('⚠️ Error sending confirmation notification:', notifError);
        }

        return NextResponse.json(toCamelCase(data as Record<string, unknown>));
    } catch (error) {
        console.error('Error in create appointment API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

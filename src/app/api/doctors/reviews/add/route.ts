import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireAuth, logSecurityEvent } from '@/lib/auth-utils';
import { sanitizeString, detectInjection } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
    try {
        // 🔐 SEGURIDAD: Solo pacientes autenticados pueden añadir reseñas
        const authResult = await requireAuth(request, ['patient']);

        if (authResult instanceof NextResponse) {
            logSecurityEvent('REVIEW_ADD_UNAUTHORIZED', {
                ip: request.headers.get('x-forwarded-for') || 'unknown'
            });
            return authResult;
        }

        const { user } = authResult;
        const reviewData = await request.json();

        // 🔐 SEGURIDAD: Detectar inyección
        if (detectInjection(JSON.stringify(reviewData))) {
            return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
        }

        // 🔐 SEGURIDAD: Verificar que el paciente solo crea reseñas a su nombre
        if (reviewData.patientId !== user.id) {
            logSecurityEvent('REVIEW_ADD_FORBIDDEN', {
                userId: user.id,
                attemptedPatientId: reviewData.patientId
            });
            return NextResponse.json(
                { error: 'No puedes crear reseñas como otro paciente' },
                { status: 403 }
            );
        }

        // Convertir camelCase a snake_case
        const snakeCaseData = {
            doctor_id: reviewData.doctorId,
            patient_id: user.id,
            patient_name: sanitizeString(reviewData.patientName || user.name),
            patient_profile_image: reviewData.patientProfileImage || null,
            rating: reviewData.rating,
            comment: sanitizeString(reviewData.comment || ''),
            date: reviewData.date || new Date().toISOString().split('T')[0],
            is_verified: true // Ya está autenticado
        };

        const { data, error } = await supabaseAdmin
            .from('doctor_reviews')
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) {
            console.error('Error adding doctor review:', error);
            return NextResponse.json(
                { error: error.message || 'Error al agregar reseña' },
                { status: 500 }
            );
        }

        // Actualizar rating promedio del doctor
        await updateDoctorRating(reviewData.doctorId);

        logSecurityEvent('REVIEW_ADDED', {
            userId: user.id,
            doctorId: reviewData.doctorId,
            rating: reviewData.rating
        });

        return NextResponse.json({ id: data.id, success: true });
    } catch (error) {
        console.error('Error in add review API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Función para actualizar el rating promedio del doctor
async function updateDoctorRating(doctorId: string) {
    try {
        const { data: reviews, error } = await supabaseAdmin
            .from('doctor_reviews')
            .select('rating')
            .eq('doctor_id', doctorId);

        if (error || !reviews || reviews.length === 0) return;

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        await supabaseAdmin
            .from('doctors')
            .update({ rating: Math.round(avgRating * 10) / 10 })
            .eq('id', doctorId);
    } catch (err) {
        console.error('Error updating doctor rating:', err);
    }
}

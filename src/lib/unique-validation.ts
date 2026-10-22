/**
 * =====================================================
 * UNIQUE VALIDATION UTILITIES
 * =====================================================
 * Funciones para verificar campos únicos antes de guardar
 * en la base de datos.
 * 
 * @version 1.1.0
 * @date 2026-10-22
 */

import { supabaseAdmin } from './supabase-admin';

// =====================================================
// TYPES
// =====================================================

export interface UniqueValidationResult {
    isUnique: boolean;
    field: string;
    existingId?: string;
    message: string;
}

export interface DoctorUniqueFields {
    email: string;
    cedula?: string;
    medicalLicense?: string;
    phone?: string;
    excludeId?: string; // Para excluir el registro actual en updates
}

export interface PatientUniqueFields {
    email: string;
    cedula?: string;
    phone?: string;
    excludeId?: string;
}

export interface SellerUniqueFields {
    email: string;
    referralCode?: string;
    excludeId?: string;
}

// =====================================================
// CROSS-TABLE CEDULA & PHONE VALIDATIONS
// =====================================================

/**
 * Verifica si la cédula/DNI ya existe en médicos o pacientes (comparando dígitos numéricos)
 */
export async function isCedulaUniqueAcrossAllTables(
    cedula: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    if (!cedula || cedula.trim() === '') {
        return { isUnique: true, field: 'cedula', message: '' };
    }

    const digits = cedula.replace(/\D/g, '');
    if (digits.length < 5) {
        return { isUnique: true, field: 'cedula', message: '' };
    }

    // Buscar en doctors
    const { data: doctors, error: docErr } = await supabaseAdmin
        .from('doctors')
        .select('id, cedula')
        .not('cedula', 'is', null);

    if (!docErr && doctors) {
        const matchDoc = doctors.find(d => {
            if (excludeId && d.id === excludeId) return false;
            const dDigits = (d.cedula || '').replace(/\D/g, '');
            return dDigits.length >= 5 && dDigits === digits;
        });
        if (matchDoc) {
            return {
                isUnique: false,
                field: 'cedula',
                existingId: matchDoc.id,
                message: 'Esta cédula ya está siendo usada.'
            };
        }
    }

    // Buscar en patients
    const { data: patients, error: patErr } = await supabaseAdmin
        .from('patients')
        .select('id, cedula')
        .not('cedula', 'is', null);

    if (!patErr && patients) {
        const matchPat = patients.find(p => {
            if (excludeId && p.id === excludeId) return false;
            const pDigits = (p.cedula || '').replace(/\D/g, '');
            return pDigits.length >= 5 && pDigits === digits;
        });
        if (matchPat) {
            return {
                isUnique: false,
                field: 'cedula',
                existingId: matchPat.id,
                message: 'Esta cédula ya está siendo usada.'
            };
        }
    }

    return { isUnique: true, field: 'cedula', message: '' };
}

/**
 * Verifica si el número telefónico ya existe en médicos o pacientes
 */
export async function isPhoneUniqueAcrossAllTables(
    phone: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    if (!phone || phone.trim() === '') {
        return { isUnique: true, field: 'phone', message: '' };
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
        return { isUnique: true, field: 'phone', message: '' };
    }
    const tail = digits.length >= 10 ? digits.slice(-10) : digits;

    const matchesPhone = (val?: string | null) => {
        if (!val) return false;
        const vDigits = val.replace(/\D/g, '');
        if (vDigits.length < 7) return false;
        if (vDigits === digits) return true;
        if (digits.length >= 10 && vDigits.length >= 10 && vDigits.slice(-10) === tail) return true;
        return false;
    };

    // Buscar en doctors
    const { data: doctors, error: docErr } = await supabaseAdmin
        .from('doctors')
        .select('id, phone, whatsapp');

    if (!docErr && doctors) {
        const matchDoc = doctors.find(d => {
            if (excludeId && d.id === excludeId) return false;
            return matchesPhone(d.phone) || matchesPhone(d.whatsapp);
        });
        if (matchDoc) {
            return {
                isUnique: false,
                field: 'phone',
                existingId: matchDoc.id,
                message: 'Este número telefónico ya está siendo usado.'
            };
        }
    }

    // Buscar en patients
    const { data: patients, error: patErr } = await supabaseAdmin
        .from('patients')
        .select('id, phone, whatsapp');

    if (!patErr && patients) {
        const matchPat = patients.find(p => {
            if (excludeId && p.id === excludeId) return false;
            return matchesPhone(p.phone) || matchesPhone(p.whatsapp);
        });
        if (matchPat) {
            return {
                isUnique: false,
                field: 'phone',
                existingId: matchPat.id,
                message: 'Este número telefónico ya está siendo usado.'
            };
        }
    }

    return { isUnique: true, field: 'phone', message: '' };
}

// =====================================================
// DOCTOR VALIDATIONS
// =====================================================

/**
 * Verifica si el email de un doctor ya existe
 */
export async function isDoctorEmailUnique(
    email: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    const query = supabaseAdmin
        .from('doctors')
        .select('id, email')
        .eq('email', email.toLowerCase());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking doctor email:', error);
        return { isUnique: false, field: 'email', message: 'Error al verificar el email' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'email',
            existingId: data.id,
            message: 'Este correo electrónico ya está registrado como médico.'
        };
    }

    return { isUnique: true, field: 'email', message: '' };
}

/**
 * Verifica si la cédula/DNI de un doctor ya existe
 */
export async function isDoctorCedulaUnique(
    cedula: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    return isCedulaUniqueAcrossAllTables(cedula, excludeId);
}

/**
 * Verifica si la matrícula médica ya existe
 */
export async function isDoctorMedicalLicenseUnique(
    medicalLicense: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    if (!medicalLicense || medicalLicense.trim() === '') {
        return { isUnique: true, field: 'medicalLicense', message: '' };
    }

    const query = supabaseAdmin
        .from('doctors')
        .select('id, medical_license')
        .eq('medical_license', medicalLicense.trim());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking medical license:', error);
        return { isUnique: false, field: 'medicalLicense', message: 'Error al verificar la matrícula' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'medicalLicense',
            existingId: data.id,
            message: 'Esta matrícula médica ya está registrada.'
        };
    }

    return { isUnique: true, field: 'medicalLicense', message: '' };
}

/**
 * Valida todos los campos únicos de un doctor
 */
export async function validateDoctorUniqueFields(
    fields: DoctorUniqueFields
): Promise<UniqueValidationResult[]> {
    const results: UniqueValidationResult[] = [];

    // Verificar email
    const emailResult = await isEmailUniqueAcrossAllTables(fields.email, fields.excludeId);
    if (!emailResult.isUnique) results.push(emailResult);

    // Verificar cédula
    if (fields.cedula) {
        const cedulaResult = await isDoctorCedulaUnique(fields.cedula, fields.excludeId);
        if (!cedulaResult.isUnique) results.push(cedulaResult);
    }

    // Verificar matrícula
    if (fields.medicalLicense) {
        const licenseResult = await isDoctorMedicalLicenseUnique(fields.medicalLicense, fields.excludeId);
        if (!licenseResult.isUnique) results.push(licenseResult);
    }

    // Verificar teléfono
    if (fields.phone) {
        const phoneResult = await isPhoneUniqueAcrossAllTables(fields.phone, fields.excludeId);
        if (!phoneResult.isUnique) results.push(phoneResult);
    }

    return results;
}

// =====================================================
// PATIENT VALIDATIONS
// =====================================================

/**
 * Verifica si el email de un paciente ya existe
 */
export async function isPatientEmailUnique(
    email: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    const query = supabaseAdmin
        .from('patients')
        .select('id, email')
        .eq('email', email.toLowerCase());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking patient email:', error);
        return { isUnique: false, field: 'email', message: 'Error al verificar el email' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'email',
            existingId: data.id,
            message: 'Este correo electrónico ya está registrado.'
        };
    }

    return { isUnique: true, field: 'email', message: '' };
}

/**
 * Verifica si la cédula/DNI de un paciente ya existe
 */
export async function isPatientCedulaUnique(
    cedula: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    return isCedulaUniqueAcrossAllTables(cedula, excludeId);
}

/**
 * Valida todos los campos únicos de un paciente
 */
export async function validatePatientUniqueFields(
    fields: PatientUniqueFields
): Promise<UniqueValidationResult[]> {
    const results: UniqueValidationResult[] = [];

    const emailResult = await isEmailUniqueAcrossAllTables(fields.email, fields.excludeId);
    if (!emailResult.isUnique) results.push(emailResult);

    if (fields.cedula) {
        const cedulaResult = await isPatientCedulaUnique(fields.cedula, fields.excludeId);
        if (!cedulaResult.isUnique) results.push(cedulaResult);
    }

    if (fields.phone) {
        const phoneResult = await isPhoneUniqueAcrossAllTables(fields.phone, fields.excludeId);
        if (!phoneResult.isUnique) results.push(phoneResult);
    }

    return results;
}

// =====================================================
// SELLER VALIDATIONS
// =====================================================

/**
 * Verifica si el email de un seller ya existe
 */
export async function isSellerEmailUnique(
    email: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    const query = supabaseAdmin
        .from('sellers')
        .select('id, email')
        .eq('email', email.toLowerCase());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking seller email:', error);
        return { isUnique: false, field: 'email', message: 'Error al verificar el email' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'email',
            existingId: data.id,
            message: 'Este correo electrónico ya está registrado como vendedora.'
        };
    }

    return { isUnique: true, field: 'email', message: '' };
}

/**
 * Verifica si el código de referido ya existe
 */
export async function isReferralCodeUnique(
    referralCode: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    if (!referralCode || referralCode.trim() === '') {
        return { isUnique: true, field: 'referralCode', message: '' };
    }

    const query = supabaseAdmin
        .from('sellers')
        .select('id, referral_code')
        .eq('referral_code', referralCode.trim().toUpperCase());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking referral code:', error);
        return { isUnique: false, field: 'referralCode', message: 'Error al verificar el código de referido' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'referralCode',
            existingId: data.id,
            message: 'Este código de referido ya existe.'
        };
    }

    return { isUnique: true, field: 'referralCode', message: '' };
}

// =====================================================
// CROSS-TABLE EMAIL VALIDATION
// =====================================================

/**
 * Verifica si un email existe en CUALQUIER tabla de usuarios
 * Útil para el registro cuando no sabemos qué rol tendrá el usuario
 */
export async function isEmailUniqueAcrossAllTables(
    email: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    if (!email || email.trim() === '') {
        return { isUnique: true, field: 'email', message: '' };
    }

    const lowerEmail = email.trim().toLowerCase();

    // Verificar en doctors
    const docQuery = supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('email', lowerEmail);
    if (excludeId) docQuery.neq('id', excludeId);
    const { data: doctor } = await docQuery.maybeSingle();

    if (doctor) {
        return {
            isUnique: false,
            field: 'email',
            existingId: doctor.id,
            message: 'Este correo electrónico ya está siendo usado (registrado como médico).'
        };
    }

    // Verificar en patients
    const patQuery = supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', lowerEmail);
    if (excludeId) patQuery.neq('id', excludeId);
    const { data: patient } = await patQuery.maybeSingle();

    if (patient) {
        return {
            isUnique: false,
            field: 'email',
            existingId: patient.id,
            message: 'Este correo electrónico ya está siendo usado (registrado como paciente).'
        };
    }

    // Verificar en sellers
    const selQuery = supabaseAdmin
        .from('sellers')
        .select('id')
        .eq('email', lowerEmail);
    if (excludeId) selQuery.neq('id', excludeId);
    const { data: seller } = await selQuery.maybeSingle();

    if (seller) {
        return {
            isUnique: false,
            field: 'email',
            existingId: seller.id,
            message: 'Este correo electrónico ya está siendo usado (registrado como vendedora).'
        };
    }

    // Verificar en admins
    const admQuery = supabaseAdmin
        .from('admins')
        .select('id')
        .eq('email', lowerEmail);
    if (excludeId) admQuery.neq('id', excludeId);
    const { data: admin } = await admQuery.maybeSingle();

    if (admin) {
        return {
            isUnique: false,
            field: 'email',
            existingId: admin.id,
            message: 'Este correo electrónico ya está siendo usado (registrado como administrador).'
        };
    }

    return { isUnique: true, field: 'email', message: '' };
}

// =====================================================
// APPOINTMENT VALIDATION
// =====================================================

/**
 * Verifica si ya existe una cita para el doctor en esa fecha y hora
 */
export async function isAppointmentSlotAvailable(
    doctorId: string,
    date: string,
    time: string,
    excludeId?: string
): Promise<UniqueValidationResult> {
    const query = supabaseAdmin
        .from('appointments')
        .select('id, patient_name, patient_confirmation_status')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('time', time)
        .neq('attendance', 'Cancelada')
        .neq('patient_confirmation_status', 'Cancelada');

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking appointment slot:', error);
        return { isUnique: false, field: 'time', message: 'Error al verificar disponibilidad' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'time',
            existingId: data.id,
            message: `Ya existe una cita agendada para este horario.`
        };
    }

    return { isUnique: true, field: 'time', message: '' };
}

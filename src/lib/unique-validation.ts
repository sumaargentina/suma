/**
 * =====================================================
 * UNIQUE VALIDATION UTILITIES
 * =====================================================
 * Funciones para verificar campos únicos antes de guardar
 * en la base de datos.
 * 
 * @version 1.0.0
 * @date 2025-12-24
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
    excludeId?: string; // Para excluir el registro actual en updates
}

export interface PatientUniqueFields {
    email: string;
    cedula?: string;
    excludeId?: string;
}

export interface SellerUniqueFields {
    email: string;
    referralCode?: string;
    excludeId?: string;
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
    if (!cedula || cedula.trim() === '') {
        return { isUnique: true, field: 'cedula', message: '' };
    }

    const query = supabaseAdmin
        .from('doctors')
        .select('id, cedula')
        .eq('cedula', cedula.trim());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking doctor cedula:', error);
        return { isUnique: false, field: 'cedula', message: 'Error al verificar el DNI/Cédula' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'cedula',
            existingId: data.id,
            message: 'Este DNI/Cédula ya está registrado como médico.'
        };
    }

    return { isUnique: true, field: 'cedula', message: '' };
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
    const emailResult = await isDoctorEmailUnique(fields.email, fields.excludeId);
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
    if (!cedula || cedula.trim() === '') {
        return { isUnique: true, field: 'cedula', message: '' };
    }

    const query = supabaseAdmin
        .from('patients')
        .select('id, cedula')
        .eq('cedula', cedula.trim());

    if (excludeId) {
        query.neq('id', excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
        console.error('Error checking patient cedula:', error);
        return { isUnique: false, field: 'cedula', message: 'Error al verificar el DNI/Cédula' };
    }

    if (data) {
        return {
            isUnique: false,
            field: 'cedula',
            existingId: data.id,
            message: 'Este DNI/Cédula ya está registrado.'
        };
    }

    return { isUnique: true, field: 'cedula', message: '' };
}

/**
 * Valida todos los campos únicos de un paciente
 */
export async function validatePatientUniqueFields(
    fields: PatientUniqueFields
): Promise<UniqueValidationResult[]> {
    const results: UniqueValidationResult[] = [];

    const emailResult = await isPatientEmailUnique(fields.email, fields.excludeId);
    if (!emailResult.isUnique) results.push(emailResult);

    if (fields.cedula) {
        const cedulaResult = await isPatientCedulaUnique(fields.cedula, fields.excludeId);
        if (!cedulaResult.isUnique) results.push(cedulaResult);
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
    email: string
): Promise<UniqueValidationResult> {
    const lowerEmail = email.toLowerCase();

    // Verificar en doctors
    const { data: doctor } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('email', lowerEmail)
        .maybeSingle();

    if (doctor) {
        return {
            isUnique: false,
            field: 'email',
            existingId: doctor.id,
            message: 'Este correo electrónico ya está registrado como médico.'
        };
    }

    // Verificar en patients
    const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('email', lowerEmail)
        .maybeSingle();

    if (patient) {
        return {
            isUnique: false,
            field: 'email',
            existingId: patient.id,
            message: 'Este correo electrónico ya está registrado como paciente.'
        };
    }

    // Verificar en sellers
    const { data: seller } = await supabaseAdmin
        .from('sellers')
        .select('id')
        .eq('email', lowerEmail)
        .maybeSingle();

    if (seller) {
        return {
            isUnique: false,
            field: 'email',
            existingId: seller.id,
            message: 'Este correo electrónico ya está registrado como vendedora.'
        };
    }

    // Verificar en admins
    const { data: admin } = await supabaseAdmin
        .from('admins')
        .select('id')
        .eq('email', lowerEmail)
        .maybeSingle();

    if (admin) {
        return {
            isUnique: false,
            field: 'email',
            existingId: admin.id,
            message: 'Este correo electrónico ya está registrado como administrador.'
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
        .select('id, patient_name')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('time', time)
        .neq('attendance', 'Cancelada');

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

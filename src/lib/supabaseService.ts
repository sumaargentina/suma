import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { format } from 'date-fns';
import type {
    Doctor, Seller, Patient, Appointment, AdminSupportTicket,
    SellerPayment, DoctorPayment, AppSettings, MarketingMaterial,
    ChatMessage, DoctorReview, Service, Clinic, ClinicBranch, ClinicService, Secretary, ClinicSpecialty, ClinicExpense, PatientCommunication, ClinicPatientMessage, ClinicChatConversation,
    FamilyMember, ClinicPayment
} from './types';
import { roundPrice } from './validation-utils';

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Convert snake_case to camelCase for database fields
const toCamelCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        result[camelKey] = obj[key];
    }
    return result;
};

// Convert camelCase to snake_case for database fields
const toSnakeCase = (obj: Record<string, unknown>): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        result[snakeKey] = obj[key];
    }
    return result;
};

// =====================================================
// GENERIC FETCH FUNCTIONS
// =====================================================

export async function getCollectionData<T>(tableName: string): Promise<T[]> {
    try {
        // En el cliente, usar el cliente normal (sujeto a RLS)
        // En el servidor, usar supabaseAdmin (bypass RLS)
        const client = typeof window !== 'undefined' ? supabase : supabaseAdmin;

        const { data, error } = await client
            .from(tableName)
            .select('*');

        if (error) throw new Error(error.message || String(error));
        return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as T[];
    } catch (error) {
        console.error(`Error fetching ${tableName}:`, error);
        return [];
    }
}

async function getDocumentData<T>(tableName: string, id: string): Promise<T | null> {
    if (!id || typeof id !== 'string') {
        console.error(`Invalid ID provided to getDocumentData for table ${tableName}:`, id);
        return null;
    }

    try {
        console.log(`🔍 getDocumentData: fetching ${tableName}/${id}`);
        const client = typeof window !== 'undefined' ? supabase : supabaseAdmin;
        const { data, error } = await client
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                console.log(`❌ getDocumentData: document does not exist for ${tableName}/${id}`);
                return null;
            }
            const errorMsg = error.message || (error as any).details || JSON.stringify(error);
            throw new Error(`Error fetching from ${tableName}: ${errorMsg}`);
        }

        console.log(`✅ getDocumentData: returning data for ${tableName}/${id}`);
        return toCamelCase(data as Record<string, unknown>) as T;
    } catch (error) {
        console.error(`❌ Error fetching document ${id} from ${tableName}:`, error);
        return null;
    }
}

// =====================================================
// DATA FETCHING FUNCTIONS
// =====================================================

export const getDoctors = () => getCollectionData<Doctor>('doctors');
export const getDoctor = (id: string) => getDocumentData<Doctor>('doctors', id);
export const getSellers = () => getCollectionData<Seller>('sellers');

export const getSeller = async (id: string): Promise<Seller | null> => {
    // Si estamos en el cliente, usar la API para evitar problemas de RLS
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/sellers?id=${id}`);
            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Failed to fetch seller');
            }
            return await res.json();
        } catch (error) {
            console.error('Error fetching seller via API:', error);
            return null;
        }
    }
    // Si estamos en el servidor, usar getDocumentData directamente
    return getDocumentData<Seller>('sellers', id);
};
export const getPatients = () => getCollectionData<Patient>('patients');
export const getPatient = (id: string) => getDocumentData<Patient>('patients', id);
export const getAppointments = () => getCollectionData<Appointment>('appointments');

export const getDoctorAppointments = async (doctorId: string): Promise<Appointment[]> => {
    // Si estamos en el cliente, llamar a la API para usar credenciales seguras de servidor
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/appointments/doctor?id=${doctorId}`);
            if (!res.ok) {
                console.error('Error fetching appointments via API:', await res.text());
                return [];
            }
            return await res.json();
        } catch (err) {
            console.error('Network error fetching appointments:', err);
            return [];
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId);

    if (error) {
        console.error('Error fetching doctor appointments:', error);
        return [];
    }

    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
};

export const getPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
    // Si estamos en el cliente, llamar a la API para usar credenciales seguras de servidor
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/appointments/get-patient-appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ patientId })
            });

            if (!res.ok) {
                console.error('Error fetching patient appointments via API:', await res.text());
                return [];
            }
            return await res.json();
        } catch (err) {
            console.error('Network error fetching patient appointments:', err);
            return [];
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('patient_id', patientId);

    if (error) {
        console.error('Error fetching patient appointments:', error);
        return [];
    }

    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
};

export const getDoctorPayments = () => getCollectionData<DoctorPayment>('doctor_payments');
export const getSellerPayments = () => getCollectionData<SellerPayment>('seller_payments');
export const getMarketingMaterials = () => getCollectionData<MarketingMaterial>('marketing_materials');

// Clinic Payment Functions
export const getClinicPayments = async (clinicId?: string): Promise<ClinicPayment[]> => {
    try {
        let query = supabase.from('clinic_payments').select('*');
        if (clinicId) {
            query = query.eq('clinic_id', clinicId);
        }
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return (data || []).map(item => toCamelCase(item as Record<string, unknown>) as unknown as ClinicPayment);
    } catch (error) {
        console.error('Error fetching clinic payments:', error);
        return [];
    }
};

export const addClinicPayment = async (paymentData: Omit<ClinicPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    const dbData = toSnakeCase(paymentData as unknown as Record<string, unknown>);

    const { data, error } = await supabase
        .from('clinic_payments')
        .insert(dbData)
        .select('id')
        .single();

    if (error) throw error;

    // Update clinic subscription status to pending
    await supabase
        .from('clinics')
        .update({ subscription_status: 'pending_payment' })
        .eq('id', paymentData.clinicId);

    return data.id;
};

export const updateClinicPayment = async (id: string, data: Partial<ClinicPayment>): Promise<void> => {
    const dbData = toSnakeCase(data as unknown as Record<string, unknown>);
    dbData.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('clinic_payments')
        .update(dbData)
        .eq('id', id);

    if (error) throw error;
};

export const getClinicPaymentsForAdmin = async (): Promise<(ClinicPayment & { clinicName: string })[]> => {
    try {
        const { data, error } = await supabase
            .from('clinic_payments')
            .select(`
                *,
                clinics:clinic_id (name)
            `)
            .order('date', { ascending: false });

        if (error) throw error;

        return (data || []).map(item => {
            const payment = toCamelCase(item as Record<string, unknown>) as unknown as ClinicPayment;
            return {
                ...payment,
                clinicName: (item as any).clinics?.name || 'Clínica Desconocida'
            };
        });
    } catch (error) {
        console.error('Error fetching clinic payments for admin:', error);
        return [];
    }
};
export const getSupportTickets = async (): Promise<AdminSupportTicket[]> => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/support-tickets');
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching support tickets via API:', error);
            return [];
        }
    }

    // Si estamos en el servidor, usar getCollectionData
    return getCollectionData<AdminSupportTicket>('support_tickets');
};

export const getSettings = async (): Promise<AppSettings | null> => {
    console.log('🔍 getSettings called');
    return getDocumentData<AppSettings>('settings', 'main');
};

export const getAdminNotifications = () => getCollectionData<import('./types').AdminNotification>('admin_notifications');

export const findUserByEmail = async (email: string): Promise<(Doctor | Seller | Patient | Clinic) & { role: 'doctor' | 'seller' | 'patient' | 'clinic' } | null> => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/auth/find-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Failed to find user');
            }

            return await res.json();
        } catch (error) {
            console.error('Error finding user via API:', error);
            return null;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const lowerEmail = email.toLowerCase();

    const collections: { name: 'doctors' | 'sellers' | 'patients' | 'clinics' | 'secretaries'; role: 'doctor' | 'seller' | 'patient' | 'clinic' | 'secretary' }[] = [
        { name: 'doctors', role: 'doctor' },
        { name: 'sellers', role: 'seller' },
        { name: 'patients', role: 'patient' },
        { name: 'clinics', role: 'clinic' },
        { name: 'secretaries', role: 'secretary' },
    ];

    for (const { name, role } of collections) {
        const { data, error } = await supabaseAdmin
            .from(name)
            .select('*')
            .eq('email', lowerEmail)
            .maybeSingle();

        if (data) {
            // Ensure password is included (it might be omitted by default in some Supabase queries or types)
            return {
                ...toCamelCase(data as Record<string, unknown>),
                role,
            } as (Doctor | Seller | Patient | Clinic) & { role: 'doctor' | 'seller' | 'patient' | 'clinic' };
        }
    }

    return null;
};



// =====================================================
// DATA MUTATION FUNCTIONS - DOCTORS
// =====================================================

export const addDoctor = async (doctorData: Omit<Doctor, 'id'>): Promise<string> => {
    // Si estamos en el cliente, llamar a la API para usar credenciales seguras de servidor
    if (typeof window !== 'undefined') {
        try {
            console.log('Client: Calling API to add doctor');
            const res = await fetch('/api/doctors/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(doctorData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('Client: API error:', errorData);
                throw new Error(errorData.error || 'Failed to add doctor');
            }

            const result = await res.json();
            console.log('Client: Doctor added successfully:', result.id);
            return result.id;
        } catch (err) {
            console.error('Client: Error adding doctor:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const dataWithDefaults = {
        ...toSnakeCase(doctorData as unknown as Record<string, unknown>),
        read_by_admin: false,
        read_by_seller: false,
    };

    console.log('Server: Adding doctor with data:', JSON.stringify(dataWithDefaults, null, 2));

    try {
        const { data, error } = await supabaseAdmin
            .from('doctors')
            .insert([dataWithDefaults])
            .select()
            .single();

        if (error) {
            console.error('Server: Error adding doctor:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });

            const errorMsg = error.message || error.hint || error.details || error.code || 'Unknown database error';
            throw new Error(`Failed to add doctor: ${errorMsg}`);
        }

        console.log('Server: Doctor added successfully:', data.id);
        return data.id;
    } catch (err) {
        console.error('Server: Caught exception in addDoctor:', err);
        throw err;
    }
};

export const updateDoctor = async (id: string, data: Partial<Doctor>) => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/doctors?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update doctor');
        }
        return;
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('doctors')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const deleteDoctor = async (id: string) => {
    const { error } = await supabaseAdmin
        .from('doctors')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const updateDoctorStatus = async (id: string, status: 'active' | 'inactive') => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/doctors?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update doctor status');
        }
        return;
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const { error } = await supabaseAdmin
        .from('doctors')
        .update({ status })
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const cleanupDoctorData = async (id: string): Promise<void> => {
    // In PostgreSQL, we don't have document size limits like Firestore
    // This function is kept for compatibility but doesn't need to do anything
    console.log('cleanupDoctorData called for doctor:', id);
    console.log('Note: PostgreSQL does not have document size limits like Firestore');
};

// =====================================================
// DATA MUTATION FUNCTIONS - SELLERS
// =====================================================

export const addSeller = async (sellerData: Omit<Seller, 'id'>) => {
    const snakeCaseData = toSnakeCase(sellerData as unknown as Record<string, unknown>);

    const { data, error } = await supabaseAdmin
        .from('sellers')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateSeller = async (id: string, data: Partial<Seller>) => {
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('sellers')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const deleteSeller = async (id: string) => {
    const { error } = await supabaseAdmin
        .from('sellers')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

// =====================================================
// DATA MUTATION FUNCTIONS - PATIENTS
// =====================================================

export const addPatient = async (patientData: Omit<Patient, 'id'>): Promise<string> => {
    // Si estamos en el cliente, usar la API para evitar problemas de API key
    if (typeof window !== 'undefined') {
        try {
            console.log('Client: Calling API to add patient');
            const res = await fetch('/api/patients/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patientData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('Client: API error:', errorData);
                throw new Error(errorData.error || 'Failed to add patient');
            }

            const result = await res.json();
            console.log('Client: Patient added successfully:', result.id);
            return result.id;
        } catch (err) {
            console.error('Client: Error adding patient:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const snakeCaseData = toSnakeCase(patientData as unknown as Record<string, unknown>);

    const { data, error } = await supabaseAdmin
        .from('patients')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data.id;
};

export const updatePatient = async (id: string, data: Partial<Patient>) => {
    // Si estamos en el cliente, usar la API para evitar problemas de API key
    if (typeof window !== 'undefined') {
        try {
            console.log('Client: Calling API to update patient', id);
            const res = await fetch('/api/patients/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, data })
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('Client: API error:', errorData);
                throw new Error(errorData.error || 'Failed to update patient');
            }

            console.log('Client: Patient updated successfully');
            return;
        } catch (err) {
            console.error('Client: Error updating patient:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    // Remove 'role' field as it doesn't exist in the patients table
    const { role, ...dataWithoutRole } = data as any;
    const snakeCaseData = toSnakeCase(dataWithoutRole as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('patients')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const deletePatient = async (id: string) => {
    const { error } = await supabaseAdmin
        .from('patients')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};



// =====================================================
// DATA MUTATION FUNCTIONS - CLINICS
// =====================================================

export const addClinic = async (clinicData: Omit<Clinic, 'id' | 'createdAt'>): Promise<string> => {
    // Si estamos en el cliente, llamar a la API para usar credenciales seguras de servidor
    if (typeof window !== 'undefined') {
        try {
            console.log('Client: Calling API to add clinic');
            const res = await fetch('/api/clinics/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clinicData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error('Client: API error:', errorData);
                throw new Error(errorData.error || 'Failed to add clinic');
            }

            const result = await res.json();
            console.log('Client: Clinic added successfully:', result.id);
            return result.id;
        } catch (err) {
            console.error('Client: Error adding clinic:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const snakeCaseData = toSnakeCase(clinicData as unknown as Record<string, unknown>);

    const { data, error } = await supabaseAdmin
        .from('clinics')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data.id;
};

export const updateClinic = async (id: string, data: Partial<Clinic>) => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics?id=${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update clinic');
        }
        return;
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('clinics')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const findClinicByEmail = async (email: string): Promise<Clinic | null> => {
    const { data, error } = await supabaseAdmin
        .from('clinics')
        .select('*')
        .eq('admin_email', email.toLowerCase())
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message || String(error));
    }

    return toCamelCase(data as Record<string, unknown>) as Clinic;
};

export const getClinicBySlug = async (slug: string): Promise<Clinic | null> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/by-slug?slug=${encodeURIComponent(slug)}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic by slug via API:', error);
            return null;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinics')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw new Error(error.message || String(error));
    }

    return toCamelCase(data as Record<string, unknown>) as Clinic;
};

export const getClinic = (id: string) => getDocumentData<Clinic>('clinics', id);


export const getClinics = async (): Promise<Clinic[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/clinics');
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinics via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinics')
        .select('*')
        .order('name');

    if (error) throw new Error(error.message || String(error));
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Clinic[];
};

export const getClinicSecretaries = async (clinicId: string): Promise<Secretary[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/secretaries?clinicId=${clinicId}`);
            if (!res.ok) {
                const errText = await res.text();
                console.error(`Failed to fetch secretaries via API. Status: ${res.status}. Error: ${errText}`);
                return [];
            }
            return await res.json();
        } catch (error) {
            console.error('Network error fetching secretaries:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('secretaries')
        .select('*')
        .eq('clinic_id', clinicId);

    if (error) {
        console.error('Error fetching secretaries:', error);
        return [];
    }
    return (data || []).map(item => ({
        id: item.id,
        email: item.email,
        name: item.name,
        role: 'secretary',
        clinicId: item.clinic_id,
        permissions: item.permissions || []
    }));
};

export const addSecretary = async (secretaryData: any) => {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/clinics/secretaries/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(secretaryData)
        });
        if (!res.ok) throw new Error('Failed to create secretary');
        return await res.json();
    }
};

export const deleteSecretary = async (id: string) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/secretaries?id=${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to delete secretary');
        }
        return;
    }

    const { error } = await supabaseAdmin
        .from('secretaries')
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message);
};

export const getClinicBranches = async (clinicId: string): Promise<ClinicBranch[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/branches?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic branches via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_branches')
        .select('*')
        .eq('clinic_id', clinicId);

    if (error) throw new Error(error.message || String(error));
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as ClinicBranch[];
};

export const getClinicDoctors = async (clinicId: string): Promise<Doctor[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/doctors?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic doctors via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId);

    if (error) throw new Error(error.message || String(error));
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Doctor[];
};

export const getClinicAppointments = async (clinicId: string, dateFilter?: string, endDateFilter?: string): Promise<Appointment[]> => {
    if (typeof window !== 'undefined') {
        try {
            let url = `/api/clinics/appointments?clinicId=${clinicId}`;
            if (dateFilter) url += `&date=${dateFilter}`;
            if (endDateFilter) url += `&endDate=${endDateFilter}`;
            const res = await fetch(url);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic appointments via API:', error);
            return [];
        }
    }

    // Get all doctors belonging to this clinic
    const { data: doctors } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId);

    const doctorIds = (doctors || []).map(d => d.id);

    // Get all services belonging to this clinic
    const { data: services } = await supabaseAdmin
        .from('clinic_services')
        .select('id')
        .eq('clinic_id', clinicId);

    const serviceIds = (services || []).map(s => s.id);

    if (doctorIds.length === 0 && serviceIds.length === 0) {
        return [];
    }

    // Build query - get appointments where doctor_id is in clinic doctors OR clinic_service_id is in clinic services
    let query = supabaseAdmin
        .from('appointments')
        .select('*');

    // Use OR condition for doctor_id and clinic_service_id
    const orConditions: string[] = [];
    if (doctorIds.length > 0) {
        orConditions.push(`doctor_id.in.(${doctorIds.join(',')})`);
    }
    if (serviceIds.length > 0) {
        orConditions.push(`clinic_service_id.in.(${serviceIds.join(',')})`);
    }

    if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
    }

    if (dateFilter && endDateFilter) {
        query = query.gte('date', dateFilter).lte('date', endDateFilter);
    } else if (dateFilter) {
        query = query.eq('date', dateFilter);
    }

    const { data, error } = await query.order('date', { ascending: true }).order('time', { ascending: true });

    if (error) throw new Error(error.message || String(error));
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
};

export const addClinicBranch = async (branchData: Omit<ClinicBranch, 'id'>) => {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/clinics/branches/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(branchData)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to add branch');
        }
        return await res.json();
    }

    const snakeCaseData = toSnakeCase(branchData as unknown as Record<string, unknown>);
    const { data, error } = await supabaseAdmin
        .from('clinic_branches')
        .insert([snakeCaseData])
        .select()
        .single();
    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateClinicBranch = async (id: string, branchData: Partial<ClinicBranch>) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/branches/update`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...branchData })
        });
        if (!res.ok) throw new Error('Failed to update branch');
        return;
    }

    const snakeCaseData = toSnakeCase(branchData as unknown as Record<string, unknown>);
    const { error } = await supabaseAdmin
        .from('clinic_branches')
        .update(snakeCaseData)
        .eq('id', id);
    if (error) throw new Error(error.message || String(error));
};

export const deleteClinicBranch = async (id: string) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/branches/delete?id=${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete branch');
        return;
    }

    const { error } = await supabaseAdmin
        .from('clinic_branches')
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message || String(error));
};

// Helper to handle Items embedding
const packItemsToDescription = (data: Partial<ClinicService>) => {
    const { items, description, ...rest } = data;
    let finalDescription = description || '';

    // Remove existing items block if any (to avoid duplication on updates)
    finalDescription = finalDescription.replace(/\n<!--ITEMS:[\s\S]*?-->/, '');

    if (items && items.length > 0) {
        finalDescription += `\n<!--ITEMS:${JSON.stringify(items)}-->`;
    }

    return { ...rest, description: finalDescription };
};

const unpackItemsFromDescription = (service: ClinicService): ClinicService => {
    const desc = service.description || '';
    const match = desc.match(/<!--ITEMS:(.*)-->/);

    if (match && match[1]) {
        try {
            const items = JSON.parse(match[1]);
            // Clean description for UI
            const cleanDesc = desc.replace(match[0], '').trim();
            return { ...service, description: cleanDesc, items };
        } catch (e) {
            console.error('Failed to parse items from description', e);
        }
    }
    return { ...service, items: [] };
};

export const getClinicServices = async (clinicId: string): Promise<ClinicService[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/services?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic services via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_services')
        .select('*')
        .eq('clinic_id', clinicId);

    if (error) throw new Error(error.message || String(error));

    // Unpack items from description
    return (data || []).map(item => {
        const camelItem = toCamelCase(item as Record<string, unknown>) as ClinicService;
        return unpackItemsFromDescription(camelItem);
    });
};

export const getClinicService = async (serviceId: string): Promise<ClinicService | null> => {
    if (typeof window !== 'undefined') {
        const { data, error } = await supabase
            .from('clinic_services')
            .select('*')
            .eq('id', serviceId)
            .single();

        if (error) {
            console.error('Error fetching clinic service (client):', error);
            return null;
        }

        const camelItem = toCamelCase(data as Record<string, unknown>) as ClinicService;
        return unpackItemsFromDescription(camelItem);
    }

    // Server-side
    const { data, error } = await supabaseAdmin
        .from('clinic_services')
        .select('*')
        .eq('id', serviceId)
        .single();

    if (error) {
        console.error('Error fetching clinic service:', error);
        return null;
    }

    const camelItem = toCamelCase(data as Record<string, unknown>) as ClinicService;
    return unpackItemsFromDescription(camelItem);
};

export const addClinicService = async (serviceData: Omit<ClinicService, 'id'>) => {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/clinics/services/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(serviceData)
        });
        if (!res.ok) throw new Error('Failed to add service');
        return await res.json();
    }

    // Pack items into description
    const packedData = packItemsToDescription(serviceData);

    const snakeCaseData = toSnakeCase(packedData as unknown as Record<string, unknown>);

    // Ensure 'items' key is gone (it should be gone from packedData, but double check snakeCase conversion didn't keep it if logic changes)
    // packItemsToDescription returns object WITHOUT 'items' key.

    const { data, error } = await supabaseAdmin
        .from('clinic_services')
        .insert([snakeCaseData])
        .select()
        .single();
    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateClinicService = async (id: string, serviceData: Partial<ClinicService>) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/services/update`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...serviceData })
        });
        if (!res.ok) throw new Error('Failed to update service');
        return;
    }

    // Pack items into description
    const packedData = packItemsToDescription(serviceData);
    const snakeCaseData = toSnakeCase(packedData as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('clinic_services')
        .update(snakeCaseData)
        .eq('id', id);
    if (error) throw new Error(error.message || String(error));
};

// Obtener un servicio de clínica por ID (para verificar permisos)
export const getClinicServiceById = async (id: string): Promise<{ clinicId: string } | null> => {
    const { data, error } = await supabaseAdmin
        .from('clinic_services')
        .select('clinic_id')
        .eq('id', id)
        .single();

    if (error || !data) return null;
    return { clinicId: data.clinic_id };
};

export const deleteClinicService = async (id: string) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/services/delete?id=${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete service');
        return;
    }

    const { error } = await supabaseAdmin
        .from('clinic_services')
        .delete()
        .eq('id', id);
    if (error) throw new Error(error.message || String(error));
};

export const getClinicSpecialties = async (clinicId: string): Promise<ClinicSpecialty[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/specialties?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic specialties via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_specialties')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('name');

    if (error) throw new Error(error.message || String(error));
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as ClinicSpecialty[];
};

export const addClinicSpecialty = async (data: { clinicId: string; name: string }) => {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/clinics/specialties', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Failed to add specialty');
        return await res.json();
    }

    // Server logic
    const { data: newItem, error } = await supabaseAdmin
        .from('clinic_specialties')
        .insert([{ clinic_id: data.clinicId, name: data.name }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return toCamelCase(newItem);
};

export const deleteClinicSpecialty = async (id: string) => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/clinics/specialties?id=${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error('Failed to delete specialty');
        return;
    }

    const { error } = await supabaseAdmin
        .from('clinic_specialties')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
};

export const addAppointment = async (appointmentData: Omit<Appointment, 'id'>) => {
    console.log('📝 Creating appointment with data:', {
        doctorId: appointmentData.doctorId,
        doctorName: appointmentData.doctorName,
        date: appointmentData.date,
        time: appointmentData.time,
        patientName: appointmentData.patientName,
        paymentMethod: appointmentData.paymentMethod,
        totalPrice: appointmentData.totalPrice
    });

    // Si estamos en el cliente, usar la API para evitar problemas de RLS
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/appointments/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(appointmentData)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to create appointment');
            }

            const data = await res.json();
            console.log('✅ Appointment created successfully via API with ID:', data.id);
            return data;
        } catch (err) {
            console.error('Error creating appointment via API:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    // Check for duplicate appointments using supabaseAdmin to bypass RLS
    // Check for duplicate appointments using supabaseAdmin to bypass RLS
    let query = supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('date', appointmentData.date)
        .eq('time', appointmentData.time);

    if (appointmentData.doctorId) {
        query = query.eq('doctor_id', appointmentData.doctorId);
    } else if (appointmentData.clinicServiceId) {
        query = query.eq('clinic_service_id', appointmentData.clinicServiceId);
    }

    const { data: existingAppointments, error: checkError } = await query;

    if (checkError) throw new Error(checkError.message || String(checkError));

    if (existingAppointments && existingAppointments.length > 0) {
        console.log('❌ Duplicate appointment found:', existingAppointments);
        const entityName = appointmentData.doctorName ? `el Dr. ${appointmentData.doctorName}` : `este servicio`;
        throw new Error(`Ya existe una cita agendada para ${entityName} el ${appointmentData.date} a las ${appointmentData.time}. Por favor, selecciona otro horario.`);
    }

    const dataWithFlags = {
        ...toSnakeCase(appointmentData as unknown as Record<string, unknown>),
        // Redondear precios para evitar problemas de precisión de punto flotante
        total_price: roundPrice(appointmentData.totalPrice),
        consultation_fee: roundPrice(appointmentData.consultationFee),
        read_by_doctor: false,
        read_by_patient: true,
    };

    console.log('✅ Adding appointment to database with flags');

    // Use supabaseAdmin to bypass RLS when creating appointments
    const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert([dataWithFlags])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));

    console.log('✅ Appointment created successfully with ID:', data.id);
    return data;
};

export const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    // Si estamos en el cliente, usar la API para evitar problemas de RLS
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/appointments/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, data })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update appointment');
            }

            console.log('✅ Appointment updated successfully via API');
            return;
        } catch (err) {
            console.error('Error updating appointment via API:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const dataWithFlags: Record<string, unknown> = { ...toSnakeCase(data as unknown as Record<string, unknown>) };

    // If attendance is being marked, the patient needs to be notified
    if ('attendance' in data) {
        dataWithFlags.read_by_patient = false;
    }

    const { error } = await supabaseAdmin
        .from('appointments')
        .update(dataWithFlags)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const addMessageToAppointment = async (appointmentId: string, message: { sender: 'doctor' | 'patient', text: string }) => {
    // Si estamos en el cliente, usar la API para evitar problemas de RLS
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/appointments/add-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appointmentId, message })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to add message');
            }

            const result = await res.json();
            console.log('✅ Message added successfully via API');
            return result.message;
        } catch (err) {
            console.error('Error adding message to appointment:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    try {
        // 1. Obtener mensajes actuales
        const { data: appointment, error: fetchError } = await supabaseAdmin
            .from('appointments')
            .select('messages, unread_messages_by_patient, unread_messages_by_doctor')
            .eq('id', appointmentId)
            .single();

        if (fetchError) throw fetchError;

        const currentMessages = (appointment.messages as any[]) || [];
        const newMessage = {
            id: crypto.randomUUID(),
            ...message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedMessages = [...currentMessages, newMessage];

        // 2. Actualizar mensajes y contadores
        const updateData: any = {
            messages: updatedMessages,
            last_message_timestamp: newMessage.timestamp
        };

        if (message.sender === 'doctor') {
            updateData.unread_messages_by_patient = (appointment.unread_messages_by_patient || 0) + 1;
            updateData.read_by_patient = false;
            updateData.read_by_doctor = true;
        } else {
            updateData.unread_messages_by_doctor = (appointment.unread_messages_by_doctor || 0) + 1;
            updateData.read_by_doctor = false;
            updateData.read_by_patient = true;
        }

        const { error: updateError } = await supabaseAdmin
            .from('appointments')
            .update(updateData)
            .eq('id', appointmentId);

        if (updateError) throw updateError;

        return newMessage;
    } catch (error) {
        console.error('Error adding message to appointment:', error);
        throw error;
    }
};

// =====================================================
// DATA MUTATION FUNCTIONS - MARKETING MATERIALS
// =====================================================

export const addMarketingMaterial = async (materialData: Omit<MarketingMaterial, 'id'>) => {
    const snakeCaseData = toSnakeCase(materialData as unknown as Record<string, unknown>);

    const { data, error } = await supabase
        .from('marketing_materials')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateMarketingMaterial = async (id: string, data: Partial<MarketingMaterial>) => {
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabase
        .from('marketing_materials')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const deleteMarketingMaterial = async (id: string) => {
    const { error } = await supabase
        .from('marketing_materials')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

// =====================================================
// DATA MUTATION FUNCTIONS - SUPPORT TICKETS
// =====================================================

export const addSupportTicket = async (ticketData: Omit<AdminSupportTicket, 'id' | 'messages'>) => {
    const initialMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: ticketData.description,
        timestamp: new Date().toISOString(),
    };

    const newTicketData = {
        ...ticketData,
        messages: [initialMessage],
        readByAdmin: false,
        readBySeller: ticketData.userRole === 'seller',
        readByDoctor: ticketData.userRole === 'doctor',
    };

    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/support-tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTicketData)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create support ticket');
        }
        return await res.json();
    }

    // Si estamos en el servidor, usar supabase directamente
    const snakeCaseData = toSnakeCase(newTicketData as unknown as Record<string, unknown>);

    const { data, error } = await supabase
        .from('support_tickets')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data;
};

export const addMessageToSupportTicket = async (ticketId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    // Si estamos en el cliente, llamar a la API para usar credenciales seguras de servidor
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/support/add-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId, message })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to add message');
            }

            return await res.json();
        } catch (err) {
            console.error('Error adding message to ticket:', err);
            throw err;
        }
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const { data: ticket, error: fetchError } = await supabaseAdmin
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

    if (fetchError) throw new Error(fetchError.message || String(fetchError));

    const newMessage: ChatMessage = {
        ...message,
        id: `msg-${Date.now()}`,
        timestamp: new Date().toISOString()
    };

    const messages = ticket.messages || [];
    messages.push(newMessage);

    const updateData: Record<string, unknown> = { messages };

    if (message.sender === 'user' || message.sender === 'clinic') {
        updateData.read_by_admin = false;
        updateData.status = 'abierto';
    }

    if (message.sender === 'admin') {
        updateData.status = 'abierto';
        if (ticket.user_role === 'seller') {
            updateData.read_by_seller = false;
        } else if (ticket.user_role === 'doctor') {
            updateData.read_by_doctor = false;
        } else if (ticket.user_role === 'clinic') {
            updateData.read_by_clinic = false;
        }
    }

    const { error } = await supabaseAdmin
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

    if (error) throw new Error(error.message || String(error));
};

export const updateSupportTicket = async (id: string, data: Partial<AdminSupportTicket>) => {
    // Si estamos en el cliente, usar la API
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/support-tickets/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...data })
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update support ticket');
        }
        return await res.json();
    }

    // Si estamos en el servidor, usar supabase directamente
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabase
        .from('support_tickets')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

// =====================================================
// DATA MUTATION FUNCTIONS - SETTINGS
// =====================================================

export const updateSettings = async (data: Partial<AppSettings>) => {
    // Si estamos en el cliente, usar la API route
    if (typeof window !== 'undefined') {
        const response = await fetch('/api/settings/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar settings');
        }
        return;
    }

    // Si estamos en el servidor, usar supabaseAdmin directamente
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('settings')
        .update(snakeCaseData)
        .eq('id', 'main');

    if (error) throw new Error(error.message || String(error));
};

// =====================================================
// DATA MUTATION FUNCTIONS - PAYMENTS
// =====================================================

export const addSellerPayment = async (paymentData: Omit<SellerPayment, 'id'>) => {
    const dataWithDefaults = {
        ...toSnakeCase(paymentData as unknown as Record<string, unknown>),
        status: 'pending',
        read_by_seller: false,
    };

    const { data, error } = await supabase
        .from('seller_payments')
        .insert([dataWithDefaults])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateSellerPayment = async (id: string, data: Partial<SellerPayment>) => {
    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { error } = await supabase
        .from('seller_payments')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

export const addDoctorPayment = async (paymentData: Omit<DoctorPayment, 'id'>) => {
    const dataWithDefaults = {
        ...toSnakeCase(paymentData as unknown as Record<string, unknown>),
        read_by_admin: false,
        read_by_doctor: false,
    };

    const { data, error } = await supabase
        .from('doctor_payments')
        .insert([dataWithDefaults])
        .select()
        .single();

    if (error) throw new Error(error.message || String(error));
    return data;
};

export const updateDoctorPaymentStatus = async (id: string, status: DoctorPayment['status']) => {
    const { error } = await supabase
        .from('doctor_payments')
        .update({ status, read_by_doctor: false })
        .eq('id', id);

    if (error) throw new Error(error.message || String(error));
};

// =====================================================
// BATCH NOTIFICATION UPDATES
// =====================================================

export const batchUpdateNotificationsAsRead = async (ticketIds: string[], paymentIds: string[], doctorIds: string[]) => {
    const promises = [];

    if (ticketIds.length > 0) {
        promises.push(
            supabase
                .from('support_tickets')
                .update({ read_by_admin: true })
                .in('id', ticketIds)
        );
    }

    if (paymentIds.length > 0) {
        promises.push(
            supabase
                .from('doctor_payments')
                .update({ read_by_admin: true })
                .in('id', paymentIds)
        );
    }

    if (doctorIds.length > 0) {
        promises.push(
            supabase
                .from('doctors')
                .update({ read_by_admin: true })
                .in('id', doctorIds)
        );
    }

    await Promise.all(promises);
};

export const batchUpdateDoctorNotificationsAsRead = async (paymentIds: string[], ticketIds: string[]) => {
    const promises = [];

    if (paymentIds.length > 0) {
        promises.push(
            supabase
                .from('doctor_payments')
                .update({ read_by_doctor: true })
                .in('id', paymentIds)
        );
    }

    if (ticketIds.length > 0) {
        promises.push(
            supabase
                .from('support_tickets')
                .update({ read_by_doctor: true })
                .in('id', ticketIds)
        );
    }

    await Promise.all(promises);
};

export const batchUpdateDoctorAppointmentsAsRead = async (appointmentIds: string[]) => {
    if (appointmentIds.length === 0) return;

    const { error } = await supabase
        .from('appointments')
        .update({ read_by_doctor: true })
        .in('id', appointmentIds);

    if (error) throw new Error(error.message || String(error));
};

export const batchUpdatePatientAppointmentsAsRead = async (appointmentIds: string[]) => {
    if (appointmentIds.length === 0) return;

    const { error } = await supabase
        .from('appointments')
        .update({ read_by_patient: true })
        .in('id', appointmentIds);

    if (error) throw new Error(error.message || String(error));
};

export const getServiceAppointments = async (clinicServiceId: string, date: string): Promise<Appointment[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/appointments/by-service?serviceId=${clinicServiceId}&date=${date}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching service appointments via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('appointments')
        .select('*')
        .eq('clinic_service_id', clinicServiceId)
        .eq('date', date)
    // .neq('attendance', 'Cancelada'); // Uncomment if you want to exclude cancelled appointments

    if (error) {
        console.error('Error fetching service appointments:', error);
        return [];
    }

    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
};

// =====================================================
// STORAGE FUNCTIONS
// =====================================================

export async function uploadImage(file: File, path: string, maxSizeMB: number = 5): Promise<string> {
    try {
        console.log('🚀 Iniciando subida de imagen:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            path,
            maxSizeMB,
            timestamp: new Date().toISOString()
        });

        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }

        if (!file.type.startsWith('image/')) {
            throw new Error(`El archivo debe ser una imagen. Tipo recibido: ${file.type}`);
        }

        if (file.size > maxSizeMB * 1024 * 1024) {
            throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: ${maxSizeMB}MB`);
        }

        console.log('✅ Validaciones pasadas, subiendo a Supabase Storage...');

        const { data, error } = await supabase.storage
            .from('profile-images')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw new Error(error.message || String(error));

        const { data: { publicUrl } } = supabase.storage
            .from('profile-images')
            .getPublicUrl(data.path);

        console.log('✅ Imagen subida exitosamente:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('❌ Error al subir imagen:', error);
        if (error instanceof Error) {
            throw new Error(`Error al subir la imagen: ${error.message}`);
        }
        throw new Error('No se pudo subir la imagen. Error desconocido.');
    }
}

export async function uploadPaymentProof(file: File, path: string): Promise<string> {
    console.log('=== SUBIDA DE COMPROBANTE DE PAGO ===');

    try {
        if (!file) throw new Error('No se proporcionó ningún archivo');

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error(`Tipo de archivo no permitido: ${file.type}`);
        }

        console.log('✅ Validaciones pasadas');
        console.log('📁 Archivo:', file.name, `${(file.size / 1024 / 1024).toFixed(2)}MB`, file.type);

        // For small files (<1MB), convert to base64
        if (file.size <= 1 * 1024 * 1024) {
            console.log('🔄 Archivo pequeño (<1MB), convirtiendo a base64...');

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = reader.result as string;
                    console.log('✅ Conversión a base64 completada');
                    resolve(base64);
                };
                reader.onerror = () => reject(new Error('Error al convertir archivo a base64'));
                reader.readAsDataURL(file);
            });
        }

        // For larger files, upload to Supabase Storage
        console.log('🔄 Archivo grande (>1MB), subiendo a Storage...');

        const { data, error } = await supabase.storage
            .from('payment-proofs')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw new Error(error.message || String(error));

        const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(data.path);

        console.log('✅ Comprobante subido exitosamente:', publicUrl);
        return publicUrl;
    } catch (error) {
        console.error('❌ Error en subida de comprobante:', error);
        if (error instanceof Error) {
            throw new Error(`Error al subir el comprobante de pago: ${error.message}`);
        }
        throw new Error('No se pudo subir el comprobante de pago. Error desconocido.');
    }
}

export async function uploadSettingsImage(file: File, type: 'logo' | 'hero'): Promise<string> {
    try {
        console.log('🎨 Iniciando subida de imagen de configuración:', {
            type,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: new Date().toISOString()
        });

        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            throw new Error(`Formato de archivo no soportado: ${fileExtension}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
        }

        const fileName = `${type}-${timestamp}.${fileExtension}`;
        const path = `settings/${fileName}`;

        console.log('📁 Ruta de archivo generada:', path);
        console.log('🔄 Llamando a uploadImage...');

        const result = await uploadImage(file, path, 5);
        console.log('✅ uploadSettingsImage completado exitosamente:', result);

        return result;
    } catch (error) {
        console.error('❌ Error en uploadSettingsImage:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

export async function uploadMainPageImage(file: File, type: 'logo' | 'hero'): Promise<string> {
    try {
        console.log('🎨 Iniciando subida de imagen de página principal (ALTA CALIDAD):', {
            type,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            timestamp: new Date().toISOString()
        });

        const timestamp = Date.now();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
            throw new Error(`Formato de archivo no soportado: ${fileExtension}. Formatos permitidos: ${allowedExtensions.join(', ')}`);
        }

        if (file.size > 10 * 1024 * 1024) {
            throw new Error(`El archivo es demasiado grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB`);
        }

        const fileName = `${type}-${timestamp}.${fileExtension}`;
        const path = `main-page/${fileName}`;

        console.log('📁 Ruta de archivo generada:', path);
        console.log('🔄 Subiendo con máxima calidad...');

        const result = await uploadImage(file, path, 10);
        console.log('✅ uploadMainPageImage completado exitosamente:', result);

        return result;
    } catch (error) {
        console.error('❌ Error en uploadMainPageImage:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
}

// =====================================================
// DOCTOR REVIEWS SYSTEM
// =====================================================

export const getDoctorReviews = async (doctorId: string): Promise<DoctorReview[]> => {
    try {
        const { data, error } = await supabase
            .from('doctor_reviews')
            .select('*')
            .eq('doctor_id', doctorId);

        if (error) throw new Error(error.message || String(error));
        return (data || []) as DoctorReview[];
    } catch (error) {
        console.error('Error fetching doctor reviews:', error);
        return [];
    }
};

export const getPatientReviews = async (patientId: string): Promise<DoctorReview[]> => {
    try {
        const { data, error } = await supabase
            .from('doctor_reviews')
            .select('*')
            .eq('patient_id', patientId);

        if (error) throw new Error(error.message || String(error));
        return (data || []) as DoctorReview[];
    } catch (error) {
        console.error('Error fetching patient reviews:', error);
        return [];
    }
};

export const addDoctorReview = async (reviewData: Omit<DoctorReview, 'id'>): Promise<string> => {
    // Usar API route para evitar problemas de RLS
    if (typeof window !== 'undefined') {
        const response = await fetch('/api/doctors/reviews/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to add review');
        }

        const result = await response.json();
        return result.id;
    }

    // Server-side fallback
    try {
        const snakeCaseData = toSnakeCase(reviewData as unknown as Record<string, unknown>);

        const { data, error } = await supabaseAdmin
            .from('doctor_reviews')
            .insert([snakeCaseData])
            .select()
            .single();

        if (error) throw new Error(error.message || String(error));

        // Update doctor rating
        await updateDoctorRating(reviewData.doctorId);

        return data.id;
    } catch (error) {
        console.error('Error adding doctor review:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const updateDoctorReview = async (reviewId: string, data: Partial<DoctorReview>): Promise<void> => {
    try {
        const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

        const { error } = await supabase
            .from('doctor_reviews')
            .update(snakeCaseData)
            .eq('id', reviewId);

        if (error) throw new Error(error.message || String(error));

        // If rating was updated, recalculate doctor's average rating
        if (data.rating !== undefined) {
            const review = await getDocumentData<DoctorReview>('doctor_reviews', reviewId);
            if (review) {
                await updateDoctorRating(review.doctorId);
            }
        }
    } catch (error) {
        console.error('Error updating doctor review:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const deleteDoctorReview = async (reviewId: string): Promise<void> => {
    try {
        const review = await getDocumentData<DoctorReview>('doctor_reviews', reviewId);
        if (review) {
            const { error } = await supabase
                .from('doctor_reviews')
                .delete()
                .eq('id', reviewId);

            if (error) throw new Error(error.message || String(error));

            // Recalculate doctor rating
            await updateDoctorRating(review.doctorId);
        }
    } catch (error) {
        console.error('Error deleting doctor review:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const checkPatientReviewExists = async (doctorId: string, patientId: string): Promise<DoctorReview | null> => {
    try {
        const { data, error } = await supabase
            .from('doctor_reviews')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(error instanceof Error ? error.message : String(error));
        }

        return data as DoctorReview;
    } catch (error) {
        console.error('Error checking patient review:', error);
        return null;
    }
};

export const updateDoctorRating = async (doctorId: string): Promise<void> => {
    try {
        const reviews = await getDoctorReviews(doctorId);

        if (reviews.length === 0) {
            await supabase
                .from('doctors')
                .update({ rating: 0, review_count: 0 })
                .eq('id', doctorId);
            return;
        }

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

        await supabase
            .from('doctors')
            .update({ rating: averageRating, review_count: reviews.length })
            .eq('id', doctorId);

        console.log(`✅ Rating actualizado para doctor ${doctorId}: ${averageRating} (${reviews.length} reseñas)`);
    } catch (error) {
        console.error('Error updating doctor rating:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const getDoctorReviewStats = async (doctorId: string) => {
    try {
        const reviews = await getDoctorReviews(doctorId);

        if (reviews.length === 0) {
            return {
                totalReviews: 0,
                averageRating: 0,
                ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                verifiedReviews: 0
            };
        }

        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        let verifiedReviews = 0;

        reviews.forEach(review => {
            ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
            if (review.isVerified) verifiedReviews++;
        });

        const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
        const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

        return {
            totalReviews: reviews.length,
            averageRating,
            ratingDistribution,
            verifiedReviews
        };
    } catch (error) {
        console.error('Error getting doctor review stats:', error);
        return null;
    }
};

// =====================================================
// INACTIVATION LOGS
// =====================================================

export const getDoctorInactivationLogs = async (doctorId: string) => {
    try {
        const { data, error } = await supabase
            .from('inactivation_logs')
            .select('*')
            .eq('doctor_id', doctorId);

        if (error) throw new Error(error.message || String(error));
        return data || [];
    } catch (error) {
        console.error("Error al obtener historial de inactivaciones:", error);
        return [];
    }
};

// =====================================================
// ADMIN USER MANAGEMENT
// =====================================================

export interface AdminUser {
    id: string;
    email: string;
    name: string;
    password: string;
    profileImage?: string;
    role: 'admin';
    createdAt?: string;
    lastLogin?: string | null;
    isActive?: boolean;
    permissions?: string[];
}

export const createAdminUser = async () => {
    try {
        console.log('🔐 Creando usuario administrador en Supabase...');

        const existingAdmin = await findAdminByEmail('perozzi0112@gmail.com');
        if (existingAdmin) {
            console.log('✅ Admin ya existe en Supabase');
            return existingAdmin;
        }

        const adminData = {
            email: 'perozzi0112@gmail.com',
            name: 'Administrador Suma',
            password: '..Suma..01',
            role: 'admin',
            profile_image: 'https://placehold.co/400x400.png',
            created_at: new Date().toISOString(),
            last_login: null,
            is_active: true,
            permissions: ['all'],
        };

        const { data, error } = await supabase
            .from('admins')
            .insert([adminData])
            .select()
            .single();

        if (error) throw new Error(error.message || String(error));

        console.log('✅ Admin creado exitosamente con ID:', data.id);
        return data as AdminUser;
    } catch (error) {
        console.error('❌ Error creando admin:', error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const findAdminByEmail = async (email: string): Promise<AdminUser | null> => {
    // If we're on the client, use the API route
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/auth/find-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!res.ok) {
                if (res.status === 404) return null;
                throw new Error('Failed to find admin');
            }

            return await res.json();
        } catch (error) {
            console.error('Error finding admin via API:', error);
            return null;
        }
    }

    // Server-side logic
    try {
        const { data, error } = await supabaseAdmin
            .from('admins')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(error instanceof Error ? error.message : String(error));
        }

        return data as AdminUser;
    } catch (error) {
        console.error('❌ Error buscando admin:', error);
        return null;
    }
};

// =====================================================
// TEST DATA FUNCTIONS (kept for compatibility)
// =====================================================

export const initializeTestData = async () => {
    console.log('🔧 initializeTestData: Esta función está disponible pero debe usarse con precaución en PostgreSQL');
    console.log('💡 Considera crear datos de prueba directamente en Supabase o mediante scripts SQL');
};

export const forceCreatePendingPayment = async () => {
    console.log('🔧 forceCreatePendingPayment: Esta función está disponible pero debe usarse con precaución');
};

export const createTestSupportTickets = async () => {
    console.log('🔧 createTestSupportTickets: Esta función está disponible pero debe usarse con precaución');
};

export const createTestSellers = async () => {
    console.log('🔧 createTestSellers: Esta función está disponible pero debe usarse con precaución');
};

export const clearSellerPayments = async () => {
    console.log('🔧 clearSellerPayments: Esta función está disponible pero debe usarse con precaución');
};

export const clearTestUsers = async () => {
    console.log('🔧 clearTestUsers: Esta función está disponible pero debe usarse con precaución');
};

// =====================================================
// WALK-IN APPOINTMENTS  
// =====================================================

export async function createWalkInAppointment(data: {
    doctorId: string;
    doctorName: string;
    patientName: string;
    patientEmail: string;
    patientPhone?: string;
    patientDNI?: string;
    services: Service[];
    totalPrice: number;
    consultationFee: number;
    paymentMethod: 'efectivo' | 'transferencia';
    office?: string;
}) {
    try {
        const { data: existingPatients, error: searchError } = await supabaseAdmin
            .from('patients')
            .select('*')
            .eq('email', data.patientEmail.toLowerCase())
            .limit(1);

        if (searchError) throw searchError;

        let patientId: string;
        let isNewPatient = false;

        if (existingPatients && existingPatients.length > 0) {
            patientId = existingPatients[0].id;
            console.log(' Paciente existente encontrado:', patientId);
        } else {
            const { hashPassword } = await import('./password-utils');
            const hashedPassword = await hashPassword('Suma..00');
            const newPatient = {
                name: data.patientName,
                email: data.patientEmail.toLowerCase(),
                password: hashedPassword,
                phone: data.patientPhone || null,
                cedula: data.patientDNI || null,
                document_type: data.patientDNI ? 'DNI' : null,
                age: null,
                gender: null,
                city: null,
                profile_image: '',
                profile_completed: false,
                favorite_doctor_ids: [data.doctorId],
            };

            const { data: createdPatient, error: createError } = await supabaseAdmin
                .from('patients')
                .insert([newPatient])
                .select()
                .single();

            if (createError) throw createError;
            patientId = createdPatient.id;
            isNewPatient = true;
            console.log(' Nuevo paciente creado:', patientId);
        }

        const now = new Date();
        const appointment = {
            patient_id: patientId,
            patient_name: data.patientName,
            doctor_id: data.doctorId,
            doctor_name: data.doctorName,
            date: format(now, 'yyyy-MM-dd'),
            time: format(now, 'HH:mm'),
            services: data.services,
            total_price: data.totalPrice,
            consultation_fee: data.consultationFee,
            payment_method: data.paymentMethod,
            payment_status: 'Pagado',
            payment_proof: null,
            attendance: 'Atendido',
            patient_confirmation_status: 'Confirmada',
            clinical_notes: 'Paciente walk-in (sin cita previa)',
            prescription: '',
            messages: [],
            read_by_doctor: true,
            read_by_patient: false,
            unread_messages_by_doctor: 0,
            unread_messages_by_patient: 0,
            office: data.office,
        };

        const { data: createdAppointment, error: appointmentError } = await supabaseAdmin
            .from('appointments')
            .insert([appointment])
            .select()
            .single();

        if (appointmentError) throw appointmentError;

        console.log(' Cita walk-in creada:', createdAppointment.id);

        return {
            success: true,
            patientId,
            appointmentId: createdAppointment.id,
            isNewPatient,
        };
    } catch (error) {
        console.error(' Error creating walk-in appointment:', error);
        throw error;
    }
}

// Keep password utils import for compatibility
export { hashPassword } from './password-utils';






// Clinic Expenses
export const getClinicExpenses = async (clinicId: string) => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/expenses?clinicId=${clinicId}`);
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to fetch expenses');
            }
            return await res.json();
        } catch (error) {
            console.error('Error fetching expenses via API:', error);
            throw error;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_expenses')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('date', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(toCamelCase);
};

export const addClinicExpense = async (data: { clinicId: string, description: string, amount: number, category: string, date: string }) => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/clinics/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to add expense');
            return await res.json();
        } catch (error) {
            console.error('Error adding expense via API:', error);
            throw error;
        }
    }

    const { data: newItem, error } = await supabaseAdmin
        .from('clinic_expenses')
        .insert([{
            clinic_id: data.clinicId,
            description: data.description,
            amount: data.amount,
            category: data.category,
            date: data.date
        }])
        .select()
        .single();

    if (error) throw new Error(error.message);
    return toCamelCase(newItem);
};

export const deleteClinicExpense = async (id: string) => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/expenses?id=${id}`, {
                method: 'DELETE'
            });
            if (!res.ok) throw new Error('Failed to delete expense');
            return;
        } catch (error) {
            console.error('Error deleting expense via API:', error);
            throw error;
        }
    }

    const { error } = await supabaseAdmin
        .from('clinic_expenses')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);
};

// Get all patients who have had appointments with this clinic
export const getClinicPatients = async (clinicId: string): Promise<Patient[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/patients?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching clinic patients via API:', error);
            return [];
        }
    }

    // Get all doctors belonging to this clinic
    const { data: doctors } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('clinic_id', clinicId);

    const doctorIds = (doctors || []).map(d => d.id);

    // Get all services belonging to this clinic
    const { data: services } = await supabaseAdmin
        .from('clinic_services')
        .select('id')
        .eq('clinic_id', clinicId);

    const serviceIds = (services || []).map(s => s.id);

    if (doctorIds.length === 0 && serviceIds.length === 0) {
        return [];
    }

    // Get unique patient IDs from appointments
    let appointmentsQuery = supabaseAdmin
        .from('appointments')
        .select('patient_id');

    const orConditions: string[] = [];
    if (doctorIds.length > 0) {
        orConditions.push(`doctor_id.in.(${doctorIds.join(',')})`);
    }
    if (serviceIds.length > 0) {
        orConditions.push(`clinic_service_id.in.(${serviceIds.join(',')})`);
    }

    if (orConditions.length > 0) {
        appointmentsQuery = appointmentsQuery.or(orConditions.join(','));
    }

    const { data: appointmentsData } = await appointmentsQuery;

    const uniquePatientIds = [...new Set((appointmentsData || []).map(a => a.patient_id).filter(Boolean))];

    if (uniquePatientIds.length === 0) {
        return [];
    }

    // Get patient details
    const { data: patients, error } = await supabaseAdmin
        .from('patients')
        .select('*')
        .in('id', uniquePatientIds);

    if (error) throw new Error(error.message);
    return (patients || []).map(item => toCamelCase(item as Record<string, unknown>)) as Patient[];
};

// Get communication history for a patient in a clinic
export const getPatientCommunications = async (clinicId: string, patientId: string): Promise<PatientCommunication[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/communications?clinicId=${clinicId}&patientId=${patientId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching communications via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('patient_communications')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('sent_at', { ascending: false });

    if (error) throw new Error(error.message);
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as PatientCommunication[];
};

// Add a new communication record
export const addPatientCommunication = async (
    clinicId: string,
    patientId: string,
    type: 'whatsapp' | 'email' | 'phone_call' | 'sms',
    message: string,
    sentBy: string,
    template?: string
): Promise<PatientCommunication> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/clinics/communications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, patientId, type, message, sentBy, template })
            });
            if (!res.ok) throw new Error('Failed to add communication');
            return await res.json();
        } catch (error) {
            console.error('Error adding communication via API:', error);
            throw error;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('patient_communications')
        .insert({
            clinic_id: clinicId,
            patient_id: patientId,
            type,
            message,
            sent_by: sentBy,
            template,
            sent_at: new Date().toISOString()
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return toCamelCase(data as Record<string, unknown>) as PatientCommunication;
};

// =====================================================
// CLINIC-PATIENT CHAT FUNCTIONS
// =====================================================

// Get all chat conversations for a clinic (with last message and unread count)
export const getClinicChatConversations = async (clinicId: string): Promise<ClinicChatConversation[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/chat/conversations?clinicId=${clinicId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching chat conversations via API:', error);
            return [];
        }
    }

    // Get all messages for this clinic
    const { data: messages, error: msgError } = await supabaseAdmin
        .from('clinic_patient_messages')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });

    if (msgError) throw new Error(msgError.message);

    // Get unique patient IDs
    const patientIds = [...new Set((messages || []).map(m => m.patient_id))];

    if (patientIds.length === 0) return [];

    // Get patient details
    const { data: patients, error: patError } = await supabaseAdmin
        .from('patients')
        .select('*')
        .in('id', patientIds);

    if (patError) throw new Error(patError.message);

    // Build conversations
    const conversations: ClinicChatConversation[] = (patients || []).map(patient => {
        const patientMessages = (messages || []).filter(m => m.patient_id === patient.id);
        const lastMessage = patientMessages[0];
        const unreadCount = patientMessages.filter(m => !m.is_read && m.sender_type === 'patient').length;

        return {
            patient: toCamelCase(patient as Record<string, unknown>) as Patient,
            lastMessage: lastMessage ? toCamelCase(lastMessage as Record<string, unknown>) as ClinicPatientMessage : undefined,
            unreadCount
        };
    });

    // Sort by last message date
    conversations.sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });

    return conversations;
};

// Get messages for a specific conversation
export const getClinicChatMessages = async (clinicId: string, patientId: string): Promise<ClinicPatientMessage[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/clinics/chat/messages?clinicId=${clinicId}&patientId=${patientId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching chat messages via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_patient_messages')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as ClinicPatientMessage[];
};

// Send a chat message
export const sendClinicChatMessage = async (
    clinicId: string,
    patientId: string,
    senderType: 'clinic' | 'patient',
    message: string
): Promise<ClinicPatientMessage> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch('/api/clinics/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, patientId, senderType, message })
            });
            if (!res.ok) throw new Error('Failed to send message');
            return await res.json();
        } catch (error) {
            console.error('Error sending chat message via API:', error);
            throw error;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('clinic_patient_messages')
        .insert({
            clinic_id: clinicId,
            patient_id: patientId,
            sender_type: senderType,
            message,
            is_read: false
        })
        .select()
        .single();

    if (error) throw new Error(error.message);
    return toCamelCase(data as Record<string, unknown>) as ClinicPatientMessage;
};

// Mark messages as read
export const markClinicChatAsRead = async (clinicId: string, patientId: string, readerType: 'clinic' | 'patient'): Promise<void> => {
    if (typeof window !== 'undefined') {
        try {
            await fetch('/api/clinics/chat/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clinicId, patientId, readerType })
            });
            return;
        } catch (error) {
            console.error('Error marking messages as read via API:', error);
            return;
        }
    }

    // Mark messages from the other party as read
    const senderToMark = readerType === 'clinic' ? 'patient' : 'clinic';

    await supabaseAdmin
        .from('clinic_patient_messages')
        .update({ is_read: true })
        .eq('clinic_id', clinicId)
        .eq('patient_id', patientId)
        .eq('sender_type', senderToMark)
        .eq('is_read', false);
};

// Get patient's clinics for chat (clinics they have had appointments with)
export const getPatientChatClinics = async (patientId: string): Promise<{ clinic: Clinic; unreadCount: number; lastMessage?: ClinicPatientMessage }[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/patient/chat/clinics?patientId=${patientId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching patient chat clinics via API:', error);
            return [];
        }
    }

    // Get unique clinic IDs from appointments
    const { data: appointments } = await supabaseAdmin
        .from('appointments')
        .select('doctor_id, clinic_service_id')
        .eq('patient_id', patientId);

    const doctorIds = [...new Set((appointments || []).map(a => a.doctor_id).filter(Boolean))];

    // Get clinic IDs from doctors
    const { data: doctors } = await supabaseAdmin
        .from('doctors')
        .select('clinic_id')
        .in('id', doctorIds);

    // Get clinic IDs from services
    const serviceIds = [...new Set((appointments || []).map(a => a.clinic_service_id).filter(Boolean))];
    const { data: services } = await supabaseAdmin
        .from('clinic_services')
        .select('clinic_id')
        .in('id', serviceIds);

    const clinicIds = [...new Set([
        ...(doctors || []).map(d => d.clinic_id),
        ...(services || []).map(s => s.clinic_id)
    ].filter(Boolean))];

    if (clinicIds.length === 0) return [];

    // Get clinic details
    const { data: clinics } = await supabaseAdmin
        .from('clinics')
        .select('*')
        .in('id', clinicIds);

    // Get messages for this patient
    const { data: messages } = await supabaseAdmin
        .from('clinic_patient_messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

    return (clinics || []).map(clinic => {
        const clinicMessages = (messages || []).filter(m => m.clinic_id === clinic.id);
        const lastMessage = clinicMessages[0];
        const unreadCount = clinicMessages.filter(m => !m.is_read && m.sender_type === 'clinic').length;

        return {
            clinic: toCamelCase(clinic as Record<string, unknown>) as Clinic,
            unreadCount,
            lastMessage: lastMessage ? toCamelCase(lastMessage as Record<string, unknown>) as ClinicPatientMessage : undefined
        };
    }).sort((a, b) => {
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
    });
};

export const getAdminClinics = async (): Promise<Clinic[]> => {
    try {
        const response = await fetch('/api/clinics', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) throw new Error('Failed to fetch clinics');

        const data = await response.json();
        return data as Clinic[];
    } catch (error) {
        console.error('Error fetching clinics:', error);
        return [];
    }
};

export const updateClinicStatus = async (id: string, updates: Partial<Clinic>) => {
    const response = await fetch(`/api/clinics?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        const error = await response.json();
        const errorMessage = error.details ? `${error.error}: ${error.details}` : (error.error || 'Failed to update clinic');
        throw new Error(errorMessage);
    }
};

export const getServiceAppointmentHistory = async (serviceId: string, startDate?: string, endDate?: string): Promise<Appointment[]> => {
    try {
        let query = supabase
            .from('appointments')
            .select('*')
            .eq('clinic_service_id', serviceId);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) throw error;
        return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
    } catch (error) {
        console.error('Error fetching service appointments:', error);
        return [];
    }
};

export const getDoctorAppointmentHistory = async (doctorId: string, startDate?: string, endDate?: string): Promise<Appointment[]> => {
    try {
        let query = supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctorId);

        if (startDate && endDate) {
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query.order('date', { ascending: false });

        if (error) {
            console.error("Supabase Error in getDoctorAppointmentHistory:", error);
            throw error;
        }
        return (data || []).map(item => toCamelCase(item as Record<string, unknown>)) as Appointment[];
    } catch (error) {
        console.error('Error fetching doctor appointments:', error);
        return [];
    }
};

// =====================================================
// NÚCLEO FAMILIAR - CRUD Functions
// =====================================================

export const getFamilyMembers = async (patientId: string): Promise<FamilyMember[]> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/family-members?patientId=${patientId}`);
            if (!res.ok) return [];
            return await res.json();
        } catch (error) {
            console.error('Error fetching family members via API:', error);
            return [];
        }
    }

    const { data, error } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('account_holder_id', patientId)
        .eq('status', 'active')
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching family members:', error);
        return [];
    }

    return (data || []).map(item => {
        const camel = toCamelCase(item as Record<string, unknown>) as unknown as FamilyMember;
        // Compute fullName and age
        camel.fullName = `${camel.firstName} ${camel.lastName}`;
        if (camel.birthDate) {
            const birth = new Date(camel.birthDate);
            const today = new Date();
            camel.age = today.getFullYear() - birth.getFullYear();
            // Adjust if birthday hasn't occurred this year
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                camel.age--;
            }
        }
        return camel;
    });
};

export const getFamilyMember = async (id: string): Promise<FamilyMember | null> => {
    if (typeof window !== 'undefined') {
        try {
            const res = await fetch(`/api/family-members/${id}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            console.error('Error fetching family member via API:', error);
            return null;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('family_members')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching family member:', error);
        return null;
    }

    const camel = toCamelCase(data as Record<string, unknown>) as unknown as FamilyMember;
    camel.fullName = `${camel.firstName} ${camel.lastName}`;
    return camel;
};

export const addFamilyMember = async (data: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt' | 'fullName' | 'age'>): Promise<FamilyMember> => {
    if (typeof window !== 'undefined') {
        const res = await fetch('/api/family-members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to add family member');
        }
        return await res.json();
    }

    const snakeCaseData = toSnakeCase(data as unknown as Record<string, unknown>);

    const { data: newMember, error } = await supabaseAdmin
        .from('family_members')
        .insert([snakeCaseData])
        .select()
        .single();

    if (error) throw new Error(error.message);

    const camel = toCamelCase(newMember as Record<string, unknown>) as unknown as FamilyMember;
    camel.fullName = `${camel.firstName} ${camel.lastName}`;
    return camel;
};

export const updateFamilyMember = async (id: string, data: Partial<FamilyMember>): Promise<void> => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/family-members/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to update family member');
        }
        return;
    }

    // Remove computed fields before saving
    const { fullName, age, ...dataToSave } = data;
    const snakeCaseData = toSnakeCase(dataToSave as unknown as Record<string, unknown>);

    const { error } = await supabaseAdmin
        .from('family_members')
        .update(snakeCaseData)
        .eq('id', id);

    if (error) throw new Error(error.message);
};

export const deleteFamilyMember = async (id: string): Promise<void> => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/family-members/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete family member');
        }
        return;
    }

    // Soft delete: set status to inactive
    const { error } = await supabaseAdmin
        .from('family_members')
        .update({ status: 'inactive' })
        .eq('id', id);

    if (error) throw new Error(error.message);
};

export const linkFamilyMemberToPatient = async (familyMemberId: string, patientId: string): Promise<void> => {
    if (typeof window !== 'undefined') {
        const res = await fetch(`/api/family-members/${familyMemberId}/link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patientId })
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to link family member');
        }
        return;
    }

    const { error } = await supabaseAdmin
        .from('family_members')
        .update({ linked_patient_id: patientId })
        .eq('id', familyMemberId);

    if (error) throw new Error(error.message);
};

// Get family members for appointment selector (active and can book)
export const getFamilyMembersForBooking = async (patientId: string): Promise<FamilyMember[]> => {
    const members = await getFamilyMembers(patientId);
    return members.filter(m => m.canBookAppointments && m.status === 'active');
};

export async function uploadPublicImage(file: File, bucket: string, path: string): Promise<string> {
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!fileExt || !allowed.includes(fileExt)) {
        throw new Error('Formato de imagen no permitido. Use JPG, PNG o WEBP.');
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('La imagen es demasiado grande. Máximo 5MB.');
    }

    const fileName = `${path}_${Date.now()}.${fileExt}`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    formData.append('path', fileName);

    const res = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        let errorMessage = 'Error al subir imagen';
        try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorMessage;
        } catch (e) { }
        throw new Error(errorMessage);
    }

    const { publicUrl } = await res.json();
    return publicUrl;
}

// =====================================================
// CLINIC SUPPORT TICKETS
// =====================================================

export const createClinicSupportTicket = async (ticketData: {
    clinicId: string;
    clinicName: string;
    subject: string;
    description: string;
}): Promise<string> => {
    // Usar API o admin directo si es server component
    if (typeof window !== 'undefined') {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: ticketData.clinicId,
                user_name: ticketData.clinicName,
                user_role: 'clinic',
                subject: ticketData.subject,
                description: ticketData.description,
                status: 'abierto',
                date: new Date().toISOString(),
                messages: [],
                read_by_admin: false,
                read_by_seller: false,
                read_by_doctor: false,
                read_by_clinic: true
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data.id;
    }
    return '';
};

export const getClinicSupportTickets = async (clinicId: string): Promise<AdminSupportTicket[]> => {
    const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', clinicId)
        .order('date', { ascending: false });

    if (error) throw new Error(error.message);

    // Mapear snake_case a camelCase si es necesario, o usar tipos compatibles
    return (data || []).map((ticket: any) => ({
        id: ticket.id,
        userId: ticket.user_id,
        userName: ticket.user_name,
        userRole: ticket.user_role,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        date: ticket.date,
        createdAt: ticket.created_at || ticket.date,
        messages: ticket.messages || [],
        readByAdmin: ticket.read_by_admin,
        readByClinic: ticket.read_by_clinic
    }));
};


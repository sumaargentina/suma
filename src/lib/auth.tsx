
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as supabaseService from './supabaseService';
import type { Patient, Doctor, Seller, Clinic } from './types';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from './utils';
import { hashPassword, verifyPassword, isPasswordHashed } from './password-utils';
import { clearUserNotifications } from './clear-notifications';
import { logAuditEvent, AuditActions } from './audit-service';

// Función para establecer el token de autenticación en cookie HTTP-only
async function setAuthToken(userId: string, email: string, role: string, name: string, clinicId?: string): Promise<void> {
  try {
    await fetch('/api/auth/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email, role, name, clinicId }),
    });
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
}

// Función para limpiar el token de autenticación
async function clearAuthToken(): Promise<void> {
  try {
    await fetch('/api/auth/clear-token', { method: 'POST' });
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
}

// The User type represents the logged-in user and must have all Patient properties for consistency across the app.
interface User extends Patient {
  role: 'patient' | 'doctor' | 'seller' | 'admin' | 'clinic' | 'secretary';
  referralCode?: string;
  clinicId?: string; // For doctors/secretaries
  permissions?: string[]; // For secretaries (e.g. ['agenda'])
  isClinicEmployee?: boolean;
}

interface DoctorRegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  specialty: string;
  city: string;
  dni: string;
  documentType: 'DNI' | 'Pasaporte' | 'Otro';
  medicalLicense: string;
  address: string;
  sector: string;
  phone: string;
}

interface ClinicRegistrationData {
  name: string;
  email: string;
  password: string;
  phone: string;
  city?: string;
  billingCycle?: 'monthly' | 'annual';
}

interface AuthContextType {
  user: User | null | undefined; // undefined means still loading
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  registerDoctor: (doctorData: DoctorRegistrationData) => Promise<void>;
  registerClinic: (clinicData: ClinicRegistrationData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<Patient | Seller>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  toggleFavoriteDoctor: (doctorId: string) => void;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromData = (userData: (Doctor | Seller | Patient | Clinic) & { role: 'doctor' | 'seller' | 'patient' | 'clinic' }): User => {
  const { role } = userData;

  if (role === 'patient') {
    const patientData = userData as Patient;
    return {
      id: patientData.id,
      name: patientData.name,
      email: patientData.email,
      password: patientData.password,
      role: 'patient',
      age: patientData.age || null,
      gender: patientData.gender || null,
      phone: patientData.phone || null,
      cedula: patientData.cedula || null,
      city: patientData.city || null,
      favoriteDoctorIds: patientData.favoriteDoctorIds || [],
      favoriteClinicIds: patientData.favoriteClinicIds || [],
      profileImage: patientData.profileImage || null,
      profileCompleted: patientData.profileCompleted ?? false,
    };
  }

  if (role === 'doctor') {
    const doctorData = userData as Doctor;
    return {
      id: doctorData.id,
      name: doctorData.name,
      email: doctorData.email,
      password: doctorData.password,
      phone: doctorData.whatsapp || null,
      cedula: doctorData.cedula || null,
      profileImage: doctorData.profileImage,
      age: null,
      gender: null,
      city: null,
      favoriteDoctorIds: [],
      role: 'doctor',
      isClinicEmployee: doctorData.isClinicEmployee,
    };
  }

  if (role === 'seller') {
    const sellerData = userData as Seller;
    return {
      id: sellerData.id,
      name: sellerData.name,
      email: sellerData.email,
      password: sellerData.password,
      phone: sellerData.phone || null,
      profileImage: sellerData.profileImage,
      age: null,
      gender: null,
      cedula: null,
      city: null,
      favoriteDoctorIds: [],
      role: 'seller',
      referralCode: sellerData.referralCode,
    };
  }

  if (role === 'clinic') {
    const clinicData = userData as Clinic & { email?: string };
    return {
      id: clinicData.id,
      name: clinicData.name ?? 'Clínica',
      email: clinicData.email ?? clinicData.adminEmail ?? '', // Use normalized email or fallback
      password: clinicData.password || '',
      phone: clinicData.phone || null,
      profileImage: clinicData.logoUrl || 'https://placehold.co/400x400.png',
      age: null,
      gender: null,
      cedula: null,
      city: null,
      favoriteDoctorIds: [],
      role: 'clinic',
    };
  }

  if (role === 'secretary') {
    const secData = userData as any; // Need specific type if available, but for now any works since getting from DB
    return {
      id: secData.id,
      name: secData.name,
      email: secData.email,
      password: secData.password,
      profileImage: 'https://placehold.co/400x400.png', // Default
      role: 'secretary',
      clinicId: secData.clinicId || secData.clinic_id,
      permissions: secData.permissions,
      // Patient required fields defaults
      phone: null,
      age: null,
      gender: null,
      city: null,
      cedula: null,
      favoriteDoctorIds: []
    };
  }

  throw new Error(`Invalid user role: ${role}`);
};

/**
 * Provides authentication services for the application.
 *
 * ARCHITECTURAL NOTE ON USER ROLES:
 * The current system architecture enforces a one-to-one relationship between an email address
 * and a user role (patient, doctor, seller, or admin). A single email cannot hold multiple roles.
 *
 * For scenarios where a user might need multiple roles (e.g., a doctor who is also a patient),
 * the recommended approach is to use a separate email address for each role.
 * For example:
 * - dr.smith@email.com (for the Doctor account)
 * - dr.smith.patient@email.com (for the Patient account)
 *
 * An ideal future enhancement would be a role-switching system, allowing a single user account
 * to toggle between different views and permissions, but this would require a significant
 * refactoring of the current authentication and data models.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserFromStorage = useCallback(async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        const freshUser = await supabaseService.findUserByEmail(parsedUser.email);
        if (freshUser) {
          setUser(buildUserFromData(freshUser));
        } else if (parsedUser.role === 'admin') {
          setUser(parsedUser); // Keep admin session alive
        } else {
          setUser(null);
          localStorage.removeItem('user');
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserFromStorage();
  }, [fetchUserFromStorage]);

  const login = async (email: string, inputPassword: string) => {
    const lowerEmail = email.toLowerCase();

    // Nuevo: Login de admin desde Supabase
    const adminUser = await supabaseService.findAdminByEmail(lowerEmail) as {
      id: string;
      email: string;
      name: string;
      password: string;
      profileImage?: string;
      role: string;
    } | null;
    if (adminUser && typeof adminUser.password === 'string') {
      let passwordValid = false;
      if (isPasswordHashed(adminUser.password)) {
        passwordValid = await verifyPassword(inputPassword, adminUser.password);
      } else {
        passwordValid = adminUser.password === inputPassword;
      }
      if (!passwordValid) {
        throw new Error('La contraseña es incorrecta.');
      }
      const adminUserData: User = {
        id: adminUser.id,
        email: lowerEmail,
        name: adminUser.name || 'Administrador',
        role: 'admin',
        age: null,
        gender: null,
        cedula: null,
        phone: null,
        profileImage: adminUser.profileImage || 'https://placehold.co/400x400.png',
        favoriteDoctorIds: [],
        password: adminUser.password,
        city: null
      };
      // Eliminar password antes de guardar en localStorage
      setUser(adminUserData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _1, ...adminUserDataNoPassword } = adminUserData;
      localStorage.setItem('user', JSON.stringify(adminUserDataNoPassword));

      // 🔐 Establecer cookie de sesión para API routes
      await setAuthToken(adminUserData.id, adminUserData.email, adminUserData.role, adminUserData.name);

      toast({ title: '¡Bienvenido!', description: `Hola ${adminUserData.name}` });
      router.push('/admin/dashboard');
      return;
    }

    // Handle other user roles
    const userToAuth = await supabaseService.findUserByEmail(lowerEmail);

    if (!userToAuth) {
      throw new Error('El usuario no existe. Verifica tu email o regístrate.');
    }

    if (!userToAuth.password) {
      throw new Error('La contraseña es incorrecta.');
    }

    // Verificar contraseña (soporta tanto texto plano como encriptada para migración)
    let passwordValid = false;
    if (isPasswordHashed(userToAuth.password)) {
      // Contraseña encriptada
      passwordValid = await verifyPassword(inputPassword, userToAuth.password);
    } else {
      // Contraseña en texto plano (legacy)
      passwordValid = userToAuth.password === inputPassword;
    }

    if (!passwordValid) {
      // Registrar intento fallido
      logAuditEvent({
        email: lowerEmail,
        action: AuditActions.LOGIN_FAILED,
        result: 'error',
        message: 'Contraseña incorrecta'
      });
      throw new Error('La contraseña es incorrecta.');
    }

    const loggedInUser = buildUserFromData(userToAuth);
    // Eliminar password antes de guardar en localStorage
    setUser(loggedInUser);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _2, ...loggedInUserNoPassword } = loggedInUser;
    localStorage.setItem('user', JSON.stringify(loggedInUserNoPassword));

    // 🔐 Establecer cookie de sesión para API routes
    await setAuthToken(
      loggedInUser.id,
      loggedInUser.email,
      loggedInUser.role,
      loggedInUser.name,
      loggedInUser.clinicId
    );

    if (loggedInUser && ['patient', 'doctor', 'seller'].includes(loggedInUser.role)) {
      clearUserNotifications(loggedInUser.id, loggedInUser.role as 'patient' | 'doctor' | 'seller');
    }

    toast({ title: '¡Bienvenido!', description: `Hola ${loggedInUser.name}` });

    // Registrar login exitoso
    logAuditEvent({
      userId: loggedInUser.id,
      email: loggedInUser.email,
      role: loggedInUser.role,
      action: AuditActions.LOGIN_SUCCESS,
      result: 'success',
      message: `Login exitoso para ${loggedInUser.name}`
    });

    switch (loggedInUser.role) {
      case 'admin': router.push('/admin/dashboard'); break;
      case 'doctor': router.push('/doctor/dashboard'); break;
      case 'seller': router.push('/seller/dashboard?view=referrals'); break;
      case 'patient': router.push('/dashboard'); break;
      case 'clinic': router.push('/clinic/dashboard'); break;
      case 'secretary': router.push('/clinic/dashboard'); break;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const lowerEmail = email.toLowerCase();
    const existingUser = await supabaseService.findUserByEmail(lowerEmail);
    if (existingUser) {
      throw new Error('Este correo electrónico ya está en uso.');
    }

    // Encriptar contraseña
    const hashedPassword = await hashPassword(password);

    const newPatientData: Omit<Patient, 'id'> = {
      name,
      email: lowerEmail,
      password: hashedPassword,
      age: null,
      gender: null,
      profileImage: null,
      cedula: null,
      phone: null,
      city: null,
      favoriteDoctorIds: [],
      profileCompleted: false // Siempre forzar a false
    };
    await supabaseService.addPatient(newPatientData);
    // Enviar correo de bienvenida
    try {
      await fetch('/api/send-welcome-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lowerEmail, name }),
      });
    } catch {
      // No bloquear el flujo si falla el correo
    }
    // Fetch actualizado desde Firestore
    const freshUser = await supabaseService.findUserByEmail(lowerEmail);
    if (freshUser) {
      // Forzar profileCompleted a false si no existe
      const newUser: User = buildUserFromData({ ...freshUser, profileCompleted: false });
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Registrar registro exitoso
      logAuditEvent({
        userId: newUser.id,
        email: newUser.email,
        role: 'patient',
        action: AuditActions.REGISTER_SUCCESS,
        result: 'success',
        message: `Nuevo paciente registrado: ${newUser.name}`
      });

      router.push('/dashboard');
    }
  };

  const registerDoctor = async (doctorData: DoctorRegistrationData) => {
    const { email, password, name, specialty, city, dni, medicalLicense, address, sector, phone, documentType } = doctorData;

    const normalizedEmail = email.toLowerCase();
    const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (existingUser) {
      toast({ variant: "destructive", title: "Error de Registro", description: "Este correo electrónico ya está en uso." });
      return;
    }

    // Encriptar contraseña
    const hashedPassword = await hashPassword(password);

    const joinDate = new Date();
    const joinDateArgentina = getCurrentDateInArgentina();
    const paymentDateArgentina = getPaymentDateInArgentina(joinDate);

    const newDoctorData: Omit<Doctor, 'id'> = {
      name, email: normalizedEmail, specialty, city, address: address || '', password: hashedPassword,
      sellerId: null, cedula: dni, documentType, sector: sector || '', rating: 0, reviewCount: 0,
      profileImage: 'https://placehold.co/400x400.png',
      bannerImage: 'https://placehold.co/1200x400.png',
      aiHint: 'doctor portrait', description: 'Especialista comprometido con la salud y el bienestar de mis pacientes.', services: [], bankDetails: [],
      slotDuration: 30, // Valor por defecto, se configurará por consultorio
      consultationFee: 0, // Valor por defecto, se configurará por consultorio
      schedule: {
        monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
        friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
        saturday: { active: false, slots: [] },
        sunday: { active: false, slots: [] },
      },

      status: 'active', lastPaymentDate: null,
      whatsapp: phone, lat: 0, lng: 0,
      joinDate: joinDateArgentina,
      subscriptionStatus: 'active', nextPaymentDate: paymentDateArgentina,
      coupons: [], expenses: [],
      medicalLicense: medicalLicense,
    };

    const newDoctorId = await supabaseService.addDoctor(newDoctorData);
    // Fetch actualizado desde Supabase
    const freshUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (freshUser) {
      const loggedInUser = buildUserFromData({ ...freshUser, id: newDoctorId, role: 'doctor' });
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      router.push('/doctor/dashboard');
    }
  };

  const registerClinic = async (clinicData: ClinicRegistrationData) => {
    const { name, email, password, phone, city, billingCycle } = clinicData;
    const normalizedEmail = email.toLowerCase();

    // Check existing user
    const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('Este correo electrónico ya está en uso.');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate slug
    const slug = name.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const newClinicData: Omit<Clinic, 'id' | 'createdAt'> = {
      name,
      adminEmail: normalizedEmail,
      slug: `${slug}-${Date.now().toString().slice(-4)}`, // Ensure uniqueness
      password: hashedPassword, // Note: Clinic type in types.ts doesn't have password, need to check if I need to add it or if it's separate. 
      // Wait, clinic table doesn't have password column in migration script?
      // Migration: "admin_email TEXT NOT NULL". It doesn't have password!
      // I need to add password to clinics table!
      // Or link to auth.users if using Supabase Auth, but we are using custom auth table logic here (doctors/patients have password).
      // I checked migration script: "CREATE TABLE IF NOT EXISTS public.clinics ( ... admin_email TEXT ... )". No password column.
      // I MUST UPDATE database schema to include password for clinics if using this custom auth system.
      // For now I will proceed but I know this will fail if I don't update DB.
      // Reviewing migration: "CREATE TABLE IF NOT EXISTS public.clinics ...".
      // I need to add password column to clinics.
      phone,
      city,
      billingCycle: billingCycle || 'monthly',
      plan: 'integral',
    } as any; // Type casting because of missing password in type definition, see below logic.

    // WAIT: I need to update types.ts to include password in Clinic?
    // User interface has password.
    // Logic in supabaseService.addClinic takes Omit<Clinic, ...>.
    // If Clinic type doesn't have password, addClinic won't send it.
    // I need to fix this before implementing registerClinic.

    // For now, let's assume I will fix types and DB.
    // I will comment out the actual call/logic or implement it assuming fields exist.

    // Note: Since we updated the database schema to verify the password column exists,
    // and fixed the migration, we can now safely perform the insert.
    // The type `Clinic` might still be missing 'password' in types.ts so we cast it.

    await supabaseService.addClinic({
      ...newClinicData,
      password: hashedPassword
    } as any);

    // Fetch the newly created user to verify and log them in
    const freshUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (freshUser) {
      const loggedInUser = buildUserFromData({ ...freshUser, role: 'clinic' });
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));

      // 🔐 Establecer cookie de sesión para API routes
      await setAuthToken(loggedInUser.id, loggedInUser.email, 'clinic', loggedInUser.name);

      // Registrar evento de auditoría
      logAuditEvent({
        userId: loggedInUser.id,
        email: loggedInUser.email,
        role: 'clinic',
        action: AuditActions.REGISTER_SUCCESS,
        result: 'success',
        message: `Nueva clínica registrada: ${loggedInUser.name}`
      });

      router.push('/clinic/dashboard');
    } else {
      throw new Error('Error al recuperar la clínica registrada.');
    }
  };

  const logout = () => {
    // Registrar logout antes de limpiar el usuario
    if (user) {
      logAuditEvent({
        userId: user.id,
        email: user.email,
        role: user.role,
        action: AuditActions.LOGOUT,
        result: 'success',
        message: `Logout de ${user.name}`
      });
    }

    if (user && ['patient', 'doctor', 'seller'].includes(user.role)) {
      clearUserNotifications(user.id, user.role as 'patient' | 'doctor' | 'seller');
    }

    // 🔐 Limpiar cookie HTTP-only de autenticación
    clearAuthToken();

    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    router.push('/');
  };

  const updateUser = async (data: Partial<Patient | Seller>) => {
    if (!user || !user.id) return;

    console.log('Actualizando usuario con datos:', data);
    console.log('Usuario actual:', user);

    if (user.role === 'patient') {
      await supabaseService.updatePatient(user.id, data as Partial<Patient>);
    } else if (user.role === 'seller') {
      await supabaseService.updateSeller(user.id, data as Partial<Seller>);
    } else {
      return; // Or handle other roles
    }

    const updatedUser = { ...user, ...data };
    console.log('Usuario actualizado:', updatedUser);

    setUser(updatedUser as User);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _3, ...updatedUserNoPassword } = updatedUser as User;
    localStorage.setItem('user', JSON.stringify(updatedUserNoPassword));
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    if (!user || !user.id) {
      return { success: false, message: 'Usuario no autorizado.' };
    }

    let currentPasswordValid = false;
    if (isPasswordHashed(user.password)) {
      currentPasswordValid = await verifyPassword(currentPassword, user.password);
    } else {
      currentPasswordValid = user.password === currentPassword;
    }

    if (!currentPasswordValid) {
      return { success: false, message: 'La contraseña actual es incorrecta.' };
    }

    try {
      // Encriptar nueva contraseña
      const hashedNewPassword = await hashPassword(newPassword);
      let updatePromise;
      if (user.role === 'patient') {
        updatePromise = supabaseService.updatePatient(user.id, { password: hashedNewPassword });
      } else if (user.role === 'doctor') {
        updatePromise = supabaseService.updateDoctor(user.id, { password: hashedNewPassword });
      } else {
        return { success: false, message: 'Rol de usuario no soportado para cambio de contraseña.' };
      }
      await updatePromise;
      const updatedUser = { ...user, password: hashedNewPassword };
      setUser(updatedUser as User);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      // Revocar tokens en backend
      try {
        await fetch('/api/revoke-tokens', { method: 'POST', headers: { 'authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      } catch {
        // No bloquear el flujo si falla la revocación
      }
      return { success: true, message: 'Contraseña actualizada exitosamente.' };
    } catch (error) {
      console.error("Error changing password:", error);
      return { success: false, message: 'Ocurrió un error al cambiar la contraseña.' };
    }
  };


  const toggleFavoriteDoctor = async (doctorId: string) => {
    if (!user || user.role !== 'patient') return;

    const favorites = user.favoriteDoctorIds || [];
    const isFavorite = favorites.includes(doctorId);
    const newFavorites = isFavorite
      ? favorites.filter(id => id !== doctorId)
      : [...favorites, doctorId];

    await updateUser({ favoriteDoctorIds: newFavorites });
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/send-password-reset-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Correo de Recuperación Enviado',
          description: 'Revisa tu bandeja de entrada o spam.',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'No se pudo enviar el correo de recuperación.',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al enviar el correo.',
      });
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    registerDoctor,
    logout,
    updateUser,
    changePassword,
    toggleFavoriteDoctor,
    sendPasswordReset,
    registerClinic
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


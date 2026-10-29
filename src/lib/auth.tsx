"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as supabaseService from './supabaseService';
import { supabase, clearStaleSupabaseAuth } from './supabase';
import type { Patient, Doctor, Seller, Clinic, DoctorWorkspace, ActiveWorkspace, DocumentType } from './types';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateInArgentina, getPaymentDateInArgentina } from './utils';
import { hashPassword, verifyPassword, isPasswordHashed } from './password-utils';
import { clearOtherUsersNotifications } from './clear-notifications';
import { logAuditEvent, AuditActions } from './audit-service';
import { normalizeCountryCode } from './geo-data';

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

export interface User extends Patient {
  role: 'patient' | 'doctor' | 'seller' | 'admin' | 'superadmin' | 'clinic' | 'secretary' | 'pharmacy' | 'laboratory';
  referralCode?: string;
  clinicId?: string; // For doctors/secretaries
  laboratoryId?: string; // For secretaries belonging to laboratories
  permissions?: string[]; // For secretaries (e.g. ['agenda'])
  isClinicEmployee?: boolean;
  workspaces?: DoctorWorkspace[];
  activeWorkspace?: ActiveWorkspace | null;
  profession?: string;
  specialty?: string;
  hasMedicalRecord?: boolean | null;
  hasPrescription?: boolean | null;
  medicalLicense?: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  onboardingCompleted?: boolean;
  isChain?: boolean;
  chainName?: string | null;
  branchName?: string | null;
  plan?: string;
}

interface DoctorRegistrationData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  profession?: string;
  specialty: string;
  hasMedicalRecord?: boolean | null;
  hasPrescription?: boolean | null;
  country?: string;
  state?: string;
  city: string;
  dni: string;
  documentType: DocumentType;
  medicalLicense: string;
  address: string;
  sector?: string;
  phone: string;
  lat?: number;
  lng?: number;
  sellerId?: string | null;
}

interface ClinicRegistrationData {
  name: string;
  email: string;
  password: string;
  phone: string;
  rif?: string;
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  address?: string;
  billingCycle?: 'monthly' | 'annual' | 'free';
  billingMonths?: number;
  subscriptionFee?: number;
  discountPercentage?: number;
  freeMonths?: number;
  plan?: string;
  lat?: number;
  lng?: number;
}

export interface AuthContextType {
  user: User | null | undefined; // undefined means still loading
  loading: boolean;
  activeWorkspace: ActiveWorkspace | null;
  workspaces: DoctorWorkspace[];
  showWorkspaceModal: boolean;
  setShowWorkspaceModal: (show: boolean) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, location?: { country?: string; state?: string; city?: string; cedula?: string; phone?: string }) => Promise<void>;
  registerDoctor: (doctorData: DoctorRegistrationData) => Promise<void>;
  registerClinic: (clinicData: ClinicRegistrationData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<Patient | Seller | Doctor>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  toggleFavoriteDoctor: (doctorId: string) => void;
  sendPasswordReset: (email: string) => Promise<void>;
  loginWithGoogle: (nextPath?: string, role?: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromData = (userData: any): User => {
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
      birthDate: patientData.birthDate || null,
      gender: patientData.gender || null,
      phone: patientData.phone || null,
      cedula: patientData.cedula || null,
      documentType: patientData.documentType || 'Cédula',
      country: normalizeCountryCode(patientData.country || 'VE'),
      state: patientData.state || null,
      city: patientData.city || null,
      sector: patientData.sector || null,
      address: patientData.address || null,
      favoriteDoctorIds: patientData.favoriteDoctorIds || [],
      favoriteClinicIds: patientData.favoriteClinicIds || [],
      profileImage: patientData.profileImage || null,
      profileCompleted: patientData.profileCompleted ?? false,
      bloodType: patientData.bloodType || null,
      religion: patientData.religion || null,
      maritalStatus: patientData.maritalStatus || null,
      education: patientData.education || null,
      occupation: patientData.occupation || null,
    };
  }

  if (role === 'doctor') {
    const doctorData = userData as Doctor;
    return {
      id: doctorData.id,
      name: doctorData.name,
      email: doctorData.email,
      password: doctorData.password,
      phone: doctorData.phone || doctorData.whatsapp || null,
      cedula: doctorData.cedula || null,
      documentType: doctorData.documentType || 'Cédula',
      profileImage: doctorData.profileImage,
      profession: doctorData.profession || 'Médico',
      specialty: doctorData.specialty || '',
      hasMedicalRecord: doctorData.hasMedicalRecord ?? (doctorData as any).has_medical_record ?? null,
      hasPrescription: doctorData.hasPrescription ?? (doctorData as any).has_prescription ?? null,
      medicalLicense: doctorData.medicalLicense || '',
      verificationStatus: doctorData.verificationStatus || (doctorData as any).verification_status || 'pending',
      country: normalizeCountryCode(doctorData.country || 'VE'),
      state: doctorData.state || undefined,
      city: doctorData.city || null,
      sector: doctorData.sector || undefined,
      address: doctorData.address || undefined,
      onboardingCompleted: doctorData.onboardingCompleted ?? (!!doctorData.specialty && doctorData.specialty !== 'Pendiente'),
      age: null,
      gender: null,
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
      country: normalizeCountryCode(sellerData.country || 'VE'),
      state: sellerData.state || null,
      city: sellerData.city || null,
      age: null,
      gender: null,
      cedula: null,
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
      country: normalizeCountryCode(clinicData.country || 'VE'),
      state: clinicData.state || null,
      city: clinicData.city || null,
      age: null,
      gender: null,
      cedula: null,
      favoriteDoctorIds: [],
      role: 'clinic',
      plan: clinicData.plan || 'integral',
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
      laboratoryId: secData.laboratoryId || secData.laboratory_id,
      permissions: secData.permissions,
      country: normalizeCountryCode(secData.country || 'VE'),
      state: secData.state || null,
      // Patient required fields defaults
      phone: null,
      age: null,
      gender: null,
      city: secData.city || null,
      cedula: null,
      favoriteDoctorIds: []
    };
  }

  if (role === 'pharmacy') {
    const pharmData = userData as any;
    const displayName = pharmData.name || (pharmData.chainName || pharmData.chain_name 
      ? `${pharmData.chainName || pharmData.chain_name} - ${pharmData.branchName || pharmData.branch_name || 'Sucursal'}` 
      : 'Farmacia');
    return {
      id: pharmData.id,
      name: displayName,
      email: pharmData.email,
      password: pharmData.password,
      phone: pharmData.phone || null,
      profileImage: pharmData.logoUrl || pharmData.logo_url || 'https://placehold.co/400x400.png',
      role: 'pharmacy',
      country: normalizeCountryCode(pharmData.country || 'VE'),
      city: pharmData.city || null,
      state: pharmData.state || null,
      address: pharmData.address || null,
      chainName: pharmData.chainName || pharmData.chain_name || null,
      branchName: pharmData.branchName || pharmData.branch_name || null,
      isChain: pharmData.isChain || pharmData.is_chain || false,
      age: null,
      gender: null,
      cedula: null,
      favoriteDoctorIds: []
    };
  }

  if (role === 'laboratory') {
    const labData = userData as any;
    return {
      id: labData.id,
      name: labData.name ?? 'Laboratorio',
      email: labData.email ?? labData.admin_email ?? labData.adminEmail ?? '',
      password: labData.password || '',
      phone: labData.phone || labData.whatsapp || null,
      profileImage: labData.logoUrl || labData.logo_url || 'https://placehold.co/400x400.png',
      country: normalizeCountryCode(labData.country || 'VE'),
      city: labData.city || null,
      state: labData.state || null,
      address: labData.address || null,
      age: null,
      gender: null,
      cedula: null,
      favoriteDoctorIds: [],
      role: 'laboratory',
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
  const [workspaces, setWorkspaces] = useState<DoctorWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace | null>(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState<boolean>(false);
  const router = useRouter();
  const { toast } = useToast();

  const loadDoctorWorkspaces = useCallback(async (doctorId: string): Promise<{ list: DoctorWorkspace[]; active: ActiveWorkspace | null }> => {
    try {
      const list = await supabaseService.getDoctorWorkspaces(doctorId);
      setWorkspaces(list);

      let chosenActive: ActiveWorkspace | null = null;
      const storedActiveStr = localStorage.getItem('activeWorkspace');

      const activeOnlyList = list.filter(w => w.status === 'active');
      const unlockedActiveList = activeOnlyList.filter(w => !w.subscriptionLocked);

      const toActiveWorkspace = (ws: DoctorWorkspace): ActiveWorkspace => ({
        id: ws.id,
        workspaceType: ws.workspaceType,
        name: ws.customName || ws.clinicName || (ws.workspaceType === 'private' ? 'Mi Consultorio Privado' : 'Clínica Institucional'),
        clinicId: ws.clinicId || null,
        roleInWorkplace: ws.roleInWorkplace || undefined,
        canManageFinances: ws.canManageFinances,
        canManageSchedule: ws.canManageSchedule,
        subscriptionLocked: ws.subscriptionLocked,
        lockReason: ws.lockReason,
      });

      if (storedActiveStr) {
        try {
          const parsed = JSON.parse(storedActiveStr);
          const exists = activeOnlyList.find(w => w.id === parsed.id);
          if (exists) {
            // Si el espacio guardado está bloqueado por falta de pago y el médico tiene otro espacio disponible (ej. Hospital o Clínica), cambiar automáticamente al disponible
            if (exists.subscriptionLocked && unlockedActiveList.length > 0) {
              const fallback = unlockedActiveList.find(w => w.isDefault) || unlockedActiveList[0];
              chosenActive = toActiveWorkspace(fallback);
            } else {
              chosenActive = toActiveWorkspace(exists);
            }
          }
        } catch {
          // ignore corrupted JSON
        }
      }

      if (!chosenActive && activeOnlyList.length > 0) {
        const pool = unlockedActiveList.length > 0 ? unlockedActiveList : activeOnlyList;
        const def = pool.find(w => w.isDefault) || pool[0];
        chosenActive = toActiveWorkspace(def);
      }

      setActiveWorkspace(chosenActive);
      if (chosenActive) {
        localStorage.setItem('activeWorkspace', JSON.stringify(chosenActive));
      }

      return { list, active: chosenActive };
    } catch (err) {
      console.error('Error loading doctor workspaces in AuthProvider:', err);
      return { list: [], active: null };
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (user && user.role === 'doctor') {
      await loadDoctorWorkspaces(user.id);
    }
  }, [user, loadDoctorWorkspaces]);

  const switchWorkspace = async (workspaceId: string) => {
    const target = workspaces.find(w => w.id === workspaceId && w.status === 'active');
    if (!target || !user) return;

    const newActive: ActiveWorkspace = {
      id: target.id,
      workspaceType: target.workspaceType,
      name: target.customName || target.clinicName || (target.workspaceType === 'private' ? 'Mi Consultorio Privado' : 'Clínica Institucional'),
      clinicId: target.clinicId || null,
      roleInWorkplace: target.roleInWorkplace || undefined,
      canManageFinances: target.canManageFinances,
      canManageSchedule: target.canManageSchedule,
      subscriptionLocked: target.subscriptionLocked,
      lockReason: target.lockReason,
    };

    setActiveWorkspace(newActive);
    localStorage.setItem('activeWorkspace', JSON.stringify(newActive));

    // Update session token with current workspace clinicId
    await setAuthToken(user.id, user.email, user.role, user.name, newActive.clinicId || undefined);

    if (target.subscriptionLocked && target.workspaceType === 'private') {
      toast({
        variant: 'destructive',
        title: 'Consultorio Privado Inactivo',
        description: 'Tu mensualidad de consultorio privado no está activa. Reporta tu pago en Suscripción para habilitarlo.',
      });
      router.push('/doctor/dashboard?view=subscription');
      return;
    }

    toast({
      title: 'Espacio de trabajo cambiado',
      description: `Ahora estás atendiendo en: ${newActive.name}`,
    });
  };

  const fetchUserFromStorage = useCallback(async () => {
    setLoading(true);
    try {
      let targetEmail: string | null = null;
      let existingParsed: any = null;

      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        existingParsed = JSON.parse(storedUser);
        targetEmail = existingParsed.email;
      } else {
        // Verificar si hay una sesión activa de Supabase OAuth
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            if (
              error.message?.includes('Refresh Token') ||
              error.message?.includes('refresh_token') ||
              error.name === 'AuthApiError'
            ) {
              console.warn('[Auth] Token de Supabase inválido, limpiando sesión local...');
              await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
              clearStaleSupabaseAuth();
            }
          } else if (data?.session?.user?.email) {
            targetEmail = data.session.user.email;
          }
        } catch (err: any) {
          if (err?.message?.includes('Refresh Token') || err?.name === 'AuthApiError') {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            clearStaleSupabaseAuth();
          }
        }
      }

      if (targetEmail) {
        const freshUser = await supabaseService.findUserByEmail(targetEmail);
        if (freshUser) {
          const builtUser = buildUserFromData(freshUser);
          if (builtUser.role === 'doctor') {
            const { list, active } = await loadDoctorWorkspaces(builtUser.id);
            builtUser.workspaces = list;
            builtUser.activeWorkspace = active;
          }
          setUser(builtUser);
          localStorage.setItem('user', JSON.stringify(builtUser));

          // 🔐 Sincronizar cookie auth-token para llamadas API seguras
          setAuthToken(
            builtUser.id,
            builtUser.email,
            builtUser.role,
            builtUser.name,
            builtUser.activeWorkspace?.clinicId || builtUser.clinicId
          ).catch((err) => console.error('[Auth] Error sync auth token:', err));
        } else if (existingParsed?.role === 'admin') {
          setUser(existingParsed); // Mantener sesión admin
          setAuthToken(existingParsed.id, existingParsed.email, existingParsed.role, existingParsed.name).catch(() => {});
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
  }, [loadDoctorWorkspaces]);

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

    // Verificar contraseña (soporta tanto texto plano como encriptada para migración y MANAGED_BY_AUTH)
    let passwordValid = false;
    if (userToAuth.password === 'MANAGED_BY_AUTH') {
      const { data: authSignIn, error: authSignInError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password: inputPassword,
      });
      passwordValid = !authSignInError && !!authSignIn?.user;
    } else if (isPasswordHashed(userToAuth.password)) {
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

    // Cargar espacios de trabajo si es médico
    if (loggedInUser.role === 'doctor') {
      const { list, active } = await loadDoctorWorkspaces(loggedInUser.id);
      loggedInUser.workspaces = list;
      loggedInUser.activeWorkspace = active;

      // Si tiene más de un espacio, abrir el selector modal
      if (list.length > 1) {
        setShowWorkspaceModal(true);
      }
    }

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
      loggedInUser.activeWorkspace?.clinicId || loggedInUser.clinicId
    );

    if (loggedInUser && ['patient', 'doctor', 'seller'].includes(loggedInUser.role)) {
      clearOtherUsersNotifications(loggedInUser.id, loggedInUser.role as 'patient' | 'doctor' | 'seller');
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

    const consumePatientReturnUrl = (): string | null => {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('redirect') || params.get('next');
      const fromStorage = sessionStorage.getItem('returnToDoctorUrl') || localStorage.getItem('returnToDoctorUrl');

      let candidate = fromQuery || fromStorage || null;
      if (!candidate) {
        const pendingStr = sessionStorage.getItem('pendingAppointment');
        if (pendingStr) {
          try {
            const parsed = JSON.parse(pendingStr);
            if (parsed?.doctorId) {
              candidate = `/doctors/${parsed.doctorId}?restoreAppointment=true`;
            }
          } catch {}
        }
      }

      sessionStorage.removeItem('returnToDoctorUrl');
      localStorage.removeItem('returnToDoctorUrl');

      if (candidate && candidate.startsWith('/doctors/')) {
        if (sessionStorage.getItem('pendingAppointment') && !candidate.includes('restoreAppointment=true')) {
          return `${candidate}${candidate.includes('?') ? '&' : '?'}restoreAppointment=true`;
        }
        return candidate;
      }
      return null;
    };

    switch (loggedInUser.role) {
      case 'admin': router.push('/admin/dashboard'); break;
      case 'doctor': router.push('/doctor/dashboard'); break;
      case 'seller': router.push('/seller/dashboard?view=referrals'); break;
      case 'patient': {
        const returnToDoctor = consumePatientReturnUrl();
        router.push(returnToDoctor || '/dashboard');
        break;
      }
      case 'clinic': router.push('/clinic/dashboard'); break;
      case 'secretary': 
        if (loggedInUser.laboratoryId) {
          router.push('/laboratory/dashboard');
        } else {
          router.push('/clinic/dashboard');
        }
        break;
      case 'pharmacy': router.push('/pharmacy/dashboard'); break;
      case 'laboratory': router.push('/laboratory/dashboard'); break;
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    location?: { country?: string; state?: string; city?: string; cedula?: string; phone?: string }
  ) => {
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
      birthDate: null,
      gender: null,
      profileImage: null,
      cedula: location?.cedula || null,
      phone: location?.phone || null,
      country: normalizeCountryCode(location?.country || 'VE'),
      state: location?.state || null,
      city: location?.city || null,
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

      // 🔐 Establecer cookie de sesión para API routes
      await setAuthToken(newUser.id, newUser.email, newUser.role, newUser.name);

      // Registrar registro exitoso
      logAuditEvent({
        userId: newUser.id,
        email: newUser.email,
        role: 'patient',
        action: AuditActions.REGISTER_SUCCESS,
        result: 'success',
        message: `Nuevo paciente registrado: ${newUser.name}`
      });

      let returnToDoctor: string | null = null;
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const fromQuery = params.get('redirect') || params.get('next');
        const fromStorage = sessionStorage.getItem('returnToDoctorUrl') || localStorage.getItem('returnToDoctorUrl');
        const candidate = fromQuery || fromStorage || null;
        sessionStorage.removeItem('returnToDoctorUrl');
        localStorage.removeItem('returnToDoctorUrl');
        if (candidate && candidate.startsWith('/doctors/')) {
          returnToDoctor = sessionStorage.getItem('pendingAppointment') && !candidate.includes('restoreAppointment=true')
            ? `${candidate}${candidate.includes('?') ? '&' : '?'}restoreAppointment=true`
            : candidate;
        }
      }

      router.push(returnToDoctor || '/dashboard');
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
      name, email: normalizedEmail,
      profession: doctorData.profession || 'Médico',
      specialty,
      hasMedicalRecord: doctorData.hasMedicalRecord ?? null,
      hasPrescription: doctorData.hasPrescription ?? null,
      country: normalizeCountryCode(doctorData.country || 'VE'),
      state: doctorData.state || 'Monagas',
      city, address: address || '', password: hashedPassword,
      sellerId: doctorData.sellerId || null, cedula: dni, documentType, sector: sector || '', rating: 0, reviewCount: 0,
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
      phone: phone, whatsapp: phone, lat: doctorData.lat || 0, lng: doctorData.lng || 0,
      joinDate: joinDateArgentina,
      subscriptionStatus: 'active', nextPaymentDate: paymentDateArgentina,
      coupons: [], expenses: [],
      medicalLicense: medicalLicense,
      verificationStatus: 'pending',
    };

    const newDoctorId = await supabaseService.addDoctor(newDoctorData);
    // Fetch actualizado desde Supabase
    const freshUser = await supabaseService.findUserByEmail(normalizedEmail);
    if (freshUser) {
      const loggedInUser = buildUserFromData({ ...freshUser, id: newDoctorId, role: 'doctor', onboardingCompleted: true });
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      await setAuthToken(loggedInUser.id, loggedInUser.email, 'doctor', loggedInUser.name);
      router.push('/doctor/dashboard');
    }
  };

  const registerClinic = async (clinicData: ClinicRegistrationData) => {
    const {
      name,
      email,
      password,
      phone,
      rif,
      country,
      state,
      city,
      billingCycle,
      billingMonths,
      subscriptionFee,
      discountPercentage,
      freeMonths,
      plan,
      sector,
      address,
    } = clinicData;
    const normalizedEmail = email.toLowerCase().trim();

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
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

    const joinDateArgentina = getCurrentDateInArgentina();
    const paymentDateArgentina = getPaymentDateInArgentina(new Date());
    const resolvedMonths = billingMonths || (billingCycle === 'annual' ? 12 : 1);

    const newClinicData: Omit<Clinic, 'id' | 'createdAt'> = {
      name,
      adminEmail: normalizedEmail,
      email: normalizedEmail,
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      password: hashedPassword,
      phone,
      whatsapp: phone,
      rif: rif || null,
      country: country || 'VE',
      state: state || '',
      city: city || '',
      sector: sector || '',
      address: address || '',
      billingCycle: billingCycle || (resolvedMonths === 12 ? 'annual' : 'monthly'),
      billingMonths: resolvedMonths,
      subscriptionFee: subscriptionFee || 0,
      discountPercentage: discountPercentage || 0,
      freeMonths: freeMonths ?? 1,
      plan: plan || 'integral',
      status: 'active',
      verificationStatus: 'pending',
      subscriptionStatus: 'active',
      lastPaymentDate: joinDateArgentina,
      nextPaymentDate: paymentDateArgentina,
    } as any;

    await supabaseService.addClinic({
      ...newClinicData,
      password: hashedPassword,
      lat: clinicData.lat || null,
      lng: clinicData.lng || null,
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

  const loginWithGoogle = async (nextPath?: string, role?: string) => {
    try {
      if (typeof window !== 'undefined') {
        if (role) {
          sessionStorage.setItem('suma_intended_role', role);
          localStorage.setItem('suma_intended_role', role);
        } else {
          sessionStorage.removeItem('suma_intended_role');
          localStorage.removeItem('suma_intended_role');
        }
      }

      const redirectUrl = new URL('/auth/callback', window.location.origin);
      const effectiveNextPath = nextPath || (() => {
        if (typeof window === 'undefined') return undefined;
        const params = new URLSearchParams(window.location.search);
        return params.get('redirect') || params.get('next') || sessionStorage.getItem('returnToDoctorUrl') || localStorage.getItem('returnToDoctorUrl') || undefined;
      })();
      if (effectiveNextPath) {
        redirectUrl.searchParams.set('next', effectiveNextPath);
      }
      if (role) {
        redirectUrl.searchParams.set('role', role);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Error iniciando sesión con Google:', err);
      toast({
        variant: 'destructive',
        title: 'Error con Google',
        description: err?.message || 'No se pudo conectar con el servicio de Google.',
      });
      throw err;
    }
  };

  const logout = async () => {
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

    // 🔐 Limpiar cookie HTTP-only de autenticación
    await clearAuthToken();

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    clearStaleSupabaseAuth();

    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setShowWorkspaceModal(false);
    localStorage.removeItem('user');
    localStorage.removeItem('activeWorkspace');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('activeWorkspace');
    router.push('/');
  };

  const updateUser = async (data: Partial<Patient | Seller | Doctor>) => {
    if (!user || !user.id) return;

    try {
      if (user.role === 'patient') {
        await supabaseService.updatePatient(user.id, data as Partial<Patient>);
      } else if (user.role === 'seller') {
        await supabaseService.updateSeller(user.id, data as Partial<Seller>);
      } else if (user.role === 'doctor') {
        await supabaseService.updateDoctor(user.id, data as Partial<Doctor>);
      }
    } catch (err) {
      console.error('Error syncing updateUser to Supabase:', err);
    }

    const updatedUser = { ...user, ...data };
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
      try {
        await fetch('/api/revoke-tokens', { method: 'POST', headers: { 'authorization': `Bearer ${localStorage.getItem('token') || ''}` } });
      } catch {
        // No bloquear
      }
      return { success: true, message: 'Contraseña actualizada exitosamente.' };
    } catch {
      return { success: false, message: 'Error al actualizar la contraseña.' };
    }
  };

  const toggleFavoriteDoctor = (doctorId: string) => {
    if (!user || user.role !== 'patient') return;
    const currentFavorites = user.favoriteDoctorIds || [];
    const updatedFavorites = currentFavorites.includes(doctorId)
      ? currentFavorites.filter(id => id !== doctorId)
      : [...currentFavorites, doctorId];
    updateUser({ favoriteDoctorIds: updatedFavorites });
  };

  const sendPasswordReset = async (email: string) => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() }),
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
    activeWorkspace,
    workspaces,
    showWorkspaceModal,
    setShowWorkspaceModal,
    switchWorkspace,
    refreshWorkspaces,
    login,
    register,
    registerDoctor,
    logout,
    updateUser,
    changePassword,
    toggleFavoriteDoctor,
    sendPasswordReset,
    registerClinic,
    loginWithGoogle,
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
    // Retornar un estado seguro si el provider no está disponible (ej. durante SSR o hidratación inicial)
    return {
      user: null as any,
      loading: true,
      activeWorkspace: null,
      workspaces: [],
      showWorkspaceModal: false,
      setShowWorkspaceModal: () => { },
      switchWorkspace: async () => { },
      refreshWorkspaces: async () => { },
      login: async () => { },
      register: async () => { },
      registerDoctor: async () => { },
      registerClinic: async () => { },
      logout: () => { },
      updateUser: () => { },
      changePassword: async () => ({ success: false, message: 'Auth not ready' }),
      toggleFavoriteDoctor: () => { },
      sendPasswordReset: async () => { },
      loginWithGoogle: async () => { },
    } as AuthContextType;
  }
  return context;
}

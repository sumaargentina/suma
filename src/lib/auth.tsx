
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as firestoreService from './firestoreService';
import type { Patient, Doctor, Seller } from './types';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDateInVenezuela, getPaymentDateInVenezuela } from './utils';
import { hashPassword, verifyPassword, isPasswordHashed } from './password-utils';
import { clearUserNotifications } from './clear-notifications';

// The User type represents the logged-in user and must have all Patient properties for consistency across the app.
interface User extends Patient {
  role: 'patient' | 'doctor' | 'seller' | 'admin';
  referralCode?: string;
}

interface DoctorRegistrationData {
  name: string;
  email: string;
  password: string;
  specialty: string;
  city: string;
  address: string;
  slotDuration: number;
  consultationFee: number;
}

interface AuthContextType {
  user: User | null | undefined; // undefined means still loading
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  registerDoctor: (doctorData: DoctorRegistrationData) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<Patient | Seller>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
  toggleFavoriteDoctor: (doctorId: string) => void;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const buildUserFromData = (userData: (Doctor | Seller | Patient) & { role: 'doctor' | 'seller' | 'patient' }): User => {
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
        const freshUser = await firestoreService.findUserByEmail(parsedUser.email);
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
    
    // Nuevo: Login de admin desde Firestore
    const adminUser = await firestoreService.findAdminByEmail(lowerEmail) as {
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
        toast({ variant: 'destructive', title: 'Error de Autenticación', description: 'La contraseña es incorrecta.' });
        return;
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
        router.push('/admin/dashboard');
        return;
    }

    // Handle other user roles
    const userToAuth = await firestoreService.findUserByEmail(lowerEmail);

    if (!userToAuth) {
      toast({ variant: 'destructive', title: 'Error de Autenticación', description: 'El usuario no existe.' });
      return;
    }

    if (!userToAuth.password) {
      toast({ variant: 'destructive', title: 'Error de Autenticación', description: 'La contraseña es incorrecta.' });
      return;
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
      toast({ variant: 'destructive', title: 'Error de Autenticación', description: 'La contraseña es incorrecta.' });
      return;
    }

    const loggedInUser = buildUserFromData(userToAuth);
    // Eliminar password antes de guardar en localStorage
    setUser(loggedInUser);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _2, ...loggedInUserNoPassword } = loggedInUser;
    localStorage.setItem('user', JSON.stringify(loggedInUserNoPassword));

    if (loggedInUser && ['patient', 'doctor', 'seller'].includes(loggedInUser.role)) {
      clearUserNotifications(loggedInUser.id, loggedInUser.role as 'patient' | 'doctor' | 'seller');
    }

    switch(loggedInUser.role) {
      case 'admin': router.push('/admin/dashboard'); break;
      case 'doctor': router.push('/doctor/dashboard'); break;
      case 'seller': router.push('/seller/dashboard?view=referrals'); break;
      case 'patient': router.push('/dashboard'); break;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const lowerEmail = email.toLowerCase();
    const existingUser = await firestoreService.findUserByEmail(lowerEmail);
    if (existingUser) {
      toast({ variant: "destructive", title: "Error de Registro", description: "Este correo electrónico ya está en uso." });
      return;
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
    await firestoreService.addPatient(newPatientData);
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
    const freshUser = await firestoreService.findUserByEmail(lowerEmail);
    if (freshUser) {
      // Forzar profileCompleted a false si no existe
      const newUser: User = buildUserFromData({ ...freshUser, profileCompleted: false });
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      router.push('/dashboard');
    }
  };

  const registerDoctor = async (doctorData: DoctorRegistrationData) => {
    const { email, password, name, specialty, city, address, slotDuration, consultationFee } = doctorData;
    
    const normalizedEmail = email.toLowerCase();
    const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
    if (existingUser) {
        toast({ variant: "destructive", title: "Error de Registro", description: "Este correo electrónico ya está en uso." });
        return;
    }
    
    // Encriptar contraseña
    const hashedPassword = await hashPassword(password);
    
    const joinDate = new Date();
    const joinDateVenezuela = getCurrentDateInVenezuela();
    const paymentDateVenezuela = getPaymentDateInVenezuela(joinDate);

    const newDoctorData: Omit<Doctor, 'id'> = {
        name, email: normalizedEmail, specialty, city, address, password: hashedPassword,
        sellerId: null, cedula: '', sector: '', rating: 0, reviewCount: 0,
        profileImage: 'https://placehold.co/400x400.png',
        bannerImage: 'https://placehold.co/1200x400.png',
        aiHint: 'doctor portrait', description: 'Especialista comprometido con la salud y el bienestar de mis pacientes.', services: [], bankDetails: [],
        slotDuration: slotDuration, consultationFee,
        schedule: {
            monday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
            tuesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
            wednesday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
            thursday: { active: true, slots: [{ start: "09:00", end: "17:00" }] },
            friday: { active: true, slots: [{ start: "09:00", end: "13:00" }] },
            saturday: { active: false, slots: [] },
            sunday: { active: false, slots: [] },
        },
        status: 'active', lastPaymentDate: '',
        whatsapp: '', lat: 0, lng: 0,
        joinDate: joinDateVenezuela,
        subscriptionStatus: 'active', nextPaymentDate: paymentDateVenezuela,
        coupons: [], expenses: [],
    };
    
    const newDoctorId = await firestoreService.addDoctor(newDoctorData);
    // Fetch actualizado desde Firestore
    const freshUser = await firestoreService.findUserByEmail(normalizedEmail);
    if (freshUser) {
      const loggedInUser = buildUserFromData({ ...freshUser, id: newDoctorId, role: 'doctor' });
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      router.push('/doctor/dashboard');
    }
};

  const logout = () => {
    if (user && ['patient', 'doctor', 'seller'].includes(user.role)) {
      clearUserNotifications(user.id, user.role as 'patient' | 'doctor' | 'seller');
    }
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user'); // Limpiar también sessionStorage
    // Limpiar cualquier cookie de sesión si las hubiera
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    router.push('/');
  };

  const updateUser = async (data: Partial<Patient | Seller>) => {
    if (!user || !user.id) return;
    
    console.log('Actualizando usuario con datos:', data);
    console.log('Usuario actual:', user);
    
    if (user.role === 'patient') {
      await firestoreService.updatePatient(user.id, data as Partial<Patient>);
    } else if (user.role === 'seller') {
      await firestoreService.updateSeller(user.id, data as Partial<Seller>);
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
        updatePromise = firestoreService.updatePatient(user.id, { password: hashedNewPassword });
      } else if (user.role === 'doctor') {
        updatePromise = firestoreService.updateDoctor(user.id, { password: hashedNewPassword });
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
    sendPasswordReset
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

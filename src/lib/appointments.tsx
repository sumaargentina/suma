
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import * as supabaseService from './supabaseService';
import type { Appointment } from './types';
import { useAuth } from './auth';

interface AppointmentContextType {
  appointments: Appointment[];
  addAppointment: (newAppointmentData: Omit<Appointment, 'id' | 'patientId' | 'patientName'>) => Promise<void>;
  updateAppointmentConfirmation: (appointmentId: string, status: 'Confirmada' | 'Cancelada') => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

const AppointmentContext = createContext<AppointmentContextType | undefined>(undefined);

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const { user } = useAuth();

  const fetchAppointments = useCallback(async () => {
    if (user?.role === 'patient' && user.id) {
      const patientAppointments = await supabaseService.getPatientAppointments(user.id);
      setAppointments(patientAppointments);
    } else {
      setAppointments([]);
    }
  }, [user]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Actualización automática cada 30 segundos para pacientes
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;

    if (user?.role === 'patient' && user.id) {
      interval = setInterval(fetchAppointments, 30000); // cada 30 segundos
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, fetchAppointments]);

  const addAppointment = useCallback(async (newAppointmentData: Omit<Appointment, 'id' | 'patientId' | 'patientName'>) => {
    if (!user || user.role !== 'patient') return;

    const newAppointment: Omit<Appointment, 'id'> = {
      ...newAppointmentData,
      patientId: user.id,
      patientName: user.name,
    };

    await supabaseService.addAppointment(newAppointment);
    // Enviar correo de confirmación al paciente
    try {
      const safeEmail = user.email || 'sin-correo@ejemplo.com';
      const safeName = user.name || 'Paciente';
      const safeDate = newAppointment.date || '';
      const safeTime = newAppointment.time || '';
      const safeDoctor = newAppointment.doctorName || 'Médico';
      const safeSpecialty = (newAppointment as { doctorSpecialty?: string }).doctorSpecialty || 'General';
      const safeConsultationFee = newAppointment.consultationFee ?? 0;
      const safeServices = newAppointment.services || [];
      const safeTotalPrice = newAppointment.totalPrice ?? 0;
      const safePaymentMethod = newAppointment.paymentMethod || 'efectivo';
      const safeDiscountAmount = newAppointment.discountAmount ?? 0;
      const safeAppliedCoupon = newAppointment.appliedCoupon || '';
      const safeConsultationType = (newAppointment as any).consultationType || 'presencial';
      const safeAddress = newAppointment.doctorAddress || '';
      // Si es cita para familiar, el patientName es el nombre del familiar
      const safeFamilyMemberName = (newAppointment as any).familyMemberId ? newAppointment.patientName : '';

      console.log('Datos para correo de cita:', {
        email: safeEmail,
        name: safeName,
        date: safeDate,
        time: safeTime,
        doctor: safeDoctor,
        specialty: safeSpecialty,
        consultationFee: safeConsultationFee,
        services: safeServices,
        totalPrice: safeTotalPrice,
        paymentMethod: safePaymentMethod,
        discountAmount: safeDiscountAmount,
        appliedCoupon: safeAppliedCoupon,
        consultationType: safeConsultationType,
        address: safeAddress,
        familyMemberName: safeFamilyMemberName,
      });

      console.log('📧 Enviando correo de confirmación a:', safeEmail);
      const emailResponse = await fetch('/api/send-appointment-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: safeEmail,
          name: safeName,
          date: safeDate,
          time: safeTime,
          doctor: safeDoctor,
          specialty: safeSpecialty,
          consultationFee: safeConsultationFee,
          services: safeServices,
          totalPrice: safeTotalPrice,
          paymentMethod: safePaymentMethod,
          discountAmount: safeDiscountAmount,
          appliedCoupon: safeAppliedCoupon,
          consultationType: safeConsultationType,
          address: safeAddress,
          familyMemberName: safeFamilyMemberName,
        }),
      });

      if (emailResponse.ok) {
        console.log('✅ Correo de confirmación enviado exitosamente');
      } else {
        const errorData = await emailResponse.json().catch(() => ({}));
        console.error('❌ Error al enviar correo:', emailResponse.status, errorData);
      }
    } catch (e) {
      // No bloquear el flujo si falla el correo
      console.error('❌ Error enviando correo de cita:', e);
    }
    await fetchAppointments();
  }, [user, fetchAppointments]);

  const updateAppointmentConfirmation = useCallback(async (appointmentId: string, status: 'Confirmada' | 'Cancelada') => {
    await supabaseService.updateAppointment(appointmentId, { patientConfirmationStatus: status });
    await fetchAppointments();
  }, [fetchAppointments]);

  const refreshAppointments = useCallback(async () => {
    await fetchAppointments();
  }, [fetchAppointments]);

  const value = { appointments, addAppointment, updateAppointmentConfirmation, refreshAppointments };

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, ClinicNotification } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdateDoctorAppointmentsAsRead, getClinicAppointments } from './supabaseService';
import { getCurrentDateTimeInArgentina } from './utils';
import { supabase } from './supabase';

interface ClinicNotificationContextType {
  clinicNotifications: ClinicNotification[];
  clinicUnreadCount: number;
  checkAndSetClinicNotifications: (appointments: Appointment[]) => void;
  markClinicNotificationAsRead: (id: string) => void;
  markClinicNotificationsAsRead: () => void;
  clearReadClinicNotifications: () => void;
  clearAllClinicNotifications: () => void;
}

const ClinicNotificationContext = createContext<ClinicNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-clinic-notifications-${userId}`;
const MAX_NOTIFICATIONS = 25;

// Filtrar notificaciones obsoletas (más de 14 días) y limitar a MAX_NOTIFICATIONS
const filterValidClinicNotifications = (list: ClinicNotification[]): ClinicNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 14) {
      return false;
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function ClinicNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clinicNotifications, setClinicNotifications] = useState<ClinicNotification[]>([]);
  const [clinicUnreadCount, setClinicUnreadCount] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Helper para identificar rol de clínica o secretaria
  const isClinicUser = user?.role === 'clinic' || user?.role === 'secretary';
  const effectiveClinicId = user?.role === 'secretary' ? ((user as any).clinicId || user.id) : (user?.role === 'clinic' ? user.id : null);

  useEffect(() => {
    if (user?.id && isClinicUser) {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as ClinicNotification[];
          const valid = filterValidClinicNotifications(parsed);
          setClinicNotifications(valid);
          setClinicUnreadCount(valid.filter(n => !n.read).length);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        } else {
          setClinicNotifications([]);
          setClinicUnreadCount(0);
        }
      } catch (e) {
        console.error("Failed to load clinic notifications from localStorage", e);
        setClinicNotifications([]);
        setClinicUnreadCount(0);
      }
    } else {
      setClinicNotifications([]);
      setClinicUnreadCount(0);
    }
  }, [user, isClinicUser]);

  // Limpiar notificaciones de otros usuarios cuando cambie el usuario
  useEffect(() => {
    if (user?.id && isClinicUser) {
      const allKeys = Object.keys(localStorage);
      const clinicNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-clinic-notifications-') &&
        key !== getNotificationStorageKey(user.id)
      );
      clinicNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user, isClinicUser]);

  const addNotification = useCallback((notification: ClinicNotification) => {
    if (!user?.id || !isClinicUser) return;

    const storageKey = getNotificationStorageKey(user.id);

    setClinicNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      const updated = filterValidClinicNotifications([notification, ...prev]).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setClinicUnreadCount(prev => prev + 1);
  }, [user, isClinicUser]);

  const checkAndSetClinicNotifications = useCallback((
    appointments: Appointment[]
  ) => {
    if (!user?.id || !isClinicUser) return;

    const storageKey = getNotificationStorageKey(user.id);
    const newNotificationsMap = new Map<string, ClinicNotification>();
    const now = getCurrentDateTimeInArgentina();

    const existingIds = new Set(clinicNotifications.map(n => n.id));

    // --- Generar notificaciones ---
    appointments.forEach(appt => {
      // 1. Nueva Cita
      if (appt.readByDoctor === false) {
        const id = `new-appt-${appt.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_appointment',
            title: '¡Nueva Cita en Clínica!',
            description: `Paciente: ${appt.patientName}. Fecha: ${appt.date} ${appt.time || ''}.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?tab=agenda`
          });
        }
      }

      // 2. Verificación de pago por transferencia
      if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
        const id = `verify-${appt.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'payment_verification',
            title: 'Verificación de Pago',
            description: `Pago pendiente para la cita de ${appt.patientName}.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?tab=agenda`
          });
        }
      }

      // 3. Cambios de estado (confirmada o cancelada)
      if (appt.patientConfirmationStatus === 'Confirmada' || appt.patientConfirmationStatus === 'Cancelada') {
        const id = `confirm-${appt.id}-${appt.patientConfirmationStatus}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: appt.patientConfirmationStatus === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
            title: `Cita ${appt.patientConfirmationStatus}`,
            description: `${appt.patientName} ha ${appt.patientConfirmationStatus.toLowerCase()} su cita.`,
            date: `${appt.date}T${appt.time || '00:00'}`,
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?tab=agenda`
          });
        }
      }
    });

    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const filteredExisting = filterValidClinicNotifications(clinicNotifications);
      const updatedNotifications = filterValidClinicNotifications([...uniqueNewNotifications, ...filteredExisting])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setClinicNotifications(updatedNotifications);
      setClinicUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, [clinicNotifications, user, isClinicUser]);

  // Marcar una sola notificación como leída
  const markClinicNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || !isClinicUser) return;

    const storageKey = getNotificationStorageKey(user.id);
    setClinicNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setClinicUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    if (id.startsWith('new-appt-')) {
      const apptId = id.replace('new-appt-', '');
      batchUpdateDoctorAppointmentsAsRead([apptId]).catch(console.error);
    }
  }, [user, isClinicUser]);

  // Marcar todas como leídas
  const markClinicNotificationsAsRead = useCallback(async () => {
    if (!user?.id || !isClinicUser || clinicUnreadCount === 0) return;

    const storageKey = getNotificationStorageKey(user.id);
    const updated = clinicNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setClinicNotifications(updated);
    setClinicUnreadCount(0);

    const unreadNotifications = clinicNotifications.filter(n => !n.read);
    const appointmentIdsToUpdate = unreadNotifications
      .filter(n => n.type === 'new_appointment')
      .map(n => n.id.replace('new-appt-', ''));

    if (appointmentIdsToUpdate.length > 0) {
      try {
        await batchUpdateDoctorAppointmentsAsRead(appointmentIdsToUpdate);
      } catch (error) {
        console.error("Error updating backend read status", error);
      }
    }
  }, [clinicNotifications, user, clinicUnreadCount, isClinicUser]);

  // Limpiar notificaciones leídas
  const clearReadClinicNotifications = useCallback(() => {
    if (!user?.id || !isClinicUser) return;
    const storageKey = getNotificationStorageKey(user.id);
    const remaining = clinicNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setClinicNotifications(remaining);
    setClinicUnreadCount(remaining.length);
  }, [user, isClinicUser, clinicNotifications]);

  // Limpiar todas las notificaciones
  const clearAllClinicNotifications = useCallback(() => {
    if (!user?.id || !isClinicUser) return;
    const storageKey = getNotificationStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setClinicNotifications([]);
    setClinicUnreadCount(0);
  }, [user, isClinicUser]);

  // --- Supabase Realtime para Clínicas y Secretarias ---
  useEffect(() => {
    if (!user?.id || !isClinicUser || !effectiveClinicId) {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const now = getCurrentDateTimeInArgentina();

    const channel = supabase
      .channel(`clinic-notifications-${effectiveClinicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${effectiveClinicId}`
        },
        (payload) => {
          const appt = payload.new as Record<string, unknown>;
          const notification: ClinicNotification = {
            id: `new-appt-${appt.id}`,
            type: 'new_appointment',
            title: '¡Nueva Cita en Clínica!',
            description: `Paciente: ${appt.patient_name || 'Nuevo paciente'}. Fecha: ${appt.date || ''}.`,
            date: (appt.date as string) || now.toISOString(),
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?tab=agenda`
          };
          addNotification(notification);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${effectiveClinicId}`
        },
        (payload) => {
          const appt = payload.new as Record<string, unknown>;
          const oldAppt = payload.old as Record<string, unknown>;

          if (appt.patient_confirmation_status !== oldAppt.patient_confirmation_status) {
            const status = appt.patient_confirmation_status as string;
            if (status === 'Confirmada' || status === 'Cancelada') {
              const notification: ClinicNotification = {
                id: `confirm-${appt.id}-${status}`,
                type: status === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
                title: `Cita ${status}`,
                description: `${appt.patient_name || 'El paciente'} ha ${status.toLowerCase()} su cita.`,
                date: `${appt.date}T${appt.time || '00:00'}` || now.toISOString(),
                createdAt: now.toISOString(),
                read: false,
                link: `/clinic/dashboard?tab=agenda`
              };
              addNotification(notification);
            }
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Polling backup cada 45 segundos
    const fetchInitial = async () => {
      try {
        const appointments = await getClinicAppointments(effectiveClinicId);
        checkAndSetClinicNotifications(appointments);
      } catch (error) {
        console.error("Error fetching clinic appointments for notifications", error);
      }
    };

    fetchInitial();
    const interval = setInterval(fetchInitial, 45000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, isClinicUser, effectiveClinicId, addNotification, checkAndSetClinicNotifications]);

  const value = {
    clinicNotifications,
    clinicUnreadCount,
    checkAndSetClinicNotifications,
    markClinicNotificationAsRead,
    markClinicNotificationsAsRead,
    clearReadClinicNotifications,
    clearAllClinicNotifications
  };

  return (
    <ClinicNotificationContext.Provider value={value}>
      {children}
    </ClinicNotificationContext.Provider>
  );
}

export function useClinicNotifications() {
  const context = useContext(ClinicNotificationContext);
  if (context === undefined) {
    throw new Error('useClinicNotifications must be used within a ClinicNotificationProvider');
  }
  return context;
}

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, PatientNotification } from './types';
import { differenceInHours, differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdatePatientAppointmentsAsRead } from './supabaseService';
import { getCurrentDateTimeInArgentina } from './utils';
import { supabase } from './supabase';

interface NotificationContextType {
  notifications: PatientNotification[];
  unreadCount: number;
  checkAndSetNotifications: (appointments: Appointment[]) => void;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearReadNotifications: () => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-patient-notifications-${userId}`;
const MAX_NOTIFICATIONS = 25;

// Filtra notificaciones expiradas (recordatorios pasados o de más de 14 días)
const filterValidNotifications = (list: PatientNotification[]): PatientNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    // Descartar notificaciones con más de 14 días de creadas
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 14) {
      return false;
    }
    // Descartar recordatorios de citas que ya pasaron
    if (n.type === 'reminder' && n.date) {
      const apptDate = new Date(n.date);
      if (apptDate < now) {
        return false;
      }
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as PatientNotification[];
          const valid = filterValidNotifications(parsed);
          setNotifications(valid);
          setUnreadCount(valid.filter(n => !n.read).length);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      } catch (e) {
        console.error("Failed to load notifications from localStorage", e);
        setNotifications([]);
        setUnreadCount(0);
      }
    } else if (!user) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Limpiar notificaciones de otros usuarios en el almacenamiento local
  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      const allKeys = Object.keys(localStorage);
      const patientNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-patient-notifications-') &&
        key !== getNotificationStorageKey(user.id)
      );
      patientNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);

  const addNotification = useCallback((notification: PatientNotification) => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);

    setNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      const updated = filterValidNotifications([notification, ...prev]);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setUnreadCount(prev => prev + 1);
  }, [user]);

  const checkAndSetNotifications = useCallback((appointments: Appointment[]) => {
    if (!user?.id || user.role !== 'patient') return;

    const storageKey = getNotificationStorageKey(user.id);
    const newNotificationsMap = new Map<string, PatientNotification>();
    const now = getCurrentDateTimeInArgentina();

    const existingIds = new Set(notifications.map(n => n.id));

    appointments.forEach(appt => {
      const apptDateTime = new Date(`${appt.date}T${appt.time || '00:00'}`);
      const hoursUntil = differenceInHours(apptDateTime, now);

      // --- Recordatorios sólo si la cita aún es futura ---
      if (apptDateTime > now) {
        const createReminder = (timeframe: '24h' | '3h') => {
          const id = `reminder-${appt.id}-${timeframe}`;
          if (existingIds.has(id)) return;

          const title = timeframe === '24h'
            ? `Recordatorio: Cita Mañana`
            : `Recordatorio: Cita Pronto`;

          const description = `Tu cita con ${appt.doctorName} es en aprox. ${timeframe === '24h' ? '24 horas' : '3 horas'}.`;

          newNotificationsMap.set(id, {
            id,
            type: 'reminder',
            appointmentId: appt.id,
            title,
            description,
            date: apptDateTime.toISOString(),
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        };

        if (hoursUntil > 0 && hoursUntil <= 24) createReminder('24h');
        if (hoursUntil > 0 && hoursUntil <= 3) createReminder('3h');
      }

      // --- Pago Aprobado ---
      if (appt.paymentStatus === 'Pagado') {
        const id = `payment-approved-${appt.id}`;
        if (!existingIds.has(id)) {
          const eventDate = `${appt.date}T${appt.time || '00:00'}`;
          newNotificationsMap.set(id, {
            id,
            type: 'payment_approved',
            appointmentId: appt.id,
            title: '¡Pago Aprobado!',
            description: `El Dr. ${appt.doctorName} ha confirmado tu pago para la cita.`,
            date: eventDate,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }

      // --- Nuevo Mensaje del Doctor ---
      const lastMessage = appt.messages?.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (lastMessage?.sender === 'doctor') {
        const id = `new-message-${lastMessage.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_message',
            appointmentId: appt.id,
            title: `Nuevo Mensaje de ${appt.doctorName}`,
            description: lastMessage.text.substring(0, 60) + (lastMessage.text.length > 60 ? '...' : ''),
            date: lastMessage.timestamp,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }

      // --- Registro Clínico / Receta Añadida ---
      if (appt.attendance === 'Atendido' && (appt.clinicalNotes || appt.prescription)) {
        const id = `record-added-${appt.id}`;
        if (!existingIds.has(id)) {
          const eventDate = `${appt.date}T${appt.time || '00:00'}`;
          newNotificationsMap.set(id, {
            id,
            type: 'record_added',
            appointmentId: appt.id,
            title: `Resumen de Cita Disponible`,
            description: `El Dr. ${appt.doctorName} ha añadido notas o récipe a tu consulta.`,
            date: eventDate,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }

      // --- Asistencia Marcada ---
      if (appt.attendance && appt.attendance !== 'Pendiente' && appt.readByPatient === false) {
        const id = `attendance-marked-${appt.id}`;
        if (!existingIds.has(id)) {
          const eventDate = `${appt.date}T${appt.time || '00:00'}`;
          newNotificationsMap.set(id, {
            id,
            type: 'attendance_marked',
            appointmentId: appt.id,
            title: `Cita Finalizada`,
            description: `Tu cita con el Dr. ${appt.doctorName} fue marcada como "${appt.attendance}".`,
            date: eventDate,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }
    });

    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const filteredExisting = filterValidNotifications(notifications);
      const updatedNotifications = filterValidNotifications([...uniqueNewNotifications, ...filteredExisting])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, [user, notifications]);

  // Marcar una notificación individual como leída
  const markNotificationAsRead = useCallback((id: string) => {
    if (!user?.id || user.role !== 'patient') return;

    const storageKey = getNotificationStorageKey(user.id);
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    const target = notifications.find(n => n.id === id);
    if (target && target.type === 'attendance_marked') {
      batchUpdatePatientAppointmentsAsRead([target.appointmentId]).catch(console.error);
    }
  }, [user, notifications]);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'patient' || unreadCount === 0) return;

    const storageKey = getNotificationStorageKey(user.id);
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNotifications(updated);
    setUnreadCount(0);

    const appointmentIdsToUpdate = notifications
      .filter(n => n.type === 'attendance_marked' && !n.read)
      .map(n => n.appointmentId);

    if (appointmentIdsToUpdate.length > 0) {
      await batchUpdatePatientAppointmentsAsRead(appointmentIdsToUpdate).catch(console.error);
    }
  }, [notifications, user, unreadCount]);

  // Limpiar notificaciones leídas
  const clearReadNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);
    const remaining = notifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setNotifications(remaining);
    setUnreadCount(remaining.length);
  }, [user, notifications]);

  // Limpiar todas las notificaciones
  const clearAllNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setNotifications([]);
    setUnreadCount(0);
  }, [user]);

  // --- Realtime Supabase para Pacientes ---
  useEffect(() => {
    if (!user?.id || user.role !== 'patient') {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const now = getCurrentDateTimeInArgentina();

    const channel = supabase
      .channel(`patient-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          const appt = payload.new as Record<string, any>;
          const oldAppt = payload.old as Record<string, any>;

          // Pago aprobado
          if (appt.payment_status === 'Pagado' && oldAppt.payment_status !== 'Pagado') {
            addNotification({
              id: `payment-approved-${appt.id}`,
              type: 'payment_approved',
              appointmentId: appt.id,
              title: '¡Pago Aprobado!',
              description: `Tu pago para la cita con ${appt.doctor_name || 'tu médico'} ha sido confirmado.`,
              date: `${appt.date}T${appt.time || '00:00'}`,
              read: false,
              createdAt: now.toISOString(),
              link: '/dashboard',
            });
          }

          // Resumen clínico o receta
          if (appt.attendance === 'Atendido' && (appt.clinical_notes || appt.prescription) && !oldAppt.clinical_notes && !oldAppt.prescription) {
            addNotification({
              id: `record-added-${appt.id}`,
              type: 'record_added',
              appointmentId: appt.id,
              title: 'Resumen de Cita Disponible',
              description: `El Dr. ${appt.doctor_name || 'Médico'} ha añadido indicaciones a tu consulta.`,
              date: `${appt.date}T${appt.time || '00:00'}`,
              read: false,
              createdAt: now.toISOString(),
              link: '/dashboard',
            });
          }

          // Cita finalizada
          if (appt.attendance && appt.attendance !== 'Pendiente' && oldAppt.attendance === 'Pendiente') {
            addNotification({
              id: `attendance-marked-${appt.id}`,
              type: 'attendance_marked',
              appointmentId: appt.id,
              title: 'Cita Finalizada',
              description: `Tu cita fue marcada como "${appt.attendance}".`,
              date: `${appt.date}T${appt.time || '00:00'}`,
              read: false,
              createdAt: now.toISOString(),
              link: '/dashboard',
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, addNotification]);

  const value = {
    notifications,
    unreadCount,
    checkAndSetNotifications,
    markNotificationAsRead,
    markAllAsRead,
    clearReadNotifications,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

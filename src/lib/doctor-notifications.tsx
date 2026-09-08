"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, DoctorNotification, AdminSupportTicket, DoctorPayment } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdateDoctorAppointmentsAsRead, batchUpdateDoctorNotificationsAsRead } from './supabaseService';
import { getCurrentDateTimeInArgentina } from './utils';
import { supabase } from './supabase';

interface DoctorNotificationContextType {
  doctorNotifications: DoctorNotification[];
  doctorUnreadCount: number;
  checkAndSetDoctorNotifications: (
    appointments: Appointment[],
    supportTickets: AdminSupportTicket[],
    doctorPayments: DoctorPayment[]
  ) => void;
  markDoctorNotificationAsRead: (id: string) => void;
  markDoctorNotificationsAsRead: () => void;
  clearReadDoctorNotifications: () => void;
  clearAllDoctorNotifications: () => void;
}

const DoctorNotificationContext = createContext<DoctorNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-doctor-notifications-${userId}`;
const MAX_NOTIFICATIONS = 25;

// Filtrar notificaciones obsoletas (más de 14 días) y limitar tamaño
const filterValidDoctorNotifications = (list: DoctorNotification[]): DoctorNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 14) {
      return false;
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function DoctorNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [doctorNotifications, setDoctorNotifications] = useState<DoctorNotification[]>([]);
  const [doctorUnreadCount, setDoctorUnreadCount] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'doctor') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as DoctorNotification[];
          const valid = filterValidDoctorNotifications(parsed);
          setDoctorNotifications(valid);
          setDoctorUnreadCount(valid.filter(n => !n.read).length);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        } else {
          setDoctorNotifications([]);
          setDoctorUnreadCount(0);
        }
      } catch (e) {
        console.error("Failed to load doctor notifications from localStorage", e);
        setDoctorNotifications([]);
        setDoctorUnreadCount(0);
      }
    } else {
      setDoctorNotifications([]);
      setDoctorUnreadCount(0);
    }
  }, [user]);

  // Limpiar notificaciones de otros usuarios cuando cambie el usuario
  useEffect(() => {
    if (user?.id && user.role === 'doctor') {
      const allKeys = Object.keys(localStorage);
      const doctorNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-doctor-notifications-') &&
        key !== getNotificationStorageKey(user.id)
      );
      doctorNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);

  const addNotification = useCallback((notification: DoctorNotification) => {
    if (!user?.id || user.role !== 'doctor') return;

    const storageKey = getNotificationStorageKey(user.id);

    setDoctorNotifications(prev => {
      // Evitar duplicados por ID
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      const updated = filterValidDoctorNotifications([notification, ...prev]).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setDoctorUnreadCount(prev => prev + 1);
  }, [user]);

  const checkAndSetDoctorNotifications = useCallback((
    appointments: Appointment[],
    supportTickets: AdminSupportTicket[],
    doctorPayments: DoctorPayment[]
  ) => {
    if (!user?.id || user.role !== 'doctor') return;

    const storageKey = getNotificationStorageKey(user.id);
    const newNotificationsMap = new Map<string, DoctorNotification>();
    const now = getCurrentDateTimeInArgentina();

    const existingIds = new Set(doctorNotifications.map(n => n.id));

    // --- Generate Notifications ---
    appointments.forEach(appt => {
      // 1. New Appointment
      if (appt.readByDoctor === false) {
        const id = `new-appt-${appt.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_appointment',
            title: '¡Nueva Cita Agendada!',
            description: `El paciente ${appt.patientName} ha reservado para el ${appt.date}.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }

      // 2. Payment Verification needed from you
      if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
        const id = `verify-${appt.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'payment_verification',
            title: 'Verificación de Pago',
            description: `El paciente ${appt.patientName} espera aprobación.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }

      // 3. Patient Confirmation status change
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
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }

      // 4. New Messages from patient
      const lastMessage = appt.messages?.slice(-1)[0];
      if (lastMessage?.sender === 'patient') {
        const id = `msg-${appt.id}-${lastMessage.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_message',
            title: `Nuevo Mensaje de ${appt.patientName}`,
            description: lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : ''),
            date: lastMessage.timestamp,
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }
    });

    // 5. Subscription payment update from admin
    const doctorPaymentsFiltered = doctorPayments.filter(payment => payment.doctorId === user.id);
    doctorPaymentsFiltered.forEach(payment => {
      if ((payment.status === 'Paid' || payment.status === 'Rejected') && !payment.readByDoctor) {
        const id = `sub-${payment.id}-${payment.status}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'subscription_update',
            title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
            description: `Tu pago de $${payment.amount.toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
            date: payment.date,
            createdAt: now.toISOString(),
            read: false,
            link: '/doctor/dashboard?view=subscription'
          });
        }
      }
    });

    // 6. Support Ticket Replies from admin
    const doctorSupportTickets = supportTickets.filter(ticket =>
      ticket.userRole === 'doctor' && ticket.userId === user.email
    );
    doctorSupportTickets.forEach(ticket => {
      const lastMessage = ticket.messages?.slice(-1)[0];
      if (lastMessage?.sender === 'admin' && !ticket.readByDoctor) {
        const id = `support-${ticket.id}-${lastMessage.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'support_reply',
            title: `Respuesta de Soporte`,
            description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
            date: lastMessage.timestamp,
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=support&ticketId=${ticket.id}`
          });
        }
      }
    });

    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const filteredExisting = filterValidDoctorNotifications(doctorNotifications);
      const updatedNotifications = filterValidDoctorNotifications([...uniqueNewNotifications, ...filteredExisting])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setDoctorNotifications(updatedNotifications);
      setDoctorUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, [doctorNotifications, user]);

  // Marcar una sola notificación como leída
  const markDoctorNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || user.role !== 'doctor') return;

    const storageKey = getNotificationStorageKey(user.id);
    setDoctorNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setDoctorUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    // Si es una cita nueva, marcar en base de datos
    if (id.startsWith('new-appt-')) {
      const apptId = id.replace('new-appt-', '');
      batchUpdateDoctorAppointmentsAsRead([apptId]).catch(console.error);
    } else if (id.startsWith('sub-')) {
      const paymentId = id.split('-')[1];
      batchUpdateDoctorNotificationsAsRead([paymentId], []).catch(console.error);
    } else if (id.startsWith('support-')) {
      const ticketId = id.split('-')[1];
      batchUpdateDoctorNotificationsAsRead([], [ticketId]).catch(console.error);
    }
  }, [user]);

  // Marcar todas como leídas
  const markDoctorNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'doctor' || doctorUnreadCount === 0) return;

    const storageKey = getNotificationStorageKey(user.id);
    const updated = doctorNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setDoctorNotifications(updated);
    setDoctorUnreadCount(0);

    const unreadNotifications = doctorNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    const appointmentIdsToUpdate = unreadNotifications
      .filter(n => n.type === 'new_appointment')
      .map(n => n.id.replace('new-appt-', ''));

    const paymentIdsToUpdate = unreadNotifications
      .filter(n => n.type === 'subscription_update')
      .map(n => n.id.split('-')[1]);

    const ticketIdsToUpdate = unreadNotifications
      .filter(n => n.type === 'support_reply')
      .map(n => n.id.split('-')[1]);

    await batchUpdateDoctorAppointmentsAsRead(appointmentIdsToUpdate);
    await batchUpdateDoctorNotificationsAsRead(paymentIdsToUpdate, ticketIdsToUpdate);
  }, [doctorNotifications, user, doctorUnreadCount]);

  // Limpiar notificaciones leídas
  const clearReadDoctorNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'doctor') return;
    const storageKey = getNotificationStorageKey(user.id);
    const remaining = doctorNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setDoctorNotifications(remaining);
    setDoctorUnreadCount(remaining.length);
  }, [user, doctorNotifications]);

  // Limpiar todas las notificaciones
  const clearAllDoctorNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'doctor') return;
    const storageKey = getNotificationStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setDoctorNotifications([]);
    setDoctorUnreadCount(0);
  }, [user]);

  // --- Supabase Realtime para notificaciones instantáneas ---
  useEffect(() => {
    if (!user?.id || user.role !== 'doctor') {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const now = getCurrentDateTimeInArgentina();

    const channel = supabase
      .channel(`doctor-notifications-${user.id}`)
      // Escuchar nuevas citas
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          const appt = payload.new as Record<string, unknown>;
          const notification: DoctorNotification = {
            id: `new-appt-${appt.id}`,
            type: 'new_appointment',
            title: '¡Nueva Cita Agendada!',
            description: `El paciente ${appt.patient_name || 'Un paciente'} ha reservado para el ${appt.date || 'próximamente'}.`,
            date: (appt.date as string) || now.toISOString(),
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          };
          addNotification(notification);
        }
      )
      // Escuchar cambios en citas existentes
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          const appt = payload.new as Record<string, unknown>;
          const oldAppt = payload.old as Record<string, unknown>;

          // Cambio de estado de confirmación
          if (appt.patient_confirmation_status !== oldAppt.patient_confirmation_status) {
            const status = appt.patient_confirmation_status as string;
            if (status === 'Confirmada' || status === 'Cancelada') {
              const notification: DoctorNotification = {
                id: `confirm-${appt.id}-${status}`,
                type: status === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
                title: `Cita ${status}`,
                description: `${appt.patient_name || 'El paciente'} ha ${status.toLowerCase()} su cita.`,
                date: `${appt.date}T${appt.time || '00:00'}` || now.toISOString(),
                createdAt: now.toISOString(),
                read: false,
                link: `/doctor/dashboard?view=appointments`
              };
              addNotification(notification);
            }
          }

          // Nuevo mensaje
          const newMessages = appt.messages as Array<Record<string, unknown>> | null;
          const oldMessages = oldAppt.messages as Array<Record<string, unknown>> | null;
          if (newMessages && (!oldMessages || newMessages.length > (oldMessages?.length || 0))) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.sender === 'patient') {
              const notification: DoctorNotification = {
                id: `msg-${appt.id}-${lastMessage.id || 'last'}`,
                type: 'new_message',
                title: `Nuevo Mensaje de ${appt.patient_name || 'Paciente'}`,
                description: String(lastMessage.text || '').substring(0, 50) + '...',
                date: String(lastMessage.timestamp || now.toISOString()),
                createdAt: now.toISOString(),
                read: false,
                link: `/doctor/dashboard?view=appointments`
              };
              addNotification(notification);
            }
          }
        }
      )
      // Escuchar cambios en pagos del doctor
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'doctor_payments',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          const payment = payload.new as Record<string, unknown>;
          const oldPayment = payload.old as Record<string, unknown>;

          if (payment.status !== oldPayment.status &&
            (payment.status === 'Paid' || payment.status === 'Rejected')) {
            const notification: DoctorNotification = {
              id: `sub-${payment.id}-${payment.status}`,
              type: 'subscription_update',
              title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
              description: `Tu pago de $${Number(payment.amount || 0).toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
              date: String(payment.date || now.toISOString()),
              createdAt: now.toISOString(),
              read: false,
              link: '/doctor/dashboard?view=subscription'
            };
            addNotification(notification);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Polling inicial y cada 60s
    const doctorId = user.id;
    async function fetchInitial() {
      try {
        const { getDoctorAppointments, getSupportTickets, getDoctorPayments } = await import('./supabaseService');
        const [appointments, supportTickets, doctorPayments] = await Promise.all([
          getDoctorAppointments(doctorId),
          getSupportTickets(),
          getDoctorPayments()
        ]);
        checkAndSetDoctorNotifications(appointments || [], supportTickets || [], doctorPayments || []);
      } catch (err) {
        console.warn('⚠️ No se pudieron sincronizar las notificaciones del doctor en este momento:', err);
      }
    }

    fetchInitial();
    const interval = setInterval(fetchInitial, 60000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, addNotification, checkAndSetDoctorNotifications]);

  const value = {
    doctorNotifications,
    doctorUnreadCount,
    checkAndSetDoctorNotifications,
    markDoctorNotificationAsRead,
    markDoctorNotificationsAsRead,
    clearReadDoctorNotifications,
    clearAllDoctorNotifications
  };

  return (
    <DoctorNotificationContext.Provider value={value}>
      {children}
    </DoctorNotificationContext.Provider>
  );
}

export function useDoctorNotifications() {
  const context = useContext(DoctorNotificationContext);
  if (context === undefined) {
    throw new Error('useDoctorNotifications must be used within a DoctorNotificationProvider');
  }
  return context;
}

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
const getDismissedStorageKey = (userId: string) => `suma-doctor-notifications-dismissed-${userId}`;
const MAX_NOTIFICATIONS = 30;

const filterValidDoctorNotifications = (list: DoctorNotification[]): DoctorNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 30) {
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

  const getDismissedSet = useCallback((userId: string): Set<string> => {
    try {
      const raw = localStorage.getItem(getDismissedStorageKey(userId));
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }, []);

  const addDismissedIds = useCallback((userId: string, ids: string[]) => {
    try {
      const current = getDismissedSet(userId);
      ids.forEach(id => current.add(id));
      localStorage.setItem(getDismissedStorageKey(userId), JSON.stringify(Array.from(current).slice(-200)));
    } catch {
      // ignore
    }
  }, [getDismissedSet]);

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

  useEffect(() => {
    if (user?.id && user.role === 'doctor') {
      const allKeys = Object.keys(localStorage);
      const doctorNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-doctor-notifications-') &&
        !key.startsWith('suma-doctor-notifications-dismissed-') &&
        key !== getNotificationStorageKey(user.id)
      );
      doctorNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);

  const addNotification = useCallback((notification: DoctorNotification) => {
    if (!user?.id || user.role !== 'doctor') return;
    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    if (dismissed.has(notification.id)) return;

    setDoctorNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      const updated = filterValidDoctorNotifications([notification, ...prev]).sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setDoctorUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, [user, getDismissedSet]);

  const checkAndSetDoctorNotifications = useCallback((
    appointments: Appointment[],
    supportTickets: AdminSupportTicket[],
    doctorPayments: DoctorPayment[]
  ) => {
    if (!user?.id || user.role !== 'doctor') return;

    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    const now = getCurrentDateTimeInArgentina();

    setDoctorNotifications(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));

      const upsert = (notif: DoctorNotification) => {
        if (dismissed.has(notif.id)) return;
        const existing = prevMap.get(notif.id);
        if (existing) {
          prevMap.set(notif.id, {
            ...existing,
            title: notif.title,
            description: notif.description,
            link: notif.link,
            read: existing.read || Boolean(notif.read),
          });
        } else {
          prevMap.set(notif.id, notif);
        }
      };

      // 0. Estatus de Verificación de Cuenta del Médico
      if (user.verificationStatus === 'pending' || !user.verificationStatus) {
        upsert({
          id: `verify-status-pending-${user.id}`,
          type: 'subscription_update',
          title: 'Cuenta Pendiente por Verificar',
          description: 'Tu perfil y matrícula profesional están siendo revisados por el equipo administrativo de SUMA.',
          date: now.toISOString(),
          createdAt: now.toISOString(),
          read: false,
          link: '/doctor/dashboard?view=profile',
        });
      } else if (user.verificationStatus === 'verified') {
        upsert({
          id: `verify-status-verified-${user.id}`,
          type: 'patient_confirmed',
          title: '¡Cuenta Médica Verificada!',
          description: 'Tus credenciales han sido verificadas exitosamente y tu perfil ya cuenta con el sello oficial en SUMA.',
          date: now.toISOString(),
          createdAt: now.toISOString(),
          read: prevMap.get(`verify-status-verified-${user.id}`)?.read ?? false,
          link: '/doctor/dashboard?view=profile',
        });
      }

      // 1. Citas
      appointments.forEach(appt => {
        upsert({
          id: `new-appt-${appt.id}`,
          type: 'new_appointment',
          title: 'Cita Agendada',
          description: `El paciente ${appt.patientName} reservó para el ${appt.date} (${appt.time || ''}).`,
          date: appt.date,
          createdAt: now.toISOString(),
          read: appt.readByDoctor === true,
          link: `/doctor/dashboard?view=appointments`
        });

        if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
          upsert({
            id: `verify-${appt.id}`,
            type: 'payment_verification',
            title: 'Verificación de Pago de Paciente',
            description: `El paciente ${appt.patientName} reportó una transferencia que espera tu aprobación.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }

        if (appt.patientConfirmationStatus === 'Confirmada' || appt.patientConfirmationStatus === 'Cancelada') {
          upsert({
            id: `confirm-${appt.id}-${appt.patientConfirmationStatus}`,
            type: appt.patientConfirmationStatus === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
            title: `Cita ${appt.patientConfirmationStatus}`,
            description: `${appt.patientName} ha ${appt.patientConfirmationStatus.toLowerCase()} su cita.`,
            date: `${appt.date}T${appt.time || '00:00'}`,
            createdAt: now.toISOString(),
            read: appt.readByDoctor === true,
            link: `/doctor/dashboard?view=appointments`
          });
        }

        const lastMessage = appt.messages?.slice(-1)[0];
        if (lastMessage?.sender === 'patient') {
          upsert({
            id: `msg-${appt.id}__${lastMessage.id}`,
            type: 'new_message',
            title: `Nuevo Mensaje de ${appt.patientName}`,
            description: lastMessage.text.substring(0, 60) + (lastMessage.text.length > 60 ? '...' : ''),
            date: lastMessage.timestamp,
            createdAt: now.toISOString(),
            read: appt.readByDoctor === true,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      });

      // 2. Pagos de suscripción del médico
      const doctorPaymentsFiltered = doctorPayments.filter(payment => payment.doctorId === user.id);
      doctorPaymentsFiltered.forEach(payment => {
        if (payment.status === 'Paid' || payment.status === 'Rejected') {
          upsert({
            id: `sub-${payment.id}__${payment.status}`,
            type: 'subscription_update',
            title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
            description: `Tu pago de $${payment.amount.toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
            date: payment.date,
            createdAt: now.toISOString(),
            read: Boolean(payment.readByDoctor),
            link: '/doctor/dashboard?view=subscription'
          });
        }
      });

      // 3. Respuestas de soporte
      const doctorSupportTickets = supportTickets.filter(ticket =>
        ticket.userRole === 'doctor' && ticket.userId === user.email
      );
      doctorSupportTickets.forEach(ticket => {
        const lastMessage = ticket.messages?.slice(-1)[0];
        if (lastMessage?.sender === 'admin') {
          upsert({
            id: `support-${ticket.id}__${lastMessage.id}`,
            type: 'support_reply',
            title: `Respuesta de Soporte`,
            description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
            date: lastMessage.timestamp,
            createdAt: now.toISOString(),
            read: Boolean(ticket.readByDoctor),
            link: `/doctor/dashboard?view=support&ticketId=${ticket.id}`
          });
        }
      });

      const merged = filterValidDoctorNotifications(
        Array.from(prevMap.values())
          .filter(n => !dismissed.has(n.id))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );

      localStorage.setItem(storageKey, JSON.stringify(merged));
      setDoctorUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  }, [user, getDismissedSet]);

  const extractEntityId = (id: string, prefix: string): string => {
    const withoutPrefix = id.replace(new RegExp(`^${prefix}`), '');
    return withoutPrefix.split('__')[0];
  };

  // Marcar una sola notificación como revisada
  const markDoctorNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || user.role !== 'doctor') return;

    const storageKey = getNotificationStorageKey(user.id);
    setDoctorNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setDoctorUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    if (id.startsWith('new-appt-')) {
      const apptId = id.replace(/^new-appt-/, '');
      batchUpdateDoctorAppointmentsAsRead([apptId]).catch(console.error);
    } else if (id.startsWith('sub-')) {
      const paymentId = extractEntityId(id, 'sub-').replace(/-(Paid|Rejected|Pending)$/, '');
      batchUpdateDoctorNotificationsAsRead([paymentId], []).catch(console.error);
    } else if (id.startsWith('support-')) {
      const ticketId = extractEntityId(id, 'support-');
      batchUpdateDoctorNotificationsAsRead([], [ticketId]).catch(console.error);
    }
  }, [user]);

  // Marcar todas como revisadas
  const markDoctorNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'doctor' || doctorUnreadCount === 0) return;

    const unreadNotifications = doctorNotifications.filter(n => !n.read);
    const storageKey = getNotificationStorageKey(user.id);
    const updated = doctorNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setDoctorNotifications(updated);
    setDoctorUnreadCount(0);

    if (unreadNotifications.length === 0) return;

    const appointmentIdsToUpdate = unreadNotifications
      .filter(n => n.id.startsWith('new-appt-'))
      .map(n => n.id.replace(/^new-appt-/, ''));

    const paymentIdsToUpdate = unreadNotifications
      .filter(n => n.id.startsWith('sub-'))
      .map(n => extractEntityId(n.id, 'sub-').replace(/-(Paid|Rejected|Pending)$/, ''));

    const ticketIdsToUpdate = unreadNotifications
      .filter(n => n.id.startsWith('support-'))
      .map(n => extractEntityId(n.id, 'support-'));

    await batchUpdateDoctorAppointmentsAsRead(appointmentIdsToUpdate).catch(console.error);
    await batchUpdateDoctorNotificationsAsRead(paymentIdsToUpdate, ticketIdsToUpdate).catch(console.error);
  }, [doctorNotifications, user, doctorUnreadCount]);

  // Limpiar notificaciones revisadas
  const clearReadDoctorNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'doctor') return;
    const storageKey = getNotificationStorageKey(user.id);
    const readIds = doctorNotifications.filter(n => n.read).map(n => n.id);
    addDismissedIds(user.id, readIds);
    const remaining = doctorNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setDoctorNotifications(remaining);
    setDoctorUnreadCount(remaining.length);
  }, [user, doctorNotifications, addDismissedIds]);

  // Limpiar todas las notificaciones
  const clearAllDoctorNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'doctor') return;
    const storageKey = getNotificationStorageKey(user.id);
    addDismissedIds(user.id, doctorNotifications.map(n => n.id));
    localStorage.removeItem(storageKey);
    setDoctorNotifications([]);
    setDoctorUnreadCount(0);
  }, [user, doctorNotifications, addDismissedIds]);

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
          addNotification({
            id: `new-appt-${appt.id}`,
            type: 'new_appointment',
            title: '¡Nueva Cita Agendada!',
            description: `El paciente ${appt.patient_name || 'Un paciente'} ha reservado para el ${appt.date || 'próximamente'}.`,
            date: (appt.date as string) || now.toISOString(),
            createdAt: now.toISOString(),
            read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      )
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
            addNotification({
              id: `sub-${payment.id}__${payment.status}`,
              type: 'subscription_update',
              title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
              description: `Tu pago de $${Number(payment.amount || 0).toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
              date: String(payment.date || now.toISOString()),
              createdAt: now.toISOString(),
              read: false,
              link: '/doctor/dashboard?view=subscription'
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

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
        console.warn('⚠️ No se pudieron sincronizar las notificaciones del doctor:', err);
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

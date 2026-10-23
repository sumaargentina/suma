"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, ClinicNotification } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdateDoctorAppointmentsAsRead, getClinicAppointments, getSupportTickets } from './supabaseService';
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
const getDismissedStorageKey = (userId: string) => `suma-clinic-notifications-dismissed-${userId}`;
const MAX_NOTIFICATIONS = 30;

const filterValidClinicNotifications = (list: ClinicNotification[]): ClinicNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 30) {
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

  const isClinicUser = user?.role === 'clinic' || user?.role === 'secretary';
  const effectiveClinicId = user?.role === 'secretary' ? ((user as any).clinicId || user.id) : (user?.role === 'clinic' ? user.id : null);

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

  useEffect(() => {
    if (user?.id && isClinicUser) {
      const allKeys = Object.keys(localStorage);
      const clinicNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-clinic-notifications-') &&
        !key.startsWith('suma-clinic-notifications-dismissed-') &&
        key !== getNotificationStorageKey(user.id)
      );
      clinicNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user, isClinicUser]);

  const addNotification = useCallback((notification: ClinicNotification) => {
    if (!user?.id || !isClinicUser) return;
    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    if (dismissed.has(notification.id)) return;

    setClinicNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      const updated = filterValidClinicNotifications([notification, ...prev]).sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setClinicUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, [user, isClinicUser, getDismissedSet]);

  const checkAndSetClinicNotifications = useCallback((
    appointments: Appointment[],
    supportTickets: any[] = []
  ) => {
    if (!user?.id || !isClinicUser) return;

    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    const now = getCurrentDateTimeInArgentina();

    setClinicNotifications(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));

      const upsert = (notif: ClinicNotification) => {
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

      appointments.forEach(appt => {
        upsert({
          id: `new-appt-${appt.id}`,
          type: 'new_appointment',
          title: 'Cita en Clínica',
          description: `Paciente: ${appt.patientName}. Fecha: ${appt.date} ${appt.time || ''}.`,
          date: appt.date,
          createdAt: now.toISOString(),
          read: appt.readByDoctor === true,
          link: `/clinic/dashboard?view=agenda`
        });

        if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
          upsert({
            id: `verify-${appt.id}`,
            type: 'payment_verification',
            title: 'Verificación de Pago',
            description: `Pago pendiente de revisión para la cita de ${appt.patientName}.`,
            date: appt.date,
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?view=agenda`
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
            link: `/clinic/dashboard?view=agenda`
          });
        }
      });

      supportTickets
        .filter(t => t.userRole === 'clinic' && (t.userId === user.email || t.userId === effectiveClinicId))
        .forEach(ticket => {
          const lastMessage = ticket.messages?.slice(-1)[0];
          if (lastMessage?.sender === 'admin') {
            upsert({
              id: `support-clinic-${ticket.id}__${lastMessage.id}`,
              type: 'support_reply',
              title: 'Respuesta de Soporte SUMA',
              description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
              date: lastMessage.timestamp,
              createdAt: now.toISOString(),
              read: Boolean(ticket.readByClinic),
              link: `/clinic/dashboard?view=support`
            });
          }
        });

      const merged = filterValidClinicNotifications(
        Array.from(prevMap.values())
          .filter(n => !dismissed.has(n.id))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );

      localStorage.setItem(storageKey, JSON.stringify(merged));
      setClinicUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  }, [user, isClinicUser, effectiveClinicId, getDismissedSet]);

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
      const apptId = id.replace(/^new-appt-/, '');
      batchUpdateDoctorAppointmentsAsRead([apptId]).catch(console.error);
    } else if (id.startsWith('support-clinic-')) {
      const ticketId = id.replace(/^support-clinic-/, '').split('__')[0];
      fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'clinic', ticketIds: [ticketId] }),
      }).catch(console.error);
    }
  }, [user, isClinicUser]);

  const markClinicNotificationsAsRead = useCallback(async () => {
    if (!user?.id || !isClinicUser || clinicUnreadCount === 0) return;

    const unreadNotifications = clinicNotifications.filter(n => !n.read);
    const storageKey = getNotificationStorageKey(user.id);
    const updated = clinicNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setClinicNotifications(updated);
    setClinicUnreadCount(0);

    const appointmentIdsToUpdate = unreadNotifications
      .filter(n => n.id.startsWith('new-appt-'))
      .map(n => n.id.replace(/^new-appt-/, ''));

    const ticketIdsToUpdate = unreadNotifications
      .filter(n => n.id.startsWith('support-clinic-'))
      .map(n => n.id.replace(/^support-clinic-/, '').split('__')[0]);

    try {
      if (appointmentIdsToUpdate.length > 0 || ticketIdsToUpdate.length > 0) {
        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: 'clinic',
            appointmentIds: appointmentIdsToUpdate,
            ticketIds: ticketIdsToUpdate,
          }),
        });
      }
    } catch (error) {
      console.error("Error updating backend read status", error);
    }
  }, [clinicNotifications, user, clinicUnreadCount, isClinicUser]);

  const clearReadClinicNotifications = useCallback(() => {
    if (!user?.id || !isClinicUser) return;
    const storageKey = getNotificationStorageKey(user.id);
    const readIds = clinicNotifications.filter(n => n.read).map(n => n.id);
    addDismissedIds(user.id, readIds);
    const remaining = clinicNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setClinicNotifications(remaining);
    setClinicUnreadCount(remaining.length);
  }, [user, isClinicUser, clinicNotifications, addDismissedIds]);

  const clearAllClinicNotifications = useCallback(() => {
    if (!user?.id || !isClinicUser) return;
    const storageKey = getNotificationStorageKey(user.id);
    addDismissedIds(user.id, clinicNotifications.map(n => n.id));
    localStorage.removeItem(storageKey);
    setClinicNotifications([]);
    setClinicUnreadCount(0);
  }, [user, isClinicUser, clinicNotifications, addDismissedIds]);

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
          addNotification({
            id: `new-appt-${appt.id}`,
            type: 'new_appointment',
            title: '¡Nueva Cita en Clínica!',
            description: `Paciente: ${appt.patient_name || 'Nuevo paciente'}. Fecha: ${appt.date || ''}.`,
            date: (appt.date as string) || now.toISOString(),
            createdAt: now.toISOString(),
            read: false,
            link: `/clinic/dashboard?view=agenda`
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    const fetchInitial = async () => {
      try {
        const [appointments, tickets] = await Promise.all([
          getClinicAppointments(effectiveClinicId),
          getSupportTickets(),
        ]);
        checkAndSetClinicNotifications(appointments || [], tickets || []);
      } catch (error) {
        console.error("Error fetching clinic notifications", error);
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

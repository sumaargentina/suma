"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, PatientNotification } from './types';
import { differenceInHours, differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdatePatientAppointmentsAsRead, getPatientAppointments } from './supabaseService';
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
const getDismissedStorageKey = (userId: string) => `suma-patient-notifications-dismissed-${userId}`;
const MAX_NOTIFICATIONS = 25;

const filterValidNotifications = (list: PatientNotification[]): PatientNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 30) {
      return false;
    }
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

  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      const allKeys = Object.keys(localStorage);
      const patientNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-patient-notifications-') &&
        !key.startsWith('suma-patient-notifications-dismissed-') &&
        key !== getNotificationStorageKey(user.id)
      );
      patientNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);

  const addNotification = useCallback((notification: PatientNotification) => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    if (dismissed.has(notification.id)) return;

    setNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) return prev;
      const updated = filterValidNotifications([notification, ...prev]).sort((a, b) => {
        if (a.read !== b.read) return a.read ? 1 : -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }, [user, getDismissedSet]);

  const checkAndSetNotifications = useCallback((appointments: Appointment[]) => {
    if (!user?.id || user.role !== 'patient') return;

    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    const now = getCurrentDateTimeInArgentina();

    setNotifications(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));

      const upsert = (notif: PatientNotification) => {
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
        const apptDateTime = new Date(`${appt.date}T${appt.time || '00:00'}`);
        const hoursUntil = differenceInHours(apptDateTime, now);

        if (apptDateTime > now) {
          const createReminder = (timeframe: '24h' | '3h') => {
            const id = `reminder-${appt.id}-${timeframe}`;
            const title = timeframe === '24h' ? `Recordatorio: Cita Mañana` : `Recordatorio: Cita Pronto`;
            const description = `Tu cita con ${appt.doctorName} es en aprox. ${timeframe === '24h' ? '24 horas' : '3 horas'}.`;
            upsert({
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

        if (appt.paymentStatus === 'Pagado') {
          upsert({
            id: `payment-approved-${appt.id}`,
            type: 'payment_approved',
            appointmentId: appt.id,
            title: '¡Pago Aprobado!',
            description: `El Dr(a). ${appt.doctorName} ha confirmado tu pago para la cita.`,
            date: `${appt.date}T${appt.time || '00:00'}`,
            read: Boolean(appt.readByPatient),
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }

        const lastMessage = appt.messages?.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (lastMessage?.sender === 'doctor') {
          upsert({
            id: `new-message-${lastMessage.id}`,
            type: 'new_message',
            appointmentId: appt.id,
            title: `Nuevo Mensaje de ${appt.doctorName}`,
            description: lastMessage.text.substring(0, 60) + (lastMessage.text.length > 60 ? '...' : ''),
            date: lastMessage.timestamp,
            read: Boolean(appt.readByPatient),
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }

        if (appt.attendance === 'Atendido' && (appt.clinicalNotes || appt.prescription)) {
          upsert({
            id: `record-added-${appt.id}`,
            type: 'record_added',
            appointmentId: appt.id,
            title: `Resumen de Cita Disponible`,
            description: `El Dr(a). ${appt.doctorName} ha añadido notas o récipe a tu consulta.`,
            date: `${appt.date}T${appt.time || '00:00'}`,
            read: Boolean(appt.readByPatient),
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }

        if (appt.attendance && appt.attendance !== 'Pendiente') {
          upsert({
            id: `attendance-marked-${appt.id}`,
            type: 'attendance_marked',
            appointmentId: appt.id,
            title: `Cita Finalizada (${appt.attendance})`,
            description: `Tu cita con el Dr(a). ${appt.doctorName} fue marcada como "${appt.attendance}".`,
            date: `${appt.date}T${appt.time || '00:00'}`,
            read: appt.readByPatient !== false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      });

      const merged = filterValidNotifications(
        Array.from(prevMap.values())
          .filter(n => !dismissed.has(n.id))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );

      localStorage.setItem(storageKey, JSON.stringify(merged));
      setUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  }, [user, getDismissedSet]);

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
    if (target && target.appointmentId) {
      batchUpdatePatientAppointmentsAsRead([target.appointmentId]).catch(console.error);
    }
  }, [user, notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'patient' || unreadCount === 0) return;

    const unreadItems = notifications.filter(n => !n.read);
    const storageKey = getNotificationStorageKey(user.id);
    const updated = notifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setNotifications(updated);
    setUnreadCount(0);

    const appointmentIdsToUpdate = Array.from(new Set(unreadItems.map(n => n.appointmentId).filter(Boolean)));
    if (appointmentIdsToUpdate.length > 0) {
      await batchUpdatePatientAppointmentsAsRead(appointmentIdsToUpdate).catch(console.error);
    }
  }, [notifications, user, unreadCount]);

  const clearReadNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);
    const readIds = notifications.filter(n => n.read).map(n => n.id);
    addDismissedIds(user.id, readIds);
    const remaining = notifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setNotifications(remaining);
    setUnreadCount(remaining.length);
  }, [user, notifications, addDismissedIds]);

  const clearAllNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'patient') return;
    const storageKey = getNotificationStorageKey(user.id);
    addDismissedIds(user.id, notifications.map(n => n.id));
    localStorage.removeItem(storageKey);
    setNotifications([]);
    setUnreadCount(0);
  }, [user, notifications, addDismissedIds]);

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

          if (appt.attendance === 'Atendido' && (appt.clinical_notes || appt.prescription) && !oldAppt.clinical_notes && !oldAppt.prescription) {
            addNotification({
              id: `record-added-${appt.id}`,
              type: 'record_added',
              appointmentId: appt.id,
              title: 'Resumen de Cita Disponible',
              description: `El Dr(a). ${appt.doctor_name || 'Médico'} ha añadido indicaciones a tu consulta.`,
              date: `${appt.date}T${appt.time || '00:00'}`,
              read: false,
              createdAt: now.toISOString(),
              link: '/dashboard',
            });
          }

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

    const patientId = user.id;
    const fetchInitial = async () => {
      try {
        const appts = await getPatientAppointments(patientId);
        checkAndSetNotifications(appts || []);
      } catch {
        // ignore
      }
    };
    fetchInitial();
    const interval = setInterval(fetchInitial, 60000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, addNotification, checkAndSetNotifications]);

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

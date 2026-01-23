
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { Appointment, PatientNotification } from './types';
import { differenceInHours } from 'date-fns';
import { useAuth } from './auth';
import { batchUpdatePatientAppointmentsAsRead } from './supabaseService';
import { getCurrentDateTimeInArgentina } from './utils';

interface NotificationContextType {
  notifications: PatientNotification[];
  unreadCount: number;
  checkAndSetNotifications: (appointments: Appointment[]) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-patient-notifications-${userId}`;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as PatientNotification[];
          setNotifications(parsed);
          setUnreadCount(parsed.filter(n => !n.read).length);
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
      // Clear notifications on logout
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Limpiar notificaciones de otros usuarios cuando cambie el usuario
  useEffect(() => {
    if (user?.id && user.role === 'patient') {
      // Limpiar notificaciones de otros usuarios
      const allKeys = Object.keys(localStorage);
      const patientNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-patient-notifications-') &&
        key !== getNotificationStorageKey(user.id)
      );
      patientNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);


  const checkAndSetNotifications = useCallback((appointments: Appointment[]) => {
    if (!user?.id || user.role !== 'patient') return;

    const storageKey = getNotificationStorageKey(user.id);
    const newNotificationsMap = new Map<string, PatientNotification>();
    const now = getCurrentDateTimeInArgentina();

    const existingIds = new Set(notifications.map(n => n.id));

    appointments.forEach(appt => {
      const apptDateTime = new Date(`${appt.date}T${appt.time}`);
      const hoursUntil = differenceInHours(apptDateTime, now);

      // --- Reminder Notifications ---
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
          date: apptDateTime.toISOString(), // Usar fecha de la cita
          read: false,
          createdAt: now.toISOString(),
          link: '/dashboard',
        });
      };
      if (hoursUntil > 0 && hoursUntil < 25) createReminder('24h');
      if (hoursUntil > 0 && hoursUntil < 4) createReminder('3h');

      // --- Payment Approved Notification ---
      if (appt.paymentStatus === 'Pagado') {
        const id = `payment-approved-${appt.id}`;
        if (!existingIds.has(id)) {
          // Usar fecha de la cita, no la fecha actual
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

      // --- New Message from Doctor ---
      const lastMessage = appt.messages?.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
      if (lastMessage?.sender === 'doctor') {
        const id = `new-message-${lastMessage.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_message',
            appointmentId: appt.id,
            title: `Nuevo Mensaje de ${appt.doctorName}`,
            description: lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? '...' : ''),
            date: lastMessage.timestamp,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }

      // --- Clinical Record Added ---
      if (appt.attendance === 'Atendido' && (appt.clinicalNotes || appt.prescription)) {
        const id = `record-added-${appt.id}`;
        if (!existingIds.has(id)) {
          const eventDate = `${appt.date}T${appt.time || '00:00'}`;
          newNotificationsMap.set(id, {
            id,
            type: 'record_added',
            appointmentId: appt.id,
            title: `Resumen de Cita Disponible`,
            description: `El Dr. ${appt.doctorName} ha añadido notas o un récipe a tu cita pasada.`,
            date: eventDate,
            read: false,
            createdAt: now.toISOString(),
            link: '/dashboard',
          });
        }
      }

      // --- Attendance Marked ---
      if (appt.attendance !== 'Pendiente' && appt.readByPatient === false) {
        const id = `attendance-marked-${appt.id}`;
        if (!existingIds.has(id)) {
          const eventDate = `${appt.date}T${appt.time || '00:00'}`;
          newNotificationsMap.set(id, {
            id,
            type: 'attendance_marked',
            appointmentId: appt.id,
            title: `Cita Finalizada`,
            description: `El Dr. ${appt.doctorName} ha marcado tu cita como "${appt.attendance}".`,
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
      const updatedNotifications = [...uniqueNewNotifications, ...notifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setNotifications(updatedNotifications);
      setUnreadCount(prev => prev + uniqueNewNotifications.length);
    }
  }, [user, notifications]);

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
      await batchUpdatePatientAppointmentsAsRead(appointmentIdsToUpdate);
    }
  }, [notifications, user, unreadCount]);

  const value = { notifications, unreadCount, checkAndSetNotifications, markAllAsRead };



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


"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, DoctorNotification, AdminSupportTicket, DoctorPayment } from './types';
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
  markDoctorNotificationsAsRead: () => void;
}

const DoctorNotificationContext = createContext<DoctorNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-doctor-notifications-${userId}`;

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
          setDoctorNotifications(parsed);
          setDoctorUnreadCount(parsed.filter(n => !n.read).length);
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
      // Limpiar notificaciones de otros usuarios
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
      // Evitar duplicados
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      const updated = [notification, ...prev].sort((a, b) =>
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
            id, type: 'new_appointment', title: '¡Nueva Cita Agendada!',
            description: `El paciente ${appt.patientName} ha reservado para el ${appt.date}.`,
            date: appt.date, createdAt: now.toISOString(), read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }

      // 2. Payment Verification needed from you
      if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
        const id = `verify-${appt.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id, type: 'payment_verification', title: 'Verificación de Pago',
            description: `El paciente ${appt.patientName} espera aprobación.`,
            date: appt.date, createdAt: now.toISOString(), read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }
      // 3. Patient Confirmation status change
      if (appt.patientConfirmationStatus === 'Confirmada' || appt.patientConfirmationStatus === 'Cancelada') {
        const id = `confirm-${appt.id}-${appt.patientConfirmationStatus}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id, type: appt.patientConfirmationStatus === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
            title: `Cita ${appt.patientConfirmationStatus}`,
            description: `${appt.patientName} ha ${appt.patientConfirmationStatus.toLowerCase()} su cita.`,
            date: new Date().toISOString(), createdAt: now.toISOString(), read: false,
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
            id, type: 'new_message', title: `Nuevo Mensaje de ${appt.patientName}`,
            description: lastMessage.text.substring(0, 50) + '...',
            date: lastMessage.timestamp, createdAt: now.toISOString(), read: false,
            link: `/doctor/dashboard?view=appointments`
          });
        }
      }
    });

    // 5. Subscription payment update from admin - Solo pagos de este doctor
    const doctorPaymentsFiltered = doctorPayments.filter(payment => payment.doctorId === user.id);
    doctorPaymentsFiltered.forEach(payment => {
      if ((payment.status === 'Paid' || payment.status === 'Rejected') && !payment.readByDoctor) {
        const id = `sub-${payment.id}-${payment.status}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id, type: 'subscription_update',
            title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
            description: `Tu pago de $${payment.amount.toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
            date: payment.date, createdAt: now.toISOString(), read: false,
            link: '/doctor/dashboard?view=subscription'
          });
        }
      }
    });

    // 6. Support Ticket Replies from admin - Solo tickets de este doctor
    const doctorSupportTickets = supportTickets.filter(ticket =>
      ticket.userRole === 'doctor' && ticket.userId === user.email
    );
    doctorSupportTickets.forEach(ticket => {
      const lastMessage = ticket.messages?.slice(-1)[0];
      if (lastMessage?.sender === 'admin' && !ticket.readByDoctor) {
        const id = `support-${ticket.id}-${lastMessage.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id, type: 'support_reply',
            title: `Respuesta de Soporte`,
            description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
            date: lastMessage.timestamp, createdAt: now.toISOString(), read: false,
            link: `/doctor/dashboard?view=support&ticketId=${ticket.id}`
          });
        }
      }
    });
    // --- End Generate Notifications ---


    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const updatedNotifications = [...uniqueNewNotifications, ...doctorNotifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setDoctorNotifications(updatedNotifications);
      setDoctorUnreadCount(prev => prev + uniqueNewNotifications.length);
    }
  }, [doctorNotifications, user]);

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

  const value = { doctorNotifications, doctorUnreadCount, checkAndSetDoctorNotifications, markDoctorNotificationsAsRead };

  // --- Supabase Realtime para notificaciones instantáneas ---
  useEffect(() => {
    if (!user?.id || user.role !== 'doctor') {
      // Limpiar suscripción si el usuario no es doctor
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const now = getCurrentDateTimeInArgentina();

    // Crear canal de Realtime para escuchar cambios en appointments
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
          console.log('🔔 Nueva cita recibida en tiempo real:', payload);
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
      // Escuchar cambios en citas existentes (confirmaciones, cancelaciones, pagos)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `doctor_id=eq.${user.id}`
        },
        (payload) => {
          console.log('🔔 Actualización de cita recibida:', payload);
          const appt = payload.new as Record<string, unknown>;
          const oldAppt = payload.old as Record<string, unknown>;

          // Detectar cambio de estado de confirmación
          if (appt.patient_confirmation_status !== oldAppt.patient_confirmation_status) {
            const status = appt.patient_confirmation_status as string;
            if (status === 'Confirmada' || status === 'Cancelada') {
              const notification: DoctorNotification = {
                id: `confirm-${appt.id}-${status}-${Date.now()}`,
                type: status === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
                title: `Cita ${status}`,
                description: `${appt.patient_name || 'El paciente'} ha ${status.toLowerCase()} su cita.`,
                date: now.toISOString(),
                createdAt: now.toISOString(),
                read: false,
                link: `/doctor/dashboard?view=appointments`
              };
              addNotification(notification);
            }
          }

          // Detectar nuevo mensaje
          const newMessages = appt.messages as Array<Record<string, unknown>> | null;
          const oldMessages = oldAppt.messages as Array<Record<string, unknown>> | null;
          if (newMessages && (!oldMessages || newMessages.length > (oldMessages?.length || 0))) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.sender === 'patient') {
              const notification: DoctorNotification = {
                id: `msg-${appt.id}-${lastMessage.id || Date.now()}`,
                type: 'new_message',
                title: `Nuevo Mensaje de ${appt.patient_name || 'Paciente'}`,
                description: String(lastMessage.text || '').substring(0, 50) + '...',
                date: now.toISOString(),
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
          console.log('🔔 Actualización de pago recibida:', payload);
          const payment = payload.new as Record<string, unknown>;
          const oldPayment = payload.old as Record<string, unknown>;

          if (payment.status !== oldPayment.status &&
            (payment.status === 'Paid' || payment.status === 'Rejected')) {
            const notification: DoctorNotification = {
              id: `sub-${payment.id}-${payment.status}-${Date.now()}`,
              type: 'subscription_update',
              title: `Suscripción ${payment.status === 'Paid' ? 'Aprobada' : 'Rechazada'}`,
              description: `Tu pago de $${Number(payment.amount || 0).toFixed(2)} ha sido ${payment.status === 'Paid' ? 'aprobado' : 'rechazado'}.`,
              date: now.toISOString(),
              createdAt: now.toISOString(),
              read: false,
              link: '/doctor/dashboard?view=subscription'
            };
            addNotification(notification);
          }
        }
      )
      .subscribe((status) => {
        console.log(`📡 Estado de suscripción Realtime para doctor ${user.id}:`, status);
      });

    subscriptionRef.current = channel;

    // También hacer polling inicial y cada 60 segundos como backup
    const doctorId = user.id; // Capturamos el ID aquí ya que sabemos que existe
    async function fetchInitial() {
      const { getDoctorAppointments, getSupportTickets, getDoctorPayments } = await import('./supabaseService');
      const [appointments, supportTickets, doctorPayments] = await Promise.all([
        getDoctorAppointments(doctorId),
        getSupportTickets(),
        getDoctorPayments()
      ]);
      checkAndSetDoctorNotifications(appointments, supportTickets, doctorPayments);
    }

    fetchInitial();
    const interval = setInterval(fetchInitial, 60000); // Backup polling cada 60 segundos

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, addNotification, checkAndSetDoctorNotifications]);

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

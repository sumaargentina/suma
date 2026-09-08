"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { AdminNotification } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { supabase } from './supabase';
import { batchUpdateNotificationsAsRead, getDoctorPayments, getDoctors, getSupportTickets } from './supabaseService';

interface AdminNotificationContextType {
  adminNotifications: AdminNotification[];
  adminUnreadCount: number;
  checkAndSetAdminNotifications: (notifications: AdminNotification[]) => void;
  markAdminNotificationAsRead: (id: string) => void;
  markAdminNotificationsAsRead: () => void;
  clearReadAdminNotifications: () => void;
  clearAllAdminNotifications: () => void;
  refreshAdminNotifications: () => Promise<void>;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-admin-notifications-${userId}`;
const MAX_NOTIFICATIONS = 25;

const filterValidAdminNotifications = (list: AdminNotification[]): AdminNotification[] => {
  const now = new Date();
  return list.filter(n => {
    if (n.date && differenceInDays(now, new Date(n.date)) > 14) {
      return false;
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (user?.id && user.role === 'admin') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as AdminNotification[];
          const valid = filterValidAdminNotifications(parsed);
          setAdminNotifications(valid);
          setAdminUnreadCount(valid.filter(n => !n.read).length);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        } else {
          setAdminNotifications([]);
          setAdminUnreadCount(0);
        }
      } catch (e) {
        console.error("Failed to load admin notifications from localStorage", e);
        setAdminNotifications([]);
        setAdminUnreadCount(0);
      }
    } else {
      setAdminNotifications([]);
      setAdminUnreadCount(0);
    }
  }, [user]);

  const checkAndSetAdminNotifications = useCallback((notifications: AdminNotification[]) => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    const existingIds = new Set(adminNotifications.map(n => n.id));
    const now = new Date();
    const newNotificationsMap = new Map<string, AdminNotification>();

    notifications.forEach(n => {
      if (!existingIds.has(n.id)) {
        newNotificationsMap.set(n.id, {
          ...n,
          read: false,
          date: n.date || now.toISOString(),
        });
      }
    });

    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const filteredExisting = filterValidAdminNotifications(adminNotifications);
      const updatedNotifications = filterValidAdminNotifications([...uniqueNewNotifications, ...filteredExisting])
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setAdminNotifications(updatedNotifications);
      setAdminUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, [user, adminNotifications]);

  const refreshAdminNotifications = useCallback(async () => {
    if (user?.role !== 'admin') return;

    try {
      const [tickets, payments, doctors] = await Promise.all([
        getSupportTickets(),
        getDoctorPayments(),
        getDoctors(),
      ]);

      const paymentNotifications: AdminNotification[] = payments
        .filter(p => p.status === 'Pending' && !p.readByAdmin)
        .map(p => ({
          id: `payment-${p.id}`,
          type: 'payment',
          title: 'Pago Pendiente de Aprobación',
          description: `El Dr. ${p.doctorName} ha reportado un pago.`,
          date: p.date,
          read: false,
          link: `/admin/dashboard?view=finances`
        }));

      const ticketNotifications: AdminNotification[] = tickets
        .filter(t => !t.readByAdmin)
        .map(t => ({
          id: `ticket-${t.id}`,
          type: 'support_ticket',
          title: 'Nuevo Ticket de Soporte',
          description: `De: ${t.userName}`,
          date: t.date,
          read: false,
          link: `/admin/dashboard?view=support`
        }));

      const doctorNotifications: AdminNotification[] = doctors
        .filter(d => !d.readByAdmin)
        .map(d => ({
          id: `doctor-${d.id}`,
          type: 'new_doctor',
          title: 'Nuevo Médico Registrado',
          description: `El Dr. ${d.name} se ha unido a la plataforma.`,
          date: d.joinDate,
          read: false,
          link: `/admin/dashboard?view=doctors`
        }));

      const all = [...paymentNotifications, ...ticketNotifications, ...doctorNotifications];
      checkAndSetAdminNotifications(all);
    } catch (e) {
      console.error("Error refreshing admin notifications:", e);
    }
  }, [user, checkAndSetAdminNotifications]);

  // Marcar una notificación como leída
  const markAdminNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || user.role !== 'admin') return;

    const storageKey = getNotificationStorageKey(user.id);
    setAdminNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setAdminUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    const ticketIds = id.startsWith('ticket-') ? [id.replace('ticket-', '')] : [];
    const paymentIds = id.startsWith('payment-') ? [id.replace('payment-', '')] : [];
    const doctorIds = id.startsWith('doctor-') ? [id.replace('doctor-', '')] : [];

    if (ticketIds.length > 0 || paymentIds.length > 0 || doctorIds.length > 0) {
      await batchUpdateNotificationsAsRead(ticketIds, paymentIds, doctorIds).catch(console.error);
    }
  }, [user]);

  // Marcar todas como leídas
  const markAdminNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'admin' || adminUnreadCount === 0) return;

    const storageKey = getNotificationStorageKey(user.id);
    const updated = adminNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setAdminNotifications(updated);
    setAdminUnreadCount(0);

    const unreadTicketIds = adminNotifications
      .filter(n => n.type === 'support_ticket' && !n.read)
      .map(n => n.id.replace('ticket-', ''));

    const unreadPaymentIds = adminNotifications
      .filter(n => n.type === 'payment' && !n.read)
      .map(n => n.id.replace('payment-', ''));

    const unreadDoctorIds = adminNotifications
      .filter(n => n.type === 'new_doctor' && !n.read)
      .map(n => n.id.replace('doctor-', ''));

    if (unreadTicketIds.length > 0 || unreadPaymentIds.length > 0 || unreadDoctorIds.length > 0) {
      await batchUpdateNotificationsAsRead(unreadTicketIds, unreadPaymentIds, unreadDoctorIds).catch(console.error);
    }
  }, [adminNotifications, user, adminUnreadCount]);

  // Limpiar leídas
  const clearReadAdminNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    const remaining = adminNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setAdminNotifications(remaining);
    setAdminUnreadCount(remaining.length);
  }, [user, adminNotifications]);

  // Limpiar todas
  const clearAllAdminNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setAdminNotifications([]);
    setAdminUnreadCount(0);
  }, [user]);

  // Realtime para Admin
  useEffect(() => {
    if (!user?.id || user.role !== 'admin') {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    const channel = supabase
      .channel(`admin-live-notifications`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'doctors' },
        (payload) => {
          const doc = payload.new as any;
          checkAndSetAdminNotifications([{
            id: `doctor-${doc.id}`,
            type: 'new_doctor',
            title: 'Nuevo Médico Registrado',
            description: `El Dr. ${doc.name || 'Médico'} se ha unido a la plataforma.`,
            date: new Date().toISOString(),
            read: false,
            link: `/admin/dashboard?view=doctors`
          }]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'doctor_payments' },
        (payload) => {
          const payment = payload.new as any;
          checkAndSetAdminNotifications([{
            id: `payment-${payment.id}`,
            type: 'payment',
            title: 'Pago Pendiente de Aprobación',
            description: `Se ha reportado un nuevo pago de suscripción.`,
            date: new Date().toISOString(),
            read: false,
            link: `/admin/dashboard?view=finances`
          }]);
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    refreshAdminNotifications();
    const interval = setInterval(refreshAdminNotifications, 45000);

    return () => {
      clearInterval(interval);
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user, checkAndSetAdminNotifications, refreshAdminNotifications]);

  const value = {
    adminNotifications,
    adminUnreadCount,
    checkAndSetAdminNotifications,
    markAdminNotificationAsRead,
    markAdminNotificationsAsRead,
    clearReadAdminNotifications,
    clearAllAdminNotifications,
    refreshAdminNotifications
  };

  return (
    <AdminNotificationContext.Provider value={value}>
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (context === undefined) {
    throw new Error('useAdminNotifications must be used within an AdminNotificationProvider');
  }
  return context;
}
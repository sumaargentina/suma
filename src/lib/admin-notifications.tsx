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
const getDismissedStorageKey = (userId: string) => `suma-admin-notifications-dismissed-${userId}`;
const MAX_NOTIFICATIONS = 35;

const filterValidAdminNotifications = (list: AdminNotification[]): AdminNotification[] => {
  const now = new Date();
  return list.filter(n => {
    if (n.date && differenceInDays(now, new Date(n.date)) > 30) {
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

  const checkAndSetAdminNotifications = useCallback((incoming: AdminNotification[]) => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);

    setAdminNotifications(prev => {
      const prevMap = new Map(prev.map(item => [item.id, item]));
      const nowIso = new Date().toISOString();

      incoming.forEach(n => {
        if (dismissed.has(n.id)) return;
        const existing = prevMap.get(n.id);
        if (existing) {
          prevMap.set(n.id, {
            ...existing,
            title: n.title,
            description: n.description,
            link: n.link,
            read: existing.read || Boolean(n.read),
          });
        } else {
          prevMap.set(n.id, {
            ...n,
            read: Boolean(n.read),
            date: n.date || nowIso,
          });
        }
      });

      const merged = filterValidAdminNotifications(
        Array.from(prevMap.values())
          .filter(n => !dismissed.has(n.id))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          })
      );

      localStorage.setItem(storageKey, JSON.stringify(merged));
      setAdminUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  }, [user, getDismissedSet]);

  const refreshAdminNotifications = useCallback(async () => {
    if (user?.role !== 'admin') return;

    try {
      const [tickets, payments, doctors] = await Promise.all([
        getSupportTickets(),
        getDoctorPayments(),
        getDoctors(),
      ]);

      const paymentNotifications: AdminNotification[] = payments
        .slice(0, 15)
        .map(p => ({
          id: `payment-${p.id}`,
          type: 'payment',
          title: p.status === 'Pending' ? 'Pago Pendiente de Aprobación' : `Pago de Médico (${p.status === 'Paid' ? 'Aprobado' : 'Rechazado'})`,
          description: `El Dr(a). ${p.doctorName} reportó un pago de $${(p.amount || 0).toFixed(2)}.`,
          date: p.date,
          read: Boolean(p.readByAdmin) || p.status !== 'Pending',
          link: `/admin/dashboard?view=finances`
        }));

      const ticketNotifications: AdminNotification[] = tickets
        .slice(0, 15)
        .map(t => ({
          id: `ticket-${t.id}`,
          type: 'support_ticket',
          title: t.status === 'abierto' ? 'Ticket de Soporte Abierto' : 'Ticket de Soporte',
          description: `De: ${t.userName} — "${t.subject}"`,
          date: t.date,
          read: Boolean(t.readByAdmin),
          link: `/admin/dashboard?view=support`
        }));

      const doctorNotifications: AdminNotification[] = doctors
        .slice(0, 15)
        .map(d => ({
          id: `doctor-${d.id}`,
          type: 'new_doctor',
          title: d.verificationStatus === 'pending' ? 'Médico Pendiente por Verificar' : 'Nuevo Médico Registrado',
          description: `Dr(a). ${d.name} (${d.specialty}) — ${d.verificationStatus === 'verified' ? 'Verificado' : 'Por verificar'}.`,
          date: d.joinDate,
          read: Boolean(d.readByAdmin) && d.verificationStatus === 'verified',
          link: `/admin/dashboard?view=doctors`
        }));

      const all = [...paymentNotifications, ...ticketNotifications, ...doctorNotifications];
      checkAndSetAdminNotifications(all);
    } catch (e) {
      console.error("Error refreshing admin notifications:", e);
    }
  }, [user, checkAndSetAdminNotifications]);

  // Marcar una notificación como revisada
  const markAdminNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || user.role !== 'admin') return;

    const storageKey = getNotificationStorageKey(user.id);
    setAdminNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setAdminUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    const ticketIds = id.startsWith('ticket-') ? [id.replace(/^ticket-/, '')] : [];
    const paymentIds = id.startsWith('payment-') ? [id.replace(/^payment-/, '')] : [];
    const doctorIds = id.startsWith('doctor-') ? [id.replace(/^doctor-/, '')] : [];

    if (ticketIds.length > 0 || paymentIds.length > 0 || doctorIds.length > 0) {
      await batchUpdateNotificationsAsRead(ticketIds, paymentIds, doctorIds).catch(console.error);
    }
  }, [user]);

  // Marcar todas como revisadas
  const markAdminNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'admin' || adminUnreadCount === 0) return;

    const unreadList = adminNotifications.filter(n => !n.read);
    const storageKey = getNotificationStorageKey(user.id);
    const updated = adminNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setAdminNotifications(updated);
    setAdminUnreadCount(0);

    const unreadTicketIds = unreadList
      .filter(n => n.type === 'support_ticket')
      .map(n => n.id.replace(/^ticket-/, ''));

    const unreadPaymentIds = unreadList
      .filter(n => n.type === 'payment')
      .map(n => n.id.replace(/^payment-/, ''));

    const unreadDoctorIds = unreadList
      .filter(n => n.type === 'new_doctor')
      .map(n => n.id.replace(/^doctor-/, ''));

    if (unreadTicketIds.length > 0 || unreadPaymentIds.length > 0 || unreadDoctorIds.length > 0) {
      await batchUpdateNotificationsAsRead(unreadTicketIds, unreadPaymentIds, unreadDoctorIds).catch(console.error);
    }
  }, [adminNotifications, user, adminUnreadCount]);

  // Limpiar revisadas
  const clearReadAdminNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    const readIds = adminNotifications.filter(n => n.read).map(n => n.id);
    addDismissedIds(user.id, readIds);
    const remaining = adminNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setAdminNotifications(remaining);
    setAdminUnreadCount(remaining.length);
  }, [user, adminNotifications, addDismissedIds]);

  // Limpiar todas
  const clearAllAdminNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'admin') return;
    const storageKey = getNotificationStorageKey(user.id);
    addDismissedIds(user.id, adminNotifications.map(n => n.id));
    localStorage.removeItem(storageKey);
    setAdminNotifications([]);
    setAdminUnreadCount(0);
  }, [user, adminNotifications, addDismissedIds]);

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
            title: 'Médico Pendiente por Verificar',
            description: `El Dr(a). ${doc.name || 'Médico'} se ha registrado y requiere verificación.`,
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

"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { SellerNotification, AdminSupportTicket, SellerPayment, Doctor } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { getCurrentDateTimeInArgentina } from './utils';

interface SellerNotificationContextType {
  sellerNotifications: SellerNotification[];
  sellerUnreadCount: number;
  checkAndSetSellerNotifications: (
    doctors: Doctor[],
    supportTickets: AdminSupportTicket[],
    sellerPayments: SellerPayment[]
  ) => void;
  markSellerNotificationAsRead: (id: string) => void;
  markSellerNotificationsAsRead: () => void;
  clearReadSellerNotifications: () => void;
  clearAllSellerNotifications: () => void;
}

const SellerNotificationContext = createContext<SellerNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-seller-notifications-${userId}`;
const getDismissedStorageKey = (userId: string) => `suma-seller-notifications-dismissed-${userId}`;
const MAX_NOTIFICATIONS = 30;

const filterValidSellerNotifications = (list: SellerNotification[]): SellerNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 30) {
      return false;
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function SellerNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sellerNotifications, setSellerNotifications] = useState<SellerNotification[]>([]);
  const [sellerUnreadCount, setSellerUnreadCount] = useState(0);

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
    if (user?.id && user.role === 'seller') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as SellerNotification[];
          const valid = filterValidSellerNotifications(parsed);
          setSellerNotifications(valid);
          setSellerUnreadCount(valid.filter(n => !n.read).length);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        } else {
          setSellerNotifications([]);
          setSellerUnreadCount(0);
        }
      } catch (e) {
        console.error("Failed to load seller notifications from localStorage", e);
      }
    } else {
      setSellerNotifications([]);
      setSellerUnreadCount(0);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id && user.role === 'seller') {
      const allKeys = Object.keys(localStorage);
      const sellerNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-seller-notifications-') &&
        !key.startsWith('suma-seller-notifications-dismissed-') &&
        key !== getNotificationStorageKey(user.id)
      );
      sellerNotificationKeys.forEach(key => localStorage.removeItem(key));
    }
  }, [user]);

  const checkAndSetSellerNotifications = useCallback((
    doctors: Doctor[],
    supportTickets: AdminSupportTicket[],
    sellerPayments: SellerPayment[]
  ) => {
    if (!user?.id || user.role !== 'seller') return;

    const storageKey = getNotificationStorageKey(user.id);
    const dismissed = getDismissedSet(user.id);
    const now = getCurrentDateTimeInArgentina();

    setSellerNotifications(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n]));

      const upsert = (notif: SellerNotification) => {
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

      // 1. Médicos referidos (Registrados y Verificados)
      const sellerReferredDoctors = doctors.filter(doc => doc.sellerId === user.id);
      sellerReferredDoctors.forEach(doc => {
        upsert({
          id: `new-doctor-${doc.id}`,
          type: 'new_doctor_registered',
          title: '¡Nuevo Médico Referido!',
          description: `El Dr(a). ${doc.name} (${doc.specialty}) se registró con tu código.`,
          date: doc.joinDate,
          createdAt: now.toISOString(),
          read: Boolean(doc.readBySeller),
          link: '/seller/dashboard?view=referrals'
        });

        if (doc.verificationStatus === 'verified') {
          upsert({
            id: `verified-doctor-${doc.id}`,
            type: 'new_doctor_registered',
            title: '✅ Médico Referido Verificado',
            description: `El Dr(a). ${doc.name} ya fue verificado por el administrador y está activo.`,
            date: doc.joinDate,
            createdAt: now.toISOString(),
            read: prevMap.get(`verified-doctor-${doc.id}`)?.read ?? false,
            link: '/seller/dashboard?view=referrals'
          });
        }
      });

      // 2. Comisiones Recurrentes (Pendientes y Pagadas)
      const sellerPaymentsFiltered = sellerPayments.filter(payment => payment.sellerId === user.id);
      sellerPaymentsFiltered.forEach(payment => {
        if (payment.status === 'pending') {
          upsert({
            id: `commission-pending-${payment.id}`,
            type: 'payment_processed',
            title: '💸 Nueva Comisión Recurrente Acumulada',
            description: `Tienes $${payment.amount.toFixed(2)} en comisiones pendientes del período ${payment.period}.`,
            date: payment.paymentDate,
            createdAt: now.toISOString(),
            read: Boolean(payment.readBySeller),
            link: '/seller/dashboard?view=finances'
          });
        } else if (payment.status === 'paid') {
          upsert({
            id: `payment-processed-${payment.id}`,
            type: 'payment_processed',
            title: '¡Has recibido un pago de SUMA!',
            description: `SUMA te ha pagado $${payment.amount.toFixed(2)} por tus comisiones de ${payment.period}.`,
            date: payment.paymentDate,
            createdAt: now.toISOString(),
            read: Boolean(payment.readBySeller),
            link: '/seller/dashboard?view=finances'
          });
        }
      });

      // 3. Respuestas de soporte
      const sellerSupportTickets = supportTickets.filter(ticket =>
        ticket.userRole === 'seller' && ticket.userId === user.email
      );
      sellerSupportTickets.forEach(ticket => {
        const lastMessage = ticket.messages?.slice(-1)[0];
        if (lastMessage?.sender === 'admin') {
          upsert({
            id: `support-reply-${ticket.id}__${lastMessage.id}`,
            type: 'support_reply',
            title: 'Respuesta de Soporte',
            description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
            date: lastMessage.timestamp,
            createdAt: now.toISOString(),
            read: Boolean(ticket.readBySeller),
            link: '/seller/dashboard?view=support'
          });
        }
      });

      const merged = filterValidSellerNotifications(
        Array.from(prevMap.values())
          .filter(n => !dismissed.has(n.id))
          .sort((a, b) => {
            if (a.read !== b.read) return a.read ? 1 : -1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          })
      );

      localStorage.setItem(storageKey, JSON.stringify(merged));
      setSellerUnreadCount(merged.filter(n => !n.read).length);
      return merged;
    });
  }, [user, getDismissedSet]);

  const markSellerNotificationAsRead = useCallback(async (id: string) => {
    if (!user?.id || user.role !== 'seller') return;

    const storageKey = getNotificationStorageKey(user.id);
    setSellerNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSellerUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });

    try {
      const doctorIds = id.startsWith('new-doctor-') ? [id.replace(/^new-doctor-/, '')] : [];
      const sellerPaymentIds = id.startsWith('payment-processed-')
        ? [id.replace(/^payment-processed-/, '')]
        : id.startsWith('commission-pending-')
          ? [id.replace(/^commission-pending-/, '')]
          : [];
      const ticketIds = id.startsWith('support-reply-')
        ? [id.replace(/^support-reply-/, '').split('__')[0]]
        : [];

      if (doctorIds.length > 0 || sellerPaymentIds.length > 0 || ticketIds.length > 0) {
        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'seller', doctorIds, sellerPaymentIds, ticketIds }),
        });
      }
    } catch (e) {
      console.error("Failed to mark seller notification read in API", e);
    }
  }, [user]);

  const markSellerNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'seller' || sellerUnreadCount === 0) return;

    const unreadNotifications = sellerNotifications.filter(n => !n.read);
    const storageKey = getNotificationStorageKey(user.id);
    const updated = sellerNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSellerNotifications(updated);
    setSellerUnreadCount(0);

    if (unreadNotifications.length === 0) return;

    const doctorIds = unreadNotifications
      .filter(n => n.id.startsWith('new-doctor-'))
      .map(n => n.id.replace(/^new-doctor-/, ''));
    const sellerPaymentIds = unreadNotifications
      .filter(n => n.id.startsWith('payment-processed-') || n.id.startsWith('commission-pending-'))
      .map(n => n.id.replace(/^(payment-processed-|commission-pending-)/, ''));
    const ticketIds = unreadNotifications
      .filter(n => n.id.startsWith('support-reply-'))
      .map(n => n.id.replace(/^support-reply-/, '').split('__')[0]);

    try {
      if (doctorIds.length > 0 || sellerPaymentIds.length > 0 || ticketIds.length > 0) {
        await fetch('/api/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'seller', doctorIds, sellerPaymentIds, ticketIds }),
        });
      }
    } catch (e) {
      console.error("Failed to mark seller notifications as read in API", e);
    }
  }, [sellerNotifications, user, sellerUnreadCount]);

  const clearReadSellerNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'seller') return;
    const storageKey = getNotificationStorageKey(user.id);
    const readIds = sellerNotifications.filter(n => n.read).map(n => n.id);
    addDismissedIds(user.id, readIds);
    const remaining = sellerNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setSellerNotifications(remaining);
    setSellerUnreadCount(remaining.length);
  }, [user, sellerNotifications, addDismissedIds]);

  const clearAllSellerNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'seller') return;
    const storageKey = getNotificationStorageKey(user.id);
    addDismissedIds(user.id, sellerNotifications.map(n => n.id));
    localStorage.removeItem(storageKey);
    setSellerNotifications([]);
    setSellerUnreadCount(0);
  }, [user, sellerNotifications, addDismissedIds]);

  // Carga inicial y actualización periódica cada 45 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    async function fetchAndCheck() {
      if (user?.id && user.role === 'seller') {
        try {
          const { getSellerPayments, getSupportTickets, getDoctors } = await import('./supabaseService');
          const [sellerPayments, supportTickets, referredDoctors] = await Promise.all([
            getSellerPayments(),
            getSupportTickets(),
            getDoctors()
          ]);
          checkAndSetSellerNotifications(referredDoctors, supportTickets, sellerPayments);
        } catch (err) {
          console.warn('Error syncing seller notifications:', err);
        }
      }
    }
    if (user?.id && user.role === 'seller') {
      fetchAndCheck();
      interval = setInterval(fetchAndCheck, 45000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, checkAndSetSellerNotifications]);

  const value = {
    sellerNotifications,
    sellerUnreadCount,
    checkAndSetSellerNotifications,
    markSellerNotificationAsRead,
    markSellerNotificationsAsRead,
    clearReadSellerNotifications,
    clearAllSellerNotifications
  };

  return (
    <SellerNotificationContext.Provider value={value}>
      {children}
    </SellerNotificationContext.Provider>
  );
}

export function useSellerNotifications() {
  const context = useContext(SellerNotificationContext);
  if (context === undefined) {
    throw new Error('useSellerNotifications must be used within a SellerNotificationProvider');
  }
  return context;
}

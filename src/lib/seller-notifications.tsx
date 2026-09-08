"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { SellerNotification, AdminSupportTicket, SellerPayment, Doctor } from './types';
import { differenceInDays } from 'date-fns';
import { useAuth } from './auth';
import { supabase } from './supabase';
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
const MAX_NOTIFICATIONS = 25;

const filterValidSellerNotifications = (list: SellerNotification[]): SellerNotification[] => {
  const now = getCurrentDateTimeInArgentina();
  return list.filter(n => {
    if (n.createdAt && differenceInDays(now, new Date(n.createdAt)) > 14) {
      return false;
    }
    return true;
  }).slice(0, MAX_NOTIFICATIONS);
};

export function SellerNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sellerNotifications, setSellerNotifications] = useState<SellerNotification[]>([]);
  const [sellerUnreadCount, setSellerUnreadCount] = useState(0);

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

  // Limpiar notificaciones de otros usuarios cuando cambie el usuario
  useEffect(() => {
    if (user?.id && user.role === 'seller') {
      const allKeys = Object.keys(localStorage);
      const sellerNotificationKeys = allKeys.filter(key =>
        key.startsWith('suma-seller-notifications-') &&
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
    const newNotificationsMap = new Map<string, SellerNotification>();
    const now = getCurrentDateTimeInArgentina();

    const existingIds = new Set(sellerNotifications.map(n => n.id));

    // 1. New Doctor Registered
    const sellerReferredDoctors = doctors.filter(doc => doc.sellerId === user.id);
    sellerReferredDoctors.forEach(doc => {
      if (!doc.readBySeller) {
        const id = `new-doctor-${doc.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'new_doctor_registered',
            title: '¡Nuevo Referido!',
            description: `El Dr. ${doc.name} se ha registrado con tu código.`,
            date: doc.joinDate,
            createdAt: now.toISOString(),
            read: false,
            link: '/seller/dashboard?view=referrals'
          });
        }
      }
    });

    // 2. Payment Processed
    const sellerPaymentsFiltered = sellerPayments.filter(payment => payment.sellerId === user.id);
    sellerPaymentsFiltered.forEach(payment => {
      if (!payment.readBySeller) {
        const id = `payment-processed-${payment.id}`;
        if (!existingIds.has(id)) {
          newNotificationsMap.set(id, {
            id,
            type: 'payment_processed',
            title: '¡Has recibido un pago!',
            description: `SUMA te ha pagado $${payment.amount.toFixed(2)} por tus comisiones de ${payment.period}.`,
            date: payment.paymentDate,
            createdAt: now.toISOString(),
            read: false,
            link: '/seller/dashboard?view=finances'
          });
        }
      }
    });

    // 3. Support Ticket Replies
    const sellerSupportTickets = supportTickets.filter(ticket =>
      ticket.userRole === 'seller' && ticket.userId === user.email
    );
    sellerSupportTickets.forEach(ticket => {
      if (!ticket.readBySeller) {
        const lastMessage = ticket.messages?.slice(-1)[0];
        if (lastMessage?.sender === 'admin') {
          const id = `support-reply-${ticket.id}-${lastMessage.id}`;
          if (!existingIds.has(id)) {
            newNotificationsMap.set(id, {
              id,
              type: 'support_reply',
              title: 'Respuesta de Soporte',
              description: `El equipo de SUMA ha respondido a tu ticket: "${ticket.subject}"`,
              date: lastMessage.timestamp,
              createdAt: now.toISOString(),
              read: false,
              link: '/seller/dashboard?view=support'
            });
          }
        }
      }
    });

    if (newNotificationsMap.size > 0) {
      const uniqueNewNotifications = Array.from(newNotificationsMap.values());
      const filteredExisting = filterValidSellerNotifications(sellerNotifications);
      const updatedNotifications = filterValidSellerNotifications([...uniqueNewNotifications, ...filteredExisting])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setSellerNotifications(updatedNotifications);
      setSellerUnreadCount(updatedNotifications.filter(n => !n.read).length);
    }
  }, [user, sellerNotifications]);

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
      if (id.startsWith('new-doctor-')) {
        await supabase.from('doctors').update({ read_by_seller: true }).eq('id', id.replace('new-doctor-', ''));
      } else if (id.startsWith('payment-processed-')) {
        await supabase.from('seller_payments').update({ read_by_seller: true }).eq('id', id.replace('payment-processed-', ''));
      }
    } catch (e) {
      console.error("Failed to mark seller notification read in Supabase", e);
    }
  }, [user]);

  const markSellerNotificationsAsRead = useCallback(async () => {
    if (!user?.id || user.role !== 'seller' || sellerUnreadCount === 0) return;

    const storageKey = getNotificationStorageKey(user.id);
    const updated = sellerNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setSellerNotifications(updated);
    setSellerUnreadCount(0);

    const unreadNotifications = sellerNotifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    const doctorIds = unreadNotifications.filter(n => n.type === 'new_doctor_registered').map(n => n.id.replace('new-doctor-', ''));
    const paymentIds = unreadNotifications.filter(n => n.type === 'payment_processed').map(n => n.id.replace('payment-processed-', ''));
    const ticketIds = unreadNotifications.filter(n => n.type === 'support_reply').map(n => n.id.split('-')[2]);

    try {
      const updates = [];
      if (doctorIds.length > 0) {
        updates.push(supabase.from('doctors').update({ read_by_seller: true }).in('id', doctorIds));
      }
      if (paymentIds.length > 0) {
        updates.push(supabase.from('seller_payments').update({ read_by_seller: true }).in('id', paymentIds));
      }
      if (ticketIds.length > 0) {
        updates.push(supabase.from('support_tickets').update({ read_by_seller: true }).in('id', ticketIds));
      }
      await Promise.all(updates);
    } catch (e) {
      console.error("Failed to mark seller notifications as read in Supabase", e);
    }
  }, [sellerNotifications, user, sellerUnreadCount]);

  const clearReadSellerNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'seller') return;
    const storageKey = getNotificationStorageKey(user.id);
    const remaining = sellerNotifications.filter(n => !n.read);
    localStorage.setItem(storageKey, JSON.stringify(remaining));
    setSellerNotifications(remaining);
    setSellerUnreadCount(remaining.length);
  }, [user, sellerNotifications]);

  const clearAllSellerNotifications = useCallback(() => {
    if (!user?.id || user.role !== 'seller') return;
    const storageKey = getNotificationStorageKey(user.id);
    localStorage.removeItem(storageKey);
    setSellerNotifications([]);
    setSellerUnreadCount(0);
  }, [user]);

  // Actualización periódica cada 45 segundos
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    async function fetchAndCheck() {
      if (user?.id && user.role === 'seller') {
        const { getSellerPayments, getSupportTickets, getDoctors } = await import('./supabaseService');
        const [sellerPayments, supportTickets, referredDoctors] = await Promise.all([
          getSellerPayments(),
          getSupportTickets(),
          getDoctors()
        ]);
        checkAndSetSellerNotifications(referredDoctors, supportTickets, sellerPayments);
      }
    }
    if (user?.id && user.role === 'seller') {
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

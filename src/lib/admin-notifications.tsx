"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { AdminNotification } from './types';
import { useAuth } from './auth';


interface AdminNotificationContextType {
  adminNotifications: AdminNotification[];
  adminUnreadCount: number;
  checkAndSetAdminNotifications: (notifications: AdminNotification[]) => void;
  markAdminNotificationsAsRead: () => void;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-admin-notifications-${userId}`;

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id && user.role === 'admin') {
      try {
        const storageKey = getNotificationStorageKey(user.id);
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as AdminNotification[];
          setAdminNotifications(parsed);
          setAdminUnreadCount(parsed.filter(n => !n.read).length);
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
      const updatedNotifications = [...uniqueNewNotifications, ...adminNotifications]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
      setAdminNotifications(updatedNotifications);
      setAdminUnreadCount(prev => prev + uniqueNewNotifications.length);
    }
  }, [user, adminNotifications]);

  const markAdminNotificationsAsRead = useCallback(() => {
    if (!user?.id || user.role !== 'admin' || adminUnreadCount === 0) return;
    const storageKey = getNotificationStorageKey(user.id);
    const updated = adminNotifications.map(n => ({ ...n, read: true }));
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setAdminNotifications(updated);
    setAdminUnreadCount(0);
    // Aquí podrías agregar lógica para marcar como leídas en Firestore si lo deseas
  }, [adminNotifications, user, adminUnreadCount]);

  // --- NUEVO: Actualización automática de notificaciones cada 30 segundos ---
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    async function fetchAndCheck() {
      if (user?.id && user.role === 'admin') {
        // Importación dinámica para evitar ciclo circular
        const { getAdminNotifications } = await import('./supabaseService');
        const notifications = await getAdminNotifications();
        checkAndSetAdminNotifications(notifications);
      }
    }
    if (user?.id && user.role === 'admin') {
      interval = setInterval(fetchAndCheck, 30000); // cada 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, checkAndSetAdminNotifications]);



  const value = { adminNotifications, adminUnreadCount, checkAndSetAdminNotifications, markAdminNotificationsAsRead };

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
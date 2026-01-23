
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect, useRef } from 'react';
import type { Appointment, ClinicNotification, AdminSupportTicket, DoctorPayment } from './types';
import { useAuth } from './auth';
import { batchUpdateDoctorAppointmentsAsRead } from './supabaseService';
import { getCurrentDateTimeInArgentina } from './utils';
import { supabase } from './supabase';
import { getClinicAppointments, getSupportTickets, getDoctorPayments } from './supabaseService';

interface ClinicNotificationContextType {
    clinicNotifications: ClinicNotification[];
    clinicUnreadCount: number;
    checkAndSetClinicNotifications: (
        appointments: Appointment[]
    ) => void;
    markClinicNotificationsAsRead: () => void;
}

const ClinicNotificationContext = createContext<ClinicNotificationContextType | undefined>(undefined);
const getNotificationStorageKey = (userId: string) => `suma-clinic-notifications-${userId}`;

export function ClinicNotificationProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [clinicNotifications, setClinicNotifications] = useState<ClinicNotification[]>([]);
    const [clinicUnreadCount, setClinicUnreadCount] = useState(0);

    // Helpers to identify role
    const isClinicUser = user?.role === 'clinic' || user?.role === 'secretary';

    useEffect(() => {
        if (user?.id && isClinicUser) {
            try {
                const storageKey = getNotificationStorageKey(user.id);
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const parsed = JSON.parse(stored) as ClinicNotification[];
                    setClinicNotifications(parsed);
                    setClinicUnreadCount(parsed.filter(n => !n.read).length);
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

    // Limpiar notificaciones de otros usuarios cuando cambie el usuario
    useEffect(() => {
        if (user?.id && isClinicUser) {
            const allKeys = Object.keys(localStorage);
            const clinicNotificationKeys = allKeys.filter(key =>
                key.startsWith('suma-clinic-notifications-') &&
                key !== getNotificationStorageKey(user.id)
            );
            clinicNotificationKeys.forEach(key => localStorage.removeItem(key));
        }
    }, [user, isClinicUser]);

    const addNotification = useCallback((notification: ClinicNotification) => {
        if (!user?.id || !isClinicUser) return;

        const storageKey = getNotificationStorageKey(user.id);

        setClinicNotifications(prev => {
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

        setClinicUnreadCount(prev => prev + 1);
    }, [user, isClinicUser]);

    const checkAndSetClinicNotifications = useCallback((
        appointments: Appointment[]
    ) => {
        if (!user?.id || !isClinicUser) return;

        const storageKey = getNotificationStorageKey(user.id);
        const newNotificationsMap = new Map<string, ClinicNotification>();
        const now = getCurrentDateTimeInArgentina();

        const existingIds = new Set(clinicNotifications.map(n => n.id));

        // --- Generate Notifications ---

        appointments.forEach(appt => {
            // 1. New Appointment (Using readByDoctor as proxy for clinic read/unread for now)
            if (appt.readByDoctor === false) {
                const id = `new-appt-${appt.id}`;
                if (!existingIds.has(id)) {
                    newNotificationsMap.set(id, {
                        id, type: 'new_appointment', title: '¡Nueva Cita!',
                        description: `Paciente: ${appt.patientName}. Fecha: ${appt.date} ${appt.time}.`,
                        date: appt.date, createdAt: now.toISOString(), read: false,
                        link: `/clinic/dashboard?tab=agenda`
                    });
                }
            }

            // 2. Payment Verification needed
            if (appt.paymentMethod === 'transferencia' && appt.paymentStatus === 'Pendiente') {
                const id = `verify-${appt.id}`;
                if (!existingIds.has(id)) {
                    newNotificationsMap.set(id, {
                        id, type: 'payment_verification', title: 'Verificación de Pago',
                        description: `Pago pendiente para cita de ${appt.patientName}.`,
                        date: appt.date, createdAt: now.toISOString(), read: false,
                        link: `/clinic/dashboard?tab=agenda`
                    });
                }
            }
            // 3. Status changes
            if (appt.patientConfirmationStatus === 'Confirmada' || appt.patientConfirmationStatus === 'Cancelada') {
                const id = `confirm-${appt.id}-${appt.patientConfirmationStatus}`;
                if (!existingIds.has(id)) {
                    newNotificationsMap.set(id, {
                        id, type: appt.patientConfirmationStatus === 'Confirmada' ? 'patient_confirmed' : 'patient_cancelled',
                        title: `Cita ${appt.patientConfirmationStatus}`,
                        description: `${appt.patientName} ha ${appt.patientConfirmationStatus.toLowerCase()} su cita.`,
                        date: `${appt.date}T${appt.time || '00:00'}`, createdAt: now.toISOString(), read: false,
                        link: `/clinic/dashboard?tab=agenda`
                    });
                }
            }
        });

        // --- End Generate Notifications ---

        if (newNotificationsMap.size > 0) {
            const uniqueNewNotifications = Array.from(newNotificationsMap.values());
            const updatedNotifications = [...uniqueNewNotifications, ...clinicNotifications]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            localStorage.setItem(storageKey, JSON.stringify(updatedNotifications));
            setClinicNotifications(updatedNotifications);
            setClinicUnreadCount(prev => prev + uniqueNewNotifications.length);
        }
    }, [clinicNotifications, user, isClinicUser]);

    const markClinicNotificationsAsRead = useCallback(async () => {
        if (!user?.id || !isClinicUser || clinicUnreadCount === 0) return;

        const storageKey = getNotificationStorageKey(user.id);
        const updated = clinicNotifications.map(n => ({ ...n, read: true }));
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setClinicNotifications(updated);
        setClinicUnreadCount(0);

        const unreadNotifications = clinicNotifications.filter(n => !n.read);

        // Opcional: Marcar en backend también como leídas (usando readByDoctor como proxy)
        // Esto es un side-effect: Si la secretaria marca como leído, el doctor también lo verá leído.
        // Es aceptable para un entorno colaborativo.
        const appointmentIdsToUpdate = unreadNotifications
            .filter(n => n.type === 'new_appointment')
            .map(n => n.id.replace('new-appt-', ''));

        if (appointmentIdsToUpdate.length > 0) {
            try {
                await batchUpdateDoctorAppointmentsAsRead(appointmentIdsToUpdate);
            } catch (error) {
                console.error("Error updating backend read status", error);
            }
        }

    }, [clinicNotifications, user, clinicUnreadCount, isClinicUser]);

    const value = { clinicNotifications, clinicUnreadCount, checkAndSetClinicNotifications, markClinicNotificationsAsRead };

    // Polling Logic
    useEffect(() => {
        if (!user?.id || !isClinicUser) return;

        const clinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;

        if (!clinicId) return;

        const fetchInitial = async () => {
            try {
                const appointments = await getClinicAppointments(clinicId);
                checkAndSetClinicNotifications(appointments);
            } catch (error) {
                console.error("Error fetching clinic appointments for notifications", error);
            }
        };

        fetchInitial();
        const interval = setInterval(fetchInitial, 30000); // Polling every 30s

        return () => clearInterval(interval);
    }, [user, isClinicUser, checkAndSetClinicNotifications]);

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

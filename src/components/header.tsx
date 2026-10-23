
"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/notifications";
import { useDoctorNotifications } from "@/lib/doctor-notifications";
import { useSellerNotifications } from "@/lib/seller-notifications";
import { useClinicNotifications } from "@/lib/clinic-notifications";
import { useAdminNotifications } from "@/lib/admin-notifications";
import { useChatNotifications } from "@/lib/chat-notifications";
import * as supabaseService from "@/lib/supabaseService";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { type AdminNotification, type DoctorNotification, type PatientNotification, type SellerNotification, type ClinicNotification } from "@/lib/types";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Bell,
  BellRing,
  CheckCircle,
  ClipboardList,
  CreditCard,
  DollarSign,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Stethoscope,
  Ticket,
  UserPlus,
  XCircle,
  Heart,
  User,
  Users,
  Home,
  Search,
  Bot,
  LayoutDashboard,
  LogIn,
  Menu,
  Building2,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { MobileMenuBackground } from "@/components/MobileMenuBackground";
import { WorkspaceSwitcherHeader } from "@/components/doctor/workspace-switcher-header";
import { BcvRateWidget } from "@/components/admin/bcv-rate-widget";
import { useSettings } from "@/lib/settings";
import { resolveDoctorCapabilities } from "@/lib/professions-catalog";


interface UnifiedNotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  date?: string;
  read: boolean;
  link: string;
}

export function NotificationBellPopover({
  items,
  unreadCount,
  onMarkOneAsRead,
  onMarkAllAsRead,
  onClearRead,
  getIcon,
  formatDate,
}: {
  items: UnifiedNotificationItem[];
  unreadCount: number;
  onMarkOneAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearRead: () => void;
  getIcon?: (type: any) => React.ReactNode;
  formatDate?: (dateStr?: string) => string;
}) {
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('all');
  const readCount = items.filter(n => n.read).length;
  const pendingCount = items.filter(n => !n.read).length;

  const defaultFormatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  };

  const defaultGetIcon = (type: string) => {
    switch (type) {
      case 'payment':
      case 'payment_processed':
      case 'payment_verification':
        return <DollarSign className="h-4 w-4 text-amber-500" />;
      case 'patient_confirmed':
      case 'payment_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'patient_cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'new_message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'support_ticket':
      case 'support_reply':
        return <LifeBuoy className="h-4 w-4 text-orange-500" />;
      default:
        return <BellRing className="h-4 w-4 text-primary" />;
    }
  };

  const renderIcon = getIcon || defaultGetIcon;
  const renderDate = formatDate || defaultFormatDate;

  const filteredItems = items.filter(n => {
    if (filter === 'pending') return !n.read;
    if (filter === 'reviewed') return n.read;
    return true;
  });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ml-1" title="Centro de Notificaciones">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
              {unreadCount}
            </span>
          )}
          <span className="sr-only">Ver notificaciones</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-3">
        {/* Cabecera de resumen */}
        <div className="flex flex-col gap-2 pb-2.5 mb-2 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-primary" />
              Notificaciones
            </h4>
            <div className="flex items-center gap-1">
              {pendingCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-primary hover:text-primary/80 font-medium"
                  onClick={onMarkAllAsRead}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Marcar todas
                </Button>
              )}
              {readCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] px-2 text-muted-foreground hover:text-red-500"
                  onClick={onClearRead}
                  title="Limpiar las ya revisadas"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpiar revisadas
                </Button>
              )}
            </div>
          </div>

          {/* Indicadores de cuántas faltan y cuántas ya se revisaron */}
          <div className="flex items-center gap-2 text-[11px]">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold",
                pendingCount > 0
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", pendingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-slate-400")} />
              {pendingCount} {pendingCount === 1 ? 'falta por revisar' : 'faltan por revisar'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCheck className="h-3 w-3" />
              {readCount} {readCount === 1 ? 'revisada' : 'revisadas'}
            </span>
          </div>

          {/* Pestañas de filtro rápido */}
          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={cn(
                  "py-1 rounded-md font-medium transition-colors",
                  filter === 'all' ? "bg-background shadow-2xs text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todas ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('pending')}
                className={cn(
                  "py-1 rounded-md font-medium transition-colors",
                  filter === 'pending' ? "bg-background shadow-2xs text-amber-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Faltan ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setFilter('reviewed')}
                className={cn(
                  "py-1 rounded-md font-medium transition-colors",
                  filter === 'reviewed' ? "bg-background shadow-2xs text-emerald-700 font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Revisadas ({readCount})
              </button>
            </div>
          )}
        </div>

        {/* Lista de notificaciones */}
        {filteredItems.length > 0 ? (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {filteredItems.map(n => (
              <div
                key={n.id}
                className={cn(
                  "p-2.5 rounded-lg flex items-start gap-2.5 transition-colors border",
                  n.read
                    ? "bg-slate-50/60 hover:bg-muted/50 border-slate-200/70 opacity-85"
                    : "bg-blue-50/75 hover:bg-blue-50 border-blue-200 border-l-4 border-l-blue-600 shadow-2xs"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {renderIcon(n.type)}
                </div>
                <Link
                  href={n.link}
                  onClick={() => onMarkOneAsRead(n.id)}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-0.5">
                    <p className={cn("text-xs truncate", n.read ? "font-medium text-slate-700" : "font-bold text-slate-900")}>
                      {n.title}
                    </p>
                    {n.read ? (
                      <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                        <CheckCheck className="h-2.5 w-2.5" /> Revisada
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" /> Falta revisar
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.description}</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">{renderDate(n.date)}</p>
                </Link>
                {!n.read && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 text-blue-600 hover:text-emerald-600 hover:bg-emerald-50"
                    title="Marcar como ya revisada"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onMarkOneAsRead(n.id);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <CheckCircle className="h-7 w-7 text-emerald-500/70 mb-1.5" />
            <p className="text-xs font-medium">
              {filter === 'pending'
                ? '¡No faltan notificaciones por revisar!'
                : filter === 'reviewed'
                  ? 'Aún no hay notificaciones marcadas como revisadas.'
                  : 'Estás al día'}
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              {filter === 'all' ? 'No tienes notificaciones registradas.' : 'Cambia el filtro superior para ver el resto.'}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function Header() {
  const { user, logout, activeWorkspace } = useAuth();
  const { professionsCatalog } = useSettings();
  const doctorCapabilities = resolveDoctorCapabilities(user?.role === 'doctor' ? user : null, professionsCatalog);
  const { notifications, unreadCount, markNotificationAsRead, markAllAsRead, clearReadNotifications } = useNotifications();
  const { doctorNotifications, doctorUnreadCount, markDoctorNotificationAsRead, markDoctorNotificationsAsRead, clearReadDoctorNotifications } = useDoctorNotifications();
  const { sellerNotifications, sellerUnreadCount, markSellerNotificationAsRead, markSellerNotificationsAsRead, clearReadSellerNotifications } = useSellerNotifications();
  const { clinicNotifications, clinicUnreadCount, markClinicNotificationAsRead, markClinicNotificationsAsRead, clearReadClinicNotifications } = useClinicNotifications();
  const { adminNotifications, adminUnreadCount, markAdminNotificationAsRead, markAdminNotificationsAsRead, clearReadAdminNotifications } = useAdminNotifications();
  const { unreadChatCount } = useChatNotifications();
  const pathname = usePathname();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatNotificationDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { locale: es, addSuffix: true });
    } catch {
      return '';
    }
  };

  const getAdminNotificationIcon = (type: AdminNotification['type']) => {
    switch (type) {
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'new_doctor': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'support_ticket': return <Ticket className="h-4 w-4 text-orange-500" />;
      default: return <BellRing className="h-4 w-4 text-primary" />;
    }
  };

  const getPatientNotificationIcon = (type: PatientNotification['type']) => {
    switch (type) {
      case 'reminder': return <BellRing className="h-4 w-4 text-primary" />;
      case 'payment_approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'new_message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'record_added': return <ClipboardList className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getDoctorNotificationIcon = (type: DoctorNotification['type']) => {
    switch (type) {
      case 'payment_verification': return <DollarSign className="h-4 w-4 text-amber-500" />;
      case 'patient_confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'patient_cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'new_message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'support_reply': return <LifeBuoy className="h-4 w-4 text-orange-500" />;
      case 'subscription_update': return <CreditCard className="h-4 w-4 text-indigo-500" />;
      default: return <BellRing className="h-4 w-4 text-primary" />;
    }
  };

  const getSellerNotificationIcon = (type: SellerNotification['type']) => {
    switch (type) {
      case 'payment_processed': return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'new_doctor_registered': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'support_reply': return <LifeBuoy className="h-4 w-4 text-orange-500" />;
      default: return <BellRing className="h-4 w-4 text-primary" />;
    }
  };

  const getClinicNotificationIcon = (type: ClinicNotification['type']) => {
    switch (type) {
      case 'new_appointment': return <BellRing className="h-4 w-4 text-primary" />;
      case 'payment_verification': return <DollarSign className="h-4 w-4 text-amber-500" />;
      case 'patient_confirmed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'patient_cancelled': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'new_message': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default: return <BellRing className="h-4 w-4 text-primary" />;
    }
  };



  const patientNavLinks = [
    { href: "/find-a-doctor", label: "Buscar Médico" },
    { href: "/ai-assistant", label: "Asistente IA" },
  ];

  const adminNavLinks = [
    { href: "/admin/dashboard?view=overview", label: "General" },
    { href: "/admin/dashboard?view=doctors", label: "Médicos" },
    { href: "/admin/dashboard?view=sellers", label: "Vendedoras" },
    { href: "/admin/dashboard?view=patients", label: "Pacientes" },
    { href: "/admin/dashboard?view=finances", label: "Finanzas" },
    { href: "/admin/dashboard?view=marketing", label: "Marketing" },
    { href: "/admin/dashboard?view=support", label: "Soporte" },
    { href: "/admin/dashboard?view=settings", label: "Configuración" },
  ];

  const isClinicDoctor = user?.role === 'doctor' && (
    activeWorkspace?.workspaceType === 'clinic' || 
    activeWorkspace?.workspaceType === 'public_hospital' || 
    (activeWorkspace && !activeWorkspace.canManageFinances) ||
    (!activeWorkspace && user?.isClinicEmployee)
  );

  const doctorNavLinks = (isClinicDoctor
    ? [
        { href: "/doctor/dashboard?view=appointments", label: "Citas" },
        { href: "/doctor/dashboard?view=patients", label: "Pacientes" },
        ...(doctorCapabilities.hasPrescription ? [{ href: "/doctor/dashboard?view=pharmacies", label: "Farmacias" }] : []),
        { href: "/doctor/dashboard?view=chat", label: "Chat", unreadCount: unreadChatCount },
      ]
    : [
        { href: "/doctor/dashboard?view=appointments", label: "Citas" },
        { href: "/doctor/dashboard?view=patients", label: "Pacientes" },
        { href: "/doctor/dashboard?view=finances", label: "Finanzas" },
        { href: "/doctor/dashboard?view=addresses", label: "Consultorios" },
        { href: "/doctor/dashboard?view=online-consultation", label: "Consultas Online" },
        ...(doctorCapabilities.hasPrescription ? [{ href: "/doctor/dashboard?view=pharmacies", label: "Farmacias y Patrocinios" }] : []),
        { href: "/doctor/dashboard?view=chat", label: "Chat", unreadCount: unreadChatCount },
        { href: "/doctor/dashboard?view=insurances", label: "Coberturas" },
      ]);

  const sellerNavLinks = [
    { href: "/seller/dashboard?view=referrals", label: "Mis Referidos" },
    { href: "/seller/dashboard?view=finances", label: "Finanzas" },
    { href: "/seller/dashboard?view=accounts", label: "Cuentas" },
    { href: "/seller/dashboard?view=marketing", label: "Marketing" },
    { href: "/seller/dashboard?view=support", label: "Soporte" },
  ];

  const dashboardHref = user?.role === 'doctor'
    ? '/doctor/dashboard'
    : user?.role === 'seller'
      ? '/seller/dashboard?view=referrals'
      : user?.role === 'admin'
        ? '/admin/dashboard?view=overview'
        : '/dashboard';

  const isPatient = user?.role === 'patient';
  const isAdmin = user?.role === 'admin';
  const isDoctor = user?.role === 'doctor';
  const isSeller = user?.role === 'seller';
  const isClinicOrSecretary = user?.role === 'clinic' || user?.role === 'secretary';

  // Prevent hydration mismatch by rendering a safe version first
  if (!isMounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Link href="/" className="flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-primary" />
              <span className="font-headline">SUMA</span>
            </Link>
          </div>
          {/* Static buttons placeholder or empty */}
          <div className="hidden md:flex ml-auto items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
          </div>
        </div>
      </header>
    );
  }


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-2 px-4 max-w-7xl">
        <div className="flex items-center gap-2 font-bold text-lg shrink-0">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Stethoscope className="h-6 w-6 text-primary" />
            <span className="font-headline">SUMA</span>
          </Link>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 flex-nowrap overflow-x-auto no-scrollbar mx-2">
          {user && user.role === 'admin' && (
            pathname.startsWith('/admin') ? (
              adminNavLinks.map((link) => (
                <Button key={link.href} variant={pathname.includes(link.href) ? 'secondary' : 'ghost'} size="sm" asChild className="text-xs lg:text-sm font-medium px-2.5 py-1.5 h-8 lg:h-9">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))
            ) : (
              <Button variant="default" size="sm" asChild className="text-xs lg:text-sm font-medium px-3 py-1.5 h-8 lg:h-9 shadow-sm">
                <Link href="/admin/dashboard?view=overview">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Panel Administrador
                </Link>
              </Button>
            )
          )}

          {user && user.role === 'doctor' && (
            pathname.startsWith('/doctor') ? (
              doctorNavLinks.map((link) => (
                <Button key={link.href} variant={pathname.includes(link.href) ? 'secondary' : 'ghost'} size="sm" asChild className="relative text-xs lg:text-sm font-medium px-2.5 py-1.5 h-8 lg:h-9 whitespace-nowrap">
                  <Link href={link.href}>
                    {link.label}
                    {link.unreadCount !== undefined && link.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {link.unreadCount}
                      </span>
                    )}
                  </Link>
                </Button>
              ))
            ) : (
              <Button variant="default" size="sm" asChild className="text-xs lg:text-sm font-medium px-3 py-1.5 h-8 lg:h-9 shadow-sm">
                <Link href="/doctor/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Mi Panel Médico
                </Link>
              </Button>
            )
          )}

          {user && user.role === 'seller' && (
            pathname.startsWith('/seller') ? (
              sellerNavLinks.map((link) => (
                <Button key={link.href} variant={pathname.includes(link.href) ? 'secondary' : 'ghost'} size="sm" asChild className="text-xs lg:text-sm font-medium px-2.5 py-1.5 h-8 lg:h-9">
                  <Link href={link.href}>{link.label}</Link>
                </Button>
              ))
            ) : (
              <Button variant="default" size="sm" asChild className="text-xs lg:text-sm font-medium px-3 py-1.5 h-8 lg:h-9 shadow-sm">
                <Link href="/seller/dashboard?view=referrals">
                  <LayoutDashboard className="h-4 w-4 mr-1.5" />
                  Panel Vendedora
                </Link>
              </Button>
            )
          )}

          {(!user || user.role === 'patient' || (!pathname.startsWith('/doctor') && !pathname.startsWith('/admin') && !pathname.startsWith('/seller'))) && patientNavLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild className="relative text-xs lg:text-sm font-medium px-2.5 py-1.5 h-8 lg:h-9">
              <Link href={link.href}>
                {link.label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right Side Controls (Workspace, Notifications, Avatar) */}
        <div className="hidden md:flex ml-auto items-center gap-1.5 shrink-0">
          {user && isAdmin && (
            <div className="mr-1">
              <BcvRateWidget />
            </div>
          )}
          {user && isAdmin && (
            <NotificationBellPopover
              items={adminNotifications}
              unreadCount={adminUnreadCount}
              onMarkOneAsRead={markAdminNotificationAsRead}
              onMarkAllAsRead={markAdminNotificationsAsRead}
              onClearRead={clearReadAdminNotifications}
              getIcon={getAdminNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isDoctor && (
            <div className="flex items-center mr-1">
              <WorkspaceSwitcherHeader />
            </div>
          )}

          {user && isDoctor && (
            <NotificationBellPopover
              items={doctorNotifications}
              unreadCount={doctorUnreadCount}
              onMarkOneAsRead={markDoctorNotificationAsRead}
              onMarkAllAsRead={markDoctorNotificationsAsRead}
              onClearRead={clearReadDoctorNotifications}
              getIcon={getDoctorNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isSeller && (
            <NotificationBellPopover
              items={sellerNotifications}
              unreadCount={sellerUnreadCount}
              onMarkOneAsRead={markSellerNotificationAsRead}
              onMarkAllAsRead={markSellerNotificationsAsRead}
              onClearRead={clearReadSellerNotifications}
              getIcon={getSellerNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isClinicOrSecretary && (
            <NotificationBellPopover
              items={clinicNotifications}
              unreadCount={clinicUnreadCount}
              onMarkOneAsRead={markClinicNotificationAsRead}
              onMarkAllAsRead={markClinicNotificationsAsRead}
              onClearRead={clearReadClinicNotifications}
              getIcon={getClinicNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && (isPatient || user.role === 'pharmacy' || user.role === 'laboratory') && (
            <NotificationBellPopover
              items={notifications}
              unreadCount={unreadCount}
              onMarkOneAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearRead={clearReadNotifications}
              getIcon={getPatientNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 p-0">
                  <Avatar className="h-9 w-9 border border-border">
                    {user.profileImage && <AvatarImage src={user.profileImage} alt={user.name} />}
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Panel de Control</span>
                  </Link>
                </DropdownMenuItem>
                {user.role === 'doctor' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/doctor/dashboard?view=profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    {!isClinicDoctor && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/doctor/dashboard?view=subscription">
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Suscripción</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/doctor/dashboard?view=bank-details">
                            <DollarSign className="mr-2 h-4 w-4" />
                            <span>Cuentas Bancarias</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/doctor/dashboard?view=coupons">
                            <Ticket className="mr-2 h-4 w-4" />
                            <span>Cupones</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/doctor/dashboard?view=support">
                            <LifeBuoy className="mr-2 h-4 w-4" />
                            <span>Soporte y Ayuda</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                  </>
                )}
                {user.role === 'patient' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="mr-2 h-4 w-4" />
                        <span>Mi Perfil</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/patient/chats">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        <span>Mis Mensajes</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/favorites">
                        <Heart className="mr-2 h-4 w-4" />
                        <span>Mis Favoritos</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                {user.role === 'seller' && (
                  <DropdownMenuItem asChild>
                    <Link href="/seller/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Perfil</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" /> Regístrate
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/register">
                      <User className="mr-2 h-4 w-4" />
                      Como Paciente
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/auth/register-doctor">
                      <Stethoscope className="mr-2 h-4 w-4" />
                      Como Médico
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <div className="md:hidden ml-auto flex items-center gap-1">
          {user && isAdmin && (
            <BcvRateWidget compact />
          )}
          {user && isAdmin && (
            <NotificationBellPopover
              items={adminNotifications}
              unreadCount={adminUnreadCount}
              onMarkOneAsRead={markAdminNotificationAsRead}
              onMarkAllAsRead={markAdminNotificationsAsRead}
              onClearRead={clearReadAdminNotifications}
              getIcon={getAdminNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isDoctor && (
            <NotificationBellPopover
              items={doctorNotifications}
              unreadCount={doctorUnreadCount}
              onMarkOneAsRead={markDoctorNotificationAsRead}
              onMarkAllAsRead={markDoctorNotificationsAsRead}
              onClearRead={clearReadDoctorNotifications}
              getIcon={getDoctorNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isSeller && (
            <NotificationBellPopover
              items={sellerNotifications}
              unreadCount={sellerUnreadCount}
              onMarkOneAsRead={markSellerNotificationAsRead}
              onMarkAllAsRead={markSellerNotificationsAsRead}
              onClearRead={clearReadSellerNotifications}
              getIcon={getSellerNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && isClinicOrSecretary && (
            <NotificationBellPopover
              items={clinicNotifications}
              unreadCount={clinicUnreadCount}
              onMarkOneAsRead={markClinicNotificationAsRead}
              onMarkAllAsRead={markClinicNotificationsAsRead}
              onClearRead={clearReadClinicNotifications}
              getIcon={getClinicNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          {user && (isPatient || user.role === 'pharmacy' || user.role === 'laboratory') && (
            <NotificationBellPopover
              items={notifications}
              unreadCount={unreadCount}
              onMarkOneAsRead={markNotificationAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearRead={clearReadNotifications}
              getIcon={getPatientNotificationIcon}
              formatDate={formatNotificationDate}
            />
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
                <span className="sr-only">Abrir Menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto bg-background/95 backdrop-blur-xl">
              <MobileMenuBackground />
              <SheetHeader className="text-left relative z-10">
                <SheetTitle className="sr-only">Menú</SheetTitle>
                <SheetDescription className="sr-only">Navegación principal de la plataforma SUMA</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-4 px-2 relative z-10">
                {/* Top Logo & User Card */}
                {user ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border border-border/50 shadow-sm">
                    <Avatar className="h-11 w-11 border-2 border-primary/20 shrink-0">
                      {user.profileImage && <AvatarImage src={user.profileImage} alt={user.name} className="object-cover" />}
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {user.role === 'doctor' ? (isClinicDoctor ? 'Médico Institucional' : 'Médico Particular') : user.role === 'patient' ? 'Paciente' : user.role === 'seller' ? 'Vendedora' : 'Administrador'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 font-bold text-base mb-1">
                    <Stethoscope className="h-5 w-5 text-primary" />
                    <span className="font-headline text-base">SUMA</span>
                  </div>
                )}

                {/* Navigation Links per role */}
                {user?.role === 'admin' && (
                  <div className="flex flex-col gap-1.5">
                    {!pathname.startsWith('/admin') && (
                      <SheetClose asChild>
                        <Link href="/admin/dashboard?view=overview" className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 mb-1 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition">
                          <LayoutDashboard className="h-4 w-4" /> Ir a Panel Admin
                        </Link>
                      </SheetClose>
                    )}
                    <p className="text-muted-foreground font-semibold text-xs mb-1">PANEL ADMIN</p>
                    {adminNavLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link href={link.href} className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                          <span>{link.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                )}

                {user?.role === 'doctor' && (
                  <div className="flex flex-col gap-3">
                    {/* Botón directo si no está en /doctor */}
                    {!pathname.startsWith('/doctor') && (
                      <SheetClose asChild>
                        <Link href="/doctor/dashboard" className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition">
                          <LayoutDashboard className="h-4 w-4" /> Ir a mi Panel Médico
                        </Link>
                      </SheetClose>
                    )}

                    {/* Sede Actual */}
                    <div className="pb-2 border-b border-border/50">
                      <p className="text-muted-foreground font-semibold text-xs mb-1.5">SEDE ACTUAL</p>
                      <WorkspaceSwitcherHeader />
                    </div>

                    {/* Operaciones del Doctor */}
                    <div className="flex flex-col gap-1">
                      <p className="text-muted-foreground font-semibold text-xs mb-1">OPERACIONES</p>
                      {doctorNavLinks.map((link) => (
                        <SheetClose key={link.href} asChild>
                          <Link href={link.href} className="flex items-center justify-between text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                            <span>{link.label}</span>
                            {link.unreadCount !== undefined && link.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {link.unreadCount}
                              </span>
                            )}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>

                    {/* Mi Cuenta y Ajustes */}
                    <div className="flex flex-col gap-1 border-t border-border/50 pt-2.5">
                      <p className="text-muted-foreground font-semibold text-xs mb-1">MI CUENTA</p>
                      <SheetClose asChild>
                        <Link href="/doctor/dashboard?view=profile" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                          <User className="h-4 w-4 text-primary" /> Mi Perfil
                        </Link>
                      </SheetClose>
                      {!isClinicDoctor && (
                        <>
                          <SheetClose asChild>
                            <Link href="/doctor/dashboard?view=subscription" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                              <CreditCard className="h-4 w-4 text-primary" /> Suscripción
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/doctor/dashboard?view=bank-details" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                              <DollarSign className="h-4 w-4 text-primary" /> Cuentas Bancarias
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/doctor/dashboard?view=coupons" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                              <Ticket className="h-4 w-4 text-primary" /> Cupones
                            </Link>
                          </SheetClose>
                          <SheetClose asChild>
                            <Link href="/doctor/dashboard?view=support" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                              <LifeBuoy className="h-4 w-4 text-primary" /> Soporte y Ayuda
                            </Link>
                          </SheetClose>
                        </>
                      )}
                    </div>

                    {/* Explorar sitio */}
                    <div className="flex flex-col gap-1 border-t border-border/50 pt-2.5">
                      <p className="text-muted-foreground font-semibold text-xs mb-1">EXPLORAR</p>
                      {patientNavLinks.map((link) => (
                        <SheetClose key={link.href} asChild>
                          <Link href={link.href} className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                            <span>{link.label}</span>
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                )}

                {user?.role === 'seller' && (
                  <div className="flex flex-col gap-1.5">
                    {!pathname.startsWith('/seller') && (
                      <SheetClose asChild>
                        <Link href="/seller/dashboard?view=referrals" className="flex items-center justify-center gap-2 text-sm font-semibold py-2 px-3 mb-1 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 transition">
                          <LayoutDashboard className="h-4 w-4" /> Ir a Panel Vendedora
                        </Link>
                      </SheetClose>
                    )}
                    <p className="text-muted-foreground font-semibold text-xs mb-1">PANEL VENDEDORA</p>
                    {sellerNavLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link href={link.href} className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                          <span>{link.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                    <div className="border-t border-border/50 pt-2 mt-1">
                      <SheetClose asChild>
                        <Link href="/seller/profile" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                          <User className="h-4 w-4 text-primary" /> Mi Perfil
                        </Link>
                      </SheetClose>
                    </div>
                  </div>
                )}

                {(!user || user.role === 'patient') && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-muted-foreground font-semibold text-xs mb-1">NAVEGACIÓN</p>
                    {patientNavLinks.map((link) => (
                      <SheetClose key={link.href} asChild>
                        <Link href={link.href} className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                          <span>{link.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                    {user?.role === 'patient' && (
                      <div className="border-t border-border/50 pt-2 mt-1 space-y-1">
                        <SheetClose asChild>
                          <Link href="/profile" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                            <User className="h-4 w-4 text-primary" /> Mi Perfil
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/patient/chats" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                            <MessageSquare className="h-4 w-4 text-primary" /> Mis Mensajes
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/favorites" className="flex items-center gap-2 text-sm font-medium py-2 px-2.5 rounded-lg hover:bg-muted transition">
                            <Heart className="h-4 w-4 text-primary" /> Mis Favoritos
                          </Link>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Action (Logout / Login) */}
                <div className="border-t border-border/50 pt-3 mt-2">
                  {user ? (
                    <Button onClick={logout} variant="destructive" className="w-full h-9 text-sm flex items-center gap-2 justify-center shadow-sm">
                      <LogOut className="h-4 w-4" /> Cerrar Sesión
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <SheetClose asChild>
                        <Button variant="outline" className="w-full h-9 text-sm" asChild>
                          <Link href="/login">Iniciar Sesión</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button className="w-full h-9 text-sm" asChild>
                          <Link href="/auth/register">Registrarse (Paciente)</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button className="w-full h-9 text-sm" variant="secondary" asChild>
                          <Link href="/auth/register-doctor">Registrarse (Médico)</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}


const patientBottomNavItems = [
  { href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/find-a-doctor?view=doctors", label: "Médicos", icon: Stethoscope },
  { href: "/find-a-doctor?view=clinics", label: "Clínicas", icon: Building2 },
  { href: "/dashboard/family", label: "Familia", icon: Users },
  { href: "/favorites", label: "Favoritos", icon: Heart },
];

const publicBottomNavItems = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/find-a-doctor?view=doctors", label: "Médicos", icon: Stethoscope },
  { href: "/find-a-doctor?view=clinics", label: "Clínicas", icon: Building2 },
  { href: "/ai-assistant", label: "Asistente", icon: Bot },
];


function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/find-a-doctor") ||
    pathname.startsWith("/ai-assistant") ||
    pathname.startsWith("/doctors") ||
    pathname.startsWith("/clinica");

  let navItems;

  if (user && user.role === "patient") {
    navItems = patientBottomNavItems;
  } else if (!user && isPublicPage) {
    navItems = publicBottomNavItems;
  } else {
    return null;
  }

  const checkIsActive = (href: string) => {
    const currentView = searchParams.get("view");

    if (href === "/") {
      return pathname === "/";
    }

    if (href.includes("view=doctors")) {
      if (pathname.startsWith("/doctors")) return true;
      if (pathname === "/find-a-doctor") {
        return currentView === "doctors" || !currentView;
      }
      return false;
    }

    if (href.includes("view=clinics")) {
      if (pathname.startsWith("/clinica")) return true;
      if (pathname === "/find-a-doctor") {
        return currentView === "clinics";
      }
      return false;
    }

    if (href.startsWith("/ai-assistant")) {
      return pathname.startsWith("/ai-assistant");
    }

    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    if (href.startsWith("/dashboard/family")) {
      return pathname.startsWith("/dashboard/family");
    }

    if (href.startsWith("/favorites")) {
      return pathname.startsWith("/favorites");
    }

    return pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] md:hidden">
      <div className="container flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = checkIsActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all duration-300 w-[22%] max-w-[80px] select-none active:scale-95",
                isActive
                  ? "text-teal-700 dark:text-teal-300 font-bold"
                  : "text-slate-400 dark:text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
              )}
            >
              {/* Active animated glow & background pill */}
              {isActive && (
                <>
                  <span className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 shadow-sm shadow-teal-500/50 animate-in fade-in zoom-in duration-300" />
                  <span className="absolute inset-x-1 inset-y-1 bg-gradient-to-b from-teal-500/15 to-emerald-500/10 dark:from-teal-400/20 dark:to-emerald-400/10 rounded-xl -z-10 border border-teal-500/30 animate-in fade-in zoom-in-95 duration-300" />
                </>
              )}

              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  isActive
                    ? "text-teal-600 dark:text-teal-300 scale-110 -translate-y-0.5"
                    : "group-hover:scale-105 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                )}
              />
              <span
                className={cn(
                  "text-[11px] tracking-tight leading-none transition-colors duration-300",
                  isActive
                    ? "text-teal-700 dark:text-teal-300 font-bold"
                    : "text-slate-500 dark:text-slate-400"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavContent />
    </Suspense>
  );
}

// Wrapper component with Suspense
export function HeaderWrapper() {
  return (
    <Suspense fallback={<HeaderSkeleton />}>
      <Header />
    </Suspense>
  );
}

// Skeleton component for loading state
function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="flex items-center gap-2 font-bold text-lg">
          <Stethoscope className="h-6 w-6 text-primary" />
          <span className="font-headline">SUMA</span>
        </div>
        <div className="hidden md:flex ml-auto items-center gap-4">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </header>
  );
}

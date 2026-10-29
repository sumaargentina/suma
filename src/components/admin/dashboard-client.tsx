"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useAdminNotifications } from '@/lib/admin-notifications';
import { Loader2, LayoutDashboard, Stethoscope, Briefcase, Users, DollarSign, Building2, FlaskConical, Pill, Megaphone, LifeBuoy, Settings, ClipboardList, HeartHandshake } from 'lucide-react';
import { OverviewTab } from './tabs/overview-tab';
import { DoctorsTab } from './tabs/doctors-tab';
import { SellersTab } from './tabs/sellers-tab';
import { PatientsTab } from './tabs/patients-tab';
import { FinancesTab } from './tabs/finances-tab';
import { MarketingTab } from './tabs/marketing-tab';
import { SupportTab } from './tabs/support-tab';
import { SettingsTab } from './tabs/settings-tab';
import { ClinicsTab } from './tabs/clinics-tab';
import { PharmaciesTab } from './tabs/pharmacies-tab';
import { LaboratoriesTab } from './tabs/laboratories-tab';
import { HealthCampaignsManager } from '@/components/medical/health-campaigns-manager';
import { Skeleton } from '../ui/skeleton';
import { BcvRateWidget } from './bcv-rate-widget';
import { cn } from '@/lib/utils';

const ADMIN_TABS = [
  { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
  { id: 'doctors', label: 'Médicos', icon: Stethoscope },
  { id: 'clinics', label: 'Clínicas y Hospitales', icon: Building2 },
  { id: 'laboratories', label: 'Laboratorios', icon: FlaskConical },
  { id: 'pharmacies', label: 'Farmacias', icon: Pill },
  { id: 'health-campaigns', label: 'Jornadas / Eventos', icon: HeartHandshake },
  { id: 'sellers', label: 'Vendedoras', icon: Briefcase },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'finances', label: 'Finanzas', icon: DollarSign },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'support', label: 'Soporte', icon: LifeBuoy },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'audit', label: 'Historial', icon: ClipboardList },
];

export function AdminDashboardClient({ currentTab = 'overview' }: { currentTab?: string }) {
  const { user, loading } = useAuth();
  const { } = useAdminNotifications();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex-1 container py-12">
        <div className="mb-8">
          <Skeleton className="h-8 w-1/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex-1 container py-12">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Redirigiendo...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'overview':
        return <OverviewTab />;
      case 'doctors':
        return <DoctorsTab />;
      case 'sellers':
        return <SellersTab />;
      case 'patients':
        return <PatientsTab />;
      case 'finances':
        return <FinancesTab />;
      case 'marketing':
        return <MarketingTab />;
      case 'support':
        return <SupportTab />;
      case 'settings':
        return <SettingsTab />;
      case 'clinics':
        return <ClinicsTab />;
      case 'pharmacies':
        return <PharmaciesTab />;
      case 'laboratories':
        return <LaboratoriesTab />;
      case 'health-campaigns':
        return (
          <HealthCampaignsManager
            organizerId={user.id || 'admin'}
            organizerRole="admin"
            organizerName="SUMA Salud Oficial"
          />
        );
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="flex-1 container py-8 md:py-10">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Panel de Administración</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona médicos, clínicas, hospitales, laboratorios, farmacias y finanzas desde aquí.
            </p>
          </div>
          <div className="shrink-0 flex items-center md:hidden">
            <BcvRateWidget />
          </div>
        </div>

        {/* Barra de acceso rápido con diseño cápsula unificado */}
        <div className="mt-5 flex flex-wrap items-center gap-1.5 bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => router.push(`/admin/dashboard?view=${tab.id}`)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                  active
                    ? "bg-teal-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                )}
              >
                <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-teal-600")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {renderContent()}
    </div>
  );
}

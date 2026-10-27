"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { getClinic } from '@/lib/supabaseService';
import { Clinic } from '@/lib/types';
import { useClinicNotifications } from '@/lib/clinic-notifications';
import { NotificationBellPopover } from '@/components/header';
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    Stethoscope,
    Building2,
    CreditCard,
    MessageCircle,
    LifeBuoy,
    Settings,
    Ticket,
    Menu,
    LogOut,
    ShieldCheck,
    Crown,
    Wallet,
    HeartHandshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';

import { ServicesTab } from './tabs/services-tab';
import { DoctorsTab } from './tabs/doctors-tab';
import { OverviewTab } from './tabs/overview-tab';
import { AgendaTab } from './tabs/agenda-tab';
import { FinancesTab } from './tabs/finances-tab';
import { ChatTab } from './tabs/chat-tab';
import { SupportTab } from './tabs/support-tab';
import { CouponsTab } from './tabs/coupons-tab';
import { SettingsTab } from './tabs/settings-tab';
import { TeamTab } from './tabs/team-tab';
import { PatientsTab } from './tabs/patients-tab';
import { InsurancesTab } from './tabs/insurances-tab';
import { SubscriptionTab } from './tabs/subscription-tab';
import { PaymentConfigTab } from './tabs/payment-config-tab';
import { HealthCampaignsManager } from '@/components/medical/health-campaigns-manager';

export function ClinicDashboardClient({ currentTab = 'overview' }: { currentTab?: string }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(currentTab);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [clinicData, setClinicData] = useState<Clinic | null>(null);
    const {
        clinicNotifications,
        clinicUnreadCount,
        markClinicNotificationsAsRead,
        markClinicNotificationAsRead,
        clearReadClinicNotifications,
    } = useClinicNotifications();

    useEffect(() => {
        setActiveTab(currentTab);
    }, [currentTab]);

    const targetClinicId = user?.role === 'secretary' ? user?.clinicId : user?.id;

    useEffect(() => {
        if (targetClinicId) {
            getClinic(targetClinicId)
                .then((data) => {
                    if (data) setClinicData(data);
                })
                .catch((err) => console.error('Error loading clinic data in dashboard:', err));
        }
    }, [targetClinicId]);

    // Redirect if not clinic or secretary
    useEffect(() => {
        if (user && user.role !== 'clinic' && user.role !== 'secretary') {
            router.push('/');
        }
    }, [user, router]);

    if (!user) return null;

    const isSecretary = user.role === 'secretary';
    const isHospitalGratuito = clinicData?.plan === 'hospital_gratuito' || user.plan === 'hospital_gratuito';

    const menuItems = [
        { icon: LayoutDashboard, label: 'Resumen', value: 'overview' },
        { icon: CalendarDays, label: 'Agenda', value: 'agenda' },
        { icon: Users, label: 'Médicos', value: 'doctors', adminOnly: true },
        { icon: Users, label: 'Pacientes', value: 'patients' },
        { icon: HeartHandshake, label: 'Jornadas de Salud', value: 'health-campaigns' },
        { icon: Stethoscope, label: 'Servicios', value: 'services', adminOnly: true },
        { icon: ShieldCheck, label: 'Coberturas', value: 'insurances', adminOnly: true },
        { icon: Users, label: 'Equipo', value: 'team', adminOnly: true },
        { icon: CreditCard, label: 'Finanzas', value: 'finances', adminOnly: true, commercialOnly: true },
        { icon: Wallet, label: 'Métodos de Pago', value: 'payment-methods', adminOnly: true, commercialOnly: true },
        { icon: MessageCircle, label: 'Chat', value: 'chat' },
        { icon: Ticket, label: 'Cupones', value: 'coupons', adminOnly: true, commercialOnly: true },
        { icon: Crown, label: 'Suscripción', value: 'subscription', adminOnly: true, commercialOnly: true },
        { icon: Settings, label: 'Configuración', value: 'settings', adminOnly: true },
        { icon: LifeBuoy, label: 'Soporte', value: 'support' },
    ].filter(item => {
        if (isSecretary && item.adminOnly) return false;
        if (isHospitalGratuito && item.commercialOnly) return false;
        return true;
    });

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setIsMobileOpen(false);
        router.push(`/clinic/dashboard?view=${value}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <OverviewTab />;
            case 'agenda': return <AgendaTab />;
            case 'doctors': return <DoctorsTab />;
            case 'patients': return <PatientsTab />;
            case 'health-campaigns': return (
                <div className="p-4 lg:p-6">
                    <HealthCampaignsManager
                        organizerId={user.clinicId || user.id}
                        organizerRole="clinic"
                        organizerName={clinicData?.name || user.name || 'Clínica'}
                    />
                </div>
            );
            case 'services': return <ServicesTab />;
            case 'team': return <TeamTab />;
            case 'finances': return <FinancesTab />;
            case 'payment-methods': return <PaymentConfigTab />;
            case 'chat': return <ChatTab />;
            case 'coupons': return <CouponsTab />;
            case 'insurances': return <InsurancesTab />;
            case 'subscription': return <SubscriptionTab />;
            case 'settings': return <SettingsTab />;
            case 'support': return <SupportTab />;
            default: return <OverviewTab />;
        }
    };

    return (
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-16 items-center justify-between border-b px-4 lg:px-6 bg-white/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Image
                                src="/images/logo_suma.png"
                                alt="SUMA"
                                width={85}
                                height={30}
                                className="h-7 w-auto object-contain shrink-0"
                            />
                            <div className="flex flex-col min-w-0 border-l pl-2.5">
                                <span className="text-xs font-bold text-slate-800 truncate">
                                    {isHospitalGratuito ? 'Panel Hospital' : 'Panel Clínica'}
                                </span>
                                {isHospitalGratuito && (
                                    <span className="text-[10px] font-semibold text-sky-600 leading-none">
                                        100% Gratuito
                                    </span>
                                )}
                            </div>
                        </div>
                        <NotificationBellPopover
                            items={clinicNotifications}
                            unreadCount={clinicUnreadCount}
                            onMarkAllAsRead={markClinicNotificationsAsRead}
                            onMarkOneAsRead={markClinicNotificationAsRead}
                            onClearRead={clearReadClinicNotifications}
                        />
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            {menuItems.map((item) => (
                                <Button
                                    key={item.value}
                                    variant={activeTab === item.value ? "secondary" : "ghost"}
                                    className="justify-start gap-3 w-full mb-1"
                                    onClick={() => handleTabChange(item.value)}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Button>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-auto p-4 border-t">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{clinicData?.name || user.name}</p>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-muted-foreground truncate capitalize">
                                        {user.role === 'clinic' ? (isHospitalGratuito ? 'Hospital Gratuito' : 'Admin Clínica') : 'Secretaría'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full justify-start gap-3" onClick={() => logout()}>
                            <LogOut className="h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar & Content */}
            <div className="flex flex-col">
                <header className="flex h-14 items-center gap-3 border-b bg-white px-4 lg:h-[60px] lg:px-6 md:hidden">
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col">
                            <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                            <SheetDescription className="sr-only">Navegación del panel de clínica</SheetDescription>
                            <nav className="grid gap-2 text-lg font-medium">
                                <div className="flex items-center gap-2.5 text-lg font-semibold mb-4 pb-3 border-b">
                                    <Image
                                        src="/images/logo_suma.png"
                                        alt="SUMA"
                                        width={90}
                                        height={32}
                                        className="h-7 w-auto object-contain"
                                    />
                                    <span className="text-sm font-bold text-slate-700 border-l pl-2.5">
                                        {isHospitalGratuito ? 'Panel Hospital' : 'Panel Clínica'}
                                    </span>
                                </div>
                                {menuItems.map((item) => (
                                    <Button
                                        key={item.value}
                                        variant={activeTab === item.value ? "secondary" : "ghost"}
                                        className="justify-start gap-3 w-full mb-1"
                                        onClick={() => handleTabChange(item.value)}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Button>
                                ))}
                                <div className="mt-auto pt-4 border-t">
                                    <Button variant="outline" className="w-full justify-start gap-3" onClick={() => logout()}>
                                        <LogOut className="h-4 w-4" />
                                        Cerrar Sesión
                                    </Button>
                                </div>
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <Image
                        src="/images/logo_suma.png"
                        alt="SUMA"
                        width={70}
                        height={24}
                        className="h-6 w-auto object-contain"
                    />
                    <div className="w-full flex-1 flex items-center gap-2">
                        <span className="font-semibold text-base capitalize truncate">{menuItems.find(i => i.value === activeTab)?.label}</span>
                        {isHospitalGratuito && (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px]">Gratuito</Badge>
                        )}
                    </div>
                    <NotificationBellPopover
                        items={clinicNotifications}
                        unreadCount={clinicUnreadCount}
                        onMarkAllAsRead={markClinicNotificationsAsRead}
                        onMarkOneAsRead={markClinicNotificationAsRead}
                        onClearRead={clearReadClinicNotifications}
                    />
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/10">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

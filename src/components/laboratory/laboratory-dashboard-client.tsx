"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import {
    LayoutDashboard,
    CalendarDays,
    Users,
    FlaskConical,
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
    FileCheck,
    HeartHandshake,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Dedicated Laboratory Tabs
import { LaboratoryOverviewTab } from './tabs/overview-tab';
import { LaboratoryOrdersTab } from './tabs/orders-tab';
import { LaboratoryServicesTab } from './tabs/services-tab';
import { LaboratoryAgendaTab } from './tabs/agenda-tab';
import { LaboratorySettingsTab } from './tabs/settings-tab';
import { LaboratoryTeamTab } from './tabs/team-tab';

// Shared Clinic / Provider Tabs
import { PatientsTab } from '@/components/clinic/tabs/patients-tab';
import { FinancesTab } from '@/components/clinic/tabs/finances-tab';
import { PaymentConfigTab } from '@/components/clinic/tabs/payment-config-tab';
import { ChatTab } from '@/components/clinic/tabs/chat-tab';
import { InsurancesTab } from '@/components/clinic/tabs/insurances-tab';
import { CouponsTab } from '@/components/clinic/tabs/coupons-tab';
import { SubscriptionTab } from '@/components/clinic/tabs/subscription-tab';
import { SupportTab } from '@/components/clinic/tabs/support-tab';
import { HealthCampaignsManager } from '@/components/medical/health-campaigns-manager';

export function LaboratoryDashboardClient({ currentTab = 'overview' }: { currentTab?: string }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(currentTab);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    useEffect(() => {
        setActiveTab(currentTab);
    }, [currentTab]);

    const isAuthorized = user && (user.role === 'laboratory' || (user.role === 'secretary' && Boolean(user.laboratoryId)));
    const isSecretary = user?.role === 'secretary';

    useEffect(() => {
        if (user && !isAuthorized) {
            router.push('/');
        }
    }, [user, router, isAuthorized]);

    if (!user) return null;

    const primaryItems = [
        { icon: LayoutDashboard, label: 'Resumen', value: 'overview' },
        { icon: FileCheck, label: 'Órdenes', value: 'orders' },
        { icon: CalendarDays, label: 'Agenda', value: 'agenda' },
        { icon: Users, label: 'Pacientes', value: 'patients' },
        { icon: HeartHandshake, label: 'Jornadas', value: 'health-campaigns' },
        { icon: MessageCircle, label: 'Chat', value: 'chat' },
    ];

    const catalogGroupItems = [
        { icon: FlaskConical, label: 'Pruebas y Análisis', value: 'services' },
        { icon: ShieldCheck, label: 'Coberturas de Seguro', value: 'insurances', adminOnly: true },
        { icon: Users, label: 'Equipo / Secretarias', value: 'team', adminOnly: true },
    ].filter(item => !isSecretary || !item.adminOnly);

    const managementGroupItems = [
        { icon: CreditCard, label: 'Finanzas', value: 'finances', adminOnly: true },
        { icon: Wallet, label: 'Métodos de Pago', value: 'payment-methods', adminOnly: true },
        { icon: Ticket, label: 'Cupones y Descuentos', value: 'coupons', adminOnly: true },
        { icon: Crown, label: 'Suscripción SUMA', value: 'subscription', adminOnly: true },
        { icon: Settings, label: 'Configuración', value: 'settings', adminOnly: true },
        { icon: LifeBuoy, label: 'Soporte y Ayuda', value: 'support' },
    ].filter(item => !isSecretary || !item.adminOnly);

    const allMobileItems = [...primaryItems, ...catalogGroupItems, ...managementGroupItems];

    const isCatalogGroupActive = catalogGroupItems.some(i => i.value === activeTab);
    const isManagementGroupActive = managementGroupItems.some(i => i.value === activeTab);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setIsMobileOpen(false);
        router.push(`/laboratory/dashboard?view=${value}`);
    };

    const navPillClass = (active: boolean) =>
        cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap select-none cursor-pointer",
            active
                ? "bg-teal-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
        );

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <LaboratoryOverviewTab onNavigateTab={handleTabChange} />;
            case 'orders': return <LaboratoryOrdersTab />;
            case 'agenda': return <LaboratoryAgendaTab />;
            case 'services': return <LaboratoryServicesTab />;
            case 'patients': return <PatientsTab />;
            case 'health-campaigns': return (
                <div className="p-2 lg:p-4">
                    <HealthCampaignsManager
                        organizerId={user.laboratoryId || user.id}
                        organizerRole="laboratory"
                        organizerName={user.name || 'Laboratorio'}
                    />
                </div>
            );
            case 'insurances': return <InsurancesTab />;
            case 'team': return <LaboratoryTeamTab />;
            case 'finances': return <FinancesTab />;
            case 'payment-methods': return <PaymentConfigTab />;
            case 'chat': return <ChatTab />;
            case 'coupons': return <CouponsTab />;
            case 'subscription': return <SubscriptionTab />;
            case 'settings': return <LaboratorySettingsTab />;
            case 'support': return <SupportTab />;
            default: return <LaboratoryOverviewTab onNavigateTab={handleTabChange} />;
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50/40">
            {/* Barra Superior Unificada (Idéntica en todos los perfiles) */}
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-2xs">
                <div className="container max-w-7xl mx-auto h-16 px-4 flex items-center justify-between gap-3">
                    {/* Logo SUMA + Nombre de Laboratorio */}
                    <div className="flex items-center gap-3 shrink-0">
                        <Image
                            src="/images/logo_suma.png"
                            alt="SUMA"
                            width={90}
                            height={32}
                            className="h-8 w-auto object-contain shrink-0"
                        />
                        <div className="hidden lg:flex flex-col border-l border-slate-200 pl-3">
                            <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                                {user.name}
                            </span>
                            <span className="text-[10px] font-semibold text-teal-700 leading-none mt-0.5">
                                🔬 Panel Laboratorio
                            </span>
                        </div>
                    </div>

                    {/* Menú Central Tipo Cápsula Moderna */}
                    <nav className="hidden md:flex items-center justify-center flex-1 mx-2">
                        <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
                            {primaryItems.map((item) => {
                                const Icon = item.icon;
                                const active = activeTab === item.value;
                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() => handleTabChange(item.value)}
                                        className={navPillClass(active)}
                                    >
                                        <Icon className={cn("h-3.5 w-3.5", active ? "text-white" : "text-teal-600")} />
                                        <span>{item.label}</span>
                                    </button>
                                );
                            })}

                            {/* Grupo Catálogo y Equipo */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button type="button" className={navPillClass(isCatalogGroupActive)}>
                                        <FlaskConical className={cn("h-3.5 w-3.5", isCatalogGroupActive ? "text-white" : "text-teal-600")} />
                                        <span>Catálogo</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-56 p-1.5 rounded-xl shadow-lg border-slate-200">
                                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400 px-2 py-1">
                                        Exámenes y Equipo
                                    </DropdownMenuLabel>
                                    {catalogGroupItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        const active = activeTab === item.value;
                                        return (
                                            <DropdownMenuItem
                                                key={item.value}
                                                onClick={() => handleTabChange(item.value)}
                                                className={cn("rounded-lg cursor-pointer py-2 flex items-center gap-2.5", active && "bg-teal-50 text-teal-800 font-semibold")}
                                            >
                                                <ItemIcon className="h-4 w-4 text-teal-600" />
                                                <span>{item.label}</span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Grupo Gestión */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button type="button" className={navPillClass(isManagementGroupActive)}>
                                        <Settings className={cn("h-3.5 w-3.5", isManagementGroupActive ? "text-white" : "text-teal-600")} />
                                        <span>Gestión</span>
                                        <ChevronDown className="h-3.5 w-3.5 opacity-75" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-56 p-1.5 rounded-xl shadow-lg border-slate-200">
                                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-slate-400 px-2 py-1">
                                        Administración
                                    </DropdownMenuLabel>
                                    {managementGroupItems.map((item) => {
                                        const ItemIcon = item.icon;
                                        const active = activeTab === item.value;
                                        return (
                                            <DropdownMenuItem
                                                key={item.value}
                                                onClick={() => handleTabChange(item.value)}
                                                className={cn("rounded-lg cursor-pointer py-2 flex items-center gap-2.5", active && "bg-teal-50 text-teal-800 font-semibold")}
                                            >
                                                <ItemIcon className="h-4 w-4 text-teal-600" />
                                                <span>{item.label}</span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </nav>

                    {/* Controles Derecha */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <div className="hidden md:block">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 p-0">
                                        <Avatar className="h-9 w-9 border border-slate-200">
                                            <AvatarFallback className="bg-teal-50 text-teal-700 font-bold">
                                                {(user.name || 'L').charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
                                    <DropdownMenuLabel className="font-normal">
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold leading-none truncate">{user.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                            <Badge variant="outline" className="w-fit mt-1 text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                                                Laboratorio Clínico
                                            </Badge>
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {!isSecretary && (
                                        <DropdownMenuItem onClick={() => handleTabChange('settings')} className="cursor-pointer rounded-lg">
                                            <Settings className="mr-2 h-4 w-4 text-teal-600" />
                                            <span>Configuración</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleTabChange('support')} className="cursor-pointer rounded-lg">
                                        <LifeBuoy className="mr-2 h-4 w-4 text-teal-600" />
                                        <span>Soporte y Ayuda</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => logout()} className="cursor-pointer rounded-lg text-red-600 focus:text-red-700">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        <span>Cerrar Sesión</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Botón Menú Móvil */}
                        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                    <Menu className="h-5 w-5" />
                                    <span className="sr-only">Abrir menú</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="flex flex-col overflow-y-auto">
                                <SheetTitle className="sr-only">Menú de Navegación</SheetTitle>
                                <SheetDescription className="sr-only">Menú de navegación para laboratorio</SheetDescription>
                                <div className="flex items-center gap-2.5 pb-4 mb-3 border-b">
                                    <Image
                                        src="/images/logo_suma.png"
                                        alt="SUMA"
                                        width={90}
                                        height={32}
                                        className="h-7 w-auto object-contain"
                                    />
                                    <span className="text-xs font-bold text-slate-700 border-l pl-2.5">
                                        🔬 Panel Laboratorio
                                    </span>
                                </div>
                                <nav className="grid gap-1 text-sm font-medium">
                                    {allMobileItems.map((item) => {
                                        const active = activeTab === item.value;
                                        return (
                                            <Button
                                                key={item.value}
                                                variant={active ? "secondary" : "ghost"}
                                                className={cn("justify-start gap-3 w-full", active && "bg-teal-50 text-teal-800 font-bold")}
                                                onClick={() => handleTabChange(item.value)}
                                            >
                                                <item.icon className="h-4 w-4 text-teal-600" />
                                                {item.label}
                                            </Button>
                                        );
                                    })}
                                </nav>
                                <div className="mt-auto pt-4 border-t">
                                    <Button variant="destructive" className="w-full justify-center gap-2" onClick={() => logout()}>
                                        <LogOut className="h-4 w-4" />
                                        Cerrar Sesión
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            {/* Contenido Principal */}
            <main className="flex-1 container max-w-7xl mx-auto p-4 lg:p-6">
                {renderContent()}
            </main>
        </div>
    );
}

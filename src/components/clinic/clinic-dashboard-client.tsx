"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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
    Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

// Tab Placeholders (will be replaced by real components later)
const PlaceholderTab = ({ title }: { title: string }) => (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="flex items-center">
            <h1 className="text-lg font-semibold md:text-2xl">{title}</h1>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl font-bold tracking-tight">En Construcción</h3>
                <p className="text-sm text-muted-foreground">Esta sección estará disponible pronto.</p>
            </div>
        </div>
    </div>
);

export function ClinicDashboardClient({ currentTab = 'overview' }: { currentTab?: string }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(currentTab);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Redirect if not clinic or secretary
    useEffect(() => {
        if (user && user.role !== 'clinic' && user.role !== 'secretary') {
            router.push('/');
        }
    }, [user, router]);

    if (!user) return null;

    const isSecretary = user.role === 'secretary';

    const menuItems = [
        { icon: LayoutDashboard, label: 'Resumen', value: 'overview' },
        { icon: CalendarDays, label: 'Agenda', value: 'agenda' },
        { icon: Users, label: 'Médicos', value: 'doctors', adminOnly: true },
        { icon: Users, label: 'Pacientes', value: 'patients' }, // Placeholder view or link to patients
        { icon: Stethoscope, label: 'Servicios', value: 'services', adminOnly: true },
        { icon: ShieldCheck, label: 'Coberturas', value: 'insurances', adminOnly: true },
        { icon: Users, label: 'Equipo', value: 'team', adminOnly: true },
        { icon: CreditCard, label: 'Finanzas', value: 'finances', adminOnly: true },
        { icon: MessageCircle, label: 'Chat', value: 'chat' },
        { icon: Ticket, label: 'Cupones', value: 'coupons', adminOnly: true },
        { icon: Crown, label: 'Suscripción', value: 'subscription', adminOnly: true },
        { icon: Settings, label: 'Configuración', value: 'settings', adminOnly: true },
        { icon: LifeBuoy, label: 'Soporte', value: 'support' },
    ].filter(item => !isSecretary || !item.adminOnly);

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
            case 'services': return <ServicesTab />;
            case 'team': return <TeamTab />;
            case 'finances': return <FinancesTab />;
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
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <div className="flex items-center gap-2 font-semibold">
                            <Building2 className="h-6 w-6" />
                            <span className="truncate">Panel Clínica</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
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
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate capitalize">{user.role === 'clinic' ? 'Admin' : 'Secretaría'}</p>
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
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
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
                                <div className="flex items-center gap-2 text-lg font-semibold mb-4">
                                    <Building2 className="h-6 w-6" />
                                    <span>Panel Clínica</span>
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
                    <div className="w-full flex-1">
                        <span className="font-semibold text-lg capitalize">{menuItems.find(i => i.value === activeTab)?.label}</span>
                    </div>
                </header>
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/10">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

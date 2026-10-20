"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    FileCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';

// Dedicated Laboratory Tabs
import { LaboratoryOverviewTab } from './tabs/overview-tab';
import { LaboratoryOrdersTab } from './tabs/orders-tab';
import { LaboratoryServicesTab } from './tabs/services-tab';
import { LaboratoryAgendaTab } from './tabs/agenda-tab';
import { LaboratorySettingsTab } from './tabs/settings-tab';
import { LaboratoryTeamTab } from './tabs/team-tab';

// Shared Clinic / Provider Tabs (Identical feature set minus doctors)
import { PatientsTab } from '@/components/clinic/tabs/patients-tab';
import { FinancesTab } from '@/components/clinic/tabs/finances-tab';
import { PaymentConfigTab } from '@/components/clinic/tabs/payment-config-tab';
import { ChatTab } from '@/components/clinic/tabs/chat-tab';
import { InsurancesTab } from '@/components/clinic/tabs/insurances-tab';
import { CouponsTab } from '@/components/clinic/tabs/coupons-tab';
import { SubscriptionTab } from '@/components/clinic/tabs/subscription-tab';
import { SupportTab } from '@/components/clinic/tabs/support-tab';

export function LaboratoryDashboardClient({ currentTab = 'overview' }: { currentTab?: string }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState(currentTab);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const isAuthorized = user && (user.role === 'laboratory' || (user.role === 'secretary' && Boolean(user.laboratoryId)));
    const isSecretary = user?.role === 'secretary';

    // Redirect if not laboratory or laboratory secretary
    useEffect(() => {
        if (user && !isAuthorized) {
            router.push('/');
        }
    }, [user, router, isAuthorized]);

    if (!user) return null;

    // Laboratory Menu Items (NO doctors tab, services-only!)
    const menuItems = [
        { icon: LayoutDashboard, label: 'Resumen', value: 'overview' },
        { icon: FileCheck, label: 'Órdenes y Resultados', value: 'orders' },
        { icon: CalendarDays, label: 'Agenda y Muestras', value: 'agenda' },
        { icon: FlaskConical, label: 'Pruebas y Análisis', value: 'services' },
        { icon: Users, label: 'Pacientes', value: 'patients' },
        { icon: ShieldCheck, label: 'Coberturas de Seguro', value: 'insurances', adminOnly: true },
        { icon: Users, label: 'Equipo / Secretarias', value: 'team', adminOnly: true },
        { icon: CreditCard, label: 'Finanzas', value: 'finances', adminOnly: true },
        { icon: Wallet, label: 'Métodos de Pago', value: 'payment-methods', adminOnly: true },
        { icon: MessageCircle, label: 'Chat con Pacientes', value: 'chat' },
        { icon: Ticket, label: 'Cupones y Descuentos', value: 'coupons', adminOnly: true },
        { icon: Crown, label: 'Suscripción', value: 'subscription', adminOnly: true },
        { icon: Settings, label: 'Configuración', value: 'settings', adminOnly: true },
        { icon: LifeBuoy, label: 'Soporte', value: 'support' },
    ].filter(item => !isSecretary || !item.adminOnly);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setIsMobileOpen(false);
        router.push(`/laboratory/dashboard?view=${value}`);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'overview': return <LaboratoryOverviewTab onNavigateTab={handleTabChange} />;
            case 'orders': return <LaboratoryOrdersTab />;
            case 'agenda': return <LaboratoryAgendaTab />;
            case 'services': return <LaboratoryServicesTab />;
            case 'patients': return <PatientsTab />;
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
        <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
            {/* Desktop Sidebar */}
            <div className="hidden border-r bg-muted/40 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                        <div className="flex items-center gap-2 font-semibold">
                            <div className="h-8 w-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                                <FlaskConical className="h-5 w-5" />
                            </div>
                            <span className="truncate">Panel Laboratorio</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                            {menuItems.map((item) => (
                                <Button
                                    key={item.value}
                                    variant={activeTab === item.value ? "secondary" : "ghost"}
                                    className={`justify-start gap-3 w-full mb-1 ${activeTab === item.value ? 'bg-teal-50 text-teal-800 font-semibold hover:bg-teal-100' : ''}`}
                                    onClick={() => handleTabChange(item.value)}
                                >
                                    <item.icon className="h-4 w-4 text-teal-600" />
                                    {item.label}
                                </Button>
                            ))}
                        </nav>
                    </div>
                    <div className="mt-auto p-4 border-t">
                        <div className="flex items-center gap-3 mb-4 px-2">
                            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                                <FlaskConical className="h-4 w-4" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">Laboratorio Clínico</p>
                            </div>
                        </div>
                        <Button 
                            variant="outline" 
                            className="w-full justify-start gap-3 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200" 
                            onClick={() => logout()}
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-col">
                {/* Mobile Header */}
                <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 md:hidden">
                    <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle navigation menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="flex flex-col">
                            <SheetTitle className="flex items-center gap-2 font-semibold">
                                <FlaskConical className="h-6 w-6 text-teal-600" />
                                <span>Panel Laboratorio</span>
                            </SheetTitle>
                            <SheetDescription className="sr-only">
                                Menú de navegación para laboratorio
                            </SheetDescription>
                            <nav className="grid gap-2 text-lg font-medium mt-4">
                                {menuItems.map((item) => (
                                    <Button
                                        key={item.value}
                                        variant={activeTab === item.value ? "secondary" : "ghost"}
                                        className={`justify-start gap-4 text-base ${activeTab === item.value ? 'bg-teal-50 text-teal-800' : ''}`}
                                        onClick={() => handleTabChange(item.value)}
                                    >
                                        <item.icon className="h-5 w-5 text-teal-600" />
                                        {item.label}
                                    </Button>
                                ))}
                            </nav>
                            <div className="mt-auto pt-4 border-t">
                                <Button variant="outline" className="w-full justify-start gap-3" onClick={() => logout()}>
                                    <LogOut className="h-4 w-4" />
                                    Cerrar Sesión
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                    <div className="w-full flex-1">
                        <span className="font-semibold text-sm truncate">{user.name}</span>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-slate-50/30">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getLaboratoryServices } from '@/lib/supabaseService';
import type { LaboratoryService, Appointment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Loader2, 
    FlaskConical, 
    Users, 
    CalendarDays, 
    DollarSign, 
    Clock, 
    TrendingUp, 
    CheckCircle2, 
    Plus,
    Activity,
    ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LaboratoryOverviewTabProps {
    onNavigateTab?: (tab: string) => void;
}

export function LaboratoryOverviewTab({ onNavigateTab }: LaboratoryOverviewTabProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState<LaboratoryService[]>([]);
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState({
        totalServices: 0,
        todaySamples: 0,
        totalPatients: 0,
        monthIncome: 0,
    });

    const todayDate = format(new Date(), 'yyyy-MM-dd');
    const effectiveLabId = user?.role === 'secretary' ? (user.laboratoryId || user.id) : user?.id;

    useEffect(() => {
        if (!effectiveLabId) return;

        const loadOverviewData = async () => {
            try {
                setLoading(true);

                // Fetch services
                const svcs = await getLaboratoryServices(effectiveLabId);
                setServices(svcs);

                // Fetch appointments
                const { data: appts, error } = await supabase
                    .from('appointments')
                    .select('*')
                    .eq('laboratory_id', effectiveLabId);

                if (!error && appts) {
                    const todayList = appts.filter(a => a.date === todayDate);
                    const completedList = appts.filter(a => a.attendance === 'Atendido' || a.payment_status === 'Pagado');
                    const totalInc = completedList.reduce((acc, curr) => acc + (Number(curr.total_price) || 0), 0);
                    
                    const uniquePatients = new Set(appts.map(a => a.patient_id || a.patient_name)).size;

                    setTodayAppointments(todayList.map((item: any) => ({
                        id: item.id,
                        patientId: item.patient_id,
                        patientName: item.patient_name,
                        serviceName: item.service_name,
                        date: item.date,
                        time: item.time,
                        totalPrice: item.total_price || 0,
                        attendance: item.attendance || 'Pendiente',
                        paymentStatus: item.payment_status || 'Pendiente',
                        paymentMethod: item.payment_method || 'efectivo',
                        consultationFee: item.consultation_fee || 0,
                        services: [],
                        patientConfirmationStatus: 'Confirmada',
                        paymentProof: null,
                    })));

                    setStats({
                        totalServices: svcs.length,
                        todaySamples: todayList.length,
                        totalPatients: uniquePatients,
                        monthIncome: totalInc,
                    });
                }
            } catch (err) {
                console.error('Error loading laboratory overview:', err);
            } finally {
                setLoading(false);
            }
        };

        loadOverviewData();
    }, [user?.id, todayDate]);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                <p>Cargando métricas del laboratorio...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                            Panel de Laboratorio
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                        ¡Bienvenido, {user?.name}!
                    </h2>
                    <p className="text-teal-100 text-sm max-w-xl">
                        Supervisa las tomas de muestra del día, administra tu catálogo de análisis clínicos y gestiona tus pacientes.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                    <Button 
                        onClick={() => onNavigateTab?.('services')}
                        className="bg-white text-teal-900 hover:bg-teal-50 font-semibold shadow-sm gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Prueba
                    </Button>
                    <Button 
                        onClick={() => onNavigateTab?.('agenda')}
                        variant="outline" 
                        className="border-teal-300 text-white hover:bg-teal-800/50"
                    >
                        Ver Agenda
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-teal-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Muestras de Hoy
                            </p>
                            <h3 className="text-3xl font-extrabold text-slate-900">{stats.todaySamples}</h3>
                            <p className="text-xs text-teal-600 font-medium flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {format(new Date(), "d 'de' MMMM", { locale: es })}
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                            <CalendarDays className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Total Pacientes
                            </p>
                            <h3 className="text-3xl font-extrabold text-slate-900">{stats.totalPatients}</h3>
                            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                Atendidos en SUMA
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                            <Users className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Pruebas en Catálogo
                            </p>
                            <h3 className="text-3xl font-extrabold text-slate-900">{stats.totalServices}</h3>
                            <p className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                                <FlaskConical className="h-3.5 w-3.5" />
                                Servicios activos
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                            <FlaskConical className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Ingresos Generados
                            </p>
                            <h3 className="text-3xl font-extrabold text-slate-900">${stats.monthIncome.toFixed(2)}</h3>
                            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                                <DollarSign className="h-3.5 w-3.5" />
                                Cobros registrados
                            </p>
                        </div>
                        <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                            <DollarSign className="h-6 w-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Content Grid: Today Appointments & Featured Services */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Today Appointments */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-teal-600" />
                                    Pacientes Citados para Hoy
                                </CardTitle>
                                <CardDescription>
                                    Toma de muestras programadas para la jornada de hoy.
                                </CardDescription>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onNavigateTab?.('agenda')}
                                className="text-teal-700 gap-1 text-xs"
                            >
                                Ver Todo <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {todayAppointments.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground space-y-2">
                                    <CalendarDays className="h-10 w-10 mx-auto text-slate-300" />
                                    <p className="text-sm font-medium">No hay pacientes programados para hoy.</p>
                                    <p className="text-xs">Los pacientes que agenden citas aparecerán aquí automáticamente.</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {todayAppointments.map((appt) => (
                                        <div key={appt.id} className="py-3 flex items-center justify-between">
                                            <div className="space-y-1">
                                                <p className="font-semibold text-sm text-slate-900">{appt.patientName}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 border-teal-200">
                                                        {appt.serviceName}
                                                    </Badge>
                                                    <span>Hora: {appt.time}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge className={appt.attendance === 'Atendido' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}>
                                                    {appt.attendance === 'Atendido' ? 'Muestra Tomada' : 'Pendiente'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Col: Top Services */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-teal-600" />
                                    Pruebas Destacadas
                                </CardTitle>
                                <CardDescription>
                                    Tus análisis más recientes
                                </CardDescription>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => onNavigateTab?.('services')}
                                className="text-teal-700 text-xs"
                            >
                                Catálogo
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {services.length === 0 ? (
                                <div className="py-8 text-center text-muted-foreground space-y-2">
                                    <FlaskConical className="h-8 w-8 mx-auto text-slate-300" />
                                    <p className="text-xs">Aún no has registrado pruebas en tu catálogo.</p>
                                    <Button 
                                        size="sm" 
                                        onClick={() => onNavigateTab?.('services')}
                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs mt-2"
                                    >
                                        Crear Prueba
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {services.slice(0, 5).map((s) => (
                                        <div key={s.id} className="p-2.5 rounded-lg border bg-slate-50/50 flex items-center justify-between">
                                            <div className="min-w-0 pr-2">
                                                <p className="text-sm font-semibold text-slate-900 truncate">{s.name}</p>
                                                <p className="text-[11px] text-muted-foreground truncate">{s.serviceCategory || 'General'}</p>
                                            </div>
                                            <span className="font-bold text-sm text-teal-700 shrink-0">
                                                ${s.price.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

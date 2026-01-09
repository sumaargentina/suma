"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, Users, Calendar, DollarSign } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AnalyticsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [topDoctors, setTopDoctors] = useState<any[]>([]);
    const [kpis, setKpis] = useState<any>(null);

    useEffect(() => {
        // Protección de Ruta
        if (!authLoading) {
            if (!user || user.role !== 'admin') {
                // Si no es admin, fuera.
                router.push('/dashboard');
                return;
            }
            fetchAnalytics();
        }
    }, [user, authLoading, router]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);

            // 1. Fetch Monthly Revenue
            const { data: monthly, error: err1 } = await supabase.rpc('get_admin_monthly_revenue');
            if (err1) console.error('Error fetching monthly revenue:', err1);

            // 2. Fetch Top Doctors
            const { data: doctors, error: err2 } = await supabase.rpc('get_top_performing_doctors');
            if (err2) console.error('Error fetching top doctors:', err2);

            // 3. Fetch KPIs
            const { data: kpiData, error: err3 } = await supabase.rpc('get_admin_kpis');
            if (err3) console.error('Error fetching kpis:', err3);

            setMonthlyData(monthly || []);
            setTopDoctors(doctors || []);
            setKpis(kpiData?.[0] || null);

        } catch (error) {
            console.error('Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    // Doble chequeo visual
    if (user?.role !== 'admin') return null;

    return (
        <div className="p-8 space-y-8 bg-muted/20 min-h-screen">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Panel de Analíticas Admin</h1>
                    <p className="text-muted-foreground">Visión general del rendimiento financiero y operativo.</p>
                </div>
            </div>

            {/* KPIs Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ingresos Totales (YTD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${kpis?.total_revenue_ytd?.toLocaleString() || '0'}</div>
                        <p className="text-xs text-muted-foreground">Global Plataforma</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Citas Activas</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.active_appointments || 0}</div>
                        <p className="text-xs text-muted-foreground">Futuras</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Médicos</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.total_doctors || 0}</div>
                        <p className="text-xs text-muted-foreground">Registrados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pacientes</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpis?.total_patients || 0}</div>
                        <p className="text-xs text-muted-foreground">Registrados</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">

                {/* Main Chart: Revenue */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Ingresos Mensuales</CardTitle>
                        <CardDescription>Comparativa de volumen bruto vs comisión de plataforma (5%)</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM yy', { locale: es })}
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#888888"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                                        labelFormatter={(label) => format(new Date(label + '-01'), 'MMMM yyyy', { locale: es })}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="total_revenue" name="Volumen Bruto" stroke="#8884d8" fillOpacity={1} fill="url(#colorTotal)" />
                                    <Area type="monotone" dataKey="platform_revenue" name="Comisión SUMA" stroke="#82ca9d" fill="#82ca9d" />
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Top Doctors */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Top Profesionales</CardTitle>
                        <CardDescription>Médicos con mayor facturación este mes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {topDoctors.map((doc, i) => (
                                <div key={i} className="flex items-center">
                                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold">
                                        {i + 1}
                                    </div>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{doc.doctor_name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {doc.specialty}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        +${doc.total_revenue?.toLocaleString()}
                                    </div>
                                </div>
                            ))}
                            {topDoctors.length === 0 && (
                                <p className="text-muted-foreground text-center py-4">No hay datos suficientes aún.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

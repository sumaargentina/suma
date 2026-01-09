"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { HeaderWrapper } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, Users, Calendar, DollarSign, ArrowLeft } from "lucide-react";
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

export default function DoctorAnalyticsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [kpis, setKpis] = useState({
        total_patients: 0,
        monthly_revenue: 0,
        total_appointments: 0
    });

    useEffect(() => {
        if (!authLoading) {
            if (!user || user.role !== 'doctor') {
                router.push('/dashboard');
                return;
            }
            fetchDoctorAnalytics();
        }
    }, [user, authLoading, router]);

    const fetchDoctorAnalytics = async () => {
        try {
            setLoading(true);

            // 1. Fetch Monthly Stats via RPC
            const { data, error } = await supabase.rpc('get_doctor_analytics', { p_doctor_id: user!.id });

            if (error) throw error;
            setAnalyticsData(data || []);

            // Calculate simple KPIs from the data
            const currentMonth = format(new Date(), 'yyyy-MM');
            const currentMonthData = data?.find((d: any) => d.month === currentMonth);

            setKpis({
                monthly_revenue: currentMonthData?.revenue || 0,
                total_patients: data?.reduce((acc: number, curr: any) => acc + (curr.patients_seen || 0), 0) || 0, // This is an approximation
                total_appointments: data?.reduce((acc: number, curr: any) => acc + (curr.patients_seen || 0), 0) || 0
            });

        } catch (error) {
            console.error('Doctor Analytics Error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="min-h-screen bg-muted/20">
            <HeaderWrapper />
            <div className="container py-8 space-y-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Mis Estadísticas</h1>
                        <p className="text-muted-foreground">Rendimiento de tu consultorio.</p>
                    </div>
                </div>

                {/* KPIs Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ingresos este Mes</CardTitle>
                            <DollarSign className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${kpis.monthly_revenue.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground">Facturación bruta</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pacientes Atendidos</CardTitle>
                            <Users className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpis.total_patients}</div>
                            <p className="text-xs text-muted-foreground">En los últimos 12 meses</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">+5%</div>
                            <p className="text-xs text-muted-foreground">Respecto al mes anterior</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Evolución de Ingresos</CardTitle>
                        <CardDescription>Tus ingresos mensuales</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analyticsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        tickFormatter={(value) => format(new Date(value + '-01'), 'MMM', { locale: es })}
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
                                        formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Ingresos']}
                                        labelFormatter={(label) => format(new Date(label + '-01'), 'MMMM yyyy', { locale: es })}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" fillOpacity={1} fill="#3b82f6" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

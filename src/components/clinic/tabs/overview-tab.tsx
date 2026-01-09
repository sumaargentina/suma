"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Clinic, ClinicBranch, ClinicService, Doctor, Appointment } from '@/lib/types';
import { getClinicBranches, getClinicServices, getClinicDoctors } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2, Users, Tag, CalendarDays, TrendingUp } from 'lucide-react';

export function OverviewTab() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        branchCount: 0,
        doctorCount: 0,
        serviceCount: 0,
        appointmentsToday: 0, // Placeholder
    });

    useEffect(() => {
        if (user?.id) {
            loadStats();
        }
    }, [user?.id]);

    const loadStats = async () => {
        if (!user) return;
        const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;

        if (!targetClinicId) return;

        try {
            setLoading(true);
            const [branches, doctors, services] = await Promise.all([
                getClinicBranches(targetClinicId),
                getClinicDoctors(targetClinicId),
                getClinicServices(targetClinicId)
            ]);
            setStats({
                branchCount: branches.length,
                doctorCount: doctors.length,
                serviceCount: services.length,
                appointmentsToday: 0, // TODO: Implement actual appointment fetching
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Bienvenido, {user?.name}</h2>
                <p className="text-muted-foreground">Aquí tienes un resumen de tu clínica.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Médicos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.doctorCount}</div>
                        <p className="text-xs text-muted-foreground">Profesionales registrados</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Servicios</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.serviceCount}</div>
                        <p className="text-xs text-muted-foreground">Servicios ofrecidos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
                        <p className="text-xs text-muted-foreground">Agendadas para hoy</p>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions / Placeholder for future charts */}
            <Card>
                <CardHeader>
                    <CardTitle>Próximos Pasos</CardTitle>
                    <CardDescription>Configura tu clínica para obtener lo mejor de SUMA.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        {stats.branchCount === 0 && <li>Registra tu primera <strong>Sede</strong> para comenzar.</li>}
                        {stats.doctorCount === 0 && <li>Agrega <strong>Médicos</strong> a tu plantel.</li>}
                        {stats.serviceCount === 0 && <li>Configura los <strong>Servicios</strong> que ofreces.</li>}
                        {stats.branchCount > 0 && stats.doctorCount > 0 && stats.serviceCount > 0 && (
                            <li>¡Tu clínica está lista! Comparte tu perfil público: <strong>/clinica/[tu-slug]</strong></li>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

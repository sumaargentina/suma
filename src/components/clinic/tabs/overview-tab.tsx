"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useAuth } from '@/lib/auth';
import { Clinic } from '@/lib/types';
import { getClinic, getClinicBranches, getClinicServices, getClinicDoctors, getClinicAppointments } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, Users, Tag, CalendarDays, ExternalLink, Copy, Clock } from 'lucide-react';

export function OverviewTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [stats, setStats] = useState({
        branchCount: 0,
        doctorCount: 0,
        pendingDoctorCount: 0,
        serviceCount: 0,
        appointmentsToday: 0,
    });

    useEffect(() => {
        if (user?.id) {
            loadStats();
        }
    }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadStats = async () => {
        if (!user) return;
        const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;

        if (!targetClinicId) return;

        try {
            setLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const [clinicData, branches, doctors, services, apptsToday] = await Promise.all([
                getClinic(targetClinicId),
                getClinicBranches(targetClinicId),
                getClinicDoctors(targetClinicId),
                getClinicServices(targetClinicId),
                getClinicAppointments(targetClinicId, todayStr),
            ]);
            setClinic(clinicData);

            const pendingDocs = doctors.filter((d: any) => d.workspaceStatus === 'pending_invitation').length;

            setStats({
                branchCount: branches.length,
                doctorCount: doctors.length,
                pendingDoctorCount: pendingDocs,
                serviceCount: services.length,
                appointmentsToday: apptsToday.length,
            });
        } catch (error) {
            console.error('Error loading stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPublicLink = () => {
        if (!clinic?.slug) return;
        const url = `${window.location.origin}/clinica/${clinic.slug}`;
        navigator.clipboard.writeText(url);
        toast({
            title: 'Enlace copiado',
            description: 'El link del perfil público se copió al portapapeles.',
        });
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isHospitalGratuito = clinic?.plan === 'hospital_gratuito' || user?.plan === 'hospital_gratuito';

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-2xl font-bold tracking-tight">Bienvenido, {clinic?.name || user?.name}</h2>
                        {isHospitalGratuito && (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-300 font-semibold">
                                🏥 Hospital / Centro Gratuito
                            </Badge>
                        )}
                    </div>
                    <p className="text-muted-foreground">
                        {isHospitalGratuito
                            ? 'Panel institucional gratuito de gestión médica, servicios y pacientes.'
                            : 'Aquí tienes el resumen operativo en tiempo real de tu clínica.'}
                    </p>
                </div>

                {clinic?.slug && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopyPublicLink}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link Público
                        </Button>
                        <Button size="sm" asChild>
                            <Link href={`/clinica/${clinic.slug}`} target="_blank">
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver Perfil Público
                            </Link>
                        </Button>
                    </div>
                )}
            </div>

            {isHospitalGratuito && (
                <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-900 text-sm flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Modalidad Institucional 100% Gratuita Activa</p>
                        <p className="text-xs text-sky-800 mt-0.5">
                            Esta cuenta institucional está exenta de mensualidad en SUMA y todos los servicios y consultas registrados para los pacientes son 100% gratuitos ($0).
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Médicos en Plantel</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.doctorCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.pendingDoctorCount > 0
                                ? `${stats.doctorCount - stats.pendingDoctorCount} activos • ${stats.pendingDoctorCount} por validar`
                                : 'Profesionales vinculados'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Servicios</CardTitle>
                        <Tag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.serviceCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {isHospitalGratuito ? 'Servicios gratuitos activos' : 'Servicios ofrecidos'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.appointmentsToday}</div>
                        <p className="text-xs text-muted-foreground">Agendadas para el día de hoy</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sedes / Consultorios</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{Math.max(1, stats.branchCount)}</div>
                        <p className="text-xs text-muted-foreground">Puntos de atención</p>
                    </CardContent>
                </Card>
            </div>

            {stats.pendingDoctorCount > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                        <span>
                            Tienes <strong>{stats.pendingDoctorCount} médico(s)</strong> pendientes de validar su invitación desde su Espacio de Trabajo en SUMA.
                        </span>
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Guía Rápida de Configuración</CardTitle>
                    <CardDescription>Asegúrate de completar estos pasos para aprovechar todo el ecosistema SUMA.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                        {stats.doctorCount === 0 && (
                            <li>Agrega o vincula <strong>Médicos</strong> por Cédula/DNI en la pestaña <strong>Médicos</strong> (ellos validarán la invitación en su Espacio de Trabajo).</li>
                        )}
                        {stats.serviceCount === 0 && (
                            <li>Configura los <strong>Servicios</strong> y estudios que ofreces en la pestaña <strong>Servicios</strong>.</li>
                        )}
                        {clinic?.slug && (
                            <li>
                                Tu perfil público en SUMA está activo en:{' '}
                                <Link href={`/clinica/${clinic.slug}`} target="_blank" className="font-semibold text-primary underline">
                                    /clinica/{clinic.slug}
                                </Link>
                            </li>
                        )}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}

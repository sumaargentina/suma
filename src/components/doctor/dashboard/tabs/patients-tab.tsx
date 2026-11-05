"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
    Search,
    MessageCircle,
    Phone,
    FileText,
    Users,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Baby,
    User,
    Mail,
    MapPin,
    History,
    LayoutGrid,
    List,
    Stethoscope,
    FolderOpen,
    PlusCircle,
    ExternalLink,
    Activity,
    CreditCard,
    Sparkles,
    Eye
} from "lucide-react";

import { Appointment, Patient, FamilyMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFamilyMembers, getPatient } from "@/lib/supabaseService";
import { MedicalRecordTimeline } from "@/components/doctor/patient-history/medical-record-timeline";
import { PatientFilesGallery } from "@/components/doctor/patient-history/patient-files-gallery";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type PatientSummary = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    cedula?: string;
    documentType?: string;
    age?: number | null;
    gender?: string | null;
    city?: string | null;
    bloodType?: string | null;
    allergies?: string | null;
    chronicConditions?: string | null;
    lastDiagnosis?: string | null;
    filesCount?: number;
    profileImage?: string | null;
    lastAppointment: Appointment;
    totalAppointments: number;
    completedAppointments: number;
    noShowAppointments: number;
    totalPaid: number;
    attendanceRate: number;
    servicesUsed: string[];
};

interface PatientsTabProps {
    appointments: Appointment[];
    role?: 'doctor' | 'clinic';
}

export function PatientsTab({ appointments, role = 'doctor' }: PatientsTabProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    // Por defecto se muestra como "Ficha Técnica" ('cards'), con opción de cambiar a "Listado" ('list')
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [initialModalTab, setInitialModalTab] = useState<string>("clinical-history");
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

    // Agrupar citas por paciente y calcular métricas técnicas
    const basePatients = useMemo(() => {
        const patientMap = new Map<string, {
            id: string;
            name: string;
            phone?: string;
            appointments: Appointment[];
        }>();

        appointments.forEach(appt => {
            if (!appt.patientId) return;
            if (!patientMap.has(appt.patientId)) {
                patientMap.set(appt.patientId, {
                    id: appt.patientId,
                    name: appt.patientName || 'Paciente',
                    phone: appt.patientPhone,
                    appointments: []
                });
            }
            patientMap.get(appt.patientId)?.appointments.push(appt);
        });

        return Array.from(patientMap.values()).map(p => {
            const sortedAppts = [...p.appointments].sort((a, b) =>
                new Date(b.date + 'T' + (b.time || '00:00')).getTime() - new Date(a.date + 'T' + (a.time || '00:00')).getTime()
            );

            const completed = p.appointments.filter(a => a.attendance === 'Atendido').length;
            const noShows = p.appointments.filter(a => a.attendance === 'No Asistió').length;
            const total = p.appointments.length;
            const totalPaid = p.appointments
                .filter(a => a.paymentStatus === 'Pagado' && a.attendance !== 'No Asistió')
                .reduce((sum, a) => sum + (a.totalPrice || 0), 0);

            const servicesSet = new Set<string>();
            p.appointments.forEach(a => {
                if (a.serviceName) servicesSet.add(a.serviceName);
                (a.services || []).forEach(s => {
                    if (s?.name) servicesSet.add(s.name);
                });
            });

            return {
                id: p.id,
                name: p.name,
                phone: p.phone,
                lastAppointment: sortedAppts[0],
                totalAppointments: total,
                completedAppointments: completed,
                noShowAppointments: noShows,
                totalPaid,
                attendanceRate: total > 0 ? Math.round((completed / total) * 100) : 0,
                servicesUsed: Array.from(servicesSet)
            };
        });
    }, [appointments]);

    // Cargar datos de perfil (cédula, edad, ciudad, sangre, alergias, correo) para enriquecer la Ficha Técnica
    useEffect(() => {
        let isMounted = true;
        const missingIds = basePatients
            .map(p => p.id)
            .filter(id => id && !profilesMap[id]);

        if (missingIds.length === 0) return;

        Promise.all(
            missingIds.slice(0, 50).map(async (id) => {
                try {
                    const res = await fetch(`/api/patients/get?id=${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        return { id, data };
                    }
                } catch {
                    // ignore individual error
                }
                return null;
            })
        ).then(results => {
            if (!isMounted) return;
            const nextMap: Record<string, any> = {};
            results.forEach(item => {
                if (item && item.data) {
                    nextMap[item.id] = item.data;
                }
            });
            if (Object.keys(nextMap).length > 0) {
                setProfilesMap(prev => ({ ...prev, ...nextMap }));
            }
        });

        return () => {
            isMounted = false;
        };
    }, [basePatients]);

    const patients: PatientSummary[] = useMemo(() => {
        return basePatients.map(p => {
            const prof = profilesMap[p.id];
            return {
                ...p,
                name: prof?.name || p.name,
                phone: prof?.phone || prof?.whatsapp || p.phone,
                email: prof?.email || undefined,
                cedula: prof?.cedula || undefined,
                documentType: prof?.document_type || prof?.documentType || 'V',
                age: prof?.age ?? null,
                gender: prof?.gender ?? null,
                city: prof?.city ?? null,
                bloodType: prof?.blood_type || prof?.bloodType || null,
                allergies: prof?.allergies || null,
                chronicConditions: prof?.chronic_conditions || prof?.chronicConditions || null,
                lastDiagnosis: prof?.last_diagnosis || prof?.lastDiagnosis || null,
                filesCount: typeof prof?.files_count === 'number' ? prof.files_count : 0,
                profileImage: prof?.profile_image || prof?.profileImage || null,
            };
        });
    }, [basePatients, profilesMap]);

    // Filtrar pacientes por nombre, teléfono, cédula o correo
    const filteredPatients = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return patients;
        return patients.filter(p =>
            p.name.toLowerCase().includes(term) ||
            (p.phone && p.phone.toLowerCase().includes(term)) ||
            (p.cedula && p.cedula.toLowerCase().includes(term)) ||
            (p.email && p.email.toLowerCase().includes(term)) ||
            (p.city && p.city.toLowerCase().includes(term))
        );
    }, [patients, searchTerm]);

    const handleOpenWhatsApp = (phone?: string, patientName?: string) => {
        if (!phone) return;
        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
        if (!cleanPhone.startsWith('+')) {
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            cleanPhone = cleanPhone.startsWith('58') ? `+${cleanPhone}` : `+58${cleanPhone}`;
        }
        const greeting = patientName
            ? `Hola ${patientName}, te escribo desde mi consultorio en SUMA Salud.`
            : `Hola, te escribo desde SUMA Salud.`;
        window.open(`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(greeting)}`, '_blank');
    };

    const handleOpenFullHistoryPage = (patientId: string, tab: string = 'summary') => {
        const basePath = role === 'clinic' ? `/clinic/patients/${patientId}` : `/doctor/patients/${patientId}`;
        router.push(tab && tab !== 'summary' ? `${basePath}?tab=${tab}` : basePath);
    };

    const handleOpenFichaModal = (patientId: string, defaultTab: string = 'clinical-history') => {
        setSelectedPatientId(patientId);
        setInitialModalTab(defaultTab);
        setIsDetailOpen(true);
    };

    const handleChat = (patientId: string) => {
        if (role === 'clinic') {
            router.push(`/clinic/dashboard?view=chat&chatPatientId=${patientId}`);
        } else {
            router.push(`/doctor/dashboard?view=chat&chatPatientId=${patientId}`);
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabecera con Buscador y Selector de Vista: Ficha Técnica vs Listado */}
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Mis Pacientes</h2>
                        <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                            {filteredPatients.length} {filteredPatients.length === 1 ? 'Paciente' : 'Pacientes'}
                        </Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Fichas técnicas completas con acceso directo a Historia Clínica, Archivos de Laboratorio, Evoluciones, WhatsApp y Chat.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 sm:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre, cédula o teléfono..."
                            className="pl-9 h-9 text-xs sm:text-sm rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Conmutador Ficha Técnica (Por Defecto) vs Listado */}
                    <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                viewMode === 'cards'
                                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <LayoutGrid className="h-3.5 w-3.5 text-teal-600" />
                            Fichas Técnicas
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('list')}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                                viewMode === 'list'
                                    ? "bg-white text-teal-800 shadow-xs border border-slate-200/80"
                                    : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            <List className="h-3.5 w-3.5 text-teal-600" />
                            Vista Listado
                        </button>
                    </div>
                </div>
            </div>

            {/* VISTA 1 (POR DEFECTO): FICHAS TÉCNICAS DE PACIENTES */}
            {viewMode === 'cards' ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filteredPatients.map((patient) => (
                        <Card
                            key={patient.id}
                            className="overflow-hidden border-slate-200 hover:border-teal-300 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between bg-white"
                        >
                            <div>
                                {/* Cabecera de la Ficha Técnica */}
                                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/30 to-slate-50 border-b border-slate-200/80">
                                    <div className="flex items-start gap-3.5">
                                        <Avatar className="h-14 w-14 border-2 border-teal-500/30 shadow-2xs shrink-0">
                                            <AvatarImage src={patient.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=0d9488&color=fff`} />
                                            <AvatarFallback className="bg-teal-700 text-white font-bold">
                                                {patient.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3
                                                    className="font-extrabold text-base text-slate-900 truncate cursor-pointer hover:text-teal-700 transition-colors"
                                                    title={patient.name}
                                                    onClick={() => handleOpenFullHistoryPage(patient.id)}
                                                >
                                                    {patient.name}
                                                </h3>
                                                <Badge
                                                    variant="outline"
                                                    className="bg-white text-[10px] font-mono font-bold border-slate-300 text-slate-700 shrink-0"
                                                >
                                                    {patient.cedula ? `C.I. ${patient.cedula}` : `ID #${patient.id.slice(0, 6)}`}
                                                </Badge>
                                            </div>

                                            {/* Etiquetas Biométricas / Demográficas */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-600">
                                                {patient.age !== null && patient.age !== undefined && (
                                                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 font-semibold">
                                                        {patient.age} años
                                                    </span>
                                                )}
                                                {patient.gender && (
                                                    <span className="bg-white px-2 py-0.5 rounded-md border border-slate-200 capitalize">
                                                        {patient.gender}
                                                    </span>
                                                )}
                                                {patient.bloodType && (
                                                    <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md font-bold">
                                                        🩸 {patient.bloodType}
                                                    </span>
                                                )}
                                                {patient.city && (
                                                    <span className="inline-flex items-center gap-0.5 text-slate-500">
                                                        <MapPin className="h-3 w-3 text-teal-600" /> {patient.city}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Contacto Rápido */}
                                            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Phone className="h-3 w-3 text-teal-600" />
                                                    {patient.phone || "Sin teléfono"}
                                                </span>
                                                {patient.email && (
                                                    <span className="flex items-center gap-1 truncate max-w-[160px]" title={patient.email}>
                                                        <Mail className="h-3 w-3 text-slate-400" />
                                                        {patient.email}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Cuerpo de Datos Técnicos del Paciente */}
                                <CardContent className="p-4 sm:p-5 space-y-3.5">
                                    {/* Alerta de Alergias y Condiciones / Diagnóstico si existen */}
                                    {(patient.allergies || patient.chronicConditions || patient.lastDiagnosis || (patient.filesCount ?? 0) > 0) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {patient.allergies && (
                                                <div className="bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1 text-xs text-amber-950 flex items-center gap-1.5 max-w-full">
                                                    <Activity className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                                    <span className="truncate">
                                                        <strong>Alergias:</strong> {patient.allergies}
                                                    </span>
                                                </div>
                                            )}
                                            {(patient.chronicConditions || patient.lastDiagnosis) && (
                                                <div className="bg-blue-50/90 border border-blue-200 rounded-lg px-2.5 py-1 text-xs text-blue-950 flex items-center gap-1.5 max-w-full">
                                                    <Stethoscope className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                    <span className="truncate">
                                                        <strong>Condición/Dx:</strong> {patient.chronicConditions || patient.lastDiagnosis}
                                                    </span>
                                                </div>
                                            )}
                                            {(patient.filesCount ?? 0) > 0 && (
                                                <div className="bg-purple-50/90 border border-purple-200 rounded-lg px-2.5 py-1 text-xs text-purple-950 flex items-center gap-1">
                                                    <FolderOpen className="h-3 w-3 text-purple-600 shrink-0" />
                                                    <span className="font-semibold">{patient.filesCount} {patient.filesCount === 1 ? 'archivo' : 'archivos'}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Métricas Clínicas en Grilla */}
                                    <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Consultas</span>
                                            <span className="text-sm font-extrabold text-slate-900">{patient.totalAppointments}</span>
                                        </div>
                                        <div className="border-x border-slate-200/80">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Asistencia</span>
                                            <span className="text-sm font-extrabold text-emerald-700">{patient.attendanceRate}%</span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Última Cita</span>
                                            <span className="text-xs font-bold text-slate-800">
                                                {format(new Date(patient.lastAppointment.date + 'T00:00:00'), "dd/MM/yy", { locale: es })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Estado de la última atención */}
                                    <div className="flex items-center justify-between text-xs px-1">
                                        <span className="text-slate-500 font-medium truncate max-w-[180px]" title={patient.lastAppointment.serviceName || 'Consulta Médica'}>
                                            🩺 {patient.lastAppointment.serviceName || 'Consulta General'}
                                        </span>
                                        <Badge
                                            variant={
                                                patient.lastAppointment.attendance === 'Atendido'
                                                    ? 'default'
                                                    : patient.lastAppointment.attendance === 'No Asistió'
                                                    ? 'destructive'
                                                    : 'secondary'
                                            }
                                            className={cn(
                                                "text-[10px]",
                                                patient.lastAppointment.attendance === 'Atendido' && "bg-emerald-600 text-white"
                                            )}
                                        >
                                            {patient.lastAppointment.attendance}
                                        </Badge>
                                    </div>

                                    {role === 'clinic' && patient.lastAppointment.doctorName && (
                                        <div className="text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                            Atendido por: <strong className="text-slate-800">{patient.lastAppointment.doctorName}</strong>
                                        </div>
                                    )}
                                </CardContent>
                            </div>

                            {/* Pie de Ficha Técnica: TODAS LAS OPCIONES DIRECTAS */}
                            <div className="p-3.5 pt-3 bg-slate-50/70 border-t border-slate-200/80 space-y-2">
                                {/* Fila Principal: Ir directo a Historia Clínica Completa + Nueva Evolución + Archivos */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    <Button
                                        size="sm"
                                        onClick={() => handleOpenFullHistoryPage(patient.id, 'summary')}
                                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 font-bold gap-1 shadow-2xs col-span-1"
                                        title="Abrir Historia Clínica completa del paciente"
                                    >
                                        <Stethoscope className="h-3.5 w-3.5 shrink-0" />
                                        Historia
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenFullHistoryPage(patient.id, 'new-evolution')}
                                        className="border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-900 text-xs h-8 font-semibold gap-1"
                                        title="Crear nueva evolución o récipe"
                                    >
                                        <PlusCircle className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                        Evolución
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenFullHistoryPage(patient.id, 'files')}
                                        className="border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-950 text-xs h-8 font-semibold gap-1"
                                        title="Ver o subir archivos y resultados de laboratorio"
                                    >
                                        <FolderOpen className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        Archivos
                                    </Button>
                                </div>

                                {/* Segunda Fila: Vista Rápida de Ficha Modal + WhatsApp Directo + Chat SUMA */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenFichaModal(patient.id, 'clinical-history')}
                                        className="text-xs h-8 font-semibold gap-1 bg-white"
                                    >
                                        <Eye className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                                        Vista Previa
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={!patient.phone}
                                        onClick={() => handleOpenWhatsApp(patient.phone, patient.name)}
                                        className="border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-emerald-900 text-xs h-8 font-semibold gap-1"
                                    >
                                        <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        WhatsApp
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleChat(patient.id)}
                                        className="border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 text-xs h-8 font-semibold gap-1"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                        Chat
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                /* VISTA 2: LISTADO COMPACTO EN TABLA CON TODAS LAS ACCIONES DIRECTAS */
                <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-bold text-xs">Paciente / Cédula</TableHead>
                                    <TableHead className="font-bold text-xs">Contacto</TableHead>
                                    <TableHead className="font-bold text-xs">Última Cita</TableHead>
                                    <TableHead className="font-bold text-xs text-center">Consultas</TableHead>
                                    <TableHead className="font-bold text-xs text-right">Acciones Directas</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPatients.map((patient) => (
                                    <TableRow key={patient.id} className="hover:bg-slate-50/80">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-slate-200">
                                                    <AvatarImage src={patient.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=0d9488&color=fff`} />
                                                    <AvatarFallback className="text-xs font-bold">
                                                        {patient.name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p
                                                        className="font-bold text-sm text-slate-900 hover:text-teal-700 cursor-pointer"
                                                        onClick={() => handleOpenFullHistoryPage(patient.id)}
                                                    >
                                                        {patient.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                        {patient.cedula && <span className="font-mono">C.I.: {patient.cedula}</span>}
                                                        {patient.age !== null && patient.age !== undefined && <span>• {patient.age} años</span>}
                                                        {patient.bloodType && <span className="text-rose-700 font-semibold">• {patient.bloodType}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-medium text-slate-800">{patient.phone || "Sin teléfono"}</p>
                                                {patient.email && <p className="text-slate-500 truncate max-w-[160px]">{patient.email}</p>}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs space-y-0.5">
                                                <span className="font-semibold text-slate-800 block">
                                                    {format(new Date(patient.lastAppointment.date + 'T00:00:00'), "dd MMM yyyy", { locale: es })}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[10px]",
                                                        patient.lastAppointment.attendance === 'Atendido'
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                            : patient.lastAppointment.attendance === 'No Asistió'
                                                            ? "bg-rose-50 text-rose-800 border-rose-200"
                                                            : "bg-amber-50 text-amber-800 border-amber-200"
                                                    )}
                                                >
                                                    {patient.lastAppointment.attendance}
                                                </Badge>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-bold text-xs">
                                                {patient.totalAppointments} ({patient.attendanceRate}%)
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleOpenFullHistoryPage(patient.id, 'summary')}
                                                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 gap-1 font-semibold"
                                                >
                                                    <Stethoscope className="h-3.5 w-3.5" />
                                                    Historia
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleOpenFullHistoryPage(patient.id, 'files')}
                                                    className="border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 text-xs h-8 gap-1"
                                                >
                                                    <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
                                                    Archivos
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!patient.phone}
                                                    onClick={() => handleOpenWhatsApp(patient.phone, patient.name)}
                                                    className="border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs h-8 gap-1"
                                                >
                                                    <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                                    WhatsApp
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleChat(patient.id)}
                                                    className="text-xs h-8 gap-1"
                                                >
                                                    <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
                                                    Chat
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleOpenFichaModal(patient.id, 'clinical-history')}
                                                    className="text-xs h-8 gap-1"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                    Ficha
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {filteredPatients.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-slate-50/50">
                    No se encontraron pacientes que coincidan con tu búsqueda.
                </div>
            )}

            <PatientDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                patientId={selectedPatientId}
                initialTab={initialModalTab}
                appointments={appointments}
                role={role}
                onOpenFullHistoryPage={handleOpenFullHistoryPage}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenChat={handleChat}
            />
        </div>
    );
}

function PatientDetailDialog({
    open,
    onOpenChange,
    patientId,
    initialTab = "clinical-history",
    appointments,
    role = 'doctor',
    onOpenFullHistoryPage,
    onOpenWhatsApp,
    onOpenChat
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string | null;
    initialTab?: string;
    appointments: Appointment[];
    role?: 'doctor' | 'clinic';
    onOpenFullHistoryPage: (patientId: string, tab?: string) => void;
    onOpenWhatsApp: (phone?: string, name?: string) => void;
    onOpenChat: (patientId: string) => void;
}) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [patientDetails, setPatientDetails] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab || "clinical-history");
        }
    }, [open, initialTab]);

    useEffect(() => {
        if (open && patientId) {
            setIsLoading(true);
            Promise.all([
                fetch(`/api/patients/get?id=${patientId}`).then(r => r.ok ? r.json() : getPatient(patientId)),
                getFamilyMembers(patientId)
            ]).then(([pData, fData]) => {
                setPatientDetails(pData);
                setFamilyMembers(fData || []);
            }).catch(err => {
                console.error("Error loading patient details:", err);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [open, patientId]);

    const patientAppointments = useMemo(() => {
        if (!patientId) return [];
        return appointments
            .filter(a => a.patientId === patientId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, patientId]);

    const patientInfo = patientAppointments[0];

    if (!patientId) return null;

    const displayInfo = {
        name: patientDetails?.name || patientInfo?.patientName || 'Paciente',
        phone: patientDetails?.phone || patientDetails?.whatsapp || patientInfo?.patientPhone || '',
        email: patientDetails?.email || null,
        cedula: patientDetails?.cedula || null,
        age: patientDetails?.age ?? null,
        gender: patientDetails?.gender || null,
        city: patientDetails?.city || null,
        bloodType: patientDetails?.blood_type || patientDetails?.bloodType || null,
        allergies: patientDetails?.allergies || null,
        profileImage: patientDetails?.profile_image || patientDetails?.profileImage || null
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-teal-950">
                        <Stethoscope className="h-5 w-5 text-teal-600" />
                        Ficha Técnica Integral del Paciente
                    </DialogTitle>
                    <DialogDescription>
                        Consulta su historial médico, archivos y resultados de laboratorio, citas, núcleo familiar o comunícate en 1 clic.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                    {/* Cabecera de la Ficha Técnica con Botones de Acción Directa */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-gradient-to-r from-slate-50 via-teal-50/40 to-slate-50 border border-slate-200 rounded-2xl">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-16 w-16 border-2 border-teal-500/30">
                                <AvatarImage src={displayInfo.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInfo.name)}&background=0d9488&color=fff`} />
                                <AvatarFallback className="bg-teal-700 text-white font-bold">PAC</AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-extrabold text-lg text-slate-900">{displayInfo.name}</h3>
                                    {displayInfo.cedula && (
                                        <Badge variant="outline" className="font-mono text-xs bg-white">
                                            C.I.: {displayInfo.cedula}
                                        </Badge>
                                    )}
                                    {displayInfo.bloodType && (
                                        <Badge className="bg-rose-100 text-rose-800 border border-rose-200 text-xs">
                                            🩸 {displayInfo.bloodType}
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                    <span className="flex items-center gap-1 font-medium">
                                        <Phone className="h-3.5 w-3.5 text-teal-600" /> {displayInfo.phone || "No registrado"}
                                    </span>
                                    {displayInfo.email && (
                                        <span className="flex items-center gap-1">
                                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {displayInfo.email}
                                        </span>
                                    )}
                                    {displayInfo.age !== null && <span>• {displayInfo.age} años</span>}
                                    {displayInfo.city && <span>• {displayInfo.city}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Botones Directos desde la Cabecera del Modal */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <Button
                                size="sm"
                                onClick={() => {
                                    onOpenChange(false);
                                    onOpenFullHistoryPage(patientId, 'summary');
                                }}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 font-bold gap-1.5 shadow-xs"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Abrir Módulo de Historia
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    onOpenFullHistoryPage(patientId, 'new-evolution');
                                }}
                                className="border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs h-9 font-semibold gap-1.5"
                            >
                                <PlusCircle className="h-3.5 w-3.5 text-indigo-600" />
                                Nueva Evolución
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!displayInfo.phone}
                                onClick={() => onOpenWhatsApp(displayInfo.phone, displayInfo.name)}
                                className="border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs h-9 font-semibold gap-1.5"
                            >
                                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                WhatsApp
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    onOpenChat(patientId);
                                }}
                                className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-900 text-xs h-9 font-semibold gap-1.5"
                            >
                                <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
                                Chat
                            </Button>
                        </div>
                    </div>

                    {/* Pestañas de la Ficha Técnica */}
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
                            <TabsTrigger value="clinical-history" className="text-xs py-2">
                                🩺 Historial Clínico
                            </TabsTrigger>
                            <TabsTrigger value="files" className="text-xs py-2">
                                🔬 Archivos y Lab
                            </TabsTrigger>
                            <TabsTrigger value="appointments" className="text-xs py-2">
                                📅 Citas ({patientAppointments.length})
                            </TabsTrigger>
                            <TabsTrigger value="family" className="text-xs py-2">
                                👨‍👩‍👧 Familia ({familyMembers.length})
                            </TabsTrigger>
                            <TabsTrigger value="info" className="text-xs py-2">
                                📋 Datos Técnicos
                            </TabsTrigger>
                        </TabsList>

                        {/* 1. Historial Clínico (Evoluciones, Récipes y Órdenes) */}
                        <TabsContent value="clinical-history" className="mt-4">
                            <MedicalRecordTimeline patientId={patientId} patientName={displayInfo.name} />
                        </TabsContent>

                        {/* 2. Galería de Archivos y Resultados de Laboratorio (con subida WebP y PDF) */}
                        <TabsContent value="files" className="mt-4">
                            <PatientFilesGallery patientId={patientId} />
                        </TabsContent>

                        {/* 3. Historial de Citas */}
                        <TabsContent value="appointments" className="mt-4">
                            <div className="border rounded-xl overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b font-semibold text-xs flex justify-between items-center">
                                    <span className="flex items-center gap-2"><History className="h-4 w-4 text-teal-600" /> Registro de Citas</span>
                                    <span className="text-xs text-muted-foreground">{patientAppointments.length} citas registradas</span>
                                </div>
                                <ScrollArea className="h-[320px] p-0">
                                    <div className="divide-y">
                                        {patientAppointments.map((appt) => (
                                            <div key={appt.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row justify-between gap-2">
                                                <div className="space-y-1">
                                                    <div className="font-semibold text-sm flex items-center gap-2">
                                                        {format(new Date(appt.date + 'T00:00:00'), "dd MMM yyyy", { locale: es })}
                                                        <span className="text-muted-foreground font-normal text-xs">a las {appt.time}</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {appt.serviceName || "Consulta General"}
                                                    </div>
                                                    {appt.doctorName && (
                                                        <div className="text-xs text-teal-700 font-medium">
                                                            Atendido por: {appt.doctorName}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <Badge variant={appt.attendance === 'Atendido' ? 'default' : appt.attendance === 'No Asistió' ? 'destructive' : 'secondary'}>
                                                        {appt.attendance}
                                                    </Badge>
                                                    {appt.totalPrice > 0 && (
                                                        <span className="text-xs font-mono font-bold text-slate-700">
                                                            ${appt.totalPrice.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </TabsContent>

                        {/* 4. Núcleo Familiar */}
                        <TabsContent value="family" className="mt-4">
                            {isLoading ? (
                                <div className="flex justify-center p-8 text-muted-foreground">Cargando familiares...</div>
                            ) : familyMembers.length === 0 ? (
                                <div className="text-center py-12 border rounded-xl border-dashed">
                                    <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                    <p className="text-muted-foreground text-sm">No hay familiares registrados para este paciente.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {familyMembers.map((member) => (
                                        <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border rounded-xl shadow-2xs">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center font-bold">
                                                    {member.firstName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-slate-900">{member.firstName} {member.lastName}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        {['hijo', 'hija', 'nieto', 'nieta'].includes(member.relationship.toLowerCase()) ? (
                                                            <Baby className="h-3 w-3" />
                                                        ) : (
                                                            <User className="h-3 w-3" />
                                                        )}
                                                        <span className="capitalize">{member.relationship}</span>
                                                        {member.age && <span>• {member.age} años</span>}
                                                        {member.cedula && <span>• C.I.: {member.cedula}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-8 gap-1 border-teal-200 text-teal-800 hover:bg-teal-50"
                                                    onClick={() => {
                                                        onOpenChange(false);
                                                        const basePath = role === 'clinic' ? `/clinic/patients/${patientId}` : `/doctor/patients/${patientId}`;
                                                        window.location.href = `${basePath}?familyMemberId=${member.id}`;
                                                    }}
                                                >
                                                    <Stethoscope className="h-3.5 w-3.5" />
                                                    Historia del Familiar
                                                </Button>
                                                {member.phone && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8 gap-1 border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                                                        onClick={() => onOpenWhatsApp(member.phone, `${member.firstName} ${member.lastName}`)}
                                                    >
                                                        <Phone className="h-3.5 w-3.5 text-emerald-600" />
                                                        WhatsApp
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* 5. Información Técnica General */}
                        <TabsContent value="info" className="mt-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Card className="rounded-xl">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Datos Personales y Clínicos</CardTitle></CardHeader>
                                    <CardContent className="text-xs space-y-2.5">
                                        <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">Nombre Completo:</span> <span className="font-bold">{displayInfo.name}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">Documento / Cédula:</span> <span className="font-mono font-bold">{displayInfo.cedula || "No registrada"}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">Edad / Género:</span> <span className="font-semibold">{displayInfo.age ? `${displayInfo.age} años` : '-'} {displayInfo.gender ? `(${displayInfo.gender})` : ''}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">Grupo Sanguíneo:</span> <span className="font-bold text-rose-700">{displayInfo.bloodType || "No registrado"}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span className="text-slate-500">Alergias Reportadas:</span> <span className="font-semibold text-amber-800">{displayInfo.allergies || "Ninguna reportada"}</span></div>
                                        <div className="flex justify-between"><span className="text-slate-500">Ciudad:</span> <span className="font-semibold">{displayInfo.city || "No registrada"}</span></div>
                                    </CardContent>
                                </Card>

                                <Card className="rounded-xl">
                                    <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">Métricas de Atención</CardTitle></CardHeader>
                                    <CardContent className="text-xs space-y-2.5">
                                        <div className="flex justify-between border-b pb-1.5"><span>Total Citas Agendadas:</span> <span className="font-bold">{patientAppointments.length}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span>Consultas Atendidas:</span> <span className="font-bold text-emerald-700">{patientAppointments.filter(a => a.attendance === 'Atendido').length}</span></div>
                                        <div className="flex justify-between border-b pb-1.5"><span>Inasistencias:</span> <span className="font-bold text-rose-600">{patientAppointments.filter(a => a.attendance === 'No Asistió').length}</span></div>
                                        <div className="flex justify-between"><span>Tasa de Cumplimiento:</span> <span className="font-bold text-teal-700">
                                            {patientAppointments.length > 0
                                                ? Math.round((patientAppointments.filter(a => a.attendance === 'Atendido').length / patientAppointments.length) * 100)
                                                : 0}%
                                        </span></div>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}


"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Search,
    MessageCircle,
    Phone,
    FileText,
    Users,
    MoreHorizontal,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Baby,
    User,
    Mail,
    MapPin,
    History
} from "lucide-react";

import { Appointment, Patient, FamilyMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useRouter } from "next/navigation";

// Define a Patient Summary type derived from appointments
type PatientSummary = {
    id: string;
    name: string;
    phone?: string;
    lastAppointment: Appointment;
    totalAppointments: number;
    attendanceRate: number; // Porcentaje de asistencia
};

interface PatientsTabProps {
    appointments: Appointment[];
    role?: 'doctor' | 'clinic'; // Para reutilizar en Clínica
}

export function PatientsTab({ appointments, role = 'doctor' }: PatientsTabProps) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Calcular pacientes únicos y sus estadísticas
    const patients: PatientSummary[] = useMemo(() => {
        const patientMap = new Map<string, {
            id: string;
            name: string;
            phone?: string;
            appointments: Appointment[];
        }>();

        // Agrupar citas por paciente
        appointments.forEach(appt => {
            if (!patientMap.has(appt.patientId)) {
                patientMap.set(appt.patientId, {
                    id: appt.patientId,
                    name: appt.patientName,
                    phone: appt.patientPhone,
                    appointments: []
                });
            }
            patientMap.get(appt.patientId)?.appointments.push(appt);
        });

        // Convertir a array y calcular métricas
        return Array.from(patientMap.values()).map(p => {
            // Ordenar citas por fecha descendente
            const sortedAppts = p.appointments.sort((a, b) =>
                new Date(b.date + 'T' + b.time).getTime() - new Date(a.date + 'T' + a.time).getTime()
            );

            const completed = p.appointments.filter(a => a.attendance === 'Atendido').length;
            const total = p.appointments.length;

            return {
                id: p.id,
                name: p.name,
                phone: p.phone,
                lastAppointment: sortedAppts[0],
                totalAppointments: total,
                attendanceRate: total > 0 ? (completed / total) * 100 : 0
            };
        });
    }, [appointments]);

    // Filtrar pacientes
    const filteredPatients = useMemo(() => {
        return patients.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.phone?.includes(searchTerm)
        );
    }, [patients, searchTerm]);

    const handleOpenWhatsApp = (phone?: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const handleViewDetails = (patientId: string) => {
        setSelectedPatientId(patientId);
        setIsDetailOpen(true);
    };

    const handleChat = (patientId: string) => {
        router.push(`/doctor/dashboard?view=chat&chatPatientId=${patientId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Mis Pacientes</h2>
                    <p className="text-muted-foreground">
                        Gestión y seguimiento de tus pacientes atendidos.
                    </p>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre o teléfono..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredPatients.map((patient) => (
                    <Card key={patient.id} className="overflow-hidden hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(patient.name)}&background=random`} />
                                <AvatarFallback>{patient.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 overflow-hidden">
                                <CardTitle className="text-base truncate" title={patient.name}>
                                    {patient.name}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1 text-xs">
                                    <Phone className="h-3 w-3" />
                                    {patient.phone || "Sin teléfono"}
                                </CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleViewDetails(patient.id)}>
                                        <FileText className="mr-2 h-4 w-4" /> Ver Detalles
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleChat(patient.id)}>
                                        <MessageCircle className="mr-2 h-4 w-4 text-blue-600" /> Enviar Mensaje
                                    </DropdownMenuItem>
                                    {patient.phone && (
                                        <DropdownMenuItem onClick={() => handleOpenWhatsApp(patient.phone)}>
                                            <Phone className="mr-2 h-4 w-4" /> WhatsApp
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleViewDetails(patient.id)}>
                                        <Users className="mr-2 h-4 w-4" /> Ver Núcleo Familiar
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-muted-foreground">Última Cita:</span>
                                    <span className="font-medium">
                                        {format(new Date(patient.lastAppointment.date), "dd MMM yyyy", { locale: es })}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-1 border-b">
                                    <span className="text-muted-foreground">Estado:</span>
                                    <Badge variant={
                                        patient.lastAppointment.attendance === 'Atendido' ? 'default' :
                                            patient.lastAppointment.attendance === 'No Asistió' ? 'destructive' : 'secondary'
                                    }>
                                        {patient.lastAppointment.attendance}
                                    </Badge>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-muted-foreground">Total Citas:</span>
                                    <span className="font-medium">{patient.totalAppointments}</span>
                                </div>

                                {role === 'clinic' && patient.lastAppointment.doctorName && (
                                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                                        Atendido por: <span className="font-medium text-foreground">{patient.lastAppointment.doctorName}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <Button className="flex-1" variant="outline" size="sm" onClick={() => handleChat(patient.id)}>
                                    <MessageCircle className="mr-2 h-4 w-4 text-blue-600" /> Chat
                                </Button>
                                <Button className="flex-1" variant="outline" size="sm" onClick={() => handleViewDetails(patient.id)}>
                                    <FileText className="mr-2 h-4 w-4" /> Ficha
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredPatients.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    No se encontraron pacientes que coincidan con tu búsqueda.
                </div>
            )}

            <PatientDetailDialog
                open={isDetailOpen}
                onOpenChange={setIsDetailOpen}
                patientId={selectedPatientId}
                appointments={appointments}
            />
        </div>
    );
}

function PatientDetailDialog({
    open,
    onOpenChange,
    patientId,
    appointments
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    patientId: string | null;
    appointments: Appointment[];
}) {
    const [activeTab, setActiveTab] = useState("history");
    const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
    const [patientDetails, setPatientDetails] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Cargar datos completos al abrir
    useEffect(() => {
        if (open && patientId) {
            setIsLoading(true);
            Promise.all([
                getPatient(patientId),
                getFamilyMembers(patientId)
            ]).then(([pData, fData]) => {
                setPatientDetails(pData);
                setFamilyMembers(fData);
            }).catch(err => {
                console.error("Error loading patient details:", err);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [open, patientId]);

    // Filtrar info del paciente seleccionado
    const patientAppointments = useMemo(() => {
        if (!patientId) return [];
        return appointments
            .filter(a => a.patientId === patientId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [appointments, patientId]);

    const patientInfo = patientAppointments[0]; // Usar la más reciente para datos básicos

    if (!patientId) return null;

    const displayInfo = patientDetails || {
        name: patientInfo?.patientName,
        phone: patientInfo?.patientPhone,
        email: null,
        profileImage: null
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Expediente del Paciente</DialogTitle>
                    <DialogDescription>
                        Información detallada, historial y núcleo familiar.
                    </DialogDescription>
                </DialogHeader>

                {patientInfo && (
                    <div className="space-y-6">
                        {/* Header Paciente Resumido */}
                        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={displayInfo.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayInfo.name || '')}`} />
                                <AvatarFallback>PAC</AvatarFallback>
                            </Avatar>
                            <div>
                                <h3 className="font-bold text-lg">{displayInfo.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {displayInfo.phone || "No registrado"}</span>
                                    {displayInfo.email && (
                                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {displayInfo.email}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="history">Historial de Citas</TabsTrigger>
                                <TabsTrigger value="family">Núcleo Familiar</TabsTrigger>
                                <TabsTrigger value="info">Información General</TabsTrigger>
                            </TabsList>

                            {/* Tab Historial */}
                            <TabsContent value="history" className="mt-4">
                                <div className="border rounded-md">
                                    <div className="p-3 bg-muted/50 border-b font-medium text-sm flex justify-between items-center">
                                        <span className="flex items-center gap-2"><History className="h-4 w-4" /> Últimas Visitas</span>
                                        <span className="text-xs text-muted-foreground">{patientAppointments.length} citas registradas</span>
                                    </div>
                                    <ScrollArea className="h-[300px] p-0">
                                        <div className="divide-y">
                                            {patientAppointments.map((appt) => (
                                                <div key={appt.id} className="p-4 hover:bg-muted/50 transition-colors flex flex-col sm:flex-row justify-between gap-2">
                                                    <div className="space-y-1">
                                                        <div className="font-medium flex items-center gap-2">
                                                            {format(new Date(appt.date), "dd MMM yyyy", { locale: es })}
                                                            <span className="text-muted-foreground font-normal text-sm">a las {appt.time}</span>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {appt.serviceName || "Consulta General"}
                                                        </div>
                                                        {appt.doctorName && (
                                                            <div className="text-xs text-primary/80">
                                                                Atendido por: {appt.doctorName}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <Badge variant={appt.attendance === 'Atendido' ? 'default' : appt.attendance === 'No Asistió' ? 'destructive' : 'secondary'}>
                                                            {appt.attendance}
                                                        </Badge>
                                                        {appt.totalPrice > 0 && (
                                                            <span className="text-xs font-mono text-muted-foreground">
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

                            {/* Tab Familia */}
                            <TabsContent value="family" className="mt-4">
                                {isLoading ? (
                                    <div className="flex justify-center p-8 text-muted-foreground">Cargando familiares...</div>
                                ) : familyMembers.length === 0 ? (
                                    <div className="text-center py-12 border rounded-lg border-dashed">
                                        <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                                        <p className="text-muted-foreground">No hay familiares registrados para este paciente.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
                                        {familyMembers.map((member) => (
                                            <div key={member.id} className="flex items-center gap-3 p-3 bg-card border rounded-lg shadow-sm">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {member.firstName.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium">{member.firstName} {member.lastName}</p>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        {['hijo', 'hija', 'nieto', 'nieta'].includes(member.relationship.toLowerCase()) ? (
                                                            <Baby className="h-3 w-3" />
                                                        ) : (
                                                            <User className="h-3 w-3" />
                                                        )}
                                                        <span className="capitalize">{member.relationship}</span>
                                                        {member.age && <span>• {member.age} años</span>}
                                                    </div>
                                                </div>
                                                {member.phone && (
                                                    <Button variant="ghost" size="icon" onClick={() => window.open(`https://wa.me/${(member.phone || '').replace(/\D/g, '')}`, '_blank')}>
                                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Tab Info General */}
                            <TabsContent value="info" className="mt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">Contacto y Datos</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-2">
                                            <div className="flex items-center gap-2"><Phone className="h-4 w-4 opacity-70" /> {displayInfo.phone || "-"}</div>
                                            <div className="flex items-center gap-2"><Mail className="h-4 w-4 opacity-70" /> {displayInfo.email || "No registrado"}</div>
                                            {patientDetails?.city && (
                                                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 opacity-70" /> {patientDetails.city}</div>
                                            )}
                                            {patientDetails?.cedula && (
                                                <div className="flex items-center gap-2"><User className="h-4 w-4 opacity-70" /> {patientDetails.documentType || 'DNI'}: {patientDetails.cedula}</div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-sm">Estadísticas</CardTitle></CardHeader>
                                        <CardContent className="text-sm space-y-2">
                                            <div className="flex justify-between"><span>Total Citas:</span> <span className="font-bold">{patientAppointments.length}</span></div>
                                            <div className="flex justify-between"><span>Asistencia:</span> <span className="font-bold text-green-600">
                                                {Math.round((patientAppointments.filter(a => a.attendance === 'Atendido').length / patientAppointments.length) * 100)}%
                                            </span></div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { getClinicPatients, getClinicAppointments, getPatientCommunications, addPatientCommunication, getFamilyMembers } from '@/lib/supabaseService';
import { Patient, Appointment, PatientCommunication, COMMUNICATION_TEMPLATES, FamilyMember } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Search, Users, Calendar, DollarSign, Eye, ChevronLeft, ChevronRight, Phone, Mail, MapPin, User, MessageCircle, Send, History, ExternalLink, Baby } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PatientWithStats extends Patient {
    totalAppointments: number;
    lastVisit: string | null;
    totalPaid: number;
    noShowCount: number;
    attendedByDoctors: string[];
}

export function PatientsTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [patients, setPatients] = useState<PatientWithStats[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [detailTab, setDetailTab] = useState('info');

    // Communication state
    const [communications, setCommunications] = useState<PatientCommunication[]>([]);
    const [loadingComms, setLoadingComms] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof COMMUNICATION_TEMPLATES>('custom');
    const [messageText, setMessageText] = useState('');
    const [sendingMessage, setSendingMessage] = useState(false);

    // Family members state
    const [patientFamilyMembers, setPatientFamilyMembers] = useState<FamilyMember[]>([]);
    const [isLoadingFamily, setIsLoadingFamily] = useState(false);

    // Filters
    const [filterNoShows, setFilterNoShows] = useState<'all' | 'with' | 'without'>('all');
    const [filterAppointments, setFilterAppointments] = useState<'all' | '1' | '2-5' | '6+'>('all');
    const [sortBy, setSortBy] = useState<'recent' | 'name' | 'appointments' | 'paid'>('recent');

    const PAGE_SIZE = 20;

    useEffect(() => {
        if (user?.id) {
            loadData();
        }
    }, [user?.id]);

    // Load communications when patient is selected
    useEffect(() => {
        if (selectedPatient && user?.id) {
            loadCommunications();
            loadFamilyMembers();
        }
    }, [selectedPatient?.id]);

    // Update message when template changes
    useEffect(() => {
        if (selectedPatient && selectedTemplate !== 'custom') {
            const template = COMMUNICATION_TEMPLATES[selectedTemplate];
            const msg = template.message
                .replace('{nombre}', selectedPatient.name?.split(' ')[0] || 'Paciente')
                .replace('{fecha}', '[fecha]')
                .replace('{hora}', '[hora]');
            setMessageText(msg);
        }
    }, [selectedTemplate, selectedPatient]);

    const loadData = async () => {
        if (!user?.id) return;
        const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;
        try {
            setLoading(true);
            const [patientsData, appointmentsData] = await Promise.all([
                getClinicPatients(targetClinicId),
                getClinicAppointments(targetClinicId)
            ]);

            const patientsWithStats: PatientWithStats[] = patientsData.map(patient => {
                const patientAppointments = appointmentsData.filter(a => a.patientId === patient.id);
                const paidAppointments = patientAppointments.filter(a => a.paymentStatus === 'Pagado' && a.attendance !== 'No Asistió');
                const noShows = patientAppointments.filter(a => a.attendance === 'No Asistió');

                const sortedByDate = [...patientAppointments].sort((a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                );

                const uniqueDoctors = Array.from(new Set(patientAppointments.map(a => a.doctorName).filter(Boolean))) as string[];

                return {
                    ...patient,
                    totalAppointments: patientAppointments.length,
                    lastVisit: sortedByDate[0]?.date || null,
                    totalPaid: paidAppointments.reduce((sum, a) => sum + (a.totalPrice || 0), 0),
                    noShowCount: noShows.length,
                    attendedByDoctors: uniqueDoctors
                };
            });

            setPatients(patientsWithStats);
            setAppointments(appointmentsData);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCommunications = async () => {
        if (!user?.id || !selectedPatient?.id) return;
        const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;
        try {
            setLoadingComms(true);
            const comms = await getPatientCommunications(targetClinicId, selectedPatient.id);
            setCommunications(comms);
        } catch (error) {
            console.error('Error loading communications:', error);
        } finally {
            setLoadingComms(false);
        }
    };

    const loadFamilyMembers = async () => {
        if (!selectedPatient?.id) return;
        try {
            setIsLoadingFamily(true);
            const members = await getFamilyMembers(selectedPatient.id);
            setPatientFamilyMembers(members);
        } catch (error) {
            console.error('Error loading family members:', error);
            setPatientFamilyMembers([]);
        } finally {
            setIsLoadingFamily(false);
        }
    };

    const handleSendWhatsApp = async () => {
        if (!selectedPatient?.phone || !messageText.trim() || !user?.id) return;

        // Format phone for WhatsApp (remove spaces, dashes, add country code if needed)
        let phone = selectedPatient.phone.replace(/[\s\-\(\)]/g, '');
        if (!phone.startsWith('+')) {
            phone = '+54' + phone; // Argentina default
        }

        const encodedMessage = encodeURIComponent(messageText);
        const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodedMessage}`;

        // Save to history
        try {
            setSendingMessage(true);
            const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;
            await addPatientCommunication(
                targetClinicId,
                selectedPatient.id,
                'whatsapp',
                messageText,
                user.id,
                selectedTemplate
            );

            // Open WhatsApp
            window.open(whatsappUrl, '_blank');

            // Refresh communications
            await loadCommunications();

            toast({ title: 'Mensaje enviado', description: 'Se abrió WhatsApp y se guardó en el historial.' });
            setMessageText('');
            setSelectedTemplate('custom');
        } catch (error) {
            console.error('Error saving communication:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el mensaje.' });
        } finally {
            setSendingMessage(false);
        }
    };

    const handleSendEmail = async () => {
        if (!selectedPatient?.email || !messageText.trim() || !user?.id) return;

        const subject = encodeURIComponent('Mensaje de tu clínica');
        const body = encodeURIComponent(messageText);
        const mailtoUrl = `mailto:${selectedPatient.email}?subject=${subject}&body=${body}`;

        // Save to history
        try {
            setSendingMessage(true);
            const targetClinicId = user.role === 'secretary' ? (user as any).clinicId : user.id;
            await addPatientCommunication(
                targetClinicId,
                selectedPatient.id,
                'email',
                messageText,
                user.id,
                selectedTemplate
            );

            // Open email client
            window.location.href = mailtoUrl;

            // Refresh communications
            await loadCommunications();

            toast({ title: 'Email preparado', description: 'Se abrió tu cliente de email y se guardó en el historial.' });
            setMessageText('');
            setSelectedTemplate('custom');
        } catch (error) {
            console.error('Error saving communication:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el mensaje.' });
        } finally {
            setSendingMessage(false);
        }
    };

    // Filter and sort patients
    const filteredPatients = useMemo(() => {
        let result = [...patients];

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(term) ||
                p.email?.toLowerCase().includes(term) ||
                p.phone?.toLowerCase().includes(term) ||
                p.cedula?.toLowerCase().includes(term)
            );
        }

        if (filterNoShows === 'with') {
            result = result.filter(p => p.noShowCount > 0);
        } else if (filterNoShows === 'without') {
            result = result.filter(p => p.noShowCount === 0);
        }

        if (filterAppointments === '1') {
            result = result.filter(p => p.totalAppointments === 1);
        } else if (filterAppointments === '2-5') {
            result = result.filter(p => p.totalAppointments >= 2 && p.totalAppointments <= 5);
        } else if (filterAppointments === '6+') {
            result = result.filter(p => p.totalAppointments >= 6);
        }

        switch (sortBy) {
            case 'name':
                result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'appointments':
                result.sort((a, b) => b.totalAppointments - a.totalAppointments);
                break;
            case 'paid':
                result.sort((a, b) => b.totalPaid - a.totalPaid);
                break;
            case 'recent':
            default:
                result.sort((a, b) => {
                    if (!a.lastVisit) return 1;
                    if (!b.lastVisit) return -1;
                    return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
                });
                break;
        }

        return result;
    }, [patients, searchTerm, filterNoShows, filterAppointments, sortBy]);

    const totalPages = Math.ceil(filteredPatients.length / PAGE_SIZE);
    const paginatedPatients = filteredPatients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterNoShows, filterAppointments, sortBy]);

    const patientAppointments = useMemo(() => {
        if (!selectedPatient) return [];
        return appointments
            .filter(a => a.patientId === selectedPatient.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [selectedPatient, appointments]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getInitials = (name: string) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'P';
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'whatsapp': return '💬';
            case 'email': return '📧';
            case 'phone_call': return '📞';
            case 'sms': return '📱';
            default: return '💬';
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Pacientes</h2>
                <p className="text-muted-foreground">Pacientes que han tenido citas con tu clínica.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Pacientes</CardTitle>
                        <Users className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{patients.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Citas Totales</CardTitle>
                        <Calendar className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{appointments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Ingresos Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(patients.reduce((sum, p) => sum + p.totalPaid, 0))}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Patients Table */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Listado de Pacientes</CardTitle>
                            <CardDescription>
                                {filteredPatients.length === patients.length
                                    ? `${patients.length} pacientes`
                                    : `${filteredPatients.length} de ${patients.length}`
                                }
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 w-[180px] h-9"
                                />
                            </div>
                            <Select value={filterNoShows} onValueChange={(v) => setFilterNoShows(v as any)}>
                                <SelectTrigger className="w-[140px] h-9">
                                    <SelectValue placeholder="Inasist." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="with">Con inasist.</SelectItem>
                                    <SelectItem value="without">Sin inasist.</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterAppointments} onValueChange={(v) => setFilterAppointments(v as any)}>
                                <SelectTrigger className="w-[120px] h-9">
                                    <SelectValue placeholder="Citas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="1">1 cita</SelectItem>
                                    <SelectItem value="2-5">2-5 citas</SelectItem>
                                    <SelectItem value="6+">6+ citas</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                                <SelectTrigger className="w-[130px] h-9">
                                    <SelectValue placeholder="Ordenar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="recent">Más reciente</SelectItem>
                                    <SelectItem value="name">Nombre A-Z</SelectItem>
                                    <SelectItem value="appointments">Más citas</SelectItem>
                                    <SelectItem value="paid">Mayor pago</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Paciente</TableHead>
                                <TableHead>Contacto</TableHead>
                                <TableHead>Profesionales</TableHead>
                                <TableHead className="text-center">Citas</TableHead>
                                <TableHead>Última Visita</TableHead>
                                <TableHead className="w-[60px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedPatients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        No se encontraron pacientes.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedPatients.map((patient) => (
                                    <TableRow key={patient.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={patient.profileImage || undefined} />
                                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                        {getInitials(patient.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{patient.name}</p>
                                                    {patient.cedula && (
                                                        <p className="text-xs text-muted-foreground">{patient.documentType || 'DNI'}: {patient.cedula}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                {patient.email && <p className="truncate max-w-[180px]">{patient.email}</p>}
                                                {patient.phone && <p className="text-muted-foreground">{patient.phone}</p>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {patient.attendedByDoctors.slice(0, 2).map((doc, i) => (
                                                    <Badge key={i} variant="outline" className="text-xs w-fit">
                                                        {doc}
                                                    </Badge>
                                                ))}
                                                {patient.attendedByDoctors.length > 2 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        +{patient.attendedByDoctors.length - 2} más
                                                    </span>
                                                )}
                                                {patient.attendedByDoctors.length === 0 && (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Badge variant="secondary">{patient.totalAppointments}</Badge>
                                                {patient.noShowCount > 0 && (
                                                    <Badge variant="destructive" className="text-xs">{patient.noShowCount}</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {patient.lastVisit ? format(parseISO(patient.lastVisit), "dd/MM/yy", { locale: es }) : '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="icon" onClick={() => { setSelectedPatient(patient); setIsDetailOpen(true); setDetailTab('info'); }}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                {((currentPage - 1) * PAGE_SIZE) + 1}-{Math.min(currentPage * PAGE_SIZE, filteredPatients.length)} de {filteredPatients.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm">{currentPage}/{totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Patient Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {selectedPatient && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-3">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={selectedPatient.profileImage || undefined} />
                                        <AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedPatient.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <span>{selectedPatient.name}</span>
                                        <DialogDescription>Información del paciente</DialogDescription>
                                    </div>
                                </DialogTitle>
                            </DialogHeader>

                            <Tabs value={detailTab} onValueChange={setDetailTab} className="mt-4">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="info">Información</TabsTrigger>
                                    <TabsTrigger value="family">Familia</TabsTrigger>
                                    <TabsTrigger value="contact">Contactar</TabsTrigger>
                                    <TabsTrigger value="history">Historial</TabsTrigger>
                                </TabsList>

                                <TabsContent value="info" className="space-y-4 mt-4">
                                    {/* Patient Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedPatient.email || 'No registrado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Phone className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedPatient.phone || 'No registrado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedPatient.documentType || 'DNI'}: {selectedPatient.cedula || 'No registrado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span>{selectedPatient.city || 'No registrada'}</span>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <Card className="bg-muted/50">
                                            <CardContent className="pt-4">
                                                <p className="text-2xl font-bold text-center">{selectedPatient.totalAppointments}</p>
                                                <p className="text-xs text-muted-foreground text-center">Citas</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/50">
                                            <CardContent className="pt-4">
                                                <p className="text-2xl font-bold text-center text-green-600">{formatCurrency(selectedPatient.totalPaid)}</p>
                                                <p className="text-xs text-muted-foreground text-center">Pagado</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/50">
                                            <CardContent className="pt-4">
                                                <p className={cn("text-2xl font-bold text-center", selectedPatient.noShowCount > 0 ? "text-red-600" : "text-green-600")}>
                                                    {selectedPatient.noShowCount}
                                                </p>
                                                <p className="text-xs text-muted-foreground text-center">Inasistencias</p>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* Appointments */}
                                    <div>
                                        <h4 className="font-semibold mb-2">Citas en la Clínica</h4>
                                        <div className="border rounded-lg max-h-[200px] overflow-y-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Fecha</TableHead>
                                                        <TableHead>Profesional</TableHead>
                                                        <TableHead>Estado</TableHead>
                                                        <TableHead className="text-right">Monto</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {patientAppointments.slice(0, 10).map((apt) => (
                                                        <TableRow key={apt.id}>
                                                            <TableCell className="text-sm">{format(parseISO(apt.date), "dd/MM/yy")} {apt.time}</TableCell>
                                                            <TableCell className="text-sm">{apt.doctorName || apt.serviceName || 'Servicio'}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn(
                                                                    apt.attendance === 'Atendido' && 'border-green-500 text-green-600',
                                                                    apt.attendance === 'No Asistió' && 'border-red-500 text-red-600',
                                                                    apt.attendance === 'Pendiente' && 'border-gray-400 text-gray-500'
                                                                )}>
                                                                    {apt.attendance || 'Pendiente'}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(apt.totalPrice || 0)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Tab de Núcleo Familiar */}
                                <TabsContent value="family" className="space-y-4 mt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Users className="h-5 w-5 text-primary" />
                                        <h4 className="font-semibold">Núcleo Familiar</h4>
                                    </div>
                                    {isLoadingFamily ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : patientFamilyMembers.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                            <p>Este paciente no tiene familiares registrados.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {patientFamilyMembers.map((member) => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                        {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium">{member.firstName} {member.lastName}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            {['hijo', 'hija', 'nieto', 'nieta'].includes(member.relationship) ? (
                                                                <Baby className="h-3 w-3" />
                                                            ) : (
                                                                <User className="h-3 w-3" />
                                                            )}
                                                            <span className="capitalize">{member.relationship}</span>
                                                            {member.age && <span>• {member.age} años</span>}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end text-xs text-muted-foreground">
                                                        {member.phone && (
                                                            <span className="flex items-center gap-1">
                                                                <Phone className="h-3 w-3" />
                                                                {member.phone}
                                                            </span>
                                                        )}
                                                        {member.email && (
                                                            <span className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {member.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="contact" className="space-y-4 mt-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium">Plantilla de Mensaje</label>
                                            <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as any)}>
                                                <SelectTrigger className="mt-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(COMMUNICATION_TEMPLATES).map(([key, val]) => (
                                                        <SelectItem key={key} value={key}>{val.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium">Mensaje</label>
                                            <Textarea
                                                value={messageText}
                                                onChange={(e) => setMessageText(e.target.value)}
                                                placeholder="Escribe tu mensaje aquí..."
                                                rows={4}
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleSendWhatsApp}
                                                disabled={!selectedPatient.phone || !messageText.trim() || sendingMessage}
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                            >
                                                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                                                Enviar por WhatsApp
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                            </Button>
                                            <Button
                                                onClick={handleSendEmail}
                                                disabled={!selectedPatient.email || !messageText.trim() || sendingMessage}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                                                Enviar por Email
                                                <ExternalLink className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>

                                        {!selectedPatient.phone && !selectedPatient.email && (
                                            <p className="text-sm text-destructive text-center">
                                                Este paciente no tiene teléfono ni email registrado.
                                            </p>
                                        )}
                                    </div>
                                </TabsContent>

                                <TabsContent value="history" className="space-y-4 mt-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <History className="h-4 w-4" />
                                        <h4 className="font-semibold">Historial de Comunicaciones</h4>
                                    </div>

                                    {loadingComms ? (
                                        <div className="flex justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        </div>
                                    ) : communications.length === 0 ? (
                                        <p className="text-center py-8 text-muted-foreground">
                                            No hay comunicaciones registradas con este paciente.
                                        </p>
                                    ) : (
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                            {communications.map((comm) => (
                                                <div key={comm.id} className="border rounded-lg p-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-lg">{getTypeIcon(comm.type)}</span>
                                                            <Badge variant="outline" className="capitalize">{comm.type}</Badge>
                                                            {comm.template && comm.template !== 'custom' && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    {COMMUNICATION_TEMPLATES[comm.template as keyof typeof COMMUNICATION_TEMPLATES]?.label || comm.template}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-muted-foreground">
                                                            {format(parseISO(comm.sentAt), "dd/MM/yy HH:mm", { locale: es })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">{comm.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            <p className="text-xs text-muted-foreground text-center mt-4 italic">
                                Los datos personales solo pueden ser editados por el administrador de SUMA.
                            </p>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

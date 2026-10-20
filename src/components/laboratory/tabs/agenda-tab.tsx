"use client";

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Appointment, LaboratoryService } from '@/lib/types';
import { getLaboratoryServices } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from '@/hooks/use-toast';
import {
    Loader2, CalendarDays, Clock, User, CheckCircle, XCircle, AlertCircle, RefreshCw,
    Eye, Phone, Search, FileText, FlaskConical, Calendar, Plus, UserPlus
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

export function LaboratoryAgendaTab() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [services, setServices] = useState<LaboratoryService[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // Details Modal
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // New Sample / Walk-in Modal
    const [showNewModal, setShowNewModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState({
        patientName: '',
        patientPhone: '',
        patientCedula: '',
        serviceId: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '08:00',
        paymentMethod: 'efectivo',
        paymentStatus: 'Pagado' as const,
        reason: 'Toma de muestra de laboratorio'
    });

    const effectiveLabId = user?.role === 'secretary' ? (user.laboratoryId || user.id) : user?.id;

    const loadData = async () => {
        if (!effectiveLabId) return;
        try {
            setLoading(true);
            // Fetch appointments for this laboratory
            const { data: appts, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('laboratory_id', effectiveLabId)
                .order('date', { ascending: false });

            if (error) {
                console.error('Error fetching laboratory appointments:', error);
            } else {
                // Convert camelCase
                const formatted = (appts || []).map((item: any) => ({
                    id: item.id,
                    patientId: item.patient_id,
                    patientName: item.patient_name,
                    doctorName: item.doctor_name,
                    laboratoryId: item.laboratory_id,
                    laboratoryServiceId: item.laboratory_service_id,
                    serviceName: item.service_name,
                    date: item.date,
                    time: item.time,
                    reason: item.reason,
                    totalPrice: item.total_price || 0,
                    consultationFee: item.consultation_fee || 0,
                    paymentMethod: item.payment_method || 'efectivo',
                    paymentStatus: item.payment_status || 'Pendiente',
                    attendance: item.attendance || 'Pendiente',
                    patientConfirmationStatus: item.patient_confirmation_status || 'Pendiente',
                    patientPhone: item.patient_phone,
                    currency: item.currency || 'USD',
                    services: [],
                    paymentProof: null,
                }));
                setAppointments(formatted);
            }

            // Fetch laboratory services
            const svcs = await getLaboratoryServices(effectiveLabId);
            setServices(svcs);
        } catch (error) {
            console.error('Error loading agenda data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.id]);

    // Handle Quick Attendance Update
    const handleUpdateAttendance = async (appointmentId: string, attendance: 'Atendido' | 'No Asistió' | 'Pendiente') => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ attendance })
                .eq('id', appointmentId);

            if (error) throw error;

            setAppointments(appointments.map(a => a.id === appointmentId ? { ...a, attendance } : a));
            toast({
                title: 'Estado actualizado',
                description: `Cita marcada como: ${attendance}`
            });
        } catch (err: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo actualizar el estado de asistencia.'
            });
        }
    };

    // Handle Create Walk-in Sample Collection
    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        if (!newAppointmentData.patientName.trim()) {
            toast({
                variant: 'destructive',
                title: 'Nombre requerido',
                description: 'Por favor ingresa el nombre del paciente.'
            });
            return;
        }

        const selectedService = services.find(s => s.id === newAppointmentData.serviceId);

        try {
            setIsCreating(true);
            const insertPayload = {
                laboratory_id: effectiveLabId,
                laboratory_service_id: selectedService?.id || null,
                service_name: selectedService?.name || 'Examen de Laboratorio',
                patient_id: user?.id, // User creating the record
                patient_name: newAppointmentData.patientName.trim(),
                patient_phone: newAppointmentData.patientPhone.trim() || null,
                date: newAppointmentData.date,
                time: newAppointmentData.time,
                total_price: selectedService?.price || 0,
                consultation_fee: selectedService?.price || 0,
                payment_method: newAppointmentData.paymentMethod,
                payment_status: newAppointmentData.paymentStatus,
                attendance: 'Atendido',
                patient_confirmation_status: 'Confirmada',
                reason: newAppointmentData.reason || 'Toma de muestra en taquilla',
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('appointments')
                .insert([insertPayload]);

            if (error) throw error;

            toast({
                title: 'Muestra Registrada',
                description: `Paciente ${newAppointmentData.patientName} registrado exitosamente.`
            });

            setShowNewModal(false);
            setNewAppointmentData({
                patientName: '',
                patientPhone: '',
                patientCedula: '',
                serviceId: '',
                date: format(new Date(), 'yyyy-MM-dd'),
                time: '08:00',
                paymentMethod: 'efectivo',
                paymentStatus: 'Pagado',
                reason: 'Toma de muestra de laboratorio'
            });
            await loadData();
        } catch (err: any) {
            console.error('Error creating laboratory appointment:', err);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: err.message || 'No se pudo registrar la muestra.'
            });
        } finally {
            setIsCreating(false);
        }
    };

    // Filter appointments
    const filteredAppointments = useMemo(() => {
        return appointments.filter(a => {
            const matchesSearch = 
                (a.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.patientPhone || '').includes(searchTerm);

            const matchesStatus = statusFilter === 'ALL' || a.attendance === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [appointments, searchTerm, statusFilter]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-teal-600" />
                        Agenda de Pruebas y Toma de Muestras
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Supervisa las citas programadas, pacientes citados para toma de muestra y entrega de resultados.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={loadData}
                        className="gap-1.5"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Actualizar
                    </Button>
                    <Button 
                        onClick={() => setShowNewModal(true)} 
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        Registrar Paciente / Toma
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar por nombre del paciente o examen..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Estado de Asistencia" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos los estados</SelectItem>
                                <SelectItem value="Pendiente">Pendientes de Muestra</SelectItem>
                                <SelectItem value="Atendido">Atendidos / Muestra Tomada</SelectItem>
                                <SelectItem value="No Asistió">No Asistió</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Appointments Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                            <p>Cargando agenda de laboratorio...</p>
                        </div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground space-y-3">
                            <Calendar className="h-12 w-12 mx-auto text-slate-300" />
                            <h3 className="text-lg font-semibold text-slate-700">Sin citas en la agenda</h3>
                            <p className="text-sm max-w-sm mx-auto">
                                No se encontraron registros de citas o tomas de muestra. Puedes registrar un paciente que acuda por taquilla con el botón superior.
                            </p>
                            <Button 
                                onClick={() => setShowNewModal(true)} 
                                variant="outline" 
                                className="border-teal-200 text-teal-700 hover:bg-teal-50"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Registrar Toma de Muestra
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50">
                                    <TableHead>Fecha y Hora</TableHead>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>Examen / Análisis</TableHead>
                                    <TableHead>Monto</TableHead>
                                    <TableHead>Pago</TableHead>
                                    <TableHead>Asistencia</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAppointments.map((appt) => (
                                    <TableRow key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                                        <TableCell>
                                            <div className="space-y-0.5 text-xs">
                                                <p className="font-semibold text-slate-900">{appt.date}</p>
                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{appt.time}</span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <p className="font-medium text-sm text-slate-900">{appt.patientName}</p>
                                                {appt.patientPhone && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {appt.patientPhone}
                                                    </p>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800 text-xs">
                                                {appt.serviceName || 'Examen Clínico'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <p className="font-bold text-sm text-slate-900">${(appt.totalPrice || 0).toFixed(2)}</p>
                                        </TableCell>

                                        <TableCell>
                                            <Badge 
                                                variant="secondary" 
                                                className={appt.paymentStatus === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}
                                            >
                                                {appt.paymentStatus || 'Pendiente'}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <Select 
                                                value={appt.attendance || 'Pendiente'} 
                                                onValueChange={(val: any) => handleUpdateAttendance(appt.id, val)}
                                            >
                                                <SelectTrigger className="h-8 text-xs w-[130px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                                                    <SelectItem value="Atendido">Muestra Tomada</SelectItem>
                                                    <SelectItem value="No Asistió">No Asistió</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedAppointment(appt);
                                                    setShowDetailsModal(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 text-slate-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Modal: Registrar Paciente / Toma de Muestra */}
            <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FlaskConical className="h-5 w-5 text-teal-600" />
                            Registrar Toma de Muestra en Taquilla
                        </DialogTitle>
                        <DialogDescription>
                            Registra rápidamente a un paciente que asiste al laboratorio para realizarse análisis.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateAppointment} className="space-y-4 pt-2">
                        <div className="space-y-2">
                            <Label htmlFor="patient-name">Nombre Completo del Paciente *</Label>
                            <Input
                                id="patient-name"
                                placeholder="Ej. Carlos Rodríguez"
                                value={newAppointmentData.patientName}
                                onChange={(e) => setNewAppointmentData({ ...newAppointmentData, patientName: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="patient-phone">Teléfono / WhatsApp</Label>
                            <Input
                                id="patient-phone"
                                placeholder="+58 414 1234567"
                                value={newAppointmentData.patientPhone}
                                onChange={(e) => setNewAppointmentData({ ...newAppointmentData, patientPhone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="select-service">Prueba o Análisis</Label>
                            <Select 
                                value={newAppointmentData.serviceId} 
                                onValueChange={(val) => setNewAppointmentData({ ...newAppointmentData, serviceId: val })}
                            >
                                <SelectTrigger id="select-service">
                                    <SelectValue placeholder="Seleccionar prueba del catálogo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {services.map((svc) => (
                                        <SelectItem key={svc.id} value={svc.id}>
                                            {svc.name} (${svc.price.toFixed(2)})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="appt-date">Fecha</Label>
                                <Input
                                    id="appt-date"
                                    type="date"
                                    value={newAppointmentData.date}
                                    onChange={(e) => setNewAppointmentData({ ...newAppointmentData, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="appt-time">Hora</Label>
                                <Input
                                    id="appt-time"
                                    type="time"
                                    value={newAppointmentData.time}
                                    onChange={(e) => setNewAppointmentData({ ...newAppointmentData, time: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="pay-method">Método de Pago</Label>
                                <Select 
                                    value={newAppointmentData.paymentMethod} 
                                    onValueChange={(val) => setNewAppointmentData({ ...newAppointmentData, paymentMethod: val })}
                                >
                                    <SelectTrigger id="pay-method">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="efectivo">Efectivo</SelectItem>
                                        <SelectItem value="pagomovil">Pago Móvil</SelectItem>
                                        <SelectItem value="transferencia">Transferencia</SelectItem>
                                        <SelectItem value="zelle">Zelle</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pay-status">Estado de Pago</Label>
                                <Select 
                                    value={newAppointmentData.paymentStatus} 
                                    onValueChange={(val: any) => setNewAppointmentData({ ...newAppointmentData, paymentStatus: val })}
                                >
                                    <SelectTrigger id="pay-status">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Pagado">Pagado</SelectItem>
                                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setShowNewModal(false)}
                                disabled={isCreating}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                                disabled={isCreating}
                            >
                                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                                Registrar Muestra
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Detalle de Cita */}
            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-teal-600" />
                            Detalle de la Cita de Laboratorio
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-3 py-2 text-sm">
                            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Paciente</p>
                                <p className="font-bold text-slate-900">{selectedAppointment.patientName}</p>
                                {selectedAppointment.patientPhone && (
                                    <p className="text-xs text-slate-600">{selectedAppointment.patientPhone}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Examen</p>
                                    <p className="font-semibold text-slate-900">{selectedAppointment.serviceName}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Monto</p>
                                    <p className="font-bold text-teal-700">${selectedAppointment.totalPrice?.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Horario</p>
                                <p className="font-medium text-slate-800">
                                    {selectedAppointment.date} a las {selectedAppointment.time}
                                </p>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Método de Pago</p>
                                <p className="font-medium text-slate-800 capitalize">
                                    {selectedAppointment.paymentMethod} — {selectedAppointment.paymentStatus}
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

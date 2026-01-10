"use client";

import { useEffect, useState } from "react";
import type { Appointment, Service, FamilyMember } from "@/lib/types";
import * as supabaseService from '@/lib/supabaseService';
import { FAMILY_RELATIONSHIP_LABELS } from '@/lib/types';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button, } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Eye, CheckCircle, ThumbsUp, ThumbsDown, MessageSquare, Save, CreditCard, FileText, Users, Phone } from "lucide-react";
import { format, parseISO, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import Image from 'next/image';

interface AppointmentDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
    doctorServices: Service[];
    onUpdateAppointment: (id: string, data: Partial<Appointment>) => void;
    onOpenChat: (type: 'chat', appointment: Appointment) => void;
}

export function AppointmentDetailDialog({
    isOpen,
    onOpenChange,
    appointment,
    doctorServices,
    onUpdateAppointment,
    onOpenChat,
}: AppointmentDetailDialogProps) {
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [prescription, setPrescription] = useState("");
    const [editableServices, setEditableServices] = useState<Service[]>([]);
    const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
    const [familyMemberInfo, setFamilyMemberInfo] = useState<FamilyMember | null>(null);
    const [patientInfo, setPatientInfo] = useState<import('@/lib/types').Patient | null>(null);

    // Calculate editableTotalPrice
    const editableTotalPrice =
        (appointment?.consultationFee || 0) +
        editableServices.reduce((sum, s) => sum + (s.price || 0), 0) -
        (appointment?.discountAmount || 0);

    useEffect(() => {
        if (appointment) {
            setClinicalNotes(appointment.clinicalNotes || "");
            setPrescription(appointment.prescription || "");
            setEditableServices(appointment.services || []);

            if (appointment.familyMemberId) {
                supabaseService.getFamilyMember(appointment.familyMemberId).then(setFamilyMemberInfo);
                setPatientInfo(null);
            } else {
                setFamilyMemberInfo(null);
                // Si no es familiar, cargamos info del paciente para obtener su edad
                if (appointment.patientId) {
                    supabaseService.getPatient(appointment.patientId).then(setPatientInfo);
                }
            }
        }
    }, [appointment]);

    const calculateAge = (dateString?: string) => {
        if (!dateString) return null;
        try {
            return new Date().getFullYear() - new Date(dateString).getFullYear();
        } catch (e) {
            return null;
        }
    };

    // Si es familiar, calculamos edad por fecha de nacimiento. Si es paciente directo, usamos el campo 'age' directo.
    const patientAge = familyMemberInfo?.birthDate
        ? calculateAge(familyMemberInfo.birthDate)
        : (patientInfo?.age || null);

    const handleSaveServices = () => {
        if (appointment) {
            onUpdateAppointment(appointment.id, {
                services: editableServices,
                totalPrice: editableTotalPrice,
                // Mantener los campos de descuento y cupón si existen
                discountAmount: appointment.discountAmount ?? 0,
                appliedCoupon: appointment.appliedCoupon ?? undefined,
            });
        }
    };

    const handleSaveRecord = () => {
        if (appointment) {
            onUpdateAppointment(appointment.id, { clinicalNotes, prescription });
        }
    };

    const handleViewProof = () => {
        if (!appointment?.paymentProof) {
            alert('No hay comprobante disponible para esta cita.');
            return;
        }
        setIsProofDialogOpen(true);
    };

    if (!appointment) {
        return null;
    }

    const isAttended = appointment.attendance === 'Atendido';
    const isAppointmentLocked = appointment.attendance !== 'Pendiente';

    // Función para obtener el texto del estado de pago
    const getPaymentStatusText = (status: string) => {
        switch (status) {
            case 'Pagado':
                return 'Pago Confirmado';
            case 'Pendiente':
                return 'Pendiente de Pago';
            default:
                return status;
        }
    };

    // Función para obtener el icono del estado de pago
    const getPaymentStatusIcon = (status: string) => {
        switch (status) {
            case 'Pagado':
                return <CheckCircle className="mr-1 h-4 w-4" />;
            case 'Pendiente':
                return <CreditCard className="mr-1 h-4 w-4" />;
            default:
                return null;
        }
    };

    console.log("APPOINTMENT EN MODAL:", appointment);

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Cita</DialogTitle>
                        <DialogDescription>Cita con {appointment.patientName} el {format(addHours(parseISO(appointment.date), 5), 'dd MMM yyyy', { locale: es })} a las {appointment.time}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">
                        {/* Left Column */}
                        <div className="space-y-6">
                            <Card><CardHeader><CardTitle className="text-base">Información del Paciente</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-3">
                                    <div>
                                        <Label className="text-muted-foreground text-xs uppercase font-bold">Paciente</Label>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-lg">{appointment.patientName}</p>
                                            {patientAge !== null && (
                                                <Badge variant="secondary" className="text-[10px] ml-2 h-5">
                                                    {patientAge} años
                                                </Badge>
                                            )}
                                            {(appointment.familyMemberId || (appointment.bookedByPatientId && appointment.bookedByPatientId !== appointment.patientId)) && (
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                                    Familiar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {(appointment.familyMemberId || (appointment.bookedByPatientId && appointment.bookedByPatientId !== appointment.patientId)) && appointment.bookedByName && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-4 w-4 text-amber-600" />
                                                <span className="font-bold text-amber-800 text-xs uppercase">Titular de la Cuenta</span>
                                            </div>
                                            <p className="text-sm text-amber-900">
                                                Dependiente de: <span className="font-semibold">{appointment.bookedByName}</span>
                                            </p>
                                            {familyMemberInfo && (
                                                <p className="text-xs text-amber-700 mt-1">
                                                    Relación: <span className="font-semibold uppercase">{FAMILY_RELATIONSHIP_LABELS[familyMemberInfo.relationship] || familyMemberInfo.relationship}</span>
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {appointment.patientPhone && (
                                        <div>
                                            <Label className="text-muted-foreground text-xs uppercase font-bold">Teléfono de Contacto</Label>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Phone className="h-3 w-3 text-muted-foreground" />
                                                <p>{appointment.patientPhone}</p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Detalles del Pago</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm space-y-2">
                                    {/* Mostrar el subtotal antes de descuento si hay descuento */}
                                    {appointment.discountAmount && appointment.discountAmount > 0 && (
                                        <p>
                                            <strong>Subtotal:</strong>
                                            <span className="font-mono">
                                                ${((appointment.totalPrice || 0) + (appointment.discountAmount || 0)).toFixed(2)}
                                            </span>
                                        </p>
                                    )}
                                    {/* Mostrar el descuento si existe */}
                                    {appointment.discountAmount && appointment.discountAmount > 0 && (
                                        <p>
                                            <strong>Descuento:</strong>
                                            <span className="font-mono text-green-600">
                                                -${appointment.discountAmount.toFixed(2)}
                                            </span>
                                            {appointment.appliedCoupon && (
                                                <span className="ml-2 text-xs text-green-700">
                                                    (Cupón: {appointment.appliedCoupon})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    {/* Mostrar el total final */}
                                    <p>
                                        <strong>Total:</strong>
                                        <span className="font-mono font-semibold">
                                            ${(appointment.totalPrice || 0).toFixed(2)}
                                            {appointment.discountAmount && appointment.discountAmount > 0 && (
                                                <span className="ml-2 text-green-600 text-xs font-normal">
                                                    (con descuento)
                                                </span>
                                            )}
                                        </span>
                                    </p>
                                    <p>
                                        <strong>Método:</strong>
                                        <span className="capitalize">{appointment.paymentMethod}</span>
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <strong>Estado:</strong>
                                        <Badge variant={appointment.paymentStatus === 'Pagado' ? 'default' : 'secondary'} className={cn({ 'bg-green-600 text-white': appointment.paymentStatus === 'Pagado' })}>
                                            {getPaymentStatusIcon(appointment.paymentStatus)}
                                            {getPaymentStatusText(appointment.paymentStatus)}
                                        </Badge>
                                    </div>

                                    {appointment.paymentMethod === 'transferencia' && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-2"
                                                onClick={handleViewProof}
                                                disabled={!appointment.paymentProof}
                                            >
                                                <Eye className="mr-2 h-4 w-4" /> Ver Comprobante
                                            </Button>
                                        </>
                                    )}

                                    {appointment.paymentStatus === 'Pendiente' && (
                                        <Button size="sm" className="w-full mt-2" onClick={() => onUpdateAppointment(appointment.id, { paymentStatus: 'Pagado' })}>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            {appointment.paymentMethod === 'efectivo' ? 'Confirmar Pago en Efectivo' : 'Aprobar Pago'}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-base">Gestión de la Cita</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    {appointment.attendance === 'Pendiente' ? (
                                        <div className="flex items-center gap-4">
                                            <Label>Asistencia del Paciente:</Label>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant='outline' onClick={() => onUpdateAppointment(appointment.id, { attendance: 'Atendido' })}> <ThumbsUp className="mr-2 h-4 w-4" />Atendido </Button>
                                                <Button size="sm" variant='outline' onClick={() => onUpdateAppointment(appointment.id, { attendance: 'No Asistió' })}> <ThumbsDown className="mr-2 h-4 w-4" />No Asistió </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Label>Asistencia:</Label>
                                            <Badge variant={appointment.attendance === 'Atendido' ? 'default' : 'destructive'} className={cn({ 'bg-green-600 text-white': appointment.attendance === 'Atendido' })}>
                                                {appointment.attendance}
                                            </Badge>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex justify-between items-center">
                                        <span>Servicios de la Cita</span>
                                        {!isAppointmentLocked && (
                                            <Button size="sm" variant="secondary" onClick={handleSaveServices}><Save className="mr-2 h-4 w-4" /> Guardar Servicios</Button>
                                        )}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex justify-between items-center bg-muted p-2 rounded-md">
                                        <Label htmlFor="consulta-base" className="font-semibold">Consulta Base</Label>
                                        <span className="font-mono font-semibold">${(appointment.consultationFee || 0).toFixed(2)}</span>
                                    </div>
                                    <Separator />
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                        {doctorServices.length > 0 ? doctorServices.map(service => (
                                            <div key={service.id} className="flex justify-between items-center">
                                                <span>{service.name}</span>
                                                <span className="font-mono">${service.price.toFixed(2)}</span>
                                            </div>
                                        )) : (
                                            <div className="text-muted-foreground text-xs">Sin servicios adicionales</div>
                                        )}
                                    </div>
                                    <Separator />
                                    {/* Mostrar descuento si existe */}
                                    {appointment.discountAmount && appointment.discountAmount > 0 && (
                                        <div className="flex justify-between items-center text-green-600 text-sm">
                                            <span>
                                                Descuento:
                                                {appointment.appliedCoupon && (
                                                    <span className="ml-1 text-green-700">
                                                        (Cupón: <span className="font-mono">{appointment.appliedCoupon}</span>)
                                                    </span>
                                                )}
                                            </span>
                                            <span className="font-mono">-${appointment.discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {/* Mostrar el total final */}
                                    <div className="flex justify-between items-center font-bold text-lg pt-2">
                                        <span>Total:</span>
                                        <span className="text-primary">${appointment.totalPrice?.toFixed(2) ?? "0.00"}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Acceso rápido a Historia Clínica del Paciente */}
                            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                <CardHeader>
                                    <CardTitle className="text-base text-blue-900">Historia Clínica del Paciente</CardTitle>
                                    <CardDescription className="text-blue-700">
                                        Gestiona el historial médico completo desde la página del paciente
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <Button
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                        onClick={() => {
                                            window.location.href = `/doctor/patients/${appointment.patientId}`;
                                        }}
                                    >
                                        <FileText className="mr-2 h-4 w-4" />
                                        Ver/Crear Historia Clínica
                                    </Button>
                                    <p className="text-xs text-blue-600 text-center">
                                        Accede al historial completo, crea nuevas evoluciones y gestiona archivos médicos
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                    <DialogFooter className="gap-2 sm:justify-end pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => { onOpenChat('chat', appointment); onOpenChange(false); }}><MessageSquare className="mr-2 h-4 w-4" />Abrir Chat</Button>
                        <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Diálogo para mostrar el comprobante de pago */}
            <Dialog open={isProofDialogOpen} onOpenChange={setIsProofDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Comprobante de Pago
                        </DialogTitle>
                        <DialogDescription>
                            Comprobante de pago para la cita con {appointment?.patientName}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {appointment?.paymentProof ? (
                            <div className="relative w-full h-[60vh] bg-muted rounded-lg overflow-hidden">
                                {appointment.paymentProof.startsWith('data:') ? (
                                    // Es un archivo base64
                                    <Image
                                        src={appointment.paymentProof}
                                        alt="Comprobante de pago"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                                    />
                                ) : (
                                    // Es una URL
                                    <Image
                                        src={appointment.paymentProof}
                                        alt="Comprobante de pago"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-32 text-muted-foreground">
                                No se pudo cargar el comprobante
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cerrar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

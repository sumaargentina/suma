"use client";

import { useEffect, useState } from "react";
import type { Appointment, Service, FamilyMember } from "@/lib/types";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, CheckCircle, ThumbsUp, ThumbsDown, MessageSquare, Save, CreditCard, FileText, Users, Phone, User } from "lucide-react";
import { format, parseISO, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import Image from 'next/image';
import { DoctorPatientChat } from "@/components/chat/DoctorPatientChat";
import { useAuth } from "@/lib/auth";

interface AppointmentDetailDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    appointment: Appointment | null;
    doctorServices: Service[];
    onUpdateAppointment: (id: string, data: Partial<Appointment>) => void;
    onOpenChat?: (type: 'chat', appointment: Appointment) => void;
    doctorId?: string;
    doctorName?: string;
}

export function AppointmentDetailDialog({
    isOpen,
    onOpenChange,
    appointment,
    doctorServices,
    onUpdateAppointment,
    onOpenChat,
    doctorId: propDoctorId,
    doctorName: propDoctorName,
}: AppointmentDetailDialogProps) {
    const { user } = useAuth();
    const [clinicalNotes, setClinicalNotes] = useState("");
    const [prescription, setPrescription] = useState("");
    const [editableServices, setEditableServices] = useState<Service[]>([]);
    const [isProofDialogOpen, setIsProofDialogOpen] = useState(false);
    const [isChatDialogOpen, setIsChatDialogOpen] = useState(false);
    const [familyMemberInfo, setFamilyMemberInfo] = useState<FamilyMember | null>(null);
    const [patientInfo, setPatientInfo] = useState<any>(null);

    // Use the account holder's patient ID for chat (bookedByPatientId), not the family member
    const chatPatientId = appointment?.bookedByPatientId || appointment?.patientId;
    const effectiveDoctorId = propDoctorId || appointment?.doctorId || user?.id;
    const effectiveDoctorName = propDoctorName || user?.name || 'Doctor';

    const editableTotalPrice =
        (appointment?.consultationFee || 0) +
        editableServices.reduce((sum, s) => sum + (s.price || 0), 0) -
        (appointment?.discountAmount || 0);

    useEffect(() => {
        if (appointment) {
            console.log('📋 AppointmentDetailDialog - doctorServices:', doctorServices);
            console.log('📋 AppointmentDetailDialog - appointment.services:', appointment.services);
            setClinicalNotes(appointment.clinicalNotes || "");
            setPrescription(appointment.prescription || "");
            setEditableServices(appointment.services || []);

            if (appointment.patientId) {
                fetch(`/api/patients/get?id=${appointment.patientId}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        console.log("Titular Loaded:", data);
                        setPatientInfo(data);
                    })
                    .catch(err => console.error("Error loading patient info:", err));
            }

            if (appointment.familyMemberId) {
                fetch(`/api/family-members/get?id=${appointment.familyMemberId}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        console.log("Familia Loaded:", data);
                        setFamilyMemberInfo(data);
                    })
                    .catch(err => console.error("Error loading family info:", err));
            } else {
                setFamilyMemberInfo(null);
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

    const patientAge = familyMemberInfo?.birthDate
        ? calculateAge(familyMemberInfo.birthDate)
        : (patientInfo?.age || null);

    const holderRaw = patientInfo as any;
    const holderName = appointment?.bookedByName ||
        (holderRaw ? `${holderRaw.first_name || holderRaw.name || ''} ${holderRaw.last_name || ''}`.trim() : null);

    const handleSaveServices = () => {
        if (appointment) {
            onUpdateAppointment(appointment.id, {
                services: editableServices,
                totalPrice: editableTotalPrice,
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

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detalles de la Cita</DialogTitle>
                        <DialogDescription>Cita con {appointment.patientName} el {format(addHours(parseISO(appointment.date), 5), 'dd MMM yyyy', { locale: es })} a las {appointment.time}.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="space-y-6">
                            <Card><CardHeader><CardTitle className="text-base">Información del Paciente</CardTitle></CardHeader>
                                <CardContent className="text-sm space-y-3">
                                    <div>
                                        <Label className="text-muted-foreground text-xs uppercase font-bold">Paciente</Label>
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-lg">{appointment.patientName}</p>
                                            {patientAge !== null && (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                                                    {patientAge} años
                                                </span>
                                            )}
                                            {(appointment.familyMemberId || (appointment.bookedByPatientId && appointment.bookedByPatientId !== appointment.patientId)) && (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                                    Familiar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {(appointment.familyMemberId || (appointment.bookedByPatientId && appointment.bookedByPatientId !== appointment.patientId)) && holderName && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Users className="h-4 w-4 text-amber-600" />
                                                <span className="font-bold text-amber-800 text-xs uppercase">Titular de la Cuenta</span>
                                            </div>
                                            <p className="text-sm text-amber-900">
                                                Dependiente de: <span className="font-semibold">{holderName}</span>
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
                                    {Number(appointment.discountAmount) > 0 && (
                                        <p>
                                            <strong>Subtotal:</strong>
                                            <span className="font-mono">
                                                {`$${((appointment.totalPrice || 0) + (appointment.discountAmount || 0)).toFixed(2)}`}
                                            </span>
                                        </p>
                                    )}
                                    {Number(appointment.discountAmount) > 0 && (
                                        <p>
                                            <strong>Descuento:</strong>
                                            <span className="font-mono text-green-600">
                                                {`-$${(appointment.discountAmount || 0).toFixed(2)}`}
                                            </span>
                                            {appointment.appliedCoupon && (
                                                <span className="ml-2 text-xs text-green-700">
                                                    (Cupón: {appointment.appliedCoupon})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    <p>
                                        <strong>Total:</strong>
                                        <span className="font-mono font-semibold">
                                            {`$${(appointment.totalPrice || 0).toFixed(2)}`}
                                            {Number(appointment.discountAmount) > 0 && (
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

                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="py-3 px-4">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-sm font-semibold">Servicios</CardTitle>
                                        {!isAppointmentLocked && (
                                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSaveServices}>
                                                <Save className="mr-1 h-3 w-3" /> Guardar
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                                    {/* Consulta Base */}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Consulta</span>
                                        <span className="font-mono font-medium">{`$${(appointment.consultationFee || 0).toFixed(2)}`}</span>
                                    </div>

                                    {/* Lista de Servicios */}
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                        {(() => {
                                            const allServices = [...doctorServices];
                                            (appointment.services || []).forEach(svc => {
                                                if (!allServices.find(s => s.id === svc.id)) {
                                                    allServices.push(svc);
                                                }
                                            });

                                            if (allServices.length === 0) {
                                                return (
                                                    <div className="text-center py-3 bg-amber-50 rounded border border-amber-200">
                                                        <p className="text-xs text-amber-700">
                                                            No tienes servicios configurados.
                                                        </p>
                                                        <p className="text-xs text-amber-600 mt-1">
                                                            Configúralos en Finanzas → Servicios
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            return allServices.map(service => {
                                                const isSelected = editableServices.some(s => s.id === service.id);
                                                return (
                                                    <div
                                                        key={service.id}
                                                        onClick={() => {
                                                            if (isAppointmentLocked) return;
                                                            if (isSelected) {
                                                                setEditableServices(editableServices.filter(s => s.id !== service.id));
                                                            } else {
                                                                setEditableServices([...editableServices, service]);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex justify-between items-center py-1.5 px-2 rounded text-sm transition-colors",
                                                            isSelected
                                                                ? "bg-green-50 text-green-800"
                                                                : "hover:bg-muted/50 text-muted-foreground",
                                                            !isAppointmentLocked && "cursor-pointer"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "w-4 h-4 rounded border flex items-center justify-center text-[10px]",
                                                                isSelected
                                                                    ? "bg-green-500 border-green-500 text-white"
                                                                    : "border-gray-300"
                                                            )}>
                                                                {isSelected && "✓"}
                                                            </div>
                                                            <span className={isSelected ? "font-medium" : ""}>{service.name}</span>
                                                        </div>
                                                        <span className="font-mono text-xs">{`$${service.price.toFixed(2)}`}</span>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>

                                    {/* Total */}
                                    <div className="border-t pt-2 mt-2">
                                        {Number(appointment.discountAmount) > 0 && (
                                            <div className="flex justify-between items-center text-xs text-green-600 mb-1">
                                                <span>Descuento {appointment.appliedCoupon && `(${appointment.appliedCoupon})`}</span>
                                                <span className="font-mono">{`-$${(appointment.discountAmount || 0).toFixed(2)}`}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold">Total</span>
                                            <span className="font-mono font-bold text-lg">{`$${editableTotalPrice.toFixed(2)}`}</span>
                                        </div>
                                        {!isAppointmentLocked && editableServices.length !== (appointment.services?.length || 0) && (
                                            <p className="text-xs text-amber-600 text-center mt-1">⚠️ Cambios sin guardar</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

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
                                            const url = `/doctor/patients/${appointment.patientId}${appointment.familyMemberId ? `?familyMemberId=${appointment.familyMemberId}` : ''}`;
                                            window.location.href = url;
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
                        <Button type="button" variant="ghost" onClick={() => setIsChatDialogOpen(true)}>
                            <MessageSquare className="mr-2 h-4 w-4" />Abrir Chat
                        </Button>
                        <DialogClose asChild><Button type="button" variant="outline">Cerrar</Button></DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                                    <Image
                                        src={appointment.paymentProof}
                                        alt="Comprobante de pago"
                                        fill
                                        className="object-contain"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                                    />
                                ) : (
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

            {/* Chat Dialog - Uses continuous chat system */}
            <Dialog open={isChatDialogOpen} onOpenChange={setIsChatDialogOpen}>
                <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <span>Chat con {patientInfo?.name || appointment?.bookedByName || appointment?.patientName}</span>
                                {appointment?.familyMemberId && (
                                    <p className="text-xs font-normal text-muted-foreground">
                                        (Titular de cuenta - Cita para: {appointment.patientName})
                                    </p>
                                )}
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {chatPatientId && effectiveDoctorId && (
                        <DoctorPatientChat
                            doctorId={effectiveDoctorId}
                            patientId={chatPatientId}
                            currentUserType="doctor"
                            otherPartyName={patientInfo?.name || appointment?.bookedByName || appointment?.patientName || 'Paciente'}
                            currentUserName={effectiveDoctorName}
                            className="flex-1"
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

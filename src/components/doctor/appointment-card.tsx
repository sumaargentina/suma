
"use client";

import { Appointment } from "@/lib/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, Eye, MessageSquare, CheckCircle, XCircle, HelpCircle, CreditCard, MapPin, Video, FileText, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, addHours } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

function capitalizeWords(str: string | null | undefined) {
    if (!str) return 'Paciente';
    return str.replace(/\b\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export function DoctorAppointmentCard({ appointment, onOpenDialog, isPast = false }: { appointment: Appointment, onOpenDialog: (type: 'appointment' | 'chat', appointment: Appointment) => void, isPast?: boolean }) {
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
                return <CheckCircle className="mr-1 h-3 w-3" />;
            case 'Pendiente':
                return <CreditCard className="mr-1 h-3 w-3" />;
            default:
                return null;
        }
    };

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-lg">{capitalizeWords(appointment.patientName)}</p>
                        {/* Indicador de cita para familiar */}
                        {appointment.familyMemberId && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 border-blue-200">
                                <Users className="h-3 w-3 mr-1" />
                                Familiar
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center text-sm gap-4 pt-1 text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {format(addHours(parseISO(appointment.date), 5), 'dd MMM yyyy', { locale: es })}</span>
                        <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {appointment.time}</span>
                    </div>
                    {appointment.consultationType === 'online' ? (
                        <div className="flex items-center text-sm gap-1.5 pt-1 text-blue-600">
                            <Video className="h-4 w-4" />
                            <span className="font-medium">Consulta Online</span>
                        </div>
                    ) : appointment.doctorAddress && (
                        <div className="flex items-center text-sm gap-1.5 pt-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{appointment.doctorAddress}</span>
                        </div>
                    )}
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-2">
                    <p className="font-bold text-lg">${(appointment.totalPrice || 0).toFixed(2)}</p>
                    <div className="flex flex-col gap-2 items-end">
                        {isPast ? (
                            <Badge variant={appointment.attendance === 'Atendido' ? 'default' : 'destructive'} className={cn({ 'bg-green-600 text-white': appointment.attendance === 'Atendido' })}>
                                {appointment.attendance}
                            </Badge>
                        ) : (
                            <>
                                <Badge variant={appointment.paymentStatus === 'Pagado' ? 'default' : 'secondary'} className={cn({ 'bg-green-600 text-white': appointment.paymentStatus === 'Pagado' })}>
                                    {getPaymentStatusIcon(appointment.paymentStatus)}
                                    {getPaymentStatusText(appointment.paymentStatus)}
                                </Badge>
                                {appointment.patientConfirmationStatus === 'Pendiente' && (
                                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                                        <HelpCircle className="mr-1 h-3 w-3" />
                                        Por confirmar
                                    </Badge>
                                )}
                                {appointment.patientConfirmationStatus === 'Confirmada' && (
                                    <Badge variant="outline" className="border-green-500 text-green-600">
                                        <CheckCircle className="mr-1 h-3 w-3" />
                                        Confirmada
                                    </Badge>
                                )}
                                {appointment.patientConfirmationStatus === 'Cancelada' && (
                                    <Badge variant="destructive">
                                        <XCircle className="mr-1 h-3 w-3" />
                                        Cancelada
                                    </Badge>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 border-t mt-4 flex justify-end gap-2 flex-wrap">
                <Link href={`/doctor/patients/${appointment.patientId}`} passHref>
                    <Button size="sm" variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                        <FileText className="mr-2 h-4 w-4" /> Historia
                    </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => onOpenDialog('chat', appointment)}><MessageSquare className="mr-2 h-4 w-4" /> Chat</Button>
                <Button size="sm" onClick={() => onOpenDialog('appointment', appointment)}><Eye className="mr-2 h-4 w-4" /> Ver Detalles</Button>
                {appointment.patientPhone && (() => {
                    const appointmentDate = addHours(parseISO(appointment.date), 5);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const apptDateOnly = new Date(appointmentDate);
                    apptDateOnly.setHours(0, 0, 0, 0);

                    // Determinar el texto descriptivo de la fecha
                    let fechaTexto = '';
                    if (apptDateOnly.getTime() === today.getTime()) {
                        fechaTexto = `hoy (${format(appointmentDate, 'dd/MM/yyyy')} a las ${appointment.time})`;
                    } else if (apptDateOnly.getTime() === tomorrow.getTime()) {
                        fechaTexto = `mañana (${format(appointmentDate, 'dd/MM/yyyy')} a las ${appointment.time})`;
                    } else {
                        fechaTexto = `el día ${format(appointmentDate, "EEEE d 'de' MMMM", { locale: es })} a las ${appointment.time}`;
                    }

                    // Determinar el tipo de consulta
                    const esOnline = appointment.consultationType === 'online';
                    const ubicacion = esOnline
                        ? '💻 Esta es una consulta online. Recibirás el enlace de la videollamada antes de la cita.'
                        : `📍 Dirección: ${(appointment.doctorAddress && appointment.doctorAddress.trim() !== '' ? appointment.doctorAddress : 'Consultorio')}`;

                    const mensaje = `👩‍⚕️ Estimado/a ${appointment.patientName},\n\n📅 Le recordamos que tiene una cita médica programada para ${fechaTexto}.\n\n${ubicacion}\n\n⏰ Por favor, ${esOnline ? 'esté listo/a unos minutos antes de la hora establecida' : 'llegue al menos 10 minutos antes de la hora establecida'}. ${esOnline ? '' : 'Si llega después de la hora, podría perder su turno.'}\n\nℹ️ Si tiene alguna novedad, puede ver más detalles de su cita en la app de SUMA.\n\n🙏 ¡Gracias por confiar en www.sumasalud.app! 💙`;

                    return (
                        <a
                            href={`https://api.whatsapp.com/send?phone=${appointment.patientPhone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(mensaje)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9"
                            title="Enviar recordatorio por WhatsApp"
                            style={{ textDecoration: 'none' }}
                        >
                            WhatsApp
                        </a>
                    );
                })()}
            </CardFooter>
        </Card>
    )
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Appointment } from "@/lib/types";
import { updateAppointment } from "@/lib/supabaseService";
import { useToast } from "@/hooks/use-toast";
import { Calendar, RefreshCw, DollarSign, ShieldAlert, CheckCircle, Clock, User, AlertCircle, ArrowRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface NoShowResolutionModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ResolutionType = 'reschedule' | 'refund' | 'retain';

export function NoShowResolutionModal({
  appointment,
  isOpen,
  onClose,
  onSuccess,
}: NoShowResolutionModalProps) {
  const { toast } = useToast();
  const [resolutionType, setResolutionType] = useState<ResolutionType>('reschedule');
  const [loading, setLoading] = useState(false);

  // Form states
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const [refundMethod, setRefundMethod] = useState("Transferencia Bancaria");
  const [refundReference, setRefundReference] = useState("");
  const [refundReason, setRefundReason] = useState("Inasistencia del paciente");

  const [retainNote, setRetainNote] = useState("Política de inasistencia sin aviso previo de 24h.");

  if (!appointment) return null;

  const isPaid = appointment.paymentStatus === 'Pagado';
  const price = appointment.totalPrice || appointment.consultationFee || 0;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (resolutionType === 'reschedule') {
        if (!newDate) {
          toast({ variant: "destructive", title: "Error", description: "Debes seleccionar la nueva fecha para la cita." });
          setLoading(false);
          return;
        }

        const updateData: Partial<Appointment> = {
          date: newDate,
          time: newTime || appointment.time,
          attendance: 'Pendiente',
          patientConfirmationStatus: 'Confirmada',
          noShowResolution: 'rescheduled',
          rescheduledFromDate: appointment.date,
          noShowNote: rescheduleNote || `Cita reprogramada desde ${appointment.date}`,
          readByPatient: false,
        };

        await updateAppointment(appointment.id, updateData);

        toast({
          title: "🗓️ Cita Reprogramada con Éxito",
          description: `La cita de ${appointment.patientName} ha sido trasladada al ${format(parseISO(newDate), "dd 'de' MMMM, yyyy", { locale: es })}.`,
        });
      } else if (resolutionType === 'refund') {
        const updateData: Partial<Appointment> = {
          attendance: 'No Asistió',
          paymentStatus: 'Reembolsado',
          noShowResolution: 'refunded',
          refundAmount: price,
          refundDate: new Date().toISOString(),
          refundReason: `${refundMethod} - ${refundReason} ${refundReference ? `(Ref: ${refundReference})` : ''}`.trim(),
          noShowNote: `Reembolso registrado por $${price}`,
          readByPatient: false,
        };

        await updateAppointment(appointment.id, updateData);

        toast({
          title: "💸 Reembolso Registrado",
          description: `Se marcó la cita como 'No Asistió' y se registró el reembolso de $${price}.`,
        });
      } else if (resolutionType === 'retain') {
        const updateData: Partial<Appointment> = {
          attendance: 'No Asistió',
          paymentStatus: 'Pagado',
          noShowResolution: 'retained',
          noShowNote: retainNote || "Pago retenido por política de inasistencia.",
          readByPatient: false,
        };

        await updateAppointment(appointment.id, updateData);

        toast({
          title: "🔒 Pago Retenido por Inasistencia",
          description: `La cita quedó registrada como 'No Asistió' y el ingreso se mantiene en finanzas.`,
        });
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Error resolviendo inasistencia:", error);
      toast({
        variant: "destructive",
        title: "Error al actualizar cita",
        description: error?.message || "No se pudo procesar la resolución de la cita.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Resolución de Inasistencia</DialogTitle>
              <DialogDescription className="text-xs">
                Gestiona la cita y el destino de los fondos del paciente
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumen del Paciente y Cita */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <User className="h-3.5 w-3.5 text-slate-500" />
              {appointment.patientName}
            </div>
            <Badge variant={isPaid ? "default" : "secondary"} className={isPaid ? "bg-green-600" : ""}>
              {isPaid ? `Pagado ($${price})` : "Pago Pendiente"}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {appointment.date}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {appointment.time}
            </span>
            {appointment.serviceName && (
              <span className="text-slate-500 truncate font-medium">
                • {appointment.serviceName}
              </span>
            )}
          </div>
        </div>

        {/* Selección de Acción */}
        <div className="space-y-3 pt-1">
          <Label className="text-xs font-semibold text-slate-700">
            ¿Qué acción deseas tomar con esta cita?
          </Label>

          <RadioGroup
            value={resolutionType}
            onValueChange={(val) => setResolutionType(val as ResolutionType)}
            className="grid grid-cols-1 gap-2.5"
          >
            {/* Opción 1: Reprogramar */}
            <label
              htmlFor="opt-reschedule"
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                resolutionType === 'reschedule'
                  ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <RadioGroupItem value="reschedule" id="opt-reschedule" className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  🗓️ Reprogramar Cita (Reagendar)
                </div>
                <p className="text-xs text-slate-600">
                  Mantiene el pago del paciente. Selecciona una nueva fecha y horario sin cobrarle nuevamente.
                </p>
              </div>
            </label>

            {/* Opción 2: Reembolsar */}
            {isPaid && (
              <label
                htmlFor="opt-refund"
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  resolutionType === 'refund'
                    ? 'border-amber-600 bg-amber-50/50 ring-1 ring-amber-600'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="refund" id="opt-refund" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    💸 Registrar Reembolso
                  </div>
                  <p className="text-xs text-slate-600">
                    Marca como &quot;No Asistió&quot;, registra la devolución de ${price} y se descuenta de los ingresos netos.
                  </p>
                </div>
              </label>
            )}

            {/* Opción 3: Retener Pago */}
            <label
              htmlFor="opt-retain"
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                resolutionType === 'retain'
                  ? 'border-red-600 bg-red-50/50 ring-1 ring-red-600'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <RadioGroupItem value="retain" id="opt-retain" className="mt-1" />
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  🔒 Retener Pago (Penalización por Inasistencia)
                </div>
                <p className="text-xs text-slate-600">
                  Marca como &quot;No Asistió&quot; pero retiene el pago como compensación por el cupo reservado.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Formularios según la opción seleccionada */}
        <div className="pt-2">
          {resolutionType === 'reschedule' && (
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3 text-xs">
              <h4 className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Datos de la Nueva Cita
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newDate" className="text-xs text-slate-700">Nueva Fecha *</Label>
                  <Input
                    id="newDate"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="bg-white text-xs"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newTime" className="text-xs text-slate-700">Nuevo Horario</Label>
                  <Input
                    id="newTime"
                    placeholder="Ej: 10:00 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="rescheduleNote" className="text-xs text-slate-700">Nota / Motivo de cambio</Label>
                <Input
                  id="rescheduleNote"
                  placeholder="Ej: Paciente notificó retraso, se acordó nueva fecha"
                  value={rescheduleNote}
                  onChange={(e) => setRescheduleNote(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            </div>
          )}

          {resolutionType === 'refund' && (
            <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3 text-xs">
              <h4 className="font-semibold text-amber-900 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-amber-600" />
                Detalle del Reembolso (${price})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="refundMethod" className="text-xs text-slate-700">Método de Devolución</Label>
                  <Select value={refundMethod} onValueChange={setRefundMethod}>
                    <SelectTrigger className="bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Transferencia Bancaria">Transferencia Bancaria</SelectItem>
                      <SelectItem value="Pago Móvil">Pago Móvil</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="MercadoPago">MercadoPago / Tarjeta</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="refundRef" className="text-xs text-slate-700">Nº de Referencia / Comprobante</Label>
                  <Input
                    id="refundRef"
                    placeholder="Ej: Ref 987654321"
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="refundReason" className="text-xs text-slate-700">Motivo de Devolución</Label>
                <Input
                  id="refundReason"
                  placeholder="Ej: Paciente solicitó devolución por causa de fuerza mayor"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            </div>
          )}

          {resolutionType === 'retain' && (
            <div className="p-3.5 bg-red-50/60 border border-red-200 rounded-xl space-y-2 text-xs">
              <h4 className="font-semibold text-red-900 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-red-600" />
                Justificación de Retención de Pago
              </h4>
              <p className="text-slate-600 text-xs">
                El paciente no asistió a su turno reservado y los fondos se retienen de acuerdo a las políticas de cancelación.
              </p>
              <div className="space-y-1">
                <Label htmlFor="retainNote" className="text-xs text-slate-700">Nota interna</Label>
                <Textarea
                  id="retainNote"
                  rows={2}
                  value={retainNote}
                  onChange={(e) => setRetainNote(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={
              resolutionType === 'reschedule'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : resolutionType === 'refund'
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Confirmar Resolución
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  User, 
  FlaskConical, 
  FileText, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileCheck, 
  ExternalLink,
  Calendar,
  Stethoscope,
  Phone,
  Check,
  UserCheck
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { uploadPublicImage } from '@/lib/supabaseService';

interface PatientData {
  id: string;
  name: string;
  cedula: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

interface LabOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  doctorId: string;
  laboratoryId?: string | null;
  doctor: {
    id?: string;
    name: string;
    specialty: string;
    medical_license?: string;
    phone?: string;
    city?: string;
  };
  date: string;
  studies: string;
  diagnosis?: string;
  clinicalIndications?: string;
  doctorNotes?: string;
  status: 'pending' | 'in_progress' | 'completed';
  resultsAvailable: boolean;
  resultsUrl?: string | null;
  laboratoryNotes?: string;
  attendedAt?: string | null;
  completedDate?: string | null;
  source?: string;
}

interface LaboratoryOrdersTabProps {
  initialQuery?: string;
}

export function LaboratoryOrdersTab({ initialQuery }: LaboratoryOrdersTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState(initialQuery || '');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [attendingOrderId, setAttendingOrderId] = useState<string | null>(null);

  // Historial del Laboratorio
  const [labHistory, setLabHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal para Cargar Resultados
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [resultsSummary, setResultsSummary] = useState('');
  const [bioanalystName, setBioanalystName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal para Visualizar Resultados
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<LabOrder | null>(null);

  const effectiveLabId = user?.role === 'secretary' ? (user.laboratoryId || user.id) : user?.id;

  const loadLabHistory = useCallback(async () => {
    if (!effectiveLabId) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/laboratory/search?laboratoryId=${effectiveLabId}`);
      if (res.ok) {
        const data = await res.json();
        setLabHistory(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando historial del laboratorio:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [effectiveLabId]);

  useEffect(() => {
    loadLabHistory();
  }, [loadLabHistory]);

  const executeSearch = useCallback(async (queryToRun: string) => {
    const clean = queryToRun.trim();
    if (!clean) {
      toast({
        variant: 'destructive',
        title: 'Ingresa la Cédula del paciente',
        description: 'Escribe el número de cédula del paciente o el código de orden (ej: SUMA-LAB-...).'
      });
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      setPatient(null);
      setOrders([]);

      const res = await fetch('/api/laboratory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al realizar la búsqueda');
      }

      if (data.patient) {
        setPatient(data.patient);
      }
      setOrders(data.orders || []);

      if ((!data.orders || data.orders.length === 0) && !data.patient) {
        toast({
          title: 'Sin resultados',
          description: data.message || 'No se encontraron órdenes ni pacientes con esa cédula.',
        });
      }
    } catch (error: any) {
      console.error('Error buscando órdenes de laboratorio:', error);
      toast({
        variant: 'destructive',
        title: 'Error de búsqueda',
        description: error.message || 'Ocurrió un error al consultar el sistema.'
      });
    } finally {
      setIsSearching(false);
    }
  }, [toast]);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setSearchQuery(initialQuery.trim());
      executeSearch(initialQuery.trim());
    }
  }, [initialQuery, executeSearch]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await executeSearch(searchQuery);
  };

  /**
   * Marca inmediatamente al paciente sin cita como "Lo Atendimos Ahorita"
   * asociando los exámenes que le mandó a hacer el médico con este laboratorio SUMA.
   */
  const handleAttendWalkInNow = async (order: LabOrder) => {
    if (!effectiveLabId) return;

    try {
      setAttendingOrderId(order.id);
      const res = await fetch('/api/laboratory/attend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.orderNumber,
          patientId: patient?.id || order.patientId,
          patientName: patient?.name || 'Paciente SUMA',
          patientCedula: patient?.cedula || searchQuery.trim(),
          patientPhone: patient?.phone || '',
          doctorId: order.doctorId || order.doctor?.id,
          doctorName: order.doctor?.name || 'Médico Tratante',
          studies: order.studies,
          diagnosis: order.diagnosis || '',
          laboratoryId: effectiveLabId,
          laboratoryName: user?.name || 'Laboratorio SUMA'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar la atención');
      }

      toast({
        title: '✅ ¡Paciente Atendido Ahorita (Sin Cita)!',
        description: `Se registró la atención inmediata de ${patient?.name || 'el paciente'} para los exámenes indicados por Dr(a). ${order.doctor?.name || 'Tratante'}.`,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-950'
      });

      // Actualizar estado local y recargar búsqueda e historial
      await executeSearch(searchQuery);
      await loadLabHistory();
    } catch (err: any) {
      console.error('Error marcando paciente atendido en laboratorio:', err);
      toast({
        variant: 'destructive',
        title: 'Error al registrar atención',
        description: err.message || 'No se pudo marcar como atendido.'
      });
    } finally {
      setAttendingOrderId(null);
    }
  };

  const handleOpenUploadModal = (order: LabOrder) => {
    setSelectedOrder(order);
    setUploadFile(null);
    setUploadPreview(null);
    setResultsSummary(order.laboratoryNotes || '');
    setBioanalystName(user?.name || '');
    setIsUploadModalOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setUploadPreview(url);
    } else {
      setUploadPreview(null);
    }
  };

  const handleUploadAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !patient) return;

    if (!resultsSummary.trim() && !uploadFile) {
      toast({
        variant: 'destructive',
        title: 'Faltan datos de resultados',
        description: 'Debes escribir el resumen del laboratorio o adjuntar el archivo/imagen de resultados.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      let resultsUrl = selectedOrder.resultsUrl || '';

      if (uploadFile) {
        setIsUploadingFile(true);
        resultsUrl = await uploadPublicImage(uploadFile, 'profile-images', 'laboratory/results');
        setIsUploadingFile(false);
      }

      const res = await fetch('/api/laboratory/upload-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          orderNumber: selectedOrder.orderNumber,
          patientId: patient.id,
          doctorId: selectedOrder.doctorId || selectedOrder.doctor?.id,
          studies: selectedOrder.studies,
          diagnosis: selectedOrder.diagnosis || '',
          laboratoryId: effectiveLabId,
          laboratoryName: user?.name,
          resultsSummary: resultsSummary.trim(),
          resultsUrl,
          fileName: uploadFile?.name || `Resultados - ${selectedOrder.studies}`,
          fileType: uploadFile?.type || 'image/jpeg',
          fileSize: uploadFile?.size || 0,
          bioanalystName: bioanalystName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando resultados');

      toast({
        title: '✅ Resultados Cargados',
        description: 'Los resultados se han guardado y vinculado automáticamente a la historia médica del paciente.'
      });

      setIsUploadModalOpen(false);
      await executeSearch(searchQuery);
      await loadLabHistory();

    } catch (err: any) {
      console.error('Error guardando resultados:', err);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: err.message || 'No se pudieron guardar los resultados.'
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingFile(false);
    }
  };

  const handleOpenViewModal = (order: LabOrder) => {
    setViewOrder(order);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* MOSTRADOR POR CÉDULA (IDÉNTICO A FARMACIA PARA PACIENTES SIN CITA) */}
      <Card className="border-teal-200 bg-white shadow-md rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-6 sm:p-7">
          <div className="max-w-3xl">
            <span className="text-xs uppercase tracking-wider font-bold text-teal-300 bg-teal-950/70 px-2.5 py-1 rounded-full border border-teal-500/40 inline-block mb-2">
              🔬 Recepción Directa en Laboratorio SUMA (Con o Sin Cita)
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Consulta por Cédula y Atención Inmediata
            </h1>
            <p className="text-sm text-teal-100/90 mt-1.5 leading-relaxed">
              Si el paciente llega directamente al laboratorio <strong>sin cita previa</strong>, ingresa su <strong>número de Cédula</strong> para ver al instante cuáles son los exámenes que le mandó a hacer el médico, marcar <strong>&quot;Lo Atendimos Ahorita&quot;</strong> y cargar sus resultados.
            </p>
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Ingresa la Cédula del paciente (Ej: V-12345678 ó 12345678) o Código SUMA-LAB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 text-base bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border-0 shadow-inner focus-visible:ring-2 focus-visible:ring-teal-400 font-medium"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching}
              className="h-12 px-6 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold shadow-md text-sm shrink-0 transition-all gap-2"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar por Cédula
            </Button>
          </form>
        </div>
      </Card>

      {/* INFORMACIÓN DEL PACIENTE */}
      {patient && (
        <Card className="border-slate-200 bg-white shadow-xs rounded-2xl animate-in fade-in-50">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                  <User className="h-6 w-6 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{patient.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-0.5">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">
                      C.I.: {patient.cedula || 'No registrada'}
                    </span>
                    {patient.age && <span>• {patient.age} años</span>}
                    {patient.gender && <span className="capitalize">• {patient.gender}</span>}
                    {patient.phone && (
                      <span className="flex items-center gap-1">
                        • <Phone className="h-3 w-3" /> {patient.phone}
                      </span>
                    )}
                    {patient.city && <span>• {patient.city}</span>}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-teal-50 text-teal-800 border-teal-200 px-3 py-1 font-semibold">
                Paciente Identificado por Cédula
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LISTADO DE ÓRDENES Y ESTUDIOS INDICADOS POR EL MÉDICO */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-teal-600" />
              Exámenes Indicados por el Médico ({orders.length})
            </h3>
            <span className="text-xs text-slate-500">
              Órdenes médicas vinculadas a la cédula del paciente
            </span>
          </div>

          {orders.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2 rounded-2xl">
              <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-semibold">No se encontraron exámenes pendientes para esta cédula.</p>
              <p className="text-xs text-slate-500 mt-1">
                Verifica el número de cédula o asegúrate de que el médico haya registrado los estudios solicitados en la historia del paciente.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {orders.map((order) => {
                const isCompleted = order.status === 'completed' || order.resultsAvailable;
                const isAttendedInProgress = order.status === 'in_progress' && !isCompleted;
                const isAttendingThis = attendingOrderId === order.id;

                return (
                  <Card
                    key={order.id}
                    className={`overflow-hidden border-2 rounded-2xl shadow-xs transition-all ${
                      isCompleted
                        ? 'border-emerald-300 bg-white'
                        : isAttendedInProgress
                        ? 'border-blue-300 bg-blue-50/10'
                        : 'border-teal-200 bg-white hover:border-teal-300'
                    }`}
                  >
                    {/* Cabecera de la Orden */}
                    <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b ${
                      isCompleted
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : isAttendedInProgress
                        ? 'bg-blue-50/80 border-blue-200'
                        : 'bg-teal-50/60 border-teal-100'
                    }`}>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge className="bg-slate-900 text-white font-mono text-xs px-2.5 py-1">
                          {order.orderNumber}
                        </Badge>
                        <span className="text-xs text-slate-600 flex items-center gap-1 font-medium">
                          <Calendar className="h-3.5 w-3.5 text-teal-700" />
                          Emitido: {order.date ? format(parseISO(order.date), "dd 'de' MMMM, yyyy", { locale: es }) : 'Fecha no disp.'}
                        </span>
                      </div>
                      <div>
                        {isCompleted ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white gap-1 text-xs px-3 py-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Atendido y Resultados Listos
                          </Badge>
                        ) : isAttendedInProgress ? (
                          <Badge className="bg-blue-600 hover:bg-blue-600 text-white gap-1 text-xs px-3 py-1">
                            <UserCheck className="h-3.5 w-3.5" /> Atendido Ahorita (Muestra Tomada)
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white gap-1 text-xs px-3 py-1">
                            <Clock className="h-3.5 w-3.5" /> Pendiente de Atención en Laboratorio
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Médico solicitante y Diagnóstico */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-500 font-medium block uppercase text-[10px]">Médico que mandó los exámenes:</span>
                          <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5 mt-0.5">
                            <Stethoscope className="h-4 w-4 text-teal-600 shrink-0" />
                            Dr(a). {order.doctor?.name || 'Médico Tratante'}
                          </span>
                          <span className="text-teal-700 font-semibold block mt-0.5">
                            {order.doctor?.specialty || 'Especialista'}
                            {order.doctor?.medical_license ? ` • M.P.: ${order.doctor.medical_license}` : ''}
                          </span>
                        </div>
                        {order.diagnosis && (
                          <div>
                            <span className="text-slate-500 font-medium block uppercase text-[10px]">Diagnóstico / Motivo Clínico:</span>
                            <span className="font-semibold text-slate-800 mt-0.5 block text-xs">{order.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {/* Exámenes Requeridos (DESTACADO) */}
                      <div className="bg-amber-50/80 border-2 border-amber-200 rounded-xl p-4">
                        <Label className="text-xs font-extrabold text-amber-950 uppercase flex items-center gap-1.5 mb-1.5">
                          🔬 Exámenes que le mandó a hacer el Médico:
                        </Label>
                        <p className="text-base font-bold text-slate-900 whitespace-pre-wrap leading-relaxed">
                          {order.studies}
                        </p>
                      </div>

                      {/* Banner si ya fue marcado como Atendido Ahorita (Sin Cita) */}
                      {isAttendedInProgress && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-blue-950">
                          <UserCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-blue-900">
                              ✅ Paciente recibido y atendido en este Laboratorio SUMA (Sin Cita)
                            </p>
                            <p className="text-blue-800 mt-0.5">
                              La toma de muestra ya quedó registrada en tu agenda e historial del día. Cuando tengas los resultados listos, súbelos con el botón de abajo.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Si ya tiene resultados cargados */}
                      {isCompleted && (
                        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-2">
                          <Label className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Informe y Resultados del Laboratorio
                          </Label>
                          {order.laboratoryNotes && (
                            <p className="text-xs text-slate-800 whitespace-pre-wrap bg-white p-3 rounded-lg border border-emerald-100">
                              {order.laboratoryNotes}
                            </p>
                          )}
                          <div className="flex items-center justify-between pt-1">
                            {order.completedDate && (
                              <span className="text-[11px] text-emerald-700 font-medium">
                                Procesado: {format(parseISO(order.completedDate), "dd/MM/yyyy hh:mm a")}
                              </span>
                            )}
                            {order.resultsUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-100 bg-white"
                                onClick={() => handleOpenViewModal(order)}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Ver Archivo Adjunto
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Botones de acción: Atender Ahorita (Sin Cita) y Cargar Resultados */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500">
                          {order.status === 'pending'
                            ? '¿El paciente llegó directo al laboratorio sin cita? Márcalo como atendido ahorita:'
                            : 'Orden vinculada a este laboratorio SUMA.'}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 ml-auto">
                          {order.status === 'pending' && (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isAttendingThis}
                              onClick={() => handleAttendWalkInNow(order)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 h-9 gap-1.5 shadow-sm"
                            >
                              {isAttendingThis ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Lo Atendimos Ahorita (Sin Cita)
                            </Button>
                          )}

                          {isCompleted ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1.5 border-slate-300 h-9"
                              onClick={() => handleOpenUploadModal(order)}
                            >
                              <Upload className="h-3.5 w-3.5 text-slate-600" />
                              Actualizar Resultados
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs h-9 px-4 font-semibold"
                              onClick={() => handleOpenUploadModal(order)}
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Cargar Resultados de Laboratorio
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HISTORIAL DE ÓRDENES ATENDIDAS EN ESTE LABORATORIO Y MÉDICOS QUE LAS ENVIARON */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              Historial de Exámenes Atendidos por este Laboratorio ({labHistory.length})
            </h3>
            <p className="text-xs text-slate-500">
              Registro de pacientes atendidos por cédula y médicos tratantes que solicitaron los estudios.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadLabHistory}
            disabled={loadingHistory}
            className="text-xs"
          >
            {loadingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
            Actualizar
          </Button>
        </div>

        <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
          <CardContent className="p-0">
            {loadingHistory ? (
              <div className="p-10 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                Cargando historial del laboratorio...
              </div>
            ) : labHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Aún no hay órdenes marcadas como atendidas en este laboratorio. Cuando atiendas un paciente por cédula, quedará registrado aquí.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Fecha Atención</TableHead>
                    <TableHead className="text-xs font-semibold">Orden</TableHead>
                    <TableHead className="text-xs font-semibold">Paciente</TableHead>
                    <TableHead className="text-xs font-semibold">Médico Solicitante</TableHead>
                    <TableHead className="text-xs font-semibold">Exámenes Realizados</TableHead>
                    <TableHead className="text-xs font-semibold">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {labHistory.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/70">
                      <TableCell className="text-xs whitespace-nowrap">
                        {item.attendedAt ? format(parseISO(item.attendedAt), 'dd/MM/yyyy hh:mm a') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-bold bg-slate-100 px-2 py-0.5 rounded">
                          {item.orderNumber}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-bold text-slate-900">{item.patientName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">C.I.: {item.patientCedula}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-900">Dr(a). {item.doctorName}</div>
                        <div className="text-[11px] text-teal-700">{item.doctorSpecialty}</div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 max-w-xs truncate" title={item.studies}>
                        {item.studies}
                      </TableCell>
                      <TableCell>
                        {item.resultsAvailable || item.status === 'completed' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">
                            Resultados Listos
                          </Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px]">
                            Atendido / Muestra Tomada
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL DE CARGA DE RESULTADOS */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-950">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              Cargar Resultados de Laboratorio
            </DialogTitle>
            <DialogDescription>
              {selectedOrder && (
                <span>
                  Orden <strong>{selectedOrder.orderNumber}</strong> para <strong>{patient?.name}</strong> (C.I.: {patient?.cedula}).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadAndSave} className="space-y-4 pt-2">
            {/* Estudios que debe realizarse */}
            {selectedOrder && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">
                  Exámenes Solicitados por Dr(a). {selectedOrder.doctor?.name || 'Médico Tratante'}:
                </span>
                <p className="text-slate-800 font-semibold">{selectedOrder.studies}</p>
              </div>
            )}

            {/* Subir archivo / imagen de resultado */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">
                Archivo de Resultados (Imagen JPG, PNG o PDF)
              </Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-400 transition-colors bg-slate-50/50">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="lab-result-file-upload"
                />
                <label
                  htmlFor="lab-result-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="h-8 w-8 text-teal-600" />
                  <span className="text-xs font-semibold text-slate-700">
                    {uploadFile ? uploadFile.name : 'Haz clic para seleccionar el archivo o escaneo'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Formatos recomendados: JPG, PNG o PDF del informe de laboratorio
                  </span>
                </label>
              </div>

              {uploadPreview && (
                <div className="mt-2 relative rounded-lg border p-2 bg-slate-100 max-h-48 overflow-hidden flex justify-center">
                  <img src={uploadPreview} alt="Preview" className="max-h-44 object-contain rounded" />
                </div>
              )}
            </div>

            {/* Resumen escrito / Valores de referencia */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">
                Resumen de Resultados / Observaciones Clínicas
              </Label>
              <Textarea
                rows={4}
                placeholder="Escribe los valores principales, hallazgos o conclusiones del análisis (ej: Glicemia 95 mg/dl, Hematocrito 42%, Leucocitos normales...)"
                value={resultsSummary}
                onChange={(e) => setResultsSummary(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-slate-500">
                Este resumen será visible directamente para el médico tratante en el historial clínico del paciente.
              </p>
            </div>

            {/* Bioanalista responsable */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700">
                Bioanalista / Profesional Responsable
              </Label>
              <Input
                placeholder="Nombre del Bioanalista"
                value={bioanalystName}
                onChange={(e) => setBioanalystName(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                disabled={isSubmitting || isUploadingFile}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando Resultados...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Guardar y Vincular a Historia Médica
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA VER RESULTADOS COMPLETOS */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-teal-600" />
              Resultados de Laboratorio
            </DialogTitle>
            <DialogDescription>
              {viewOrder && (
                <span>Orden: <strong>{viewOrder.orderNumber}</strong> • {viewOrder.studies}</span>
              )}
            </DialogDescription>
          </DialogHeader>

          {viewOrder && (
            <div className="space-y-4 pt-2">
              {viewOrder.laboratoryNotes && (
                <div className="bg-slate-50 p-4 rounded-xl border">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Informe del Laboratorio</h4>
                  <p className="text-xs whitespace-pre-wrap text-slate-900 leading-relaxed">
                    {viewOrder.laboratoryNotes}
                  </p>
                </div>
              )}

              {viewOrder.resultsUrl && (
                <div className="border rounded-xl p-3 bg-slate-100 flex flex-col items-center">
                  {viewOrder.resultsUrl.endsWith('.pdf') ? (
                    <div className="py-8 text-center">
                      <FileText className="h-12 w-12 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Documento PDF de Resultados</p>
                      <Button
                        size="sm"
                        className="mt-3 bg-red-600 hover:bg-red-700 text-white gap-2"
                        onClick={() => window.open(viewOrder.resultsUrl!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" /> Abrir PDF en nueva pestaña
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full text-center">
                      <img
                        src={viewOrder.resultsUrl}
                        alt="Resultado de Laboratorio"
                        className="max-h-[60vh] object-contain mx-auto rounded-lg shadow-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => window.open(viewOrder.resultsUrl!, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir imagen en tamaño completo
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

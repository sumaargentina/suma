"use client";

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  Image as ImageIcon
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
  doctor: {
    name: string;
    specialty: string;
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
  completedDate?: string | null;
  source?: string;
}

export function LaboratoryOrdersTab() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);

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

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ingresa un dato de búsqueda',
        description: 'Escribe el número de cédula del paciente o el código de orden (ej: SUMA-LAB-...).'
      });
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      setPatient(null);
      setOrders([]);
      setAttachments([]);

      const res = await fetch('/api/laboratory/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al realizar la búsqueda');
      }

      if (data.patient) {
        setPatient(data.patient);
      }
      setOrders(data.orders || []);
      setAttachments(data.attachments || []);

      if ((!data.orders || data.orders.length === 0) && !data.patient) {
        toast({
          title: 'Sin resultados',
          description: data.message || 'No se encontraron órdenes ni pacientes con ese criterio.',
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

      // Subir archivo a Supabase Storage si se seleccionó uno nuevo
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
          laboratoryId: user?.id,
          laboratoryName: user?.name,
          resultsSummary: resultsSummary.trim(),
          resultsUrl,
          fileName: uploadFile?.name || 'Resultados de Laboratorio',
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
      // Refrescar búsqueda
      handleSearch();

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
    <div className="space-y-6">
      {/* HEADER Y BUSCADOR */}
      <Card className="border-teal-200/60 shadow-sm bg-gradient-to-r from-teal-50/40 via-white to-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 text-white rounded-xl shadow-xs">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl text-teal-950 font-bold">
                Recepción de Órdenes & Carga de Resultados
              </CardTitle>
              <CardDescription>
                Consulta los estudios solicitados por médicos a los pacientes y sube sus resultados directamente a su historial clínico.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Ingresa Cédula (ej: V-12345678 o 12345678) o Código de Orden (ej: SUMA-LAB-...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-teal-200 focus:border-teal-500 shadow-2xs text-sm"
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSearching}
              className="h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-medium shadow-xs gap-2"
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar Exámenes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* INFORMACIÓN DEL PACIENTE */}
      {patient && (
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
                  <User className="h-6 w-6 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{patient.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-0.5">
                    <span className="font-semibold text-slate-800">C.I: {patient.cedula || 'No registrada'}</span>
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
                Paciente Verificado
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LISTADO DE ÓRDENES Y ESTUDIOS */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-teal-600" />
              Estudios Solicitados por Médicos ({orders.length})
            </h3>
          </div>

          {orders.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">No se encontraron órdenes de laboratorio registradas para este criterio.</p>
              <p className="text-xs text-slate-400 mt-1">
                Asegúrate de que el médico haya indicado estudios en la evolución del paciente.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order) => {
                const isCompleted = order.status === 'completed' || order.resultsAvailable;

                return (
                  <Card key={order.id} className="overflow-hidden border border-slate-200 shadow-xs hover:border-teal-300 transition-colors">
                    <div className="p-5 space-y-4">
                      {/* Cabecera de la Orden */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2.5">
                          <Badge className="bg-slate-900 text-white font-mono text-xs">
                            {order.orderNumber}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {order.date ? format(parseISO(order.date), "dd 'de' MMMM, yyyy", { locale: es }) : 'Fecha no disp.'}
                          </span>
                        </div>
                        <div>
                          {isCompleted ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Resultados Listos
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-amber-300 gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-600" /> Pendiente de Resultados
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Médico solicitante y Diagnóstico */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                        <div>
                          <span className="text-slate-500 font-medium block">Médico Solicitante:</span>
                          <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                            <Stethoscope className="h-3.5 w-3.5 text-teal-600" />
                            {order.doctor?.name || 'Dr. Tratante'}
                          </span>
                          <span className="text-slate-600">{order.doctor?.specialty}</span>
                        </div>
                        {order.diagnosis && (
                          <div>
                            <span className="text-slate-500 font-medium block">Diagnóstico / Motivo:</span>
                            <span className="font-semibold text-slate-800 mt-0.5 block">{order.diagnosis}</span>
                          </div>
                        )}
                      </div>

                      {/* Exámenes Requeridos (DESTACADO) */}
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
                        <Label className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5 mb-1.5">
                          🔬 Exámenes / Estudios Indicados
                        </Label>
                        <p className="text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed">
                          {order.studies}
                        </p>
                      </div>

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
                              <span className="text-[11px] text-emerald-700">
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

                      {/* Botones de acción */}
                      <div className="flex items-center justify-end gap-2 pt-2">
                        {isCompleted ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1.5 border-slate-300"
                            onClick={() => handleOpenUploadModal(order)}
                          >
                            <Upload className="h-3.5 w-3.5 text-slate-600" />
                            Actualizar Resultados
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="text-xs gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                            onClick={() => handleOpenUploadModal(order)}
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Cargar Resultados de Laboratorio
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

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
                  Orden <strong>{selectedOrder.orderNumber}</strong> para <strong>{patient?.name}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadAndSave} className="space-y-4 pt-2">
            {/* Estudios que debe realizarse */}
            {selectedOrder && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Estudios Solicitados por el Médico:</span>
                <p className="text-slate-800 font-medium">{selectedOrder.studies}</p>
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

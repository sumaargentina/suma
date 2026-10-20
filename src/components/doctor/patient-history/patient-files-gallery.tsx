"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FlaskConical, 
  FileText, 
  ExternalLink, 
  Image as ImageIcon, 
  Calendar, 
  Download, 
  Loader2, 
  FolderOpen,
  Eye,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PatientFilesGalleryProps {
  patientId: string;
}

interface FileItem {
  id: string;
  title: string;
  url: string;
  type: string;
  category: 'lab_result' | 'imaging' | 'prescription' | 'general';
  description?: string;
  createdAt: string;
  source: 'attachment' | 'lab_order';
  laboratoryName?: string;
}

export function PatientFilesGallery({ patientId }: PatientFilesGalleryProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  useEffect(() => {
    loadFiles();
  }, [patientId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const items: FileItem[] = [];

      // 1. Obtener de medical_attachments
      const { data: attachments, error: attError } = await supabase
        .from('medical_attachments')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (!attError && attachments) {
        attachments.forEach((att: any) => {
          items.push({
            id: att.id,
            title: att.file_name || 'Archivo Adjunto',
            url: att.file_url,
            type: att.file_type || 'image/jpeg',
            category: att.category || 'general',
            description: att.description,
            createdAt: att.created_at,
            source: 'attachment'
          });
        });
      }

      // 2. Obtener de laboratory_orders con resultados disponibles
      const { data: labOrders, error: labError } = await supabase
        .from('laboratory_orders')
        .select('*')
        .eq('patient_id', patientId)
        .eq('results_available', true)
        .order('completed_date', { ascending: false });

      if (!labError && labOrders) {
        labOrders.forEach((order: any) => {
          // Evitar duplicar si la url ya está en medical_attachments
          const alreadyInList = items.some(i => i.url && i.url === order.results_url);
          if (!alreadyInList && (order.results_url || order.laboratory_notes)) {
            let studiesName = 'Estudios de Laboratorio';
            if (Array.isArray(order.studies) && order.studies.length > 0) {
              studiesName = order.studies.map((s: any) => typeof s === 'string' ? s : s.name).join(', ');
            }

            items.push({
              id: order.id,
              title: studiesName,
              url: order.results_url || '',
              type: order.results_url?.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
              category: 'lab_result',
              description: order.laboratory_notes,
              createdAt: order.completed_date || order.results_uploaded_at || order.created_at,
              source: 'lab_order'
            });
          }
        });
      }

      setFiles(items);
    } catch (err) {
      console.error('Error cargando archivos del paciente:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(f => {
    if (selectedCategory === 'ALL') return true;
    return f.category === selectedCategory;
  });

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-teal-600" />
        <span className="text-sm">Cargando galería de estudios y archivos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de Categoría */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={selectedCategory === 'ALL' ? 'default' : 'outline'}
            className="text-xs h-8"
            onClick={() => setSelectedCategory('ALL')}
          >
            Todos ({files.length})
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'lab_result' ? 'default' : 'outline'}
            className="text-xs h-8 gap-1.5"
            onClick={() => setSelectedCategory('lab_result')}
          >
            <FlaskConical className="h-3.5 w-3.5 text-teal-600" />
            Laboratorios ({files.filter(f => f.category === 'lab_result').length})
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'imaging' ? 'default' : 'outline'}
            className="text-xs h-8 gap-1.5"
            onClick={() => setSelectedCategory('imaging')}
          >
            <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
            Imágenes ({files.filter(f => f.category === 'imaging').length})
          </Button>
        </div>

        <span className="text-xs text-muted-foreground">
          {files.length} archivo(s) disponibles
        </span>
      </div>

      {/* Lista de Archivos */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
          <FolderOpen className="h-12 w-12 mx-auto text-slate-300 mb-2" />
          <h3 className="text-base font-semibold text-slate-700">Sin archivos o resultados en esta categoría</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Cuando un laboratorio aliado cargue los resultados de los estudios indicados, se mostrarán automáticamente aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isLab = file.category === 'lab_result';
            const isPdf = file.url.toLowerCase().endsWith('.pdf');

            return (
              <Card key={file.id} className="overflow-hidden border hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  {/* Vista previa o icono */}
                  <div className="relative h-40 bg-slate-100 flex items-center justify-center overflow-hidden border-b">
                    {file.url && !isPdf ? (
                      <img
                        src={file.url}
                        alt={file.title}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewFile(file)}
                      />
                    ) : isPdf ? (
                      <div 
                        className="flex flex-col items-center justify-center p-4 cursor-pointer text-center"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <FileText className="h-14 w-14 text-red-500 mb-1" />
                        <span className="text-xs font-semibold text-slate-700">Documento PDF</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center">
                        <FlaskConical className="h-12 w-12 text-teal-600 mb-1" />
                        <span className="text-xs text-slate-600 font-medium">Informe Escrito</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <Badge className={isLab ? 'bg-teal-600 text-white font-semibold text-[10px]' : 'bg-blue-600 text-white text-[10px]'}>
                        {isLab ? 'Laboratorio' : 'Estudio'}
                      </Badge>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1" title={file.title}>
                      {file.title}
                    </h4>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{file.createdAt ? format(parseISO(file.createdAt), "dd 'de' MMMM, yyyy", { locale: es }) : 'Fecha no disp.'}</span>
                    </div>

                    {file.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-md border text-[11px]">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-3 pt-0 border-t bg-slate-50/50 flex items-center justify-end gap-2">
                  {file.url ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs gap-1"
                        onClick={() => setPreviewFile(file)}
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1"
                        onClick={() => window.open(file.url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 w-full"
                      onClick={() => setPreviewFile(file)}
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver Informe Completo
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Vista Previa */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              {previewFile?.title}
            </DialogTitle>
          </DialogHeader>

          {previewFile && (
            <div className="space-y-4 pt-2">
              {previewFile.description && (
                <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200">
                  <h4 className="text-xs font-bold text-teal-900 uppercase mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    Informe y Conclusiones del Laboratorio
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewFile.description}
                  </p>
                </div>
              )}

              {previewFile.url && (
                <div className="border rounded-xl p-2 bg-slate-100 flex flex-col items-center">
                  {previewFile.url.toLowerCase().endsWith('.pdf') ? (
                    <div className="py-8 text-center">
                      <FileText className="h-16 w-16 text-red-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold">Documento de Resultados (PDF)</p>
                      <Button
                        size="sm"
                        className="mt-3 bg-red-600 hover:bg-red-700 text-white gap-2"
                        onClick={() => window.open(previewFile.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" /> Abrir en pantalla completa
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full text-center">
                      <img
                        src={previewFile.url}
                        alt={previewFile.title}
                        className="max-h-[60vh] object-contain mx-auto rounded shadow-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 mt-2"
                        onClick={() => window.open(previewFile.url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir archivo original
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

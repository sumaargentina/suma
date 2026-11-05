"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { uploadPublicImage } from '@/lib/supabaseService';
import { compressImageToWebP } from '@/lib/image-compression';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  Upload,
  Plus,
  Stethoscope,
  Sparkles,
  Trash2
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
  fileSize?: number;
  category: 'lab_result' | 'imaging' | 'prescription' | 'before_after_photo' | 'general';
  description?: string;
  createdAt: string;
  source: string;
  uploaderName?: string;
  uploaderRole?: 'doctor' | 'laboratory' | 'clinic' | 'patient';
  laboratoryName?: string;
  doctorName?: string;
  orderNumber?: string;
}

export function PatientFilesGallery({ patientId }: PatientFilesGalleryProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  // Modal de subida de archivo (por Médico, Clínica o Laboratorio)
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ originalKB: number; compressedKB: number; ratio: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fileTitle, setFileTitle] = useState('');
  const [fileCategory, setFileCategory] = useState<'lab_result' | 'imaging' | 'prescription' | 'before_after_photo' | 'general'>('lab_result');
  const [fileDescription, setFileDescription] = useState('');

  const loadFiles = useCallback(async () => {
    if (!patientId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/patient-files?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data.files) ? data.files : []);
      }
    } catch (err) {
      console.error('Error cargando archivos del paciente:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleOpenUploadModal = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCompressionInfo(null);
    setFileTitle('');
    setFileCategory(user?.role === 'laboratory' ? 'lab_result' : 'lab_result');
    setFileDescription('');
    setIsUploadOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    // Autocompletar título si está vacío
    if (!fileTitle.trim()) {
      const cleanName = rawFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setFileTitle(cleanName);
    }

    // Si es imagen, comprimir automáticamente a formato WebP (.webp)
    if (rawFile.type.startsWith('image/') || rawFile.name.match(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)$/i)) {
      try {
        setIsCompressing(true);
        const compressed = await compressImageToWebP(rawFile, {
          maxWidth: 1800,
          maxHeight: 1800,
          quality: 0.86,
          maxInputSizeMB: 25
        });
        setSelectedFile(compressed.file);
        setFilePreviewUrl(compressed.dataUrl);
        setCompressionInfo({
          originalKB: Math.round(compressed.originalSize / 1024),
          compressedKB: Math.round(compressed.compressedSize / 1024),
          ratio: compressed.compressionRatio
        });
      } catch (err: any) {
        console.warn('Error comprimiendo a WebP, usando archivo original:', err);
        setSelectedFile(rawFile);
        setFilePreviewUrl(URL.createObjectURL(rawFile));
        setCompressionInfo(null);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // PDFs u otros documentos se suben directamente sin compresión de imagen
      setSelectedFile(rawFile);
      setFilePreviewUrl(null);
      setCompressionInfo(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        variant: 'destructive',
        title: 'Archivo requerido',
        description: 'Selecciona un archivo PDF o una imagen para subir a la historia del paciente.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const uploadedUrl = await uploadPublicImage(selectedFile, 'profile-images', `patient-files/${patientId}`);

      const res = await fetch('/api/patient-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          uploaderId: user?.laboratoryId || user?.clinicId || user?.id || patientId,
          uploaderName: user?.name || 'Profesional SUMA',
          uploaderRole: user?.role === 'laboratory' ? 'laboratory' : user?.role === 'clinic' ? 'clinic' : 'doctor',
          fileName: fileTitle.trim() || selectedFile.name,
          fileUrl: uploadedUrl,
          fileType: selectedFile.type || (uploadedUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/webp'),
          fileSize: selectedFile.size,
          category: fileCategory,
          description: fileDescription.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo registrar el archivo.');
      }

      toast({
        title: '✅ Archivo subido a la historia',
        description: selectedFile.type === 'image/webp'
          ? 'La imagen fue optimizada en formato WebP y guardada en la historia del paciente.'
          : 'El documento fue guardado exitosamente en la historia del paciente.'
      });

      setIsUploadOpen(false);
      await loadFiles();
    } catch (err: any) {
      console.error('Error subiendo archivo del paciente:', err);
      toast({
        variant: 'destructive',
        title: 'Error al subir archivo',
        description: err.message || 'Ocurrió un problema al subir el archivo.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const res = await fetch(`/api/patient-files?id=${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Archivo eliminado', description: 'Se quitó el archivo de la galería.' });
        setFiles(prev => prev.filter(f => f.id !== fileId));
        if (previewFile?.id === fileId) setPreviewFile(null);
      }
    } catch (err) {
      console.error('Error eliminando archivo:', err);
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
        <span className="text-sm">Cargando galería de estudios y archivos del paciente...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior: Filtros de Categoría + Botón de Subir Archivo */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b">
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
            Imágenes / Estudios ({files.filter(f => f.category === 'imaging').length})
          </Button>
          <Button
            size="sm"
            variant={selectedCategory === 'general' ? 'default' : 'outline'}
            className="text-xs h-8 gap-1.5"
            onClick={() => setSelectedCategory('general')}
          >
            <FileText className="h-3.5 w-3.5 text-slate-600" />
            Otros Documentos ({files.filter(f => f.category !== 'lab_result' && f.category !== 'imaging').length})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleOpenUploadModal}
            className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 gap-1.5 font-semibold shadow-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Subir Archivo / Resultado
          </Button>
        </div>
      </div>

      {/* Lista de Archivos */}
      {filteredFiles.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-xl bg-slate-50/50 space-y-3">
          <FolderOpen className="h-12 w-12 mx-auto text-slate-300" />
          <div>
            <h3 className="text-base font-semibold text-slate-700">Sin archivos o resultados en esta categoría</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Aquí aparecen automáticamente los archivos y resultados subidos por los <strong>Laboratorios Aliados</strong> o los estudios adjuntados directamente por el <strong>Médico</strong> (imágenes en formato WebP y documentos PDF).
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenUploadModal}
            className="border-teal-300 text-teal-800 hover:bg-teal-50 gap-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Adjuntar Primer Archivo o Estudio
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const isLab = file.category === 'lab_result' || file.uploaderRole === 'laboratory';
            const isPdf = file.url.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
            const isWebp = file.url.toLowerCase().endsWith('.webp') || file.type === 'image/webp';

            return (
              <Card key={file.id} className="overflow-hidden border hover:shadow-md transition-shadow flex flex-col justify-between bg-white">
                <div>
                  {/* Vista previa o icono */}
                  <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden border-b">
                    {file.url && !isPdf ? (
                      <img
                        src={file.url}
                        alt={file.title}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewFile(file)}
                      />
                    ) : isPdf ? (
                      <div 
                        className="flex flex-col items-center justify-center p-4 cursor-pointer text-center hover:bg-slate-200/60 w-full h-full transition-colors"
                        onClick={() => setPreviewFile(file)}
                      >
                        <FileText className="h-14 w-14 text-red-500 mb-1.5" />
                        <span className="text-xs font-semibold text-slate-800">Documento PDF</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Clic para previsualizar o abrir</span>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col items-center justify-center p-4 text-center cursor-pointer w-full h-full"
                        onClick={() => setPreviewFile(file)}
                      >
                        <FlaskConical className="h-12 w-12 text-teal-600 mb-1" />
                        <span className="text-xs text-slate-600 font-medium">Informe de Resultados</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      <Badge className={isLab ? 'bg-teal-600 text-white font-semibold text-[10px]' : 'bg-blue-600 text-white text-[10px]'}>
                        {isLab ? '🔬 Laboratorio' : file.category === 'imaging' ? '🖼️ Imagen / Estudio' : '📄 Archivo Médico'}
                      </Badge>
                      {isWebp && (
                        <Badge variant="outline" className="bg-slate-900/80 text-white border-0 text-[9px] font-mono">
                          WebP
                        </Badge>
                      )}
                      {isPdf && (
                        <Badge variant="outline" className="bg-red-600 text-white border-0 text-[9px] font-mono">
                          PDF
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="p-4 space-y-2">
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-1" title={file.title}>
                      {file.title}
                    </h4>

                    {/* Origen del archivo: Laboratorio o Doctor */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      {file.uploaderRole === 'laboratory' || file.laboratoryName ? (
                        <span className="inline-flex items-center gap-1 text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md font-semibold">
                          <FlaskConical className="h-3 w-3 text-teal-600" />
                          {file.laboratoryName || file.uploaderName || 'Laboratorio Aliado'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-semibold">
                          <Stethoscope className="h-3 w-3 text-blue-600" />
                          {file.uploaderName || file.doctorName || 'Médico Tratante'}
                        </span>
                      )}
                      {file.orderNumber && (
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                          {file.orderNumber}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{file.createdAt ? format(parseISO(file.createdAt), "dd 'de' MMMM, yyyy", { locale: es }) : 'Fecha no disp.'}</span>
                    </div>

                    {file.description && (
                      <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded-md border text-[11px] whitespace-pre-wrap">
                        {file.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-3 pt-2 border-t bg-slate-50/50 flex items-center justify-between gap-2">
                  {file.source !== 'laboratory' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleDeleteFile(file.id)}
                      title="Eliminar archivo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
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
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL PARA SUBIR ARCHIVO / ESTUDIO (DOCTOR, CLÍNICA O LABORATORIO) */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-950">
              <Upload className="h-5 w-5 text-teal-600" />
              Subir Archivo o Resultado a la Historia del Paciente
            </DialogTitle>
            <DialogDescription>
              Puedes adjuntar documentos <strong>PDF</strong> o <strong>Imágenes</strong> (las imágenes se comprimen automáticamente en formato <strong>WebP</strong> de alta nitidez).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Selector de Archivo */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-800">
                Seleccionar Archivo (Imagen JPG/PNG/WebP o PDF) *
              </Label>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-teal-400 transition-colors bg-slate-50/50">
                <Input
                  type="file"
                  accept="image/*,application/pdf,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  id="patient-history-file-upload"
                />
                <label
                  htmlFor="patient-history-file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                      <span className="text-xs font-semibold text-teal-800">
                        Comprimiendo imagen a formato WebP...
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-teal-600" />
                      <span className="text-xs font-semibold text-slate-700">
                        {selectedFile ? selectedFile.name : 'Haz clic para seleccionar un PDF o imagen'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Las imágenes se convierten automáticamente a .webp optimizado
                      </span>
                    </>
                  )}
                </label>
              </div>

              {compressionInfo && (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-lg text-xs">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Optimizado a WebP ({compressionInfo.originalKB} KB ➔ {compressionInfo.compressedKB} KB)
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[10px]">
                    -{compressionInfo.ratio}% peso
                  </Badge>
                </div>
              )}

              {filePreviewUrl && (
                <div className="mt-2 relative rounded-lg border p-2 bg-slate-100 max-h-48 overflow-hidden flex justify-center">
                  <img src={filePreviewUrl} alt="Vista previa WebP" className="max-h-44 object-contain rounded" />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Título del Estudio / Archivo *</Label>
                <Input
                  placeholder="Ej: Hematología Completa / Rayos X"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800">Categoría</Label>
                <Select value={fileCategory} onValueChange={(v: any) => setFileCategory(v)}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab_result">🔬 Resultado de Laboratorio</SelectItem>
                    <SelectItem value="imaging">🖼️ Imagen Diagnóstica / Eco / Rx</SelectItem>
                    <SelectItem value="prescription">💊 Informe / Récipe Externo</SelectItem>
                    <SelectItem value="before_after_photo">📸 Foto Clínica / Evolución</SelectItem>
                    <SelectItem value="general">📄 Documento General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Observaciones / Notas del Estudio (Opcional)
              </Label>
              <Textarea
                rows={3}
                placeholder="Agrega valores clave, hallazgos o comentarios clínicos sobre este archivo..."
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isCompressing || !selectedFile}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5 font-semibold"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Guardar en Historia del Paciente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border">
                <span>
                  <strong>Subido por:</strong> {previewFile.laboratoryName || previewFile.uploaderName || 'Sistema SUMA'}
                </span>
                {previewFile.createdAt && (
                  <span>
                    {format(parseISO(previewFile.createdAt), "dd/MM/yyyy hh:mm a")}
                  </span>
                )}
              </div>

              {previewFile.description && (
                <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200">
                  <h4 className="text-xs font-bold text-teal-900 uppercase mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    Informe y Observaciones
                  </h4>
                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {previewFile.description}
                  </p>
                </div>
              )}

              {previewFile.url && (
                <div className="border rounded-xl p-2 bg-slate-100 flex flex-col items-center">
                  {previewFile.url.toLowerCase().endsWith('.pdf') || previewFile.type === 'application/pdf' ? (
                    <div className="w-full space-y-3">
                      <iframe
                        src={previewFile.url}
                        title={previewFile.title}
                        className="w-full h-[60vh] rounded-lg border bg-white"
                      />
                      <div className="flex justify-center gap-2 pb-1">
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white gap-2 text-xs"
                          onClick={() => window.open(previewFile.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" /> Abrir PDF en pestaña nueva
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full text-center">
                      <img
                        src={previewFile.url}
                        alt={previewFile.title}
                        className="max-h-[65vh] object-contain mx-auto rounded shadow-xs"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs gap-1.5 mt-2 bg-white"
                        onClick={() => window.open(previewFile.url, '_blank')}
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir imagen original
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

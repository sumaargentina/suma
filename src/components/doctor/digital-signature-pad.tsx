"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser, Check, Upload, Trash2, PenTool, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface DigitalSignaturePadProps {
  initialSignature?: string | null;
  onSaveSignature: (signatureDataUrl: string) => Promise<void>;
  onDeleteSignature?: () => Promise<void>;
}

export function DigitalSignaturePad({
  initialSignature,
  onSaveSignature,
  onDeleteSignature,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModeEditing, setIsModeEditing] = useState(!initialSignature);
  const [currentSignature, setCurrentSignature] = useState<string | null>(initialSignature || null);

  useEffect(() => {
    setCurrentSignature(initialSignature || null);
    if (!initialSignature) {
      setIsModeEditing(true);
    }
  }, [initialSignature]);

  // Canvas setup with High DPI resolution
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = (rect.width || 480) * dpr;
    canvas.height = (rect.height || 180) * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#1e3a8a'; // Color tinta médica azul oscura profesional
  }, []);

  useEffect(() => {
    if (isModeEditing) {
      // Small timeout to ensure DOM rect is calculated properly
      const timer = setTimeout(() => {
        initCanvas();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModeEditing, initCanvas]);

  // Touch drawing handlers with non-passive event listeners
  useEffect(() => {
    if (!isModeEditing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let drawing = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.beginPath();
      ctx.moveTo(x, y);
      drawing = true;
      setIsDrawing(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!drawing) return;
      if (e.cancelable) e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.lineTo(x, y);
      ctx.stroke();
      setHasDrawn(true);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      drawing = false;
      setIsDrawing(false);
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.closePath();
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isModeEditing]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.closePath();
    }
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    initCanvas();
    setHasDrawn(false);
  };

  const handleSaveFromCanvas = async () => {
    if (!hasDrawn) {
      toast({
        variant: 'destructive',
        title: 'Firma vacía',
        description: 'Por favor dibuja tu firma en la pizarra antes de guardar.',
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      setIsSaving(true);
      const dataUrl = canvas.toDataURL('image/png');
      await onSaveSignature(dataUrl);
      setCurrentSignature(dataUrl);
      setIsModeEditing(false);
      setHasDrawn(false);
      toast({
        title: 'Firma guardada',
        description: 'Tu firma digital se ha actualizado y se estampará en los récipes médicos.',
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la firma digital.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Formato no soportado',
        description: 'Por favor sube una imagen válida (PNG o JPG).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        try {
          setIsSaving(true);
          await onSaveSignature(reader.result);
          setCurrentSignature(reader.result);
          setIsModeEditing(false);
          toast({
            title: 'Firma cargada con éxito',
            description: 'Tu firma ha sido guardada para tus récipes médicos.',
          });
        } catch (err) {
          console.error(err);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo procesar la imagen de firma.',
          });
        } finally {
          setIsSaving(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    if (onDeleteSignature) {
      try {
        setIsSaving(true);
        await onDeleteSignature();
        setCurrentSignature(null);
        setIsModeEditing(true);
        handleClear();
        toast({
          title: 'Firma eliminada',
          description: 'Se ha removido tu firma digital.',
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      {!isModeEditing && currentSignature ? (
        <div className="border rounded-xl p-4 bg-slate-50/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-44 h-20 bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-center shadow-xs">
              <img
                src={currentSignature}
                alt="Firma Digital"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Check className="h-4 w-4 text-emerald-600" /> Firma Digital Activa
              </p>
              <p className="text-xs text-slate-500 max-w-xs mt-0.5">
                Esta firma se estampará automáticamente en los récipes e informes que emitas a tus pacientes.
              </p>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModeEditing(true);
                handleClear();
              }}
              disabled={isSaving}
            >
              <PenTool className="h-4 w-4 mr-1.5 text-primary" />
              Cambiar Firma
            </Button>
            {onDeleteSignature && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={isSaving}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-teal-200/80 bg-teal-50/30 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <PenTool className="h-4 w-4 text-teal-600" />
                Pizarra de Firma Digitalizada
              </p>
              <p className="text-xs text-muted-foreground">
                Firma directamente con tu dedo en el celular/tablet o con el mouse.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isSaving}
                />
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-100/70 hover:bg-teal-200/70 px-2.5 py-1.5 rounded-md transition-colors">
                  <Upload className="h-3.5 w-3.5" /> Subir Imagen PNG
                </span>
              </label>
            </div>
          </div>

          {/* Drawing Canvas */}
          <div className="relative bg-white border-2 border-dashed border-teal-300 rounded-lg overflow-hidden touch-none shadow-inner">
            <canvas
              ref={canvasRef}
              className="w-full h-36 md:h-44 cursor-crosshair block touch-none select-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            {!hasDrawn && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
                <PenTool className="h-6 w-6 mb-1 opacity-40 animate-pulse" />
                <span className="text-xs font-medium opacity-60">Dibuja tu firma aquí</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasDrawn || isSaving}
              className="text-xs"
            >
              <Eraser className="h-3.5 w-3.5 mr-1" /> Limpiar
            </Button>

            <div className="flex gap-2">
              {currentSignature && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModeEditing(false)}
                  disabled={isSaving}
                  className="text-xs"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                onClick={handleSaveFromCanvas}
                disabled={!hasDrawn || isSaving}
                className="text-xs bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" /> Guardar Firma
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCw, Check, X, Crop as CropIcon } from 'lucide-react';
import { getCroppedImgWebP, PixelCrop } from '@/lib/image-compression';

export interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string | null;
  cropShape?: 'round' | 'rect';
  aspectRatio?: number; // 1 for avatar (1:1), 16/9 for banner, 3/1 for banner, etc.
  title?: string;
  description?: string;
  originalFileName?: string;
  onCropComplete: (result: { file: File; dataUrl: string }) => void | Promise<void>;
}

export function ImageCropModal({
  isOpen,
  onClose,
  imageSrc,
  cropShape = 'round',
  aspectRatio = 1,
  title = 'Ajustar y Encuadrar Imagen',
  description = 'Arrastra para mover la imagen y usa el zoom para encuadrar la zona deseada.',
  originalFileName = 'foto-perfil',
  onCropComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onCropCompleteHandler = useCallback((_croppedArea: any, croppedPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const cropped = await getCroppedImgWebP(
        imageSrc,
        croppedAreaPixels,
        originalFileName,
        rotation,
        0.86
      );

      await onCropComplete(cropped);
      onClose();
    } catch (error) {
      console.error('Error al recortar imagen:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl w-[95vw] p-0 overflow-hidden bg-slate-950 text-slate-100 border-slate-800">
        <DialogHeader className="p-4 md:p-6 pb-2">
          <div className="flex items-center gap-2 text-primary">
            <CropIcon className="w-5 h-5 text-emerald-400" />
            <DialogTitle className="text-base md:text-lg font-semibold text-slate-100">
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs md:text-sm text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Cropper Container */}
        <div className="relative w-full h-72 sm:h-80 md:h-96 bg-slate-900 overflow-hidden select-none">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              cropShape={cropShape}
              showGrid={true}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteHandler}
              onZoomChange={setZoom}
              classes={{
                containerClassName: 'relative w-full h-full',
                cropAreaClassName: cropShape === 'round' ? 'border-2 border-emerald-400 shadow-2xl' : 'border-2 border-emerald-400 shadow-2xl',
              }}
            />
          )}
        </div>

        {/* Controls Bar */}
        <div className="px-4 py-3 bg-slate-900/80 border-t border-slate-800/80 space-y-3">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={(val) => setZoom(val[0])}
              className="flex-1 cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-xs font-mono text-slate-300 w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>

            {/* Rotate Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRotate}
              title="Rotar 90°"
              className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-row items-center justify-between sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-900"
          >
            <X className="w-4 h-4 mr-1.5" />
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleApplyCrop}
            disabled={isProcessing}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md transition-all"
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Optimizando WebP...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Aplicar Recorte
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

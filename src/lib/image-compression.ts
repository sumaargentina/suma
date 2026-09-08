/**
 * Utility for client-side image compression and conversion to WebP format.
 * Reduces file sizes by 80-95% while maintaining crisp quality for avatars and banners.
 */

export interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0 (default: 0.82)
  maxInputSizeMB?: number; // Maximum allowed raw file size in MB (default: 20MB)
}

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage reduced
}

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compresses an image and converts it into the WebP format.
 */
export async function compressImageToWebP(
  file: File,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82,
    maxInputSizeMB = 20,
  } = options;

  if (!file) {
    throw new Error('No se proporcionó ningún archivo de imagen.');
  }

  // Validate that it is an image
  if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|gif|heic|bmp|tiff)$/i)) {
    throw new Error(`El archivo seleccionado (${file.name}) no es una imagen válida.`);
  }

  // Check against maximum allowed input size
  const maxBytes = maxInputSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `La imagen es demasiado pesada (${(file.size / 1024 / 1024).toFixed(1)}MB). El tamaño máximo permitido es ${maxInputSizeMB}MB.`
    );
  }

  // Server-side fallback check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      dataUrl: '',
      originalSize: file.size,
      compressedSize: file.size,
      compressionRatio: 0,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));

    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        return reject(new Error('No se pudo leer el contenido de la imagen.'));
      }

      const img = document.createElement('img');

      img.onerror = () => reject(new Error('El archivo de imagen está dañado o no se puede decodificar.'));

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // Calculate new dimensions preserving aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            return reject(new Error('No se pudo inicializar el contexto 2D del canvas.'));
          }

          // Draw image
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Get dataUrl as WebP
          let dataUrl = canvas.toDataURL('image/webp', quality);
          let mimeType = 'image/webp';

          // Fallback if browser didn't encode as WebP
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
            mimeType = 'image/jpeg';
          }

          // Convert canvas to Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('Error al generar el archivo WebP comprimido.'));
              }

              // Create new File with .webp extension
              const baseName = file.name.replace(/\.[^/.]+$/, '');
              const newFileName = `${baseName}.webp`;
              const webpFile = new File([blob], newFileName, {
                type: mimeType,
                lastModified: Date.now(),
              });

              const originalSize = file.size;
              const compressedSize = webpFile.size;
              const compressionRatio = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

              console.log(`🖼️ Imagen convertida a WebP: ${file.name} (${(originalSize / 1024).toFixed(1)}KB) ➔ ${newFileName} (${(compressedSize / 1024).toFixed(1)}KB) [-${compressionRatio}%]`);

              resolve({
                file: webpFile,
                dataUrl,
                originalSize,
                compressedSize,
                compressionRatio,
              });
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}

export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });
}

function calculateRotatedBox(width: number, height: number, rotation: number) {
  const rad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
}

/**
 * Returns the cropped image canvas blob & dataURL encoded as WebP
 */
export async function getCroppedImgWebP(
  imageSrc: string,
  pixelCrop: PixelCrop,
  fileName: string = 'cropped-image',
  rotation: number = 0,
  quality: number = 0.86
): Promise<{ file: File; dataUrl: string; width: number; height: number; size: number }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('No se pudo obtener el contexto 2D del canvas.');
  }

  const rotRad = (rotation * Math.PI) / 180;

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = calculateRotatedBox(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    rotation
  );

  // Set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Translate canvas center to image center and rotate
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-(image.naturalWidth || image.width) / 2, -(image.naturalHeight || image.height) / 2);

  // Draw rotated image
  ctx.drawImage(image, 0, 0);

  // Extract the cropped canvas
  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) {
    throw new Error('No se pudo obtener el contexto de recorte.');
  }

  croppedCanvas.width = Math.round(pixelCrop.width);
  croppedCanvas.height = Math.round(pixelCrop.height);

  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';
  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    let dataUrl = croppedCanvas.toDataURL('image/webp', quality);
    let mimeType = 'image/webp';
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = croppedCanvas.toDataURL('image/jpeg', quality);
      mimeType = 'image/jpeg';
    }

    croppedCanvas.toBlob(
      (blob) => {
        if (!blob) {
          return reject(new Error('Error al generar el recorte WebP.'));
        }
        const baseName = fileName.replace(/\.[^/.]+$/, '');
        const file = new File([blob], `${baseName}.webp`, {
          type: mimeType,
          lastModified: Date.now(),
        });

        resolve({
          file,
          dataUrl,
          width: pixelCrop.width,
          height: pixelCrop.height,
          size: file.size,
        });
      },
      mimeType,
      quality
    );
  });
}

"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Smartphone,
  Download,
  X,
  Share,
  PlusSquare,
  Sparkles,
  Check,
  ArrowDown
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // 1. Si ya se ejecuta en modo standalone/instalado, no mostrar
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Verificar descarte reciente (recordar descarte por 3 días)
    const dismissedUntil = localStorage.getItem('suma_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return;
    }

    // 3. Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // 4. Capturar evento beforeinstallprompt (Android / Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Si es móvil y no hay evento nativo inmediato, mostrar banner amigable tras 2 segundos
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(userAgent);
    const timer = setTimeout(() => {
      if (isMobile && !isStandalone) {
        setShowBanner(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowBanner(false);
          setDeferredPrompt(null);
        }
      } catch (error) {
        console.error('Error al solicitar instalación PWA:', error);
      } finally {
        setIsInstalling(false);
      }
    } else {
      // Mostrar modal instructivo adaptado (iOS o Android general)
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Descartar por 3 días
    const threeDays = Date.now() + 3 * 24 * 60 * 60 * 1000;
    localStorage.setItem('suma_pwa_dismissed_until', String(threeDays));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Banner flotante optimizado para no obstruir el BottomNav en móviles */}
      <aside aria-label="Instalar aplicación" className="fixed bottom-20 md:bottom-5 left-3 right-3 md:left-auto md:right-5 z-40 max-w-sm ml-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="bg-background/95 backdrop-blur-md border border-primary/20 shadow-xl rounded-2xl p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-blue-500 flex items-center justify-center text-white shadow-md shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs text-foreground tracking-tight">Instalar SUMA App</span>
                <span className="bg-emerald-500/15 text-emerald-600 text-[9px] font-bold px-1.5 py-0.2 rounded-full">Rápida</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">Carga más rápido y sin barras de navegador</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="h-8 text-xs px-3 shadow-sm rounded-xl font-medium"
            >
              {isInstalling ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Instalar
                </>
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleDismiss}
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-full"
              title="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Modal Guía para iOS Safari o navegadores sin prompt automático */}
      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Smartphone className="w-6 h-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Instala SUMA en tu Teléfono
            </DialogTitle>
            <DialogDescription className="text-center text-xs">
              Sigue estos sencillos pasos para tener SUMA como una app nativa en tu pantalla de inicio:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {isIos ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Toca el botón Compartir</p>
                    <p className="text-muted-foreground mt-0.5">En la barra inferior de Safari, pulsa el icono de compartir <Share className="inline w-3.5 h-3.5 text-primary mx-1" />.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Selecciona "Agregar a pantalla de inicio"</p>
                    <p className="text-muted-foreground mt-0.5">Desliza hacia abajo en el menú y selecciona <PlusSquare className="inline w-3.5 h-3.5 text-primary mx-1" /> <strong>Agregar a pantalla de inicio</strong>.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Confirma en "Agregar"</p>
                    <p className="text-muted-foreground mt-0.5">Toca el botón <strong>Agregar</strong> en la esquina superior derecha. ¡Listo!</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Abre el menú del navegador</p>
                    <p className="text-muted-foreground mt-0.5">Toca los tres puntos verticales (⋮) en la esquina superior derecha de tu navegador.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-muted/60 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Selecciona "Instalar aplicación"</p>
                    <p className="text-muted-foreground mt-0.5">Pulsa en <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla principal</strong>.</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={() => setShowIosGuide(false)} className="w-full text-xs rounded-xl">
              <Check className="w-4 h-4 mr-1.5" /> Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
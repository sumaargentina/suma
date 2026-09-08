"use client";

import { useEffect } from 'react';

/**
 * PwaRegistry registra el Service Worker en el cliente de manera segura y transparente.
 * Garantiza que la PWA funcione sin conexión y sea instalable en Android e iOS.
 */
export function PwaRegistry() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      // Registrar el Service Worker generado en /sw.js
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });

          // Verificar si hay una actualización pendiente
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 SUMA PWA: Nueva versión disponible.');
                }
              });
            }
          });

          console.log('✅ SUMA PWA: Service Worker activo con alcance:', registration.scope);
        } catch (error) {
          console.warn('⚠️ SUMA PWA: No se pudo registrar el Service Worker:', error);
        }
      };

      // Esperar a que la página cargue completamente para no bloquear métricas LCP
      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}

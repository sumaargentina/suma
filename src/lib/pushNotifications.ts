// import { getMessaging, getToken, onMessage } from 'firebase/messaging';
// import { app } from './supabase';

// Inicializar Firebase Messaging solo en el cliente
// let messaging: ReturnType<typeof getMessaging> | null = null;

// if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
//   try {
//     messaging = getMessaging(app);
//   } catch (error) {
//     console.warn('Firebase Messaging no disponible:', error);
//   }
// }

// Tipos de notificación
export type NotificationType =
  | 'appointment_reminder'
  | 'message'
  | 'system'
  | 'background';

export interface PushNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  timestamp: Date;
  read: boolean;
  userId: string;
}

// Solicitar permisos y obtener token
export async function requestNotificationPermission(): Promise<string | null> {
  console.log('🔔 Notificaciones Push desactivadas temporalmente (Migración a Supabase)');
  return null;
  /*
  if (typeof window === 'undefined' || !messaging) {
    console.warn('Firebase Messaging no disponible en este entorno');
    return null;
  }

  try {
    console.log('🔔 Solicitando permisos de notificación...');
    
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos');
      
      // Obtener token FCM
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      console.log('🎯 Token FCM obtenido:', token);
      return token;
    } else {
      console.log('❌ Permisos de notificación denegados');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al solicitar permisos:', error);
    return null;
  }
  */
}

// Escuchar notificaciones en primer plano
export function onForegroundMessage(callback: (payload: unknown) => void) {
  console.log('🔔 Notificaciones Push desactivadas temporalmente');
  return () => { };
  /*
  if (typeof window === 'undefined' || !messaging) {
    console.warn('Firebase Messaging no disponible en este entorno');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('📱 Notificación recibida en primer plano:', payload);
    
    // Mostrar notificación nativa
    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.notification?.title || 'Nueva notificación', {
        body: payload.notification?.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: payload.data?.type || 'default',
        data: payload.data
      });
      
      // Manejar clic en notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Ejecutar callback con los datos
        callback(payload);
      };
    }
    
    // Ejecutar callback
    callback(payload);
  });
  */
}

// Enviar notificación push (desde el servidor)
export async function sendPushNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  console.log('📤 (Simulado) Enviando notificación push:', { userId, type, title, body });
  return true;
  /*
  try {
    console.log('📤 Enviando notificación push:', { userId, type, title, body });
    
    const response = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        type,
        title,
        body,
        data
      }),
    });
    
    if (response.ok) {
      console.log('✅ Notificación enviada exitosamente');
      return true;
    } else {
      console.error('❌ Error al enviar notificación:', response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Error al enviar notificación:', error);
    return false;
  }
  */
}

// Verificar si las notificaciones están habilitadas
export function isNotificationSupported(): boolean {
  return false; // Desactivado temporalmente
  // return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}

// Verificar si los permisos están concedidos
export function hasNotificationPermission(): boolean {
  return false; // Desactivado temporalmente
  // return typeof window !== 'undefined' && Notification.permission === 'granted';
}
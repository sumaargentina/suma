
import type { Metadata, Viewport } from "next";
import { PT_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";
import { AppointmentProvider } from "@/lib/appointments";
import { NotificationProvider } from "@/lib/notifications";
import { DoctorNotificationProvider } from "@/lib/doctor-notifications";
import { SellerNotificationProvider } from "@/lib/seller-notifications";
import { AdminNotificationProvider } from "@/lib/admin-notifications";
import { ChatNotificationProvider } from "@/lib/chat-notifications";
import { ClinicNotificationProvider } from "@/lib/clinic-notifications";
import { SettingsProvider } from "@/lib/settings";
import { RealtimeNotifications } from "@/components/realtime-notifications";
import "./globals.css";

// Configuración optimizada de fuentes con next/font
const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-pt-sans',
});

export const metadata: Metadata = {
  title: "SUMA",
  description: "Sistema Unificado de Medicina Avanzada",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-128x128.png", sizes: "128x128", type: "image/png" },
      { url: "/icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-168x168.png", sizes: "168x168", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-384x384.png", sizes: "384x384", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SUMA",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className={ptSans.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SUMA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <AuthProvider>
          <AppointmentProvider>
            <NotificationProvider>
              <DoctorNotificationProvider>
                <ClinicNotificationProvider>
                  <SellerNotificationProvider>
                    <AdminNotificationProvider>
                      <ChatNotificationProvider>
                        <SettingsProvider>
                          {children}
                          <RealtimeNotifications />
                          <Toaster />
                        </SettingsProvider>
                      </ChatNotificationProvider>
                    </AdminNotificationProvider>
                  </SellerNotificationProvider>
                </ClinicNotificationProvider>
              </DoctorNotificationProvider>
            </NotificationProvider>
          </AppointmentProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

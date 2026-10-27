"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Store,
  FileCheck2,
  Handshake,
  Sparkles,
  FileSpreadsheet,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";

export default function PharmacyLandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white py-20 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex items-center justify-between mb-10">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-teal-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Volver al Portal Inicial
            </Link>
            <Link href="/" className="bg-white px-4 py-2 rounded-2xl shadow-md flex items-center">
              <Image
                src="/images/logo_suma.png"
                alt="SUMA Logo"
                width={150}
                height={52}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <Badge className="bg-teal-500/20 text-teal-200 border border-teal-400/30 mb-4 px-3.5 py-1 text-xs uppercase tracking-wider">
              Red Nacional de Farmacias Aliadas SUMA
            </Badge>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
              Conecta tu <span className="text-teal-400">Farmacia</span> con los Récipes y Médicos de tu Ciudad
            </h1>
            <p className="text-lg md:text-xl text-teal-100/90 max-w-2xl mx-auto mb-10">
              Regístrate gratis para recibir y validar récipes médicos digitales con solo ingresar la cédula del paciente y formar parte del directorio oficial SUMA.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-10 text-lg h-14 rounded-full shadow-xl"
                asChild
              >
                <Link href="/auth/register-pharmacy?plan=free">
                  Solicitar Cuenta Gratuita
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">
              ¿Cómo potencia SUMA las ventas de tu Farmacia?
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Desde la dispensación rápida por cédula en tu cuenta gratuita hasta funciones avanzadas del Plan Pro Alianza B2B disponibles dentro de tu portal una vez inicies sesión.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileCheck2 className="h-9 w-9 text-teal-600" />}
              badge="Incluido en el Gratis"
              isPro={false}
              title="Visor de Récipes por Cédula"
              description="Ingresa la cédula del paciente en mostrador y visualiza al instante su récipe electrónico verificado con firma y sello del médico."
            />
            <FeatureCard
              icon={<Store className="h-9 w-9 text-blue-600" />}
              badge="Incluido en el Gratis"
              isPro={false}
              title="Presencia en Directorio SUMA"
              description="Los pacientes de tu ciudad pueden ubicar tu farmacia, dirección, horario de atención y contacto dentro del ecosistema SUMA."
            />
            <FeatureCard
              icon={<Handshake className="h-9 w-9 text-amber-600" />}
              badge="Plan Pro Alianza B2B"
              isPro={true}
              title="Match y Negociación con Médicos"
              description="Conecta con médicos de tu ciudad o a nivel nacional, acuerda patrocinios en chat privado y aparece como Farmacia Recomendada en sus récipes."
            />
            <FeatureCard
              icon={<FileSpreadsheet className="h-9 w-9 text-emerald-600" />}
              badge="Plan Pro Alianza B2B"
              isPro={true}
              title="Catálogo Excel + Imágenes WebP"
              description="Sube tus medicamentos disponibles o en promoción mediante archivo Excel o carga manual con fotografías ultralivianas en formato WebP."
            />
            <FeatureCard
              icon={<Sparkles className="h-9 w-9 text-purple-600" />}
              badge="Plan Pro Alianza B2B"
              isPro={true}
              title="Banners y Cupones en el Récipe"
              description="Cuando el paciente abre su récipe médico, ve el banner publicitario de tu farmacia, productos en oferta y cupones de descuento exclusivos."
            />
            <FeatureCard
              icon={<TrendingUp className="h-9 w-9 text-indigo-600" />}
              badge="Plan Pro Alianza B2B"
              isPro={true}
              title="Métricas de Conversión (ROI)"
              description="Mide cuántas veces se mostró tu farmacia en récipes, cuántos pacientes hicieron clic en tu tarjeta y cuántos pedidos recibiste por WhatsApp."
            />
          </div>
        </div>
      </section>

      {/* Free Account Call To Action */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2 border-teal-600 shadow-xl bg-white">
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-3">
                  <Badge className="bg-teal-600 text-white font-bold px-3 py-1">
                    Afiliación 100% Gratuita
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold text-slate-900">
                  Cuenta Gratuita para Farmacias
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Regístrate gratis y comienza a recibir pacientes de SUMA hoy mismo. Una vez inicies sesión en tu portal de farmacia, también podrás visualizar y solicitar el <strong>Plan Pro Alianza B2B</strong>.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-2 space-y-6">
                <ul className="space-y-3 text-sm max-w-lg mx-auto">
                  {[
                    "Consulta de récipes médicos digitales por Cédula del paciente",
                    "Verificación de firma y sello digital del médico tratante",
                    "Control de dispensación en mostrador en tiempo real",
                    "Presencia oficial en el directorio de farmacias de tu ciudad en SUMA",
                    "Creación y participación en Jornadas de Salud comunitarias o privadas",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <div className="bg-teal-100 rounded-full p-1 mt-0.5 shrink-0">
                        <Check className="h-3.5 w-3.5 text-teal-700" />
                      </div>
                      <span className="text-slate-700 font-medium">{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-2">
                  <Button
                    size="lg"
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 text-lg rounded-xl shadow-lg"
                    asChild
                  >
                    <Link href="/auth/register-pharmacy?plan=free">
                      Solicitar Cuenta Gratuita Ahora
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  badge,
  isPro,
  title,
  description,
}: {
  icon: React.ReactNode;
  badge: string;
  isPro?: boolean;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100 shrink-0">
            {icon}
          </div>
          <Badge
            variant="outline"
            className={`text-[11px] font-bold ${
              isPro
                ? "bg-amber-50 text-amber-900 border-amber-300"
                : "bg-teal-50 text-teal-800 border-teal-200"
            }`}
          >
            {badge}
          </Badge>
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

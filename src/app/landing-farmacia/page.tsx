"use client";

import { useState } from "react";
import Link from "next/link";
import { useSettings } from "@/lib/settings";
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
  Gift,
  Percent,
  Globe
} from "lucide-react";

export default function PharmacyLandingPage() {
  const { countries, getCountryPricing } = useSettings();
  const [selectedCountry, setSelectedCountry] = useState("VE");
  const pricing = getCountryPricing(selectedCountry);
  const b2bBasePrice = pricing.pharmacyB2BMonthlyFee;
  const priceInLocal = (b2bBasePrice * pricing.exchangeRate).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white py-20 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-teal-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Volver al Portal Inicial
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
              Regístrate gratis para recibir y validar récipes médicos digitales con solo ingresar la cédula del paciente, o activa el Plan Alianza Comercial B2B para que los médicos recomienden tu farmacia directamente en cada récipe.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-8 text-lg h-14 rounded-full shadow-xl"
                asChild
              >
                <Link href="/auth/register-pharmacy?plan=free">
                  Solicitar Cuenta Gratuita
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-teal-400/50 hover:bg-teal-900/60 px-8 text-lg h-14 rounded-full"
                asChild
              >
                <Link href="#planes">Ver Comparativa de Planes</Link>
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
              Desde la dispensación rápida por cédula hasta acuerdos comerciales directos con los médicos especialistas de tu ciudad.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileCheck2 className="h-9 w-9 text-teal-600" />}
              badge="Incluido Gratis"
              title="Visor de Récipes por Cédula"
              description="Ingresa la cédula del paciente en mostrador y visualiza al instante su récipe electrónico verificado con firma y sello del médico."
            />
            <FeatureCard
              icon={<Store className="h-9 w-9 text-blue-600" />}
              badge="Incluido Gratis"
              title="Presencia en Directorio SUMA"
              description="Los pacientes de tu ciudad pueden ubicar tu farmacia, dirección, horario de atención y contacto dentro del ecosistema SUMA."
            />
            <FeatureCard
              icon={<Handshake className="h-9 w-9 text-amber-600" />}
              badge="Plan Alianza B2B"
              title="Match y Negociación con Médicos"
              description="Conecta con médicos de tu ciudad o a nivel nacional, acuerda patrocinios en chat privado y aparece como Farmacia Recomendada en sus récipes."
            />
            <FeatureCard
              icon={<FileSpreadsheet className="h-9 w-9 text-emerald-600" />}
              badge="Plan Alianza B2B"
              title="Catálogo Excel + Imágenes WebP"
              description="Sube tus medicamentos disponibles o en promoción mediante archivo Excel o carga manual con fotografías ultralivianas en formato WebP."
            />
            <FeatureCard
              icon={<Sparkles className="h-9 w-9 text-purple-600" />}
              badge="Plan Alianza B2B"
              title="Banners y Cupones en el Récipe"
              description="Cuando el paciente abre su récipe médico, ve el banner publicitario de tu farmacia, productos en oferta y cupones de descuento exclusivos."
            />
            <FeatureCard
              icon={<TrendingUp className="h-9 w-9 text-indigo-600" />}
              badge="Plan Alianza B2B"
              title="Métricas de Conversión (ROI)"
              description="Mide cuántas veces se mostró tu farmacia en récipes, cuántos pacientes hicieron clic en tu tarjeta y cuántos pedidos recibiste por WhatsApp."
            />
          </div>
        </div>
      </section>

      {/* Two-Tier Pricing Comparison */}
      <section id="planes" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3 text-slate-900">
              Modalidades de Afiliación para Farmacias
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-6">
              El registro oficial en SUMA es totalmente gratuito. Si deseas impulsar tus ventas mediante recomendaciones médicas y catálogo promocional, activa el Plan Alianza B2B.
            </p>
            {countries.length > 0 && (
              <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 px-2">
                  <Globe className="h-3.5 w-3.5 text-teal-600" /> País:
                </span>
                {countries.filter((c) => c.isActive !== false).map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setSelectedCountry(c.code)}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                      selectedCountry === c.code
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {c.flag || "🏳️"} {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* PLAN GRATUITO */}
            <Card className="border-2 border-slate-200 shadow-lg flex flex-col justify-between bg-white">
              <div>
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-800 font-bold">
                      Afiliación Base
                    </Badge>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                      Sin costo mensual
                    </span>
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    Plan Dispensación & Directorio
                  </CardTitle>
                  <CardDescription className="text-base">
                    Ideal para todas las farmacias que desean recibir pacientes de SUMA y consultar récipes digitales por cédula.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">$0</span>
                      <span className="text-slate-500 font-medium">/ mes (100% Gratis)</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Previa verificación de los datos oficiales de la empresa por el Administrador.
                    </p>
                  </div>

                  <ul className="space-y-3.5 text-sm">
                    {[
                      "Consulta de récipes médicos digitales por Cédula del paciente",
                      "Verificación de firma y sello digital del médico tratante",
                      "Control de dispensación para evitar duplicidad de récipes",
                      "Presencia básica en el listado de farmacias de tu ciudad en SUMA",
                      "Ficha oficial con dirección, teléfono y horario de atención",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="bg-teal-100 rounded-full p-1 mt-0.5 shrink-0">
                          <Check className="h-3.5 w-3.5 text-teal-700" />
                        </div>
                        <span className="text-slate-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-0 mt-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-2 border-teal-600 text-teal-700 hover:bg-teal-50 font-bold h-12"
                  asChild
                >
                  <Link href="/auth/register-pharmacy?plan=free">
                    Solicitar Cuenta Gratuita
                  </Link>
                </Button>
              </div>
            </Card>

            {/* PLAN B2B ($200/MES A BCV) */}
            <Card className="border-2 border-teal-600 shadow-2xl relative overflow-hidden flex flex-col justify-between bg-white">
              <div className="absolute top-0 right-0 bg-teal-600 text-white px-4 py-1 text-xs font-bold uppercase rounded-bl-lg">
                Máximo Alcance Comercial
              </div>

              <div>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-teal-600 text-white font-bold">
                      Plan Alianza B2B & Publicidad
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    Recomendación Médica + Catálogo
                  </CardTitle>
                  <CardDescription className="text-base">
                    Posiciona tu farmacia o cadena dentro de los récipes médicos y negocia alianzas directas con los especialistas.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-2">
                  <div className="mb-6 pb-6 border-b border-slate-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl font-extrabold text-slate-900">${b2bBasePrice}</span>
                      <span className="text-slate-500 font-medium">USD / mes ({pricing.flag} {pricing.name})</span>
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold px-3 py-1 rounded-md">
                      <span>Pagadero en moneda local ({pricing.rateLabel}):</span>
                      <span className="font-bold">{pricing.currencySymbol} {priceInLocal} / mes</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-teal-800">
                      <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        <Percent className="h-3 w-3" /> Convenios de descuento (%) disponibles
                      </span>
                      <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
                        <Gift className="h-3 w-3" /> Meses de cortesía según convenio con Admin
                      </span>
                    </div>
                  </div>

                  <ul className="space-y-3.5 text-sm">
                    {[
                      "Todo lo incluido en el Plan Gratuito de Dispensación",
                      "Módulo de Match y Negociación B2B directa con médicos por ciudad o nacional",
                      "Aparición destacada como 'Farmacia Recomendada por tu Médico' en el récipe",
                      "Carga de catálogo de medicamentos (Excel masivo + Manual con fotos WebP y stock)",
                      "Tarjeta comercial con Logo, Banner Publicitario y productos en promoción",
                      "Activación de Cupones de Descuento y pedidos directos por WhatsApp",
                      "Estadísticas en tiempo real de vistas, clics y conversión de récipes",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <div className="bg-teal-600 rounded-full p-1 mt-0.5 shrink-0">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-slate-800 font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </div>

              <div className="p-6 pt-0 mt-4">
                <Button
                  size="lg"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-lg"
                  asChild
                >
                  <Link href="/auth/register-pharmacy?plan=b2b">
                    Solicitar Cuenta con Plan B2B
                  </Link>
                </Button>
                <p className="text-center text-[11px] text-slate-500 mt-2.5">
                  El Super Administrador puede aplicar descuentos por convenio (%) o meses gratis en tu perfil al aprobar tu solicitud.
                </p>
              </div>
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
  title,
  description,
}: {
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between mb-3">
          <div className="bg-slate-50 w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-100">
            {icon}
          </div>
          <Badge variant="outline" className="text-[11px] font-semibold">
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

"use client";

import Link from "next/link";
import { useState } from "react";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Check,
  FlaskConical,
  FileSearch,
  Calendar,
  BarChart3,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Globe,
} from "lucide-react";

export default function LaboratoryLandingPage() {
  const { countries, getCountryPricing } = useSettings();
  const [selectedCountry, setSelectedCountry] = useState("VE");
  const [months, setMonths] = useState(1);
  const pricing = getCountryPricing(selectedCountry);
  const baseMonthlyPrice = pricing.laboratoryMonthlyFee;
  const effectiveBcv = pricing.exchangeRate;

  const calculateTotal = (m: number) => {
    let total = baseMonthlyPrice * m;
    let discount = 0;

    if (m === 3) discount = 0.05;
    if (m === 6) discount = 0.08;
    if (m === 12) discount = 0.15;

    total = total * (1 - discount);

    return {
      total,
      discount,
      pricePerMonth: total / m,
      totalBs: total * effectiveBcv,
      pricePerMonthBs: (total / m) * effectiveBcv,
    };
  };

  const { total, discount, pricePerMonth, totalBs } = calculateTotal(months);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-white py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-sm text-indigo-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Volver al Portal Inicial
            </Link>
          </div>

          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider mb-5">
              SUMA Bioanálisis & Diagnóstico Clínico
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Digitaliza y Conecta tu <span className="text-indigo-400">Laboratorio Clínico</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              Recibe órdenes de exámenes directamente desde los médicos de tu ciudad por número de cédula, publica tus perfiles diagnósticos y entrega resultados digitales en un solo lugar.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="#planes">
                <Button
                  size="lg"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 text-lg h-14 rounded-full font-bold shadow-xl"
                >
                  Ver Plan (${baseMonthlyPrice}/mes)
                </Button>
              </Link>
              <Link href={`/auth/register-laboratory?months=${months}`}>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-white border-indigo-400/50 hover:bg-indigo-900/50 px-8 text-lg h-14 rounded-full"
                >
                  Registrar Laboratorio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Todo lo que tu Laboratorio Clínico necesita para crecer
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Diseñado para laboratorios de bioanálisis y centros diagnósticos que buscan recibir más pacientes referidos por médicos especialistas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<FileSearch className="h-10 w-10 text-indigo-600" />}
              title="Órdenes Médicas por Cédula"
              description="Consulta al instante las órdenes de exámenes emitidas por los médicos de SUMA con solo ingresar la cédula del paciente."
            />
            <FeatureCard
              icon={<FlaskConical className="h-10 w-10 text-teal-600" />}
              title="Catálogo de Exámenes y Perfiles"
              description="Publica tus pruebas, perfiles preoperatorios, hormonales y rutinas con precios actualizados automáticamente a tasa BCV."
            />
            <FeatureCard
              icon={<Calendar className="h-10 w-10 text-blue-600" />}
              title="Citas en Sede y Toma a Domicilio"
              description="Permite que los pacientes agenden su toma de muestra en tu laboratorio o soliciten servicio a domicilio 24/7."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-emerald-600" />}
              title="Entrega Digital de Resultados"
              description="Carga los resultados en PDF o enlace seguro para que el paciente y su médico tratante los reciban de inmediato."
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 text-purple-600" />}
              title="Control Financiero en USD y Bs."
              description="Gestiona pagos por Pago Móvil, Transferencia, Zelle o Efectivo en taquilla con tasa oficial BCV integrada."
            />
            <FeatureCard
              icon={<Zap className="h-10 w-10 text-amber-500" />}
              title="Visibilidad en tu Ciudad"
              description="Aparece en el directorio oficial de SUMA para todos los pacientes y médicos de tu ciudad y estado."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section ($50/mes al cambio BCV, igual que Clínicas pero a $50) */}
      <section id="planes" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-slate-900">
              Elige tu Ciclo de Pago
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-6">
              Tarifa única accesible de <strong>${baseMonthlyPrice} USD mensuales pagaderos en moneda local ({pricing.rateLabel})</strong>. Ahorra aún más eligiendo ciclos trimestrales, semestrales o anuales.
            </p>

            {countries.length > 0 && (
              <div className="mb-6">
                <div className="inline-flex flex-wrap items-center justify-center gap-2 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 px-2">
                    <Globe className="h-3.5 w-3.5 text-indigo-600" /> País:
                  </span>
                  {countries.filter((c) => c.isActive !== false).map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCountry(c.code)}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                        selectedCountry === c.code
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {c.flag || "🏳️"} {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de Meses */}
            <div className="flex flex-wrap justify-center gap-2 bg-slate-200/80 p-2 rounded-xl w-fit mx-auto">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`px-6 py-3 rounded-lg text-sm font-bold transition-all relative ${
                    months === m
                      ? "bg-indigo-950 text-white shadow-lg scale-105"
                      : "text-slate-600 hover:bg-slate-300/70 hover:text-slate-900"
                  }`}
                >
                  {m === 1 ? "1 Mes" : `${m} Meses`}
                  {m === 3 && (
                    <span className="absolute -top-3 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                      -5%
                    </span>
                  )}
                  {m === 6 && (
                    <span className="absolute -top-3 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                      -8%
                    </span>
                  )}
                  {m === 12 && (
                    <span className="absolute -top-3 -right-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
                      -15%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-lg mx-auto">
            <Card
              className={`border-2 shadow-2xl relative overflow-hidden transition-colors bg-white ${
                discount > 0 ? "border-indigo-600" : "border-slate-200"
              }`}
            >
              {discount > 0 && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 text-xs font-bold uppercase rounded-bl-lg z-10">
                  Descuento Aplicado (-{Math.round(discount * 100)}%)
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-bold text-slate-900">
                  Plan Integral Laboratorio
                </CardTitle>
                <CardDescription className="text-base mt-1">
                  Todo incluido, sin comisiones por orden médica.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-5xl font-extrabold text-slate-900">
                      ${total.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-lg text-muted-foreground self-end mb-2">
                      USD / {months === 1 ? "mes" : `${months} meses`}
                    </span>
                  </div>

                  <div className="mt-2 inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <span>Al cambio {pricing.rateLabel}:</span>
                    <span className="font-bold">
                      {pricing.currencySymbol}{" "}
                      {totalBs.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  {months > 1 && (
                    <div className="mt-2 text-sm text-slate-500">
                      Equivale a{" "}
                      <span className="font-semibold text-slate-900">
                        ${pricePerMonth.toLocaleString("en-US", { maximumFractionDigits: 2 })}/mes
                      </span>
                      {discount > 0 && (
                        <span className="text-emerald-600 font-bold ml-1">
                          (-{Math.round(discount * 100)}% OFF)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {[
                    {
                      title: "Recepción de Órdenes Digitales por Cédula",
                      desc: "Recibe a los pacientes enviados por los médicos de tu ciudad y valida sus estudios al instante.",
                    },
                    {
                      title: "Catálogo Ilimitado de Exámenes y Perfiles",
                      desc: "Configura tus precios en USD con conversión automática en Bs. a tasa BCV.",
                    },
                    {
                      title: "Entrega de Resultados Online",
                      desc: "Envía los resultados directamente al expediente del paciente y al médico solicitante.",
                    },
                    {
                      title: "Reserva de Turnos y Servicio a Domicilio",
                      desc: "Tus pacientes agendan y pagan por Pago Móvil, Transferencia, Zelle o en taquilla.",
                    },
                    {
                      title: "Perfil Destacado en el Buscador SUMA",
                      desc: "Presencia institucional con logotipo, portada, horarios y ubicación GPS en tu ciudad.",
                    },
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="bg-indigo-100 rounded-full p-1 mt-0.5 shrink-0">
                        <Check className="h-4 w-4 text-indigo-700 font-bold" />
                      </div>
                      <div className="text-left">
                        <span className="text-slate-900 font-bold block text-sm">
                          {feature.title}
                        </span>
                        <span className="text-slate-600 text-xs leading-tight">
                          {feature.desc}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/auth/register-laboratory?months=${months}`}
                  className="w-full block"
                >
                  <Button
                    size="lg"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-lg shadow-lg transition-all"
                  >
                    Comenzar con {months === 1 ? "1 Mes ($50)" : `${months} Meses`}
                  </Button>
                </Link>
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Pago en Bolívares a la tasa oficial del BCV. Activación verificada por SUMA.
                </p>
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
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="border border-slate-100 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="mb-4 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

"use client";

import { HeaderWrapper, BottomNav } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  UserCheck,
  CalendarDays,
  Bot,
  ArrowRight,
  Star,
  Building2,
  Store,
  FlaskConical,
  Handshake,
  ExternalLink,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { HealthBackground } from "@/components/HealthBackground";
import { SplashScreen } from "@/components/splash-screen";
import { useSettings } from "@/lib/settings";
import type { CommercialAlly } from "@/lib/types";

const DEFAULT_SHOWCASE_ALLIES: CommercialAlly[] = [
  {
    id: "default-1",
    name: "Centro Médico Docente",
    category: "clinica",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=CMD&backgroundColor=0f766e&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
  {
    id: "default-2",
    name: "Policlínica Metropolitana",
    category: "clinica",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=PM&backgroundColor=0369a1&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
  {
    id: "default-3",
    name: "Red de Farmacias Aliadas",
    category: "farmacia",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=FA&backgroundColor=0d9488&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
  {
    id: "default-4",
    name: "Hospital de Clínicas",
    category: "clinica",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=HC&backgroundColor=1d4ed8&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
  {
    id: "default-5",
    name: "Bioanálisis & Diagnóstico",
    category: "laboratorio",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=BD&backgroundColor=4338ca&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
  {
    id: "default-6",
    name: "Casas Médicas & Laboratorios",
    category: "marca",
    logoUrl: "https://api.dicebear.com/7.x/initials/svg?seed=CM&backgroundColor=7e22ce&fontColor=ffffff",
    country: "VE",
    isActive: true,
  },
];

const ALLY_CATEGORY_BADGES: Record<string, string> = {
  farmacia: "Farmacia Aliada",
  clinica: "Clínica / Centro",
  laboratorio: "Laboratorio",
  marca: "Casa Médica",
  aliado: "Aliado Comercial",
};

export default function Home() {
  const { commercialAllies } = useSettings();
  const [pharmacyAllies, setPharmacyAllies] = useState<CommercialAlly[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/pharmacies")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (!active || !Array.isArray(list)) return;
        const withLogo: CommercialAlly[] = list
          .filter((p: any) => p.status === "active" && (p.logo_url || p.logoUrl))
          .map((p: any) => ({
            id: `pharm-${p.id}`,
            name: p.chain_name || p.chainName || p.name,
            logoUrl: p.logo_url || p.logoUrl,
            category: "farmacia" as const,
            country: p.country || "VE",
            city: p.city,
            isActive: true,
          }));
        setPharmacyAllies(withLogo);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const displayedAllies = useMemo(() => {
    const activeConfigured = (commercialAllies || []).filter((a) => a.isActive !== false && a.logoUrl);
    const seen = new Set(activeConfigured.map((a) => a.name.toLowerCase()));
    const combined = [...activeConfigured];

    for (const p of pharmacyAllies) {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        combined.push(p);
      }
    }

    return combined.length > 0 ? combined : DEFAULT_SHOWCASE_ALLIES;
  }, [commercialAllies, pharmacyAllies]);

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-secondary selection:text-white">
      <SplashScreen />
      <HeaderWrapper />
      <main className="flex-1 pb-20 md:pb-0">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden bg-background pt-16 md:pt-32 pb-32">
          {/* Background Decor */}
          <div className="absolute inset-0 -z-20 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 dark:bg-black dark:opacity-20 dark:bg-[radial-gradient(#333_1px,transparent_1px)]"></div>
          <HealthBackground />

          <div className="container relative mx-auto px-4 text-center">
            {/* Tagline */}
            <div className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Star className="mr-1 h-3 w-3 fill-secondary" />
              La salud digital del futuro, hoy.
            </div>

            <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-primary sm:text-7xl md:leading-[1.1] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Sistema Unificado de <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-secondary to-teal-500">
                Medicina Avanzada
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              SUMA conecta pacientes con los mejores especialistas de la ciudad.
              Reserva citas online, paga de forma segura y gestiona tu historial clínico en un solo lugar.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-xl shadow-secondary/20 transition-all hover:scale-105"
                asChild
              >
                <Link href="/find-a-doctor">
                  <Search className="mr-2 h-5 w-5" />
                  Buscar Médico
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted transition-all hover:scale-105"
                asChild
              >
                <Link href="/login">
                  Ingresar al Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex flex-col items-center gap-3 animate-in fade-in duration-700 delay-400">
              <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/70">
                Centros Médicos y Especialistas en Venezuela y Latinoamérica
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-muted-foreground/80">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-secondary/50 hover:text-foreground transition-all">
                  <Building2 className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-sm">Centro Médico Docente</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-secondary/50 hover:text-foreground transition-all">
                  <Building2 className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-sm">Policlínica Metropolitana</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-secondary/50 hover:text-foreground transition-all">
                  <Building2 className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-sm">Hospital de Clínicas</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:border-secondary/50 hover:text-foreground transition-all">
                  <Building2 className="h-4 w-4 text-secondary" />
                  <span className="font-semibold text-sm">Unidades de Especialidades</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="container relative z-10 mx-auto px-4 pb-16 -mt-16 sm:-mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e4e] via-[#086363] to-[#043333] text-white shadow-2xl shadow-teal-950/30 border border-teal-500/25">
            {/* Ambient Background Glows */}
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-emerald-300/15 blur-3xl pointer-events-none" />

            {/* Subtle Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-400/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative grid gap-6 p-6 md:grid-cols-2 md:p-10 lg:grid-cols-4">
              <FeatureCard
                icon={<Search />}
                badge="Inteligente"
                title="Búsqueda Inteligente"
                description="Filtra por ciudad, especialidad y precio para encontrar tu médico ideal rápidamente."
              />
              <FeatureCard
                icon={<CalendarDays />}
                badge="Inmediato"
                title="Reservas Instantáneas"
                description="Agenda tu cita médica 24/7 sin llamadas ni esperas. Confirmación inmediata por WhatsApp."
              />
              <FeatureCard
                icon={<UserCheck />}
                badge="Seguro"
                title="Historial Digital"
                description="Accede a tus recetas, informes clínicos y estudios médicos desde cualquier lugar."
              />
              <FeatureCard
                icon={<Bot />}
                badge="IA Médica"
                title="Asistencia Premium"
                description="Nuestro asistente inteligente te guía a preparar tu consulta de forma eficiente."
              />
            </div>
          </div>
        </section>

        {/* SECCIÓN DE ALIADOS COMERCIALES Y EMPRESAS AFILIADAS */}
        <section id="aliados" className="py-16 bg-gradient-to-b from-background via-slate-50/70 to-background border-y border-slate-200/60">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-800 mb-3">
                <Handshake className="h-3.5 w-3.5 text-teal-600" />
                Ecosistema de Salud Integrado
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-primary">
                Nuestros Aliados Comerciales e Instituciones
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                Empresas, cadenas de farmacias, clínicas, laboratorios y marcas farmacéuticas que respaldan la red médica SUMA.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
              {displayedAllies.map((ally) => {
                const cardInner = (
                  <div className="group h-full rounded-2xl bg-white border border-slate-200/80 hover:border-teal-500/40 p-4 flex flex-col items-center justify-between text-center shadow-xs hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                    <div className="h-20 w-full flex items-center justify-center p-2 rounded-xl bg-slate-50/70 group-hover:bg-white transition-colors overflow-hidden">
                      <img
                        src={ally.logoUrl}
                        alt={ally.name}
                        className="max-h-14 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-3 w-full">
                      <p className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-teal-700 transition-colors">
                        {ally.name}
                      </p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium px-2 py-0 bg-slate-100 text-slate-600"
                        >
                          {ALLY_CATEGORY_BADGES[ally.category || "aliado"] || "Aliado Comercial"}
                        </Badge>
                        {ally.websiteUrl && (
                          <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-teal-600" />
                        )}
                      </div>
                    </div>
                  </div>
                );

                return ally.websiteUrl ? (
                  <a
                    key={ally.id}
                    href={ally.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block h-full"
                  >
                    {cardInner}
                  </a>
                ) : (
                  <div key={ally.id} className="h-full">
                    {cardInner}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MEDICAL CTA SECTION */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                  ¿Eres médico o administras una clínica, farmacia o laboratorio?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Únete a la red SUMA y conecta con miles de pacientes en tu ciudad. Gestión de citas, historia clínica y récipe electrónico conectado en tiempo real con farmacias y laboratorios.
                </p>
                <ul className="space-y-3">
                  {[
                    "Pagos verificados en moneda local (Bs. a tasa BCV, ARS, COP) y USD",
                    "Récipes médicos y órdenes de exámenes conectados por cédula del paciente",
                    "Afiliación gratuita para Farmacias (módulo de récipes) y planes B2B de alto alcance",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="rounded-full bg-green-100 p-1">
                        <ArrowRight className="h-3 w-3 text-green-600" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 max-w-xl">
                  <Button size="lg" className="rounded-full justify-start px-6 h-12 shadow-sm" asChild>
                    <Link href="/auth/register-doctor">
                      <UserCheck className="mr-2.5 h-5 w-5" />
                      Soy Médico
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full justify-start px-6 h-12 border-primary text-primary hover:bg-primary/5"
                    asChild
                  >
                    <Link href="/landing-clinica">
                      <Building2 className="mr-2.5 h-5 w-5" />
                      Soy una Clínica
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full justify-between px-6 h-12 border-teal-600 text-teal-700 hover:bg-teal-50"
                    asChild
                  >
                    <Link href="/landing-farmacia">
                      <span className="flex items-center">
                        <Store className="mr-2.5 h-5 w-5 text-teal-600" />
                        Soy una Farmacia
                      </span>
                      <span className="ml-2 text-[10px] font-bold uppercase bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                        Gratis
                      </span>
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full justify-between px-6 h-12 border-indigo-600 text-indigo-700 hover:bg-indigo-50"
                    asChild
                  >
                    <Link href="/landing-laboratorio">
                      <span className="flex items-center">
                        <FlaskConical className="mr-2.5 h-5 w-5 text-indigo-600" />
                        Soy un Laboratorio
                      </span>
                      <span className="ml-2 text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                        $50 BCV
                      </span>
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="/doctor-main.png"
                  alt="Doctor SUMA"
                  width={800}
                  height={600}
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
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
  badge?: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md p-6 transition-all duration-300 hover:-translate-y-1.5 border border-white/15 hover:border-teal-300/40 shadow-lg shadow-black/10 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-300 to-emerald-400 text-teal-950 shadow-md shadow-teal-400/25 group-hover:scale-110 group-hover:shadow-teal-300/40 transition-all duration-300">
            {React.cloneElement(icon as React.ReactElement, {
              className: "h-6 w-6",
            })}
          </div>
          {badge && (
            <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-400/20 text-teal-200 border border-teal-300/30">
              {badge}
            </span>
          )}
        </div>
        <h3 className="mb-2 text-xl font-bold text-white tracking-tight group-hover:text-teal-200 transition-colors">
          {title}
        </h3>
        <p className="text-teal-50/85 text-sm leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

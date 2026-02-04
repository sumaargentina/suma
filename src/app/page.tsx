"use client";

import { HeaderWrapper, BottomNav } from "@/components/header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { Search, UserCheck, CalendarDays, Bot, ArrowRight, Star, Building2 } from "lucide-react";
import React from "react";
import { InstallPwaBanner } from "@/components/install-pwa-banner";
import { HealthBackground } from "@/components/HealthBackground";

export default function Home() {
  const heroImageUrl = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=2000";

  return (
    <div className="flex flex-col min-h-screen bg-background selection:bg-secondary selection:text-white">
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
              SUMA conecta pacientes con los mejores especialistas de Argentina.
              Reserva citas online, paga de forma segura y gestiona tu historial clínico en un solo lugar.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-secondary hover:bg-secondary/90 text-white shadow-xl shadow-secondary/20 transition-all hover:scale-105" asChild>
                <Link href="/find-a-doctor">
                  <Search className="mr-2 h-5 w-5" />
                  Buscar Médico
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-2 hover:bg-muted transition-all hover:scale-105" asChild>
                <Link href="/login">
                  Ingresar al Portal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="mt-12 flex items-center justify-center gap-8 text-muted-foreground opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Simulated Partner Logos */}
              <span className="font-bold text-xl">Hospital Central</span>
              <span className="font-bold text-xl">Clínica Norte</span>
              <span className="font-bold text-xl">Sanatorio Sur</span>
            </div>
          </div>
        </section>

        {/* FEATURES GRID SECTION */}
        <section className="container relative z-10 mx-auto px-4 pb-20 -mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground shadow-2xl ring-1 ring-white/10">

            {/* Background Image Overlay */}
            <div className="absolute inset-0 mix-blend-overlay opacity-20">
              <Image
                src={heroImageUrl}
                alt="Background texture"
                fill
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />

            <div className="relative grid gap-8 p-8 md:grid-cols-2 md:p-12 lg:grid-cols-4">
              <FeatureCard
                icon={<Search />}
                title="Búsqueda Inteligente"
                description="Filtra por ubicación, especialidad y precio para encontrar tu médico ideal."
              />
              <FeatureCard
                icon={<CalendarDays />}
                title="Reservas Instantáneas"
                description="Agenda tu cita 24/7 sin llamadas ni esperas. Confirmación inmediata."
              />
              <FeatureCard
                icon={<UserCheck />}
                title="Historial Digital"
                description="Accede a tus recetas, estudios y diagnósticos desde cualquier lugar."
              />
              <FeatureCard
                icon={<Bot />}
                title="Asistencia Premium"
                description="Nuestro asistente IA te ayuda a preparar tu consulta de forma eficiente."
              />
            </div>
          </div>
        </section>

        {/* MEDICAL CTA SECTION */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
                  ¿Eres profesional o administras una clínica?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Únete a la red SUMA y potencia tu práctica médica. Gestión de agenda, historia clínica electrónica, cobros integrados y más visibilidad para médicos y clínicas.
                </p>
                <ul className="space-y-3">
                  {['Pago garantizado (MercadoPago)', 'Recordatorios automáticos a pacientes', 'Gestión multi-especialidad'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="rounded-full bg-green-100 p-1">
                        <ArrowRight className="h-3 w-3 text-green-600" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-4 mt-6">
                  <Button size="lg" className="rounded-full" asChild>
                    <Link href="/auth/register-doctor">Soy Médico</Link>
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full border-primary text-primary hover:bg-primary/5" asChild>
                    <Link href="/landing-clinica">
                      <Building2 className="mr-2 h-4 w-4" />
                      Soy una Clínica
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl rotate-1 hover:rotate-0 transition-transform duration-500">
                <Image
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=1000"
                  alt="Doctor using tablet"
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
      <InstallPwaBanner />
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
    <div className="group rounded-2xl bg-white/5 p-6 transition-all hover:bg-white/10 hover:shadow-lg border border-white/10">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/20 text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
        {React.cloneElement(icon as React.ReactElement, {
          className: "h-6 w-6",
        })}
      </div>
      <h3 className="mb-2 text-xl font-bold text-primary-foreground">{title}</h3>
      <p className="text-primary-foreground/70 leading-relaxed">{description}</p>
    </div>
  );
}

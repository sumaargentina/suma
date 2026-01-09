import { createClient } from "@supabase/supabase-js";
import { HeaderWrapper } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { Search, MapPin, Stethoscope, Filter, Heart, Brain, Baby, Eye, Bone, Activity } from "lucide-react";
import { getDoctors, getClinics } from "@/lib/supabaseService";
import { Doctor, Clinic } from "@/lib/types";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

// Common specialties for visual categories
const POPULAR_SPECIALTIES = [
  { name: "Cardiología", icon: Heart },
  { name: "Pediatría", icon: Baby },
  { name: "Dermatología", icon: Activity },
  { name: "Neurología", icon: Brain },
  { name: "Traumatología", icon: Bone },
  { name: "Oftalmología", icon: Eye },
];

export default async function FindDoctorPage({
  searchParams,
}: {
  searchParams: { q?: string; specialty?: string; city?: string }
}) {
  const params = await searchParams;
  const query = params?.q || "";
  const specialtyFilter = params?.specialty || "all";
  const cityFilter = params?.city || "all";

  // Fetch data
  const [doctors, clinics] = await Promise.all([
    getDoctors().catch(err => { console.error("Error fetching doctors:", err); return []; }),
    getClinics().catch(err => { console.error("Error fetching clinics:", err); return []; })
  ]);

  // Extract unique filter options
  const specialties = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean))).sort();
  const cities = Array.from(new Set([
    ...doctors.map(d => d.city).filter(Boolean),
    ...clinics.map(c => c.city).filter((c): c is string => !!c)
  ])).sort();

  // Filter Logic
  const filteredDoctors = doctors.filter(doctor => {
    // Exclude doctors that belong to a clinic
    const isClinicDoctor = doctor.clinicId || doctor.isClinicEmployee;
    if (isClinicDoctor) return false;

    const matchesQuery = query === "" ||
      doctor.name.toLowerCase().includes(query.toLowerCase()) ||
      doctor.specialty.toLowerCase().includes(query.toLowerCase());

    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty === specialtyFilter;
    const matchesCity = cityFilter === "all" || doctor.city === cityFilter;

    return matchesQuery && matchesSpecialty && matchesCity;
  });

  const filteredClinics = clinics.filter(clinic => {
    const matchesQuery = query === "" ||
      clinic.name.toLowerCase().includes(query.toLowerCase());

    // Clinics filter logic by city
    const matchesCity = cityFilter === "all" || clinic.city === cityFilter;

    return matchesQuery && matchesCity;
  });

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-secondary selection:text-white">
      <HeaderWrapper />

      <main className="pb-20">
        {/* HERO & SEARCH SECTION */}
        <section className="relative overflow-hidden bg-white pt-12 pb-16 md:pt-20 md:pb-24 shadow-sm border-b border-gray-100">
          {/* Simple Background Pattern */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

          <div className="container mx-auto px-4 max-w-6xl space-y-8 relative z-10">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
                Encuentra tu especialista
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                <span className="font-semibold text-primary">Miles de profesionales</span> confían en SUMA.
                Reserva tu turno online de forma rápida y segura.
              </p>
            </div>

            {/* Main Search Bar - Floating Style */}
            <form className="max-w-4xl mx-auto bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-2 items-center transform transition-all hover:scale-[1.01]">
              <div className="relative flex-1 w-full md:w-auto group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input
                  name="q"
                  defaultValue={query}
                  placeholder="Buscar médico, especialidad o clínica..."
                  className="pl-12 h-14 border-0 bg-transparent text-lg focus-visible:ring-0 shadow-none placeholder:text-slate-400"
                />
              </div>

              <div className="w-px h-10 bg-slate-200 hidden md:block"></div>

              <div className="flex w-full md:w-auto gap-2">
                <div className="w-1/2 md:w-48">
                  <Select name="specialty" defaultValue={specialtyFilter}>
                    <SelectTrigger className="h-14 border-0 bg-transparent focus:ring-0 text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <SelectValue placeholder="Especialidad" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {specialties.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-px h-10 bg-slate-200 hidden md:block"></div>

                <div className="w-1/2 md:w-48">
                  <Select name="city" defaultValue={cityFilter}>
                    <SelectTrigger className="h-14 border-0 bg-transparent focus:ring-0 text-slate-700 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="text-muted-foreground"><MapPin className="h-4 w-4" /></div>
                        <SelectValue placeholder="Ciudad" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {cities.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" size="lg" className="h-14 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all">
                  Buscar
                </Button>
              </div>
            </form>

            {/* Quick Categories Pills */}
            <div className="flex flex-wrap justify-center gap-3 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
              {POPULAR_SPECIALTIES.map((spec) => (
                <form key={spec.name}>
                  <input type="hidden" name="specialty" value={spec.name} />
                  <Button
                    variant="secondary"
                    type="submit"
                    className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-transparent hover:border-slate-300 transition-all gap-2 h-10 px-5 text-sm font-medium"
                  >
                    <spec.icon className="h-4 w-4 opacity-70" />
                    {spec.name}
                  </Button>
                </form>
              ))}
            </div>
          </div>
        </section>

        {/* RESULTS SECTION */}
        <section className="container mx-auto px-4 py-12 max-w-7xl space-y-20">

          {/* 1. DOCTORS LIST */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Médicos Particulares</h2>
                  <p className="text-slate-500 text-sm">Especialistas independientes verificados</p>
                </div>
              </div>
              <span className="text-sm font-semibold bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full">{filteredDoctors.length} {filteredDoctors.length === 1 ? 'médico' : 'médicos'}</span>
            </div>

            {filteredDoctors.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredDoctors.map(doctor => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No encontramos resultados</h3>
                <p className="text-slate-500 max-w-sm text-center">Intenta ajustar tu búsqueda o prueba con una especialidad diferente.</p>
              </div>
            )}
          </div>

          {/* 2. CLINICS SECTION (AT THE BOTTOM AS REQUESTED) */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b pb-4 border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <Heart className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Clínicas y Centros Médicos</h2>
                  <p className="text-slate-500 text-sm">Instituciones de salud destacadas</p>
                </div>
              </div>
              <span className="text-sm font-semibold bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full">{filteredClinics.length} {filteredClinics.length === 1 ? 'centro' : 'centros'}</span>
            </div>

            {filteredClinics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredClinics.map(clinic => (
                  <ClinicCard key={clinic.id} clinic={clinic} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                  <Activity className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Sin centros médicos</h3>
                <p className="text-slate-500">No hay clínicas que coincidan con tu búsqueda.</p>
              </div>
            )}
          </div>

        </section>
      </main>
    </div>
  );
}

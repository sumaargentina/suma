import { createClient } from "@supabase/supabase-js";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { Search, Stethoscope, Heart, Activity, Sparkles } from "lucide-react";
import { getDoctors, getClinics, getSettings } from "@/lib/supabaseService";
import { Doctor, Clinic } from "@/lib/types";

import { SearchFilters } from "@/components/search-filters";
import { SpecialtyPills } from "@/components/specialty-pills";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function FindDoctorPage({
  searchParams,
}: {
  searchParams: { q?: string; specialty?: string; city?: string; minPrice?: string; maxPrice?: string; minRating?: string; verified?: string; view?: string }
}) {
  const params = await searchParams;
  const query = params?.q || "";
  const specialtyFilter = params?.specialty || "all";
  const cityFilter = params?.city || "all";
  const minPrice = Number(params?.minPrice) || 0;
  const maxPrice = Number(params?.maxPrice) || 50000;
  const minRating = Number(params?.minRating) || 0;
  const verifiedOnly = params?.verified === "true";
  const viewMode = params?.view || "all"; // "all" | "doctors" | "clinics"

  // Fetch data including settings for beauty specialties
  const [doctors, clinics, settings] = await Promise.all([
    getDoctors().catch(err => { console.error("Error fetching doctors:", err); return []; }),
    getClinics().catch(err => { console.error("Error fetching clinics:", err); return []; }),
    getSettings().catch(err => { console.error("Error fetching settings:", err); return null; })
  ]);

  // Get beauty/wellness specialties from admin settings
  const beautySpecialties = settings?.beautySpecialties || [];

  // Extract unique filter options
  const specialtiesList = Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean))).sort();

  // Calculate specialty counts (for pills display) - count ALL doctors
  const specialtiesWithCount = specialtiesList.map(specialty => ({
    name: specialty,
    count: doctors.filter(d => d.specialty === specialty).length
  })).filter(s => s.count > 0);

  const cities = Array.from(new Set([
    ...doctors.map(d => d.city).filter(Boolean),
    ...clinics.map(c => c.city).filter((c): c is string => !!c)
  ])).sort();

  // Helper function for search matching
  const matchesSearch = (searchTerm: string, ...fields: (string | undefined | null)[]): boolean => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase().trim();
    return fields.some(field =>
      field && field.toLowerCase().includes(lowerSearch)
    );
  };

  // Filter Logic - Doctores
  const filteredDoctors = doctors.filter(doctor => {
    // Exclude doctors that belong to a clinic
    const isClinicDoctor = doctor.clinicId || doctor.isClinicEmployee;
    if (isClinicDoctor) return false;

    // Búsqueda en múltiples campos
    const insurancesString = doctor.acceptedInsurances?.join(' ') || '';
    const servicesString = doctor.services?.map(s => s.name).join(' ') || '';
    const addressesString = doctor.addresses?.map(a => `${a.name} ${a.address} ${a.city}`).join(' ') || '';

    const matchesQuery = matchesSearch(
      query,
      doctor.name,           // Nombre completo
      doctor.specialty,      // Especialidad
      doctor.city,           // Ciudad
      doctor.address,        // Dirección
      doctor.sector,         // Sector/Zona
      doctor.description,    // Descripción del perfil
      insurancesString,      // Obras sociales aceptadas
      servicesString,        // Servicios que ofrece
      addressesString        // Consultorios
    );

    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty === specialtyFilter;
    const matchesCity = cityFilter === "all" || doctor.city === cityFilter;

    // Filtros Avanzados
    const fee = doctor.consultationFee || 0;
    const matchesPrice = fee >= minPrice && fee <= maxPrice;

    const rating = doctor.rating || 0;
    const matchesRating = rating >= minRating;

    const matchesVerified = !verifiedOnly || doctor.verificationStatus === 'verified';

    return matchesQuery && matchesSpecialty && matchesCity && matchesPrice && matchesRating && matchesVerified;
  });

  // Filter Logic - Clínicas
  const filteredClinics = clinics.filter(clinic => {
    const matchesStatus = clinic.verificationStatus === 'verified' && clinic.status === 'active';

    // Búsqueda en múltiples campos
    const insurancesString = clinic.acceptedInsurances?.join(' ') || '';

    const matchesQuery = matchesSearch(
      query,
      clinic.name,           // Nombre de la clínica
      clinic.description,    // Descripción
      clinic.city,           // Ciudad
      clinic.address,        // Dirección
      insurancesString       // Obras sociales
    );

    // Clinics filter logic by city
    const matchesCity = cityFilter === "all" || clinic.city === cityFilter;
    const rating = clinic.rating || 0;
    const matchesRating = rating >= minRating;

    // Clinic verification is already checked in matchesStatus ('verified'), so matchesVerified is implicit or we can enforce strict verified param if user wants ONLY verified (which clinics always are in this list basically).

    return matchesStatus && matchesQuery && matchesCity && matchesRating;
  });

  // Separar doctores: Médicos regulares vs Especialistas de Bienestar
  const regularDoctors = filteredDoctors.filter(
    doctor => !beautySpecialties.includes(doctor.specialty)
  );

  const wellnessDoctors = filteredDoctors.filter(
    doctor => beautySpecialties.includes(doctor.specialty)
  );

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-secondary selection:text-white">
      <HeaderWrapper />

      <main className="pb-28 md:pb-20">
        {/* HERO & SEARCH SECTION - Compacto en móvil */}
        <section className="relative overflow-hidden bg-white pt-4 pb-4 md:pt-16 md:pb-12 shadow-sm border-b border-gray-100">
          {/* Simple Background Pattern */}
          <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>

          <div className="container mx-auto px-3 md:px-4 max-w-6xl space-y-3 md:space-y-6 relative z-10">
            {/* Título - más pequeño en móvil */}
            <div className="text-center space-y-1 md:space-y-3">
              <h1 className="text-xl md:text-5xl font-bold md:font-extrabold text-slate-900 tracking-tight">
                Encuentra tu especialista
              </h1>
              <p className="text-xs md:text-lg text-slate-500 max-w-2xl mx-auto hidden md:block">
                <span className="font-semibold text-primary">Miles de profesionales</span> confían en SUMA.
              </p>
            </div>

            {/* Filtros */}
            <div className="max-w-5xl mx-auto">
              <SearchFilters
                specialties={specialtiesList}
                cities={cities}
                maxPrice={100000}
              />
            </div>

            {/* Especialidades - scroll horizontal */}
            <div className="pt-2 md:pt-4">
              <SpecialtyPills specialties={specialtiesWithCount} />
            </div>
          </div>
        </section>

        {/* RESULTS SECTION - Más compacto en móvil */}
        <section className="container mx-auto px-3 md:px-4 py-4 md:py-12 max-w-7xl space-y-6 md:space-y-20">

          {/* 1. MÉDICOS PARTICULARES */}
          {regularDoctors.length > 0 && viewMode !== 'clinics' && (
            <div className="space-y-3 md:space-y-6">
              {/* Header compacto en móvil */}
              <div className="flex items-center justify-between border-b pb-2 md:pb-4 border-slate-200">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
                    <Stethoscope className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-2xl font-bold text-slate-900">Médicos</h2>
                    <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">Especialistas independientes</p>
                  </div>
                </div>
                <span className="text-[10px] md:text-sm font-semibold bg-slate-100 text-slate-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full">
                  {regularDoctors.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {regularDoctors.map(doctor => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </div>
          )}

          {/* 2. ESPECIALISTAS DE BIENESTAR */}
          {wellnessDoctors.length > 0 && viewMode !== 'clinics' && (
            <div className="space-y-3 md:space-y-6">
              <div className="flex items-center justify-between border-b pb-2 md:pb-4 border-slate-200">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-lg">
                    <Sparkles className="h-4 w-4 md:h-6 md:w-6 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-2xl font-bold text-slate-900">Bienestar</h2>
                    <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">Estética y cuidado personal</p>
                  </div>
                </div>
                <span className="text-[10px] md:text-sm font-semibold bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-pink-100">
                  {wellnessDoctors.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                {wellnessDoctors.map(doctor => (
                  <DoctorCard key={doctor.id} doctor={doctor} />
                ))}
              </div>
            </div>
          )}

          {/* Mensaje cuando no hay resultados */}
          {regularDoctors.length === 0 && wellnessDoctors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 md:py-16 bg-white rounded-2xl md:rounded-3xl border border-dashed border-slate-200">
              <div className="bg-slate-50 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                <Search className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
              </div>
              <h3 className="text-sm md:text-lg font-semibold text-slate-900 mb-1">No encontramos resultados</h3>
              <p className="text-xs md:text-base text-slate-500 max-w-sm text-center px-4">Prueba con otra especialidad</p>
            </div>
          )}

          {/* 3. CLÍNICAS */}
          {filteredClinics.length > 0 && viewMode !== 'doctors' && (
            <div className="space-y-3 md:space-y-6">
              <div className="flex items-center justify-between border-b pb-2 md:pb-4 border-slate-200">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="p-1.5 md:p-2 bg-secondary/10 rounded-lg">
                    <Heart className="h-4 w-4 md:h-6 md:w-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-base md:text-2xl font-bold text-slate-900">Clínicas</h2>
                    <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">Centros médicos destacados</p>
                  </div>
                </div>
                <span className="text-[10px] md:text-sm font-semibold bg-slate-100 text-slate-600 px-2 md:px-4 py-1 md:py-1.5 rounded-full">
                  {filteredClinics.length}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
                {filteredClinics.map((clinic, index) => (
                  <ClinicCard key={clinic.id} clinic={clinic} priority={index < 3} />
                ))}
              </div>
            </div>
          )}

        </section>
      </main>

      {/* Navegación móvil tipo app */}
      <BottomNav />
    </div>
  );
}

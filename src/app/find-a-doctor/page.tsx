import { HeaderWrapper, BottomNav } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { PharmacyCard } from "@/components/pharmacy/pharmacy-card";
import { Search, Stethoscope, Heart, Activity, Sparkles, Pill } from "lucide-react";
import { getDoctors, getClinics, getPharmacies, getSettings } from "@/lib/supabaseService";
import { Doctor, Clinic, Pharmacy } from "@/lib/types";

import { SearchFilters } from "@/components/search-filters";
import { SpecialtyPills } from "@/components/specialty-pills";
import { HealthBackground } from "@/components/HealthBackground";
import { MapViewToggle } from "@/components/map-view-toggle";
import { getCitiesByState, normalizeCountryCode, isSameCountry } from "@/lib/geo-data";
import { findProfessionBySpecialty, DEFAULT_PROFESSIONS_CATALOG } from "@/lib/professions-catalog";

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function FindDoctorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; profession?: string; specialty?: string; country?: string; state?: string; city?: string; minPrice?: string; maxPrice?: string; minRating?: string; verified?: string; view?: string }>
}) {
  const params = await searchParams;
  const query = params?.q || "";
  const professionFilter = params?.profession || "all";
  const specialtyFilter = params?.specialty || "all";
  const activeCountry = normalizeCountryCode(params?.country || "VE");
  const stateFilter = params?.state || "all";
  const cityFilter = params?.city || "all";
  const minPrice = Number(params?.minPrice) || 0;
  const maxPrice = Number(params?.maxPrice) || 50000;
  const minRating = Number(params?.minRating) || 0;
  const verifiedOnly = params?.verified === "true";
  const viewMode = params?.view || "all"; // "all" | "doctors" | "clinics" | "pharmacies"

  // Fetch data including settings and pharmacies
  const [allDoctors, allClinics, allPharmacies, settings] = await Promise.all([
    getDoctors().catch(err => { console.error("Error fetching doctors:", err); return []; }),
    getClinics().catch(err => { console.error("Error fetching clinics:", err); return []; }),
    getPharmacies().catch(err => { console.error("Error fetching pharmacies:", err); return []; }),
    getSettings().catch(err => { console.error("Error fetching settings:", err); return null; })
  ]);

  // AISLAMIENTO ESTRICTO POR PAÍS: Solo entidades del país activo (VE, AR, CO, etc.)
  const doctors = allDoctors.filter(d => isSameCountry(d.country, activeCountry));
  const clinics = allClinics.filter(c => isSameCountry(c.country, activeCountry));
  const pharmacies = allPharmacies.filter(p => isSameCountry(p.country, activeCountry));

  // Get beauty/wellness specialties from admin settings
  const beautySpecialties = settings?.beautySpecialties || [];
  const professionsCatalog = settings?.professionsCatalog?.length ? settings.professionsCatalog : DEFAULT_PROFESSIONS_CATALOG;

  // Extract unique filter options within the active country + catalog
  const catalogSpecialties = professionsCatalog.flatMap(p => p.specialties.map(s => s.name));
  const specialtiesList = Array.from(new Set([
    ...doctors.map(d => d.specialty).filter(Boolean),
    ...catalogSpecialties
  ])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  // Calculate specialty counts (for pills display) - count doctors in active country
  const specialtiesWithCount = specialtiesList.map(specialty => ({
    name: specialty,
    count: doctors.filter(d => d.specialty === specialty).length
  })).filter(s => s.count > 0);

  // Lista completa de ciudades del país activo + ciudades registradas en ese país
  const countryOfficialCities = getCitiesByState(activeCountry).map(c => c.name);
  const configCities = (settings?.cities || [])
    .filter((c: any) => typeof c === 'string' ? activeCountry === 'VE' : isSameCountry(c.country, activeCountry))
    .map((c: any) => typeof c === 'string' ? c : c.name)
    .filter(Boolean);
  const cities = Array.from(new Set([
    ...countryOfficialCities,
    ...configCities,
    ...doctors.map(d => d.city).filter(Boolean),
    ...clinics.map(c => c.city).filter((c): c is string => !!c),
    ...pharmacies.map(p => p.city).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  // Helper function for search matching
  const matchesSearch = (searchTerm: string, ...fields: (string | undefined | null)[]): boolean => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase().trim();
    return fields.some(field =>
      field && field.toLowerCase().includes(lowerSearch)
    );
  };

  // Helper para verificar si una ciudad pertenece a un estado/provincia del país activo
  const getCitiesForState = (stName: string): string[] => {
    if (stName === "all") return [];
    return getCitiesByState(activeCountry, stName).map(c => c.name.toLowerCase());
  };

  const selectedStateCities = stateFilter !== "all" ? getCitiesForState(stateFilter) : [];

  // Filter Logic - Doctores (ya aislados por país)
  const filteredDoctors = doctors.filter(doctor => {
    // Exclude doctors that belong to a clinic
    const isClinicDoctor = doctor.clinicId || doctor.isClinicEmployee;
    if (isClinicDoctor) return false;

    // Búsqueda en múltiples campos
    const insurancesString = doctor.acceptedInsurances?.join(' ') || '';
    const servicesString = doctor.services?.map(s => s.name).join(' ') || '';
    const addressesString = doctor.addresses?.map(a => `${a.name} ${a.address} ${a.city}`).join(' ') || '';

    const resolvedProf = doctor.profession || findProfessionBySpecialty(doctor.specialty, professionsCatalog)?.name || 'Médico';

    const matchesQuery = matchesSearch(
      query,
      doctor.name,           // Nombre completo
      resolvedProf,          // Profesión (Nivel 1)
      doctor.specialty,      // Especialidad (Nivel 2)
      doctor.city,           // Ciudad
      doctor.state,          // Estado
      doctor.address,        // Dirección
      doctor.sector,         // Sector/Zona
      doctor.description,    // Descripción del perfil
      insurancesString,      // Obras sociales aceptadas
      servicesString,        // Servicios que ofrece
      addressesString        // Consultorios
    );

    const matchesProfession = professionFilter === "all" || resolvedProf.toLowerCase() === professionFilter.toLowerCase();
    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty === specialtyFilter;

    // Filtro por Estado y Ciudad
    let matchesLocation = true;
    if (stateFilter !== "all") {
      const docStateMatches = doctor.state?.toLowerCase() === stateFilter.toLowerCase();
      const docCityInState = doctor.city && selectedStateCities.includes(doctor.city.toLowerCase());
      matchesLocation = Boolean(docStateMatches || docCityInState);
    }
    if (matchesLocation && cityFilter !== "all") {
      matchesLocation = doctor.city?.toLowerCase() === cityFilter.toLowerCase();
    }

    // Filtros Avanzados
    const fee = doctor.consultationFee || 0;
    const matchesPrice = fee >= minPrice && fee <= maxPrice;

    const rating = doctor.rating || 0;
    const matchesRating = rating >= minRating;

    const matchesVerified = !verifiedOnly || doctor.verificationStatus === 'verified';

    return matchesQuery && matchesProfession && matchesSpecialty && matchesLocation && matchesPrice && matchesRating && matchesVerified;
  });

  // Filter Logic - Clínicas (ya aisladas por país)
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

    // Clinics filter logic by state and city
    let matchesLocation = true;
    if (stateFilter !== "all") {
      const clinicStateMatches = clinic.state?.toLowerCase() === stateFilter.toLowerCase();
      const clinicCityInState = clinic.city && selectedStateCities.includes(clinic.city.toLowerCase());
      matchesLocation = Boolean(clinicStateMatches || clinicCityInState);
    }
    if (matchesLocation && cityFilter !== "all") {
      matchesLocation = clinic.city?.toLowerCase() === cityFilter.toLowerCase();
    }

    const rating = clinic.rating || 0;
    const matchesRating = rating >= minRating;

    return matchesStatus && matchesQuery && matchesLocation && matchesRating;
  });

  // Separar doctores: Médicos regulares vs Especialistas de Bienestar
  const regularDoctors = filteredDoctors.filter(
    doctor => !beautySpecialties.includes(doctor.specialty)
  );

  const wellnessDoctors = filteredDoctors.filter(
    doctor => beautySpecialties.includes(doctor.specialty)
  );

  // Doctores y Clínicas para el Mapa (Dentro del país activo)
  const mapDoctors = doctors.filter(doctor => {
    const isClinicDoctor = doctor.clinicId || doctor.isClinicEmployee;
    if (isClinicDoctor) return false;

    const insurancesString = doctor.acceptedInsurances?.join(' ') || '';
    const servicesString = doctor.services?.map(s => s.name).join(' ') || '';
    const addressesString = doctor.addresses?.map(a => `${a.name} ${a.address} ${a.city}`).join(' ') || '';

    const matchesQuery = matchesSearch(
      query,
      doctor.name,
      doctor.specialty,
      doctor.city,
      doctor.state,
      doctor.address,
      doctor.sector,
      doctor.description,
      insurancesString,
      servicesString,
      addressesString
    );

    const resolvedProf = doctor.profession || findProfessionBySpecialty(doctor.specialty, professionsCatalog)?.name || 'Médico';
    const matchesProfession = professionFilter === "all" || resolvedProf.toLowerCase() === professionFilter.toLowerCase();
    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty === specialtyFilter;
    const fee = doctor.consultationFee || 0;
    const matchesPrice = fee >= minPrice && fee <= maxPrice;
    const rating = doctor.rating || 0;
    const matchesRating = rating >= minRating;
    const matchesVerified = !verifiedOnly || doctor.verificationStatus === 'verified';

    return matchesQuery && matchesProfession && matchesSpecialty && matchesPrice && matchesRating && matchesVerified;
  });

  const mapClinics = clinics.filter(clinic => {
    const matchesStatus = clinic.verificationStatus === 'verified' && clinic.status === 'active';
    const insurancesString = clinic.acceptedInsurances?.join(' ') || '';

    const matchesQuery = matchesSearch(
      query,
      clinic.name,
      clinic.description,
      clinic.city,
      clinic.address,
      insurancesString
    );

    const rating = clinic.rating || 0;
    const matchesRating = rating >= minRating;

    return matchesStatus && matchesQuery && matchesRating;
  });

  // Filter Logic - Farmacias Aliadas (ya aisladas por país)
  const activePharmacies = pharmacies.filter(p => p.status === 'active' || !p.status);

  const filteredPharmacies = activePharmacies.filter(pharmacy => {
    const matchesQuery = matchesSearch(
      query,
      pharmacy.name,
      pharmacy.chainName,
      pharmacy.chain_name,
      pharmacy.branchName,
      pharmacy.branch_name,
      pharmacy.city,
      pharmacy.state,
      pharmacy.address
    );

    let matchesLocation = true;
    if (stateFilter !== "all") {
      const pharmacyCityInState = pharmacy.city && selectedStateCities.includes(pharmacy.city.toLowerCase());
      const pharmacyStateMatches = pharmacy.state?.toLowerCase() === stateFilter.toLowerCase();
      matchesLocation = Boolean(pharmacyCityInState || pharmacyStateMatches);
    }
    if (matchesLocation && cityFilter !== "all") {
      matchesLocation = pharmacy.city?.toLowerCase() === cityFilter.toLowerCase();
    }

    return matchesQuery && matchesLocation;
  });

  // Farmacias para el mapa
  const mapPharmacies = activePharmacies.filter(pharmacy => {
    return matchesSearch(
      query,
      pharmacy.name,
      pharmacy.chainName,
      pharmacy.chain_name,
      pharmacy.branchName,
      pharmacy.branch_name,
      pharmacy.city,
      pharmacy.state,
      pharmacy.address
    );
  });

  return (
    <div className="min-h-screen bg-neutral-50 selection:bg-secondary selection:text-white">
      <HeaderWrapper />

      <main className="pb-28 md:pb-20">
        {/* HERO & SEARCH SECTION - Compacto en móvil */}
        <section className="relative overflow-hidden bg-white pt-4 pb-4 md:pt-16 md:pb-12 shadow-sm border-b border-gray-100">
          {/* Background Animation */}
          <HealthBackground />

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

          {/* Toggle Lista / Mapa */}
          <MapViewToggle
            doctors={filteredDoctors}
            clinics={filteredClinics}
            pharmacies={filteredPharmacies}
            mapDoctors={mapDoctors}
            mapClinics={mapClinics}
            mapPharmacies={mapPharmacies}
            centerCity={cityFilter !== "all" ? cityFilter : (stateFilter !== "all" ? stateFilter : undefined)}
          >
            {/* 1. MÉDICOS PARTICULARES */}
            {regularDoctors.length > 0 && viewMode !== 'clinics' && viewMode !== 'pharmacies' && (
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
            {wellnessDoctors.length > 0 && viewMode !== 'clinics' && viewMode !== 'pharmacies' && (
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

            {/* 3. CLÍNICAS */}
            {filteredClinics.length > 0 && viewMode !== 'doctors' && viewMode !== 'pharmacies' && (
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {filteredClinics.map((clinic, index) => (
                    <ClinicCard key={clinic.id} clinic={clinic} priority={index < 3} />
                  ))}
                </div>
              </div>
            )}

            {/* 4. FARMACIAS ALIADAS */}
            {filteredPharmacies.length > 0 && viewMode !== 'doctors' && viewMode !== 'clinics' && (
              <div className="space-y-3 md:space-y-6">
                <div className="flex items-center justify-between border-b pb-2 md:pb-4 border-slate-200">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2 bg-emerald-500/10 rounded-lg">
                      <Pill className="h-4 w-4 md:h-6 md:w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base md:text-2xl font-bold text-slate-900">Farmacias Aliadas</h2>
                      <p className="text-slate-500 text-[10px] md:text-sm hidden md:block">
                        Dispensación y validación oficial de récipes médicos SUMA
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] md:text-sm font-semibold bg-emerald-50 text-emerald-700 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-emerald-100">
                    {filteredPharmacies.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                  {filteredPharmacies.map((pharmacy, index) => (
                    <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} priority={index < 3} />
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay resultados en ninguna categoría */}
            {regularDoctors.length === 0 && wellnessDoctors.length === 0 && filteredClinics.length === 0 && filteredPharmacies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 md:py-16 bg-white rounded-2xl md:rounded-3xl border border-dashed border-slate-200">
                <div className="bg-slate-50 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                  <Search className="h-6 w-6 md:h-8 md:w-8 text-slate-400" />
                </div>
                <h3 className="text-sm md:text-lg font-semibold text-slate-900 mb-1">No encontramos resultados</h3>
                <p className="text-xs md:text-base text-slate-500 max-w-sm text-center px-4">Prueba buscando por otra ciudad o término</p>
              </div>
            )}
          </MapViewToggle>

        </section>
      </main>

      {/* Navegación móvil tipo app */}
      <BottomNav />
    </div>
  );
}

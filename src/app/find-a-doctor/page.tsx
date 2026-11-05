import { HeaderWrapper, BottomNav } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { AlliedPharmaciesSection } from "@/components/pharmacy/pharmacy-card";
import {
  ExpandableDoctorsSection,
  ExpandableWellnessSection,
  ExpandableClinicsSection,
} from "@/components/directory-expandable-sections";
import { Search, Stethoscope, Heart, Activity, Sparkles } from "lucide-react";
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
    // La ficha individual del médico aparece en el buscador general si está activo, verificado
    // y su suscripción no está inactiva (incluye 'active' y 'pending_payment' una vez verificado).
    const hasActivePrivateConsultorio =
      doctor.status === 'active' &&
      doctor.verificationStatus === 'verified' &&
      doctor.subscriptionStatus !== 'inactive' &&
      (!doctor.isClinicEmployee || Boolean(doctor.lastPaymentDate) || doctor.subscriptionStatus === 'active');
    if (!hasActivePrivateConsultorio) return false;

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
    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty?.toLowerCase() === specialtyFilter.toLowerCase();

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
    const isHospitalGratuito = clinic.plan === 'hospital_gratuito' || clinic.institutionType === 'public_hospital';
    const matchesStatus =
      clinic.verificationStatus === 'verified' &&
      clinic.status === 'active' &&
      (isHospitalGratuito || clinic.subscriptionStatus !== 'inactive');

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
    const hasActivePrivateConsultorio =
      doctor.status === 'active' &&
      doctor.verificationStatus === 'verified' &&
      doctor.subscriptionStatus !== 'inactive' &&
      (!doctor.isClinicEmployee || Boolean(doctor.lastPaymentDate) || doctor.subscriptionStatus === 'active');
    if (!hasActivePrivateConsultorio) return false;

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
    const matchesSpecialty = specialtyFilter === "all" || doctor.specialty?.toLowerCase() === specialtyFilter.toLowerCase();
    const fee = doctor.consultationFee || 0;
    const matchesPrice = fee >= minPrice && fee <= maxPrice;
    const rating = doctor.rating || 0;
    const matchesRating = rating >= minRating;
    const matchesVerified = !verifiedOnly || doctor.verificationStatus === 'verified';

    return matchesQuery && matchesProfession && matchesSpecialty && matchesPrice && matchesRating && matchesVerified;
  });

  const mapClinics = clinics.filter(clinic => {
    const isHospitalGratuito = clinic.plan === 'hospital_gratuito' || clinic.institutionType === 'public_hospital';
    const matchesStatus =
      clinic.verificationStatus === 'verified' &&
      clinic.status === 'active' &&
      (isHospitalGratuito || clinic.subscriptionStatus !== 'inactive');
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

      <main className="pb-24 md:pb-16">
        {/* HERO & SEARCH SECTION - Compacto para subir el contenido */}
        <section className="relative overflow-hidden bg-white pt-3 pb-3 md:pt-7 md:pb-5 shadow-sm border-b border-gray-100">
          {/* Background Animation */}
          <HealthBackground />

          <div className="container mx-auto px-3 md:px-4 max-w-6xl space-y-2.5 md:space-y-4 relative z-10">
            {/* Título compacto */}
            <div className="text-center space-y-1">
              <h1 className="text-xl md:text-3xl font-bold md:font-extrabold text-slate-900 tracking-tight">
                Encuentra tu especialista
              </h1>
              <p className="text-xs md:text-sm text-slate-500 max-w-2xl mx-auto hidden md:block">
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
          </div>
        </section>

        {/* RESULTS SECTION */}
        <section className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-7xl space-y-5 md:space-y-10">

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
            {/* 1. MÉDICOS PARTICULARES (3 en fila horizontal + Ver más) */}
            {regularDoctors.length > 0 && viewMode !== 'clinics' && viewMode !== 'pharmacies' && (
              <ExpandableDoctorsSection
                doctors={regularDoctors}
                defaultExpanded={viewMode === 'doctors'}
              />
            )}

            {/* 2. ESPECIALISTAS DE BIENESTAR (3 en fila horizontal + Ver más) */}
            {wellnessDoctors.length > 0 && viewMode !== 'clinics' && viewMode !== 'pharmacies' && (
              <ExpandableWellnessSection
                doctors={wellnessDoctors}
                defaultExpanded={viewMode === 'doctors'}
              />
            )}

            {/* 3. CLÍNICAS (Carrusel horizontal de 2 tarjetas en vista Médicos/Todos + Grilla completa en vista Clínicas) */}
            {filteredClinics.length > 0 && viewMode !== 'pharmacies' && (
              <ExpandableClinicsSection
                clinics={filteredClinics}
                defaultExpanded={viewMode === 'clinics'}
                linkToClinicsView={viewMode !== 'clinics'}
              />
            )}

            {/* 4. FARMACIAS ALIADAS (Minitarjetas en 1 línea + desplegable + modal) */}
            {filteredPharmacies.length > 0 && viewMode !== 'doctors' && viewMode !== 'clinics' && (
              <AlliedPharmaciesSection
                pharmacies={filteredPharmacies}
                defaultExpanded={viewMode === 'pharmacies'}
              />
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

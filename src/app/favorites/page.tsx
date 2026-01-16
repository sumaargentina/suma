
"use client";
export const dynamic = 'force-dynamic';

import React, { useMemo, useEffect, useState } from "react";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { useAuth } from "@/lib/auth";
import * as supabaseService from '@/lib/supabaseService';
import { type Doctor, type Clinic } from "@/lib/types";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { Heart, Loader2, Stethoscope, Building2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function FavoritesPage() {
  const { user } = useAuth();
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [allClinics, setAllClinics] = useState<Clinic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [docs, clinics] = await Promise.all([
          supabaseService.getDoctors(),
          supabaseService.getClinics()
        ]);
        setAllDoctors(docs);
        setAllClinics(clinics);
      } catch (error) {
        console.error("Failed to fetch data for favorites.", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const favoriteDoctors = useMemo(() => {
    if (user?.role !== 'patient' || !user.favoriteDoctorIds) {
      return [];
    }
    return allDoctors.filter((doctor) =>
      user.favoriteDoctorIds!.includes(doctor.id)
    );
  }, [user, allDoctors]);

  const favoriteClinics = useMemo(() => {
    if (user?.role !== 'patient' || !user.favoriteClinicIds) {
      return [];
    }
    return allClinics.filter((clinic) =>
      user.favoriteClinicIds!.includes(clinic.id)
    );
  }, [user, allClinics]);

  const hasFavorites = favoriteDoctors.length > 0 || favoriteClinics.length > 0;

  if (user === undefined || isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <HeaderWrapper />
        <main className="container flex-1 flex flex-col items-center justify-center text-center py-20">
          <h1 className="text-2xl font-bold mb-4">Inicia sesión para ver tus favoritos</h1>
          <p className="text-muted-foreground mb-6">Debes tener una cuenta para guardar y ver tus favoritos.</p>
          <Button asChild>
            <Link href="/auth/login">Iniciar Sesión</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 bg-muted/40 pb-24 md:pb-0">
        <div className="container py-4 md:py-12">
          <div className="mb-4 md:mb-8">
            <h1 className="text-lg md:text-3xl font-bold font-headline flex items-center gap-2 mb-1 md:mb-2">
              <Heart className="text-red-500 h-5 w-5 md:h-8 md:w-8" />
              Mis Favoritos
            </h1>
            <p className="text-xs md:text-base text-muted-foreground">
              Médicos y clínicas que has guardado.
            </p>
          </div>

          {!hasFavorites ? (
            <div className="text-center py-10 md:py-20 bg-card rounded-lg border">
              <Heart className="h-10 w-10 md:h-16 md:w-16 text-muted-foreground mx-auto mb-2 md:mb-4" />
              <h2 className="text-base md:text-xl font-semibold">Aún no tienes favoritos</h2>
              <p className="text-xs md:text-base text-muted-foreground mt-1 md:mt-2 mb-4 md:mb-6">
                Haz clic en el corazón sobre una tarjeta para guardarla aquí.
              </p>
              <Button asChild size="sm" className="text-xs md:text-base">
                <Link href="/find-a-doctor">Explorar</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-10">
              {/* Médicos Favoritos */}
              {favoriteDoctors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <Stethoscope className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </div>
                    <h2 className="text-sm md:text-xl font-bold">Médicos</h2>
                    <span className="text-[10px] md:text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {favoriteDoctors.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
                    {favoriteDoctors.map((doctor) => (
                      <DoctorCard key={doctor.id} doctor={doctor} />
                    ))}
                  </div>
                </div>
              )}

              {/* Clínicas Favoritas */}
              {favoriteClinics.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3 md:mb-4">
                    <div className="p-1.5 bg-secondary/10 rounded-lg">
                      <Building2 className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                    </div>
                    <h2 className="text-sm md:text-xl font-bold">Clínicas</h2>
                    <span className="text-[10px] md:text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {favoriteClinics.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6">
                    {favoriteClinics.map((clinic) => (
                      <ClinicCard key={clinic.id} clinic={clinic} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

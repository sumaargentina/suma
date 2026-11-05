"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { Doctor, Clinic } from "@/lib/types";
import { DoctorCard } from "@/components/doctor-card";
import { ClinicCard } from "@/components/clinic/clinic-card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Sparkles, Heart, ChevronDown, ChevronUp, ChevronRight, Building2 } from "lucide-react";

interface ExpandableDoctorsSectionProps {
  doctors: Doctor[];
  defaultExpanded?: boolean;
}

export function ExpandableDoctorsSection({
  doctors,
  defaultExpanded = false,
}: ExpandableDoctorsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!doctors || doctors.length === 0) return null;

  // Mostrar 3 barras/tarjetas de médicos horizontalmente en computadora y luego "Ver más"
  const INITIAL_VISIBLE = 3;
  const hasMore = doctors.length > INITIAL_VISIBLE;
  const visibleDoctors = isExpanded ? doctors : doctors.slice(0, INITIAL_VISIBLE);
  const remainingCount = Math.max(0, doctors.length - INITIAL_VISIBLE);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between border-b pb-2 md:pb-3 border-slate-200">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-primary/10 rounded-lg">
            <Stethoscope className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-slate-900">Médicos</h2>
            <p className="text-slate-500 text-[10px] md:text-xs hidden md:block">
              Especialistas disponibles en tu ciudad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {doctors.length} {doctors.length === 1 ? "médico" : "médicos"}
          </span>

          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-7 px-2.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 gap-1 rounded-lg"
            >
              <span>{isExpanded ? "Ver menos" : "Ver más"}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* 3 tarjetas horizontales de médicos en computadora */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {visibleDoctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>

      {/* Botón desplegable "Ver más" / "Ver menos" */}
      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Mostrar menos médicos</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Ver más médicos ({remainingCount} más)</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface ExpandableWellnessSectionProps {
  doctors: Doctor[];
  defaultExpanded?: boolean;
}

export function ExpandableWellnessSection({
  doctors,
  defaultExpanded = false,
}: ExpandableWellnessSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!doctors || doctors.length === 0) return null;

  const INITIAL_VISIBLE = 3;
  const hasMore = doctors.length > INITIAL_VISIBLE;
  const visibleDoctors = isExpanded ? doctors : doctors.slice(0, INITIAL_VISIBLE);
  const remainingCount = Math.max(0, doctors.length - INITIAL_VISIBLE);

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between border-b pb-2 md:pb-3 border-slate-200">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-lg">
            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-pink-500" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-slate-900">Bienestar</h2>
            <p className="text-slate-500 text-[10px] md:text-xs hidden md:block">
              Estética y cuidado integral
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-semibold bg-gradient-to-r from-pink-50 to-purple-50 text-pink-600 px-2.5 py-1 rounded-full border border-pink-100">
            {doctors.length}
          </span>

          {hasMore && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-7 px-2.5 text-xs font-semibold text-pink-700 hover:text-pink-800 hover:bg-pink-50 gap-1 rounded-lg"
            >
              <span>{isExpanded ? "Ver menos" : "Ver más"}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {visibleDoctors.map(doctor => (
          <DoctorCard key={doctor.id} doctor={doctor} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-pink-50 text-pink-700 border border-pink-200 shadow-2xs transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Mostrar menos especialistas</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Ver más especialistas ({remainingCount} más)</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface ExpandableClinicsSectionProps {
  clinics: Clinic[];
  defaultExpanded?: boolean;
  linkToClinicsView?: boolean;
}

export function ExpandableClinicsSection({
  clinics,
  defaultExpanded = false,
  linkToClinicsView = false,
}: ExpandableClinicsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!clinics || clinics.length === 0) return null;

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between border-b pb-2 md:pb-3 border-slate-200">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-teal-50 rounded-lg border border-teal-100">
            <Building2 className="h-4 w-4 md:h-5 md:w-5 text-teal-700" />
          </div>
          <div>
            <h2 className="text-base md:text-xl font-bold text-slate-900">Clínicas y Centros</h2>
            <p className="text-slate-500 text-[10px] md:text-xs hidden md:block">
              Desliza horizontalmente o explora todas las instituciones afiliadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            {clinics.length} {clinics.length === 1 ? "centro" : "centros"}
          </span>

          {linkToClinicsView ? (
            <Link
              href="/find-a-doctor?view=clinics"
              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 rounded-lg transition-colors"
            >
              <span>Ver todas</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : clinics.length > 2 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              className="h-7 px-2.5 text-xs font-semibold text-teal-700 hover:text-teal-800 hover:bg-teal-50 gap-1 rounded-lg"
            >
              <span>{isExpanded ? "Ver menos" : "Ver todas"}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        /* Vista Expandida: Grilla completa (2 por fila en móvil/tablet, 3 en escritorio) */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
          {clinics.map((clinic, index) => (
            <ClinicCard key={clinic.id} clinic={clinic} priority={index < 4} />
          ))}
        </div>
      ) : (
        /* Vista Carrusel Horizontal: 2 tarjetas visibles en paralelo + deslizar con el dedo hacia las demás */
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-2.5 sm:gap-4 pb-2 -mx-1 px-1 scrollbar-thin">
          {clinics.map((clinic, index) => (
            <div
              key={clinic.id}
              className="w-[46%] min-w-[162px] sm:w-[47%] lg:w-[31.5%] shrink-0 snap-start"
            >
              <ClinicCard clinic={clinic} priority={index < 3} />
            </div>
          ))}
        </div>
      )}

      {!isExpanded && (
        <div className="flex justify-center pt-1">
          {linkToClinicsView ? (
            <Link
              href="/find-a-doctor?view=clinics"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs transition-all"
            >
              <span>Ver todas las clínicas ({clinics.length})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : clinics.length > 2 ? (
            <button
              type="button"
              onClick={() => setIsExpanded(prev => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs transition-all cursor-pointer"
            >
              <span>Ver todas las clínicas ({clinics.length})</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

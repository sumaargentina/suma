"use client";

import React, { useState } from "react";
import { MapPin, List } from "lucide-react";
import dynamic from "next/dynamic";
import type { Doctor, Clinic } from "@/lib/types";

// Dynamic import — MapLibre needs browser APIs, can't run on server
const DoctorMap = dynamic(() => import("@/components/doctor-map"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[500px] md:h-[600px] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-500 font-medium">Cargando mapa...</span>
            </div>
        </div>
    ),
});

import { cn } from "@/lib/utils";

interface MapViewToggleProps {
    doctors: Doctor[];
    clinics: Clinic[];
    mapDoctors?: Doctor[];
    mapClinics?: Clinic[];
    centerCity?: string;
    children: React.ReactNode; // The list view content
}

export function MapViewToggle({ doctors, clinics, mapDoctors, mapClinics, centerCity, children }: MapViewToggleProps) {
    const [view, setView] = useState<"list" | "map">("list");

    return (
        <div>
            {/* Toggle buttons */}
            <div className="flex items-center justify-center gap-1 mb-4 md:mb-6">
                <button
                    onClick={() => setView("list")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-l-full text-xs md:text-sm font-semibold transition-all duration-200 ${view === "list"
                            ? "bg-teal-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                >
                    <List className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Lista</span>
                </button>
                <button
                    onClick={() => setView("map")}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-r-full text-xs md:text-sm font-semibold transition-all duration-200 ${view === "map"
                            ? "bg-teal-600 text-white shadow-md"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                >
                    <MapPin className="h-3.5 w-3.5 md:h-4 md:w-4" />
                    <span>Mapa</span>
                </button>
            </div>

            {/* Map view */}
            {view === "map" && (
                <div className="mb-6 md:mb-10">
                    <DoctorMap
                        doctors={mapDoctors || doctors}
                        clinics={mapClinics || clinics}
                        centerCity={centerCity}
                    />
                </div>
            )}

            {/* List view — generous spacing between Médicos, Bienestar, Clínicas and bottom margin */}
            <div className={cn("space-y-8 md:space-y-16 pb-20 md:pb-28", view === "map" && "hidden")}>
                {children}
            </div>
        </div>
    );
}

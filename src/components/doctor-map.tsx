
"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import type { Doctor } from "@/lib/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import Link from "next/link";
import { Button } from "./ui/button";
import { Star, MapPin } from "lucide-react";

// Fix for default Leaflet marker icons not showing up in Next.js
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


const DoctorMapComponent = ({ doctors }: { doctors: Doctor[] }) => {
  if (typeof window === "undefined") {
    return null;
  }

  // Coordenadas de Argentina (centrado en Buenos Aires)
  const argentinaPosition: [number, number] = [-34.6037, -58.3816];

  return (
    <MapContainer
      center={argentinaPosition}
      zoom={6}
      scrollWheelZoom={true}
      className="h-[600px] w-full rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {doctors.map((doctor) => {
        const icon = L.divIcon({
          html: `<div class="bg-background rounded-full p-1 shadow-md border-2 border-primary"><img src="${doctor.profileImage || 'https://placehold.co/400x400.png'}" alt="${doctor.name}" class="rounded-full w-10 h-10 object-cover"></div>`,
          className: '',
          iconSize: [48, 48],
          iconAnchor: [24, 48],
          popupAnchor: [0, -48]
        });

        return (
          <Marker
            key={doctor.id}
            position={[doctor.lat, doctor.lng]}
            icon={icon}
          >
            <Popup>
              <div className="w-64">
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src={doctor.profileImage || 'https://placehold.co/400x400.png'}
                      alt={`Dr. ${doctor.name}`}
                      fill
                      sizes="64px"
                      className="rounded-lg object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-md font-bold leading-tight">{doctor.name}</h3>
                    <p className="text-primary font-medium text-sm">{doctor.specialty}</p>
                    <div className="flex items-center gap-1 text-xs mt-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-bold">{doctor.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-muted-foreground mt-2 text-xs">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p>{doctor.address}, {doctor.city}</p>
                </div>
                <Button className="w-full mt-3" size="sm" asChild>
                  <Link href={`/doctors/${doctor.id}`}>Reservar Cita</Link>
                </Button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

export default React.memo(DoctorMapComponent);

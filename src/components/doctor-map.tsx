"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Doctor, Clinic } from "@/lib/types";

// ─── Types ───────────────────────────────────────────

type MapItem = {
  id: string;
  doctorId?: string;
  type: "doctor" | "clinic";
  name: string;
  specialty?: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  profileImage?: string | null;
  consultationFee?: number;
  slug?: string;
};

type PublicHealthFacility = {
  id: number;
  name: string;
  type: "hospital" | "clinic" | "health_centre";
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  operator?: string;
  emergency?: boolean;
};

import { GEO_DATA, resolveLocation } from "@/lib/geo-data";

function toMapItems(doctors: Doctor[], clinics: Clinic[]): MapItem[] {
  const items: MapItem[] = [];

  doctors.forEach((d, i) => {
    let lat = Number(d.lat);
    let lng = Number(d.lng);

    if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat) || isNaN(lng)) {
      const resolved = resolveLocation(d.country || 'VE', d.state, d.city || 'Maturín');
      lat = resolved.lat;
      lng = resolved.lng;

      // Jitter determinista para que varios doctores en la misma ciudad no se tapen
      const angle = (i * 137.5) * (Math.PI / 180);
      const radius = 0.0035 * Math.sqrt((i % 12) + 1);
      lat += Math.sin(angle) * radius;
      lng += Math.cos(angle) * radius;
    }

    items.push({
      id: d.id,
      type: "doctor",
      name: d.name,
      specialty: d.specialty,
      address: d.address || d.city || "Consultorio Médico",
      city: d.city || "Maturín",
      lat,
      lng,
      rating: d.rating || 0,
      profileImage: d.profileImage,
      consultationFee: d.consultationFee,
    });

    if (d.addresses && d.addresses.length > 0) {
      d.addresses.forEach((addr, addrIdx) => {
        let addrLat = Number(addr.lat);
        let addrLng = Number(addr.lng);
        if (!addrLat || !addrLng || (addrLat === 0 && addrLng === 0) || isNaN(addrLat) || isNaN(addrLng)) {
          const resolved = resolveLocation(d.country || 'VE', undefined, addr.city || d.city || 'Maturín');
          addrLat = resolved.lat;
          addrLng = resolved.lng;
          const angle = ((i + addrIdx + 3) * 137.5) * (Math.PI / 180);
          const radius = 0.004 * Math.sqrt((addrIdx % 6) + 1);
          addrLat += Math.sin(angle) * radius;
          addrLng += Math.cos(angle) * radius;
        }

        items.push({
          id: `${d.id}-${addr.id || addrIdx}`,
          doctorId: d.id,
          type: "doctor",
          name: d.name,
          specialty: d.specialty,
          address: addr.address || addr.name || d.address || "",
          city: addr.city || d.city || "",
          lat: addrLat,
          lng: addrLng,
          rating: d.rating || 0,
          profileImage: d.profileImage,
          consultationFee: addr.consultationFee || d.consultationFee,
        });
      });
    }
  });

  clinics.forEach((c, i) => {
    let lat = Number((c as Record<string, unknown>).lat);
    let lng = Number((c as Record<string, unknown>).lng);

    if (!lat || !lng || (lat === 0 && lng === 0) || isNaN(lat) || isNaN(lng)) {
      const resolved = resolveLocation((c as Record<string, unknown>).country as string || 'VE', c.state, c.city || 'Maturín');
      lat = resolved.lat;
      lng = resolved.lng;

      const angle = ((i + 7) * 137.5) * (Math.PI / 180);
      const radius = 0.004 * Math.sqrt((i % 10) + 1);
      lat += Math.sin(angle) * radius;
      lng += Math.cos(angle) * radius;
    }

    items.push({
      id: c.id,
      type: "clinic",
      name: c.name,
      address: c.address || c.city || "Centro Médico",
      city: c.city || "",
      lat,
      lng,
      rating: c.rating || 0,
      profileImage: c.logoUrl,
      slug: c.slug,
    });
  });

  return items;
}

// In-memory cache for public health facilities in client
const publicFacilitiesCache = new Map<string, PublicHealthFacility[]>();

async function fetchPublicHealthFacilities(
  bounds: maplibregl.LngLatBounds
): Promise<PublicHealthFacility[]> {
  const s = bounds.getSouth();
  const w = bounds.getWest();
  const n = bounds.getNorth();
  const e = bounds.getEast();

  const cacheKey = `${s.toFixed(2)}_${w.toFixed(2)}_${n.toFixed(2)}_${e.toFixed(2)}`;
  if (publicFacilitiesCache.has(cacheKey)) {
    return publicFacilitiesCache.get(cacheKey)!;
  }

  try {
    const res = await fetch(`/api/overpass?s=${s}&w=${w}&n=${n}&e=${e}`);
    if (!res.ok) return [];

    const facilities: PublicHealthFacility[] = await res.json();
    publicFacilitiesCache.set(cacheKey, facilities);
    return facilities;
  } catch {
    return [];
  }
}

// ─── Marker creation ─────────────────────────────────

function createMarkerEl(item: MapItem): HTMLElement {
  const el = document.createElement("div");
  el.className = "maplibre-marker-custom";

  const isDoctor = item.type === "doctor";
  const borderColor = isDoctor ? "#0d9488" : "#6366f1";
  const bgColor = isDoctor ? "#f0fdfa" : "#eef2ff";

  el.innerHTML = `
    <div style="
      width: 44px; height: 44px; border-radius: 50%;
      border: 3px solid ${borderColor};
      background: ${bgColor};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
    ">
      ${item.profileImage
      ? `<img src="${item.profileImage}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<span style="font-size:18px;font-weight:700;color:${borderColor}">${item.name.charAt(0)}</span>`
    }
    </div>
    <div style="
      width:0; height:0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 8px solid ${borderColor};
      margin: -1px auto 0;
    "></div>
  `;

  el.addEventListener("mouseenter", () => {
    const inner = el.firstElementChild as HTMLElement;
    if (inner) {
      inner.style.transform = "scale(1.15)";
      inner.style.boxShadow = "0 4px 16px rgba(0,0,0,0.25)";
    }
  });
  el.addEventListener("mouseleave", () => {
    const inner = el.firstElementChild as HTMLElement;
    if (inner) {
      inner.style.transform = "scale(1)";
      inner.style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
    }
  });

  return el;
}

function createPublicHealthMarkerEl(facility: PublicHealthFacility): HTMLElement {
  const el = document.createElement("div");
  el.className = "maplibre-marker-public";

  const isHospital = facility.type === "hospital";
  const size = isHospital ? 36 : 30;
  const emoji = isHospital ? "🏥" : "🩺";

  el.innerHTML = `
    <div style="
      width: ${size}px; height: ${size}px; border-radius: 50%;
      border: 2.5px solid #16a34a;
      background: #f0fdf4;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      transition: transform 0.2s ease;
      font-size: ${isHospital ? 16 : 13}px;
    ">${emoji}</div>
    <div style="
      width:0; height:0;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 6px solid #16a34a;
      margin: -1px auto 0;
    "></div>
  `;

  el.addEventListener("mouseenter", () => {
    const inner = el.firstElementChild as HTMLElement;
    if (inner) inner.style.transform = "scale(1.15)";
  });
  el.addEventListener("mouseleave", () => {
    const inner = el.firstElementChild as HTMLElement;
    if (inner) inner.style.transform = "scale(1)";
  });

  return el;
}

function createPopupHTML(item: MapItem): string {
  const isDoctor = item.type === "doctor";
  const link = isDoctor ? `/doctors/${item.doctorId || item.id}` : `/clinica/${item.slug || item.id}`;
  const label = isDoctor ? "Reservar Cita" : "Ver Clínica";
  const badge = isDoctor
    ? `<span style="background:#f0fdfa;color:#0d9488;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${item.specialty || "Médico"}</span>`
    : `<span style="background:#eef2ff;color:#6366f1;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">Clínica</span>`;

  const stars = "★".repeat(Math.round(item.rating)) + "☆".repeat(5 - Math.round(item.rating));

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;width:240px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <div style="width:48px;height:48px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#f1f5f9;">
          ${item.profileImage
      ? `<img src="${item.profileImage}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;" />`
      : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#64748b;">${item.name.charAt(0)}</div>`
    }
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:14px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
          ${badge}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
        <span style="color:#eab308;font-size:12px;letter-spacing:1px;">${stars}</span>
        <span style="font-size:12px;color:#64748b;font-weight:600;">${item.rating.toFixed(1)}</span>
      </div>
      <div style="font-size:12px;color:#64748b;margin-bottom:8px;display:flex;align-items:start;gap:4px;">
        <span style="flex-shrink:0;">📍</span>
        <span>${item.address}${item.city ? `, ${item.city}` : ""}</span>
      </div>
      ${item.consultationFee ? `<div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:8px;">💲 $${item.consultationFee.toLocaleString()}</div>` : ""}
      <a href="${link}" style="
        display:block;text-align:center;
        background:#0d9488;color:white;
        padding:8px 16px;border-radius:8px;
        font-size:13px;font-weight:600;
        text-decoration:none;
        transition:background 0.2s;
      " onmouseover="this.style.background='#0f766e'" onmouseout="this.style.background='#0d9488'">${label}</a>
    </div>
  `;
}

function createPublicHealthPopupHTML(f: PublicHealthFacility): string {
  const typeLabel = f.type === "hospital" ? "Hospital Público" : f.type === "clinic" ? "Clínica Pública" : "Centro de Salud";
  const typeColor = f.type === "hospital" ? "#15803d" : "#16a34a";

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;width:220px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="font-size:24px;">${f.type === "hospital" ? "🏥" : "🩺"}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.3;">${f.name}</div>
          <span style="background:#f0fdf4;color:${typeColor};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600;">${typeLabel}</span>
        </div>
      </div>
      ${f.emergency ? `<div style="font-size:11px;color:#dc2626;font-weight:600;margin-bottom:4px;">🚨 Emergencias 24hs</div>` : ""}
      ${f.address ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px;display:flex;align-items:start;gap:4px;"><span>📍</span><span>${f.address}</span></div>` : ""}
      ${f.phone ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><span>📞</span><a href="tel:${f.phone}" style="color:#0d9488;text-decoration:none;font-weight:500;">${f.phone}</a></div>` : ""}
      ${f.operator ? `<div style="font-size:11px;color:#64748b;display:flex;align-items:center;gap:4px;"><span>🏛️</span><span>${f.operator}</span></div>` : ""}
      <div style="margin-top:8px;padding-top:6px;border-top:1px solid #e2e8f0;">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:8px;">
          <span style="font-size:14px;">💚</span>
          <span style="font-size:11px;font-weight:600;color:#16a34a;">Atención Gratuita</span>
        </div>
        <a href="https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}&query_place_id=${encodeURIComponent(f.name)}" target="_blank" rel="noopener noreferrer" style="
          display:flex;align-items:center;justify-content:center;gap:6px;
          background:#4285f4;color:white;
          padding:7px 12px;border-radius:8px;
          font-size:12px;font-weight:600;
          text-decoration:none;
          transition:background 0.2s;
        " onmouseover="this.style.background='#3367d6'" onmouseout="this.style.background='#4285f4'">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          Ver en Google Maps
        </a>
      </div>
    </div>
  `;
}

// ─── City Coordinates ────────────────────────────────

function getCityCoordinates(cityName?: string): [number, number] {
  if (!cityName || cityName === "all") {
    // Default Venezuela center (Maturín / Monagas)
    return [9.7469, -63.1831];
  }
  const resolved = resolveLocation('VE', undefined, cityName);
  if (resolved && resolved.lat && resolved.lng) {
    return [resolved.lat, resolved.lng];
  }
  return [9.7469, -63.1831];
}

// ─── Component ───────────────────────────────────────

interface DoctorMapProps {
  doctors: Doctor[];
  clinics: Clinic[];
  centerCity?: string;
}

export default function DoctorMapComponent({ doctors, clinics, centerCity }: DoctorMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPublicHealth, setShowPublicHealth] = useState(false);
  const [publicHealthLoading, setPublicHealthLoading] = useState(false);
  const [publicFacilityCount, setPublicFacilityCount] = useState(0);
  const publicMarkersRef = useRef<maplibregl.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    let center: [number, number] = getCityCoordinates(centerCity);
    let zoom = centerCity && centerCity !== "all" ? 12 : 6;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        name: "SUMA Map",
        sources: {
          "osm-tiles": {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          },
        },
        layers: [
          {
            id: "osm-tiles-layer",
            type: "raster",
            source: "osm-tiles",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [center[1], center[0]],
      zoom,
      attributionControl: {},
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(
      new maplibregl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      }),
      "top-right"
    );

    map.on("load", () => setMapLoaded(true));
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [centerCity]);

  // Add doctor/clinic markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const map = mapRef.current;
    const mapItems = toMapItems(doctors, clinics);
    const markers: maplibregl.Marker[] = [];

    for (const item of mapItems) {
      const el = createMarkerEl(item);
      const popup = new maplibregl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: "280px",
      }).setHTML(createPopupHTML(item));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .setPopup(popup)
        .addTo(map);

      markers.push(marker);
    }

    if (mapItems.length > 0) {
      if (centerCity && centerCity !== "all") {
        const centerCoords = getCityCoordinates(centerCity);
        map.flyTo({ center: [centerCoords[1], centerCoords[0]], zoom: 12, duration: 800 });
      } else {
        const bounds = new maplibregl.LngLatBounds();
        for (const item of mapItems) {
          bounds.extend([item.lng, item.lat]);
        }
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 1000 });
      }
    }

    return () => {
      for (const m of markers) m.remove();
    };
  }, [doctors, clinics, mapLoaded, centerCity]);

  // Load/unload public health facilities
  const loadPublicFacilities = useCallback(async () => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear existing
    for (const m of publicMarkersRef.current) m.remove();
    publicMarkersRef.current = [];
    setPublicFacilityCount(0);

    if (!showPublicHealth) return;

    setPublicHealthLoading(true);

    try {
      const bounds = map.getBounds();
      const facilities = await fetchPublicHealthFacilities(bounds);

      const markers: maplibregl.Marker[] = [];
      for (const f of facilities) {
        const el = createPublicHealthMarkerEl(f);
        const popup = new maplibregl.Popup({
          offset: 20,
          closeButton: true,
          closeOnClick: true,
          maxWidth: "260px",
        }).setHTML(createPublicHealthPopupHTML(f));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([f.lng, f.lat])
          .setPopup(popup)
          .addTo(map);

        markers.push(marker);
      }

      publicMarkersRef.current = markers;
      setPublicFacilityCount(facilities.length);
    } catch {
      console.warn("Failed to load public health facilities");
    } finally {
      setPublicHealthLoading(false);
    }
  }, [showPublicHealth]);

  // Trigger load when toggle changes or map moves
  useEffect(() => {
    if (!mapLoaded) return;
    loadPublicFacilities();

    const map = mapRef.current;
    if (!map || !showPublicHealth) return;

    let debounceTimer: NodeJS.Timeout;
    const onMoveEnd = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadPublicFacilities();
      }, 700);
    };

    map.on("moveend", onMoveEnd);

    return () => {
      clearTimeout(debounceTimer);
      map.off("moveend", onMoveEnd);
    };
  }, [showPublicHealth, mapLoaded, loadPublicFacilities]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div ref={mapContainerRef} className="w-full h-[500px] md:h-[600px]" />

      {/* Public Health Toggle — top left */}
      <button
        onClick={() => setShowPublicHealth((v) => !v)}
        className={`absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold shadow-lg transition-all duration-200 ${showPublicHealth
          ? "bg-green-600 text-white hover:bg-green-700"
          : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
      >
        <span className="text-sm">💚</span>
        <span>{showPublicHealth ? "Ocultar" : "Mostrar"} Salud Pública</span>
        {publicHealthLoading && (
          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {showPublicHealth && publicFacilityCount > 0 && !publicHealthLoading && (
          <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
            {publicFacilityCount}
          </span>
        )}
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-teal-600 bg-teal-50" />
          <span className="text-slate-600 font-medium">Médicos</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-indigo-50" />
          <span className="text-slate-600 font-medium">Clínicas</span>
        </div>
        {showPublicHealth && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-green-600 bg-green-50" />
            <span className="text-green-700 font-medium">Salud Pública</span>
          </div>
        )}
      </div>

      {/* Zoom hint for public health */}
      {showPublicHealth && publicFacilityCount === 0 && !publicHealthLoading && mapLoaded && (
        <div className="absolute top-16 left-3 z-10 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg shadow-sm max-w-[200px]">
          💡 Hacé zoom a una ciudad para ver centros de salud públicos
        </div>
      )}

      {/* Loading state */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500 font-medium">Cargando mapa...</span>
          </div>
        </div>
      )}
    </div>
  );
}

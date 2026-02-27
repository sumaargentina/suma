"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, Search, X, Loader2 } from "lucide-react";

interface LocationPickerProps {
    lat?: number;
    lng?: number;
    onLocationChange: (lat: number, lng: number) => void;
    city?: string;
    disabled?: boolean;
}

type NominatimResult = {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
};

// City centers for Argentina
const CITY_CENTERS: Record<string, [number, number]> = {
    "Buenos Aires": [-34.6037, -58.3816],
    "Córdoba": [-31.4201, -64.1888],
    "Rosario": [-32.9468, -60.6393],
    "Mendoza": [-32.8895, -68.8458],
    "Tucumán": [-26.8083, -65.2176],
    "La Plata": [-34.9205, -57.9536],
    "Mar del Plata": [-38.0023, -57.5575],
    "Salta": [-24.7821, -65.4232],
    "Santa Fe": [-31.6333, -60.7000],
    "San Juan": [-31.5375, -68.5364],
    "Resistencia": [-27.4513, -58.9868],
    "Posadas": [-27.3671, -55.8961],
    "Paraná": [-31.7320, -60.5238],
    "Neuquén": [-38.9516, -68.0591],
    "Formosa": [-26.1775, -58.1781],
    "Corrientes": [-27.4696, -58.8306],
    "Bahía Blanca": [-38.7183, -62.2663],
};

export function LocationPicker({ lat, lng, onLocationChange, city, disabled }: LocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markerRef = useRef<maplibregl.Marker | null>(null);
    const [mapOpen, setMapOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [locating, setLocating] = useState(false);
    const [selectedLat, setSelectedLat] = useState(lat || 0);
    const [selectedLng, setSelectedLng] = useState(lng || 0);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const hasLocation = selectedLat !== 0 || selectedLng !== 0;

    // Initialize map when opened
    useEffect(() => {
        if (!mapOpen || !mapContainerRef.current || mapRef.current) return;

        // Determine initial center
        let center: [number, number] = [-58.3816, -34.6037]; // Buenos Aires [lng, lat]
        let zoom = 5;

        if (selectedLat && selectedLng && (selectedLat !== 0 || selectedLng !== 0)) {
            center = [selectedLng, selectedLat];
            zoom = 16;
        } else if (city && CITY_CENTERS[city]) {
            const [clat, clng] = CITY_CENTERS[city];
            center = [clng, clat];
            zoom = 12;
        }

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: {
                version: 8,
                sources: {
                    "osm-tiles": {
                        type: "raster",
                        tiles: [
                            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                        ],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                    },
                },
                layers: [{
                    id: "osm-tiles-layer",
                    type: "raster",
                    source: "osm-tiles",
                    minzoom: 0,
                    maxzoom: 19,
                }],
            },
            center,
            zoom,
            attributionControl: {},
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");

        // Place marker if location exists
        if (selectedLat && selectedLng && (selectedLat !== 0 || selectedLng !== 0)) {
            const marker = new maplibregl.Marker({ color: "#0d9488", draggable: true })
                .setLngLat([selectedLng, selectedLat])
                .addTo(map);

            marker.on("dragend", () => {
                const pos = marker.getLngLat();
                setSelectedLat(pos.lat);
                setSelectedLng(pos.lng);
            });

            markerRef.current = marker;
        }

        // Click to place/move marker
        map.on("click", (e) => {
            const { lng: clickLng, lat: clickLat } = e.lngLat;
            setSelectedLat(clickLat);
            setSelectedLng(clickLng);

            if (markerRef.current) {
                markerRef.current.setLngLat([clickLng, clickLat]);
            } else {
                const marker = new maplibregl.Marker({ color: "#0d9488", draggable: true })
                    .setLngLat([clickLng, clickLat])
                    .addTo(map);

                marker.on("dragend", () => {
                    const pos = marker.getLngLat();
                    setSelectedLat(pos.lat);
                    setSelectedLng(pos.lng);
                });

                markerRef.current = marker;
            }
        });

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                try { mapRef.current.remove(); } catch { /* already removed */ }
                mapRef.current = null;
            }
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mapOpen]);

    // Geocoding search with Nominatim
    const searchAddress = useCallback(async (query: string) => {
        if (!query || query.length < 3) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const countryBias = "&countrycodes=ar";
            const cityBias = city ? `+${encodeURIComponent(city)}` : "";
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}${cityBias},+Argentina${countryBias}&limit=5&addressdetails=0`;

            const resp = await fetch(url, {
                headers: { "Accept-Language": "es" },
            });

            if (resp.ok) {
                const data: NominatimResult[] = await resp.json();
                setSearchResults(data);
            }
        } catch {
            console.warn("Nominatim search failed");
        } finally {
            setSearching(false);
        }
    }, [city]);

    // Debounced search
    const handleSearchInput = (value: string) => {
        setSearchQuery(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchAddress(value), 400);
    };

    // Select a search result
    const selectResult = (result: NominatimResult) => {
        const resultLat = parseFloat(result.lat);
        const resultLng = parseFloat(result.lon);
        setSelectedLat(resultLat);
        setSelectedLng(resultLng);
        setSearchResults([]);
        setSearchQuery(result.display_name.split(",")[0]);

        if (mapRef.current) {
            mapRef.current.flyTo({ center: [resultLng, resultLat], zoom: 17, duration: 1000 });

            if (markerRef.current) {
                markerRef.current.setLngLat([resultLng, resultLat]);
            } else {
                const marker = new maplibregl.Marker({ color: "#0d9488", draggable: true })
                    .setLngLat([resultLng, resultLat])
                    .addTo(mapRef.current);

                marker.on("dragend", () => {
                    const pos = marker.getLngLat();
                    setSelectedLat(pos.lat);
                    setSelectedLng(pos.lng);
                });

                markerRef.current = marker;
            }
        }
    };

    // Use browser geolocation
    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setLocating(true);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const geoLat = pos.coords.latitude;
                const geoLng = pos.coords.longitude;
                setSelectedLat(geoLat);
                setSelectedLng(geoLng);
                setLocating(false);

                if (mapRef.current) {
                    mapRef.current.flyTo({ center: [geoLng, geoLat], zoom: 17, duration: 1000 });

                    if (markerRef.current) {
                        markerRef.current.setLngLat([geoLng, geoLat]);
                    } else {
                        const marker = new maplibregl.Marker({ color: "#0d9488", draggable: true })
                            .setLngLat([geoLng, geoLat])
                            .addTo(mapRef.current);

                        marker.on("dragend", () => {
                            const p = marker.getLngLat();
                            setSelectedLat(p.lat);
                            setSelectedLng(p.lng);
                        });

                        markerRef.current = marker;
                    }
                }
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Confirm location
    const confirmLocation = () => {
        onLocationChange(selectedLat, selectedLng);
        setMapOpen(false);
        // Cleanup map
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
        }
    };

    // Cancel
    const cancelPicker = () => {
        setSelectedLat(lat || 0);
        setSelectedLng(lng || 0);
        setMapOpen(false);
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markerRef.current = null;
        }
    };

    if (!mapOpen) {
        return (
            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setMapOpen(true)}
                    disabled={disabled}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed transition-all duration-200 text-sm font-medium ${hasLocation
                        ? "border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100"
                        : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-400"
                        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                    <MapPin className="h-4 w-4" />
                    {hasLocation ? "📍 Ubicación marcada — Click para ajustar" : "📍 Marcar ubicación en el mapa"}
                </button>
                {hasLocation && (
                    <p className="text-[10px] text-teal-600 text-center">
                        Lat: {selectedLat.toFixed(5)}, Lng: {selectedLng.toFixed(5)}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                    <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-teal-600" />
                        Seleccioná tu ubicación
                    </h3>
                    <button type="button" onClick={cancelPicker} className="text-slate-400 hover:text-slate-600">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Search bar */}
                <div className="px-4 py-3 border-b space-y-2">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchInput(e.target.value)}
                                placeholder="Buscar dirección..."
                                className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                            />
                            {searching && (
                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={useMyLocation}
                            disabled={locating}
                            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition-colors shrink-0 disabled:opacity-50"
                        >
                            {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Mi ubicación</span>
                        </button>
                    </div>

                    {/* Search results dropdown */}
                    {searchResults.length > 0 && (
                        <div className="border rounded-lg bg-white shadow-lg max-h-40 overflow-y-auto">
                            {searchResults.map((r) => (
                                <button
                                    type="button"
                                    key={r.place_id}
                                    onClick={() => selectResult(r)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 border-b last:border-b-0 transition-colors"
                                >
                                    <span className="text-slate-700 line-clamp-1">{r.display_name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Map */}
                <div className="flex-1 min-h-[300px]">
                    <div ref={mapContainerRef} className="w-full h-[350px] md:h-[400px]" />
                </div>

                {/* Help text */}
                <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                    💡 Podés hacer click en el mapa para mover el marcador, o arrastrarlo a la posición exacta.
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
                    <div className="text-xs text-slate-500">
                        {selectedLat !== 0 || selectedLng !== 0 ? (
                            <span className="text-teal-600 font-medium">
                                📍 {selectedLat.toFixed(5)}, {selectedLng.toFixed(5)}
                            </span>
                        ) : (
                            "Seleccioná un punto en el mapa"
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={cancelPicker}
                            className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={confirmLocation}
                            disabled={selectedLat === 0 && selectedLng === 0}
                            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            ✓ Confirmar ubicación
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

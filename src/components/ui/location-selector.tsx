"use client";

import React, { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getSupportedCountries,
  getStatesByCountry,
  getCitiesByState,
  getCoordinates,
  normalizeGeoText,
} from '@/lib/geo-data';
import { useSettings } from '@/lib/settings';

export interface LocationData {
  country: string;
  state: string;
  city: string;
  sector?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface LocationSelectorProps {
  country?: string;
  state?: string;
  city?: string;
  sector?: string;
  address?: string;
  onLocationChange: (data: LocationData) => void;
  showAddressFields?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  errors?: {
    country?: string;
    state?: string;
    city?: string;
    sector?: string;
    address?: string;
  };
}

export function LocationSelector({
  country = 'VE',
  state = '',
  city = '',
  sector = '',
  address = '',
  onLocationChange,
  showAddressFields = true,
  disabled = false,
  compact = false,
  className = '',
  errors,
}: LocationSelectorProps) {
  const { countries: dynamicCountries, states: dynamicStates, cities: dynamicCities } = useSettings();

  // 1. Países disponibles (Deduplicados)
  const countries = useMemo(() => {
    let rawCountries: { code: string; name: string; flag: string; phoneCode: string; currency: string }[] = [];
    if (dynamicCountries && dynamicCountries.length > 0) {
      rawCountries = dynamicCountries.map(c => ({
        code: c.code.toUpperCase(),
        name: c.name,
        flag: c.flag || '🏳️',
        phoneCode: c.phoneCode || '+1',
        currency: c.currency || 'USD'
      }));
    }
    if (rawCountries.length === 0) {
      rawCountries = getSupportedCountries().map(c => ({
        code: c.code.toUpperCase(),
        name: c.name,
        flag: c.flag,
        phoneCode: c.phoneCode,
        currency: 'USD'
      }));
    }
    const seen = new Set<string>();
    const unique: typeof rawCountries = [];
    for (const c of rawCountries) {
      if (!seen.has(c.code)) {
        seen.add(c.code);
        unique.push(c);
      }
    }
    return unique;
  }, [dynamicCountries]);

  const currentCountry = useMemo(() => {
    if (!country) return countries[0]?.code || 'VE';
    const q = normalizeGeoText(country);
    const found = countries.find(c => normalizeGeoText(c.code) === q || normalizeGeoText(c.name) === q);
    if (found) return found.code;
    if (q === 'venezuela' || q === 've') return 'VE';
    if (q === 'argentina' || q === 'ar') return 'AR';
    return country.length === 2 ? country.toUpperCase() : (countries[0]?.code || 'VE');
  }, [country, countries]);

  // 2. Estados disponibles (Deduplicados y filtrados por país actual)
  const states = useMemo(() => {
    let rawStates: { name: string; code: string }[] = [];
    const countryQuery = normalizeGeoText(currentCountry);

    if (dynamicStates && dynamicStates.length > 0) {
      const filtered = dynamicStates.filter(s => {
        const sCountry = s.country ? normalizeGeoText(s.country) : 've';
        return sCountry === countryQuery || (sCountry === 'venezuela' && countryQuery === 've');
      });
      if (filtered.length > 0) {
        rawStates = filtered.map(s => ({
          name: s.name.trim(),
          code: s.code || s.name.trim().substring(0, 3).toUpperCase()
        }));
      }
    }
    if (rawStates.length === 0) {
      rawStates = getStatesByCountry(currentCountry).map(s => ({
        name: s.name.trim(),
        code: s.code
      }));
    }
    const seen = new Set<string>();
    const unique: { name: string; code: string }[] = [];
    for (const s of rawStates) {
      const key = normalizeGeoText(s.name);
      if (!seen.has(key) && s.name) {
        seen.add(key);
        unique.push(s);
      }
    }
    return unique;
  }, [dynamicStates, currentCountry]);

  // Encontrar el nombre exacto de estado que coincida con la lista (para valor en Select)
  const matchedState = useMemo(() => {
    if (!state) return '';
    const q = normalizeGeoText(state);
    const found = states.find(s => normalizeGeoText(s.name) === q);
    return found ? found.name : state;
  }, [states, state]);

  // 3. Ciudades disponibles (Deduplicadas y filtradas por estado actual)
  const cities = useMemo(() => {
    if (!matchedState) return [];
    let rawCities: { name: string; lat: number; lng: number }[] = [];
    const stateQuery = normalizeGeoText(matchedState);
    const countryQuery = normalizeGeoText(currentCountry);

    if (dynamicCities && dynamicCities.length > 0) {
      const filtered = dynamicCities.filter(c => {
        const cCountry = c.country ? normalizeGeoText(c.country) : 've';
        const matchCountry = cCountry === countryQuery || (cCountry === 'venezuela' && countryQuery === 've');
        const matchState = normalizeGeoText(c.state || '') === stateQuery;
        return matchCountry && matchState;
      });
      if (filtered.length > 0) {
        rawCities = filtered.map(c => ({
          name: c.name.trim(),
          lat: c.lat || 0,
          lng: c.lng || 0
        }));
      }
    }

    if (rawCities.length === 0) {
      rawCities = getCitiesByState(currentCountry, matchedState).map(c => ({
        name: c.name.trim(),
        lat: c.lat,
        lng: c.lng
      }));
    }

    const seen = new Set<string>();
    const unique: { name: string; lat: number; lng: number }[] = [];
    for (const c of rawCities) {
      const key = normalizeGeoText(c.name);
      if (!seen.has(key) && c.name) {
        seen.add(key);
        unique.push(c);
      }
    }
    return unique;
  }, [dynamicCities, currentCountry, matchedState]);

  // Encontrar el nombre exacto de ciudad que coincida con la lista (para valor en Select)
  const matchedCity = useMemo(() => {
    if (!city) return '';
    const q = normalizeGeoText(city);
    const found = cities.find(c => normalizeGeoText(c.name) === q);
    return found ? found.name : city;
  }, [cities, city]);

  // Manejar cambio de País
  const handleCountryChange = (newCountry: string) => {
    const normCountry = normalizeGeoText(newCountry);
    let firstState = '';
    if (dynamicStates && dynamicStates.length > 0) {
      const filtered = dynamicStates.filter(s => {
        const sCountry = s.country ? normalizeGeoText(s.country) : 've';
        return sCountry === normCountry || (sCountry === 'venezuela' && normCountry === 've');
      });
      if (filtered.length > 0) firstState = filtered[0].name.trim();
    }
    if (!firstState) {
      const fallbackStates = getStatesByCountry(newCountry);
      firstState = fallbackStates[0]?.name || '';
    }

    let firstCity = '';
    let coords = { lat: 0, lng: 0 };
    if (firstState) {
      const stateQuery = normalizeGeoText(firstState);
      if (dynamicCities && dynamicCities.length > 0) {
        const filteredCities = dynamicCities.filter(c => {
          const cCountry = c.country ? normalizeGeoText(c.country) : 've';
          const matchCountry = cCountry === normCountry || (cCountry === 'venezuela' && normCountry === 've');
          const matchState = normalizeGeoText(c.state || '') === stateQuery;
          return matchCountry && matchState;
        });
        if (filteredCities.length > 0) {
          firstCity = filteredCities[0].name.trim();
          coords = { lat: filteredCities[0].lat || 0, lng: filteredCities[0].lng || 0 };
        }
      }
      if (!firstCity) {
        const fallbackCities = getCitiesByState(newCountry, firstState);
        firstCity = fallbackCities[0]?.name || '';
        coords = getCoordinates(newCountry, firstState, firstCity);
      }
    }

    onLocationChange({
      country: newCountry,
      state: firstState,
      city: firstCity,
      sector: '',
      address,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  // Manejar cambio de Estado
  const handleStateChange = (newState: string) => {
    let firstCity = '';
    let coords = { lat: 0, lng: 0 };
    const stateQuery = normalizeGeoText(newState);
    const countryQuery = normalizeGeoText(currentCountry);

    if (dynamicCities && dynamicCities.length > 0) {
      const filteredCities = dynamicCities.filter(c => {
        const cCountry = c.country ? normalizeGeoText(c.country) : 've';
        const matchCountry = cCountry === countryQuery || (cCountry === 'venezuela' && countryQuery === 've');
        const matchState = normalizeGeoText(c.state || '') === stateQuery;
        return matchCountry && matchState;
      });
      if (filteredCities.length > 0) {
        firstCity = filteredCities[0].name.trim();
        coords = { lat: filteredCities[0].lat || 0, lng: filteredCities[0].lng || 0 };
      }
    }

    if (!firstCity) {
      const fallbackCities = getCitiesByState(currentCountry, newState);
      firstCity = fallbackCities[0]?.name || '';
      coords = getCoordinates(currentCountry, newState, firstCity);
    }

    onLocationChange({
      country: currentCountry,
      state: newState,
      city: firstCity,
      sector,
      address,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  // Manejar cambio de Ciudad
  const handleCityChange = (newCity: string) => {
    let coords = { lat: 0, lng: 0 };
    const stateQuery = normalizeGeoText(matchedState);
    const countryQuery = normalizeGeoText(currentCountry);
    const cityQuery = normalizeGeoText(newCity);

    if (dynamicCities && dynamicCities.length > 0) {
      const found = dynamicCities.find(c => {
        const cCountry = c.country ? normalizeGeoText(c.country) : 've';
        const matchCountry = cCountry === countryQuery || (cCountry === 'venezuela' && countryQuery === 've');
        const matchState = normalizeGeoText(c.state || '') === stateQuery;
        const matchCity = normalizeGeoText(c.name) === cityQuery;
        return matchCountry && matchState && matchCity;
      });
      if (found) {
        coords = { lat: found.lat || 0, lng: found.lng || 0 };
      }
    }
    if (!coords.lat && !coords.lng) {
      coords = getCoordinates(currentCountry, matchedState, newCity);
    }

    onLocationChange({
      country: currentCountry,
      state: matchedState,
      city: newCity,
      sector,
      address,
      lat: coords.lat,
      lng: coords.lng,
    });
  };

  // Manejar Sector
  const handleSectorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onLocationChange({
      country: currentCountry,
      state: matchedState,
      city: matchedCity,
      sector: e.target.value,
      address,
    });
  };

  // Manejar Dirección
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onLocationChange({
      country: currentCountry,
      state: matchedState,
      city: matchedCity,
      sector,
      address: e.target.value,
    });
  };

  return (
    <div className={`space-y-3 md:space-y-4 ${className}`}>
      {/* Geographic Cascading Selectors: País -> Estado -> Ciudad */}
      <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3`}>
        {/* Country */}
        <div className="space-y-1.5">
          <Label className="text-xs md:text-sm font-medium">
            País <span className="text-destructive">*</span>
          </Label>
          <Select
            value={currentCountry || undefined}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
              <SelectValue placeholder="Selecciona un país" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.country && (
            <p className="text-[11px] text-destructive">{errors.country}</p>
          )}
        </div>

        {/* State */}
        <div className="space-y-1.5">
          <Label className="text-xs md:text-sm font-medium">
            Estado / Provincia <span className="text-destructive">*</span>
          </Label>
          <Select
            value={matchedState || undefined}
            onValueChange={handleStateChange}
            disabled={disabled || states.length === 0}
          >
            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
              <SelectValue placeholder={states.length === 0 ? "Sin estados" : "Selecciona un estado"} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {states.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.state && (
            <p className="text-[11px] text-destructive">{errors.state}</p>
          )}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <Label className="text-xs md:text-sm font-medium">
            Ciudad / Municipio <span className="text-destructive">*</span>
          </Label>
          <Select
            value={matchedCity || undefined}
            onValueChange={handleCityChange}
            disabled={disabled || cities.length === 0}
          >
            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
              <SelectValue placeholder={!matchedState ? "Primero elige un estado" : "Selecciona una ciudad"} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {cities.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.city && (
            <p className="text-[11px] text-destructive">{errors.city}</p>
          )}
        </div>
      </div>

      {/* Address & Sector Details */}
      {showAddressFields && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="location-sector" className="text-xs md:text-sm font-medium">
              Sector / Urbanización / Zona
            </Label>
            <Input
              id="location-sector"
              name="sector"
              value={sector || ''}
              onChange={handleSectorChange}
              placeholder="Ej: Tipuro, Las Mercedes, Centro"
              className="h-9 md:h-10 text-xs md:text-sm"
              disabled={disabled}
            />
            {errors?.sector && (
              <p className="text-[11px] text-destructive">{errors.sector}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location-address" className="text-xs md:text-sm font-medium">
              Dirección Detallada <span className="text-destructive">*</span>
            </Label>
            <Input
              id="location-address"
              name="address"
              value={address || ''}
              onChange={handleAddressChange}
              placeholder="Ej: Av. Principal, Edif. Centro Médico, Piso 3, Consultorio 302"
              className="h-9 md:h-10 text-xs md:text-sm"
              disabled={disabled}
            />
            {errors?.address && (
              <p className="text-[11px] text-destructive">{errors.address}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

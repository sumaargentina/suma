"use client";

import { useState, useEffect } from 'react';
import { getDoctors, getSettings } from '@/lib/supabaseService';
import { Doctor, AppSettings } from '@/lib/types';

interface CityWithCount {
  name: string;
  doctorCount: number;
}

interface SpecialtyWithCount {
  name: string;
  doctorCount: number;
}

interface DynamicData {
  specialties: string[];
  cities: string[];
  // Nuevos campos con conteos
  citiesWithCount: CityWithCount[];
  specialtiesWithCount: SpecialtyWithCount[];
  totalActiveDoctors: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDynamicData(): DynamicData {
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesWithCount, setCitiesWithCount] = useState<CityWithCount[]>([]);
  const [specialtiesWithCount, setSpecialtiesWithCount] = useState<SpecialtyWithCount[]>([]);
  const [totalActiveDoctors, setTotalActiveDoctors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todos los doctores
      const doctorsData = await getDoctors();

      // Filtrar solo doctores activos
      const activeDoctors = doctorsData.filter(d => d.status === 'active');
      setTotalActiveDoctors(activeDoctors.length);

      // Obtener configuración de settings
      const settingsData = await getSettings();

      // Contar médicos por ciudad (solo activos)
      const cityCountMap = new Map<string, number>();
      activeDoctors.forEach(d => {
        if (d.city) {
          cityCountMap.set(d.city, (cityCountMap.get(d.city) || 0) + 1);
        }
      });

      // Contar médicos por especialidad (solo activos)
      const specialtyCountMap = new Map<string, number>();
      activeDoctors.forEach(d => {
        if (d.specialty) {
          specialtyCountMap.set(d.specialty, (specialtyCountMap.get(d.specialty) || 0) + 1);
        }
      });

      // Crear array de ciudades con conteos, ordenado por cantidad de médicos
      const citiesWithCountArray: CityWithCount[] = Array.from(cityCountMap.entries())
        .map(([name, doctorCount]) => ({ name, doctorCount }))
        .sort((a, b) => b.doctorCount - a.doctorCount);

      // Crear array de especialidades con conteos, ordenado por cantidad de médicos
      const specialtiesWithCountArray: SpecialtyWithCount[] = Array.from(specialtyCountMap.entries())
        .map(([name, doctorCount]) => ({ name, doctorCount }))
        .sort((a, b) => b.doctorCount - a.doctorCount);

      // Extraer solo los nombres para compatibilidad
      const doctorSpecialties = specialtiesWithCountArray.map(s => s.name);
      const doctorCities = citiesWithCountArray.map(c => c.name);

      // Combinar con especialidades configuradas
      const configSpecialties = settingsData?.specialties || [];
      const allSpecialties = [...new Set([...doctorSpecialties, ...configSpecialties])].sort();

      // Combinar con ciudades configuradas
      const configCities = settingsData?.cities?.map(c => c.name) || [];
      const allCities = [...new Set([...doctorCities, ...configCities])].sort();

      setSpecialties(allSpecialties);
      setCities(allCities);
      setCitiesWithCount(citiesWithCountArray);
      setSpecialtiesWithCount(specialtiesWithCountArray);

    } catch (err) {
      console.error('Error al obtener datos dinámicos:', err);
      setError('Error al cargar los datos de especialidades y ciudades');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    specialties,
    cities,
    citiesWithCount,
    specialtiesWithCount,
    totalActiveDoctors,
    loading,
    error,
    refresh: fetchData
  };
}

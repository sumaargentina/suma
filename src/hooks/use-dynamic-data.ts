"use client";

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Doctor, AppSettings } from '@/lib/types';

interface DynamicData {
  specialties: string[];
  cities: string[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDynamicData(): DynamicData {
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Obtener todos los doctores
      const doctorsSnapshot = await getDocs(collection(db, 'doctors'));
      const doctorsData = doctorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Doctor[];
      
      // Obtener configuración de settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
      const settingsData = settingsDoc.exists() ? settingsDoc.data() as AppSettings : null;
      
      // Extraer especialidades únicas de doctores
      const doctorSpecialties = [...new Set(
        doctorsData
          .map(d => d.specialty)
          .filter(Boolean)
      )];
      
      // Extraer ciudades únicas de doctores
      const doctorCities = [...new Set(
        doctorsData
          .map(d => d.city)
          .filter(Boolean)
      )];
      
      // Combinar con especialidades configuradas
      const configSpecialties = settingsData?.specialties || [];
      const allSpecialties = [...new Set([...doctorSpecialties, ...configSpecialties])].sort();
      
      // Combinar con ciudades configuradas
      const configCities = settingsData?.cities?.map(c => c.name) || [];
      const allCities = [...new Set([...doctorCities, ...configCities])].sort();
      
      setSpecialties(allSpecialties);
      setCities(allCities);
      
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
    loading,
    error,
    refresh: fetchData
  };
}

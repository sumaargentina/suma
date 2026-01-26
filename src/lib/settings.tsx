
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import * as supabaseService from './supabaseService';
import type { AppSettings, Coupon, CompanyExpense, BankDetail, City } from './types';
import { useToast } from '@/hooks/use-toast';

interface SettingsContextType {
  settings: AppSettings | null;
  cities: City[];
  specialties: string[];
  beautySpecialties: string[];
  timezone: string;
  logoUrl: string;
  heroImageUrl: string;
  currency: string;
  companyBankDetails: BankDetail[];
  companyExpenses: CompanyExpense[];
  coupons: Coupon[];
  billingCycleStartDay: number;
  billingCycleEndDay: number;

  updateSetting: (key: keyof AppSettings, value: unknown) => Promise<void>;

  addListItem: (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', item: City | string | Omit<BankDetail, 'id'> | Omit<CompanyExpense, 'id'> | Omit<Coupon, 'id'>) => Promise<void>;
  updateListItem: (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', itemId: string, newItem: City | string | BankDetail | CompanyExpense | Coupon) => Promise<void>;
  deleteListItem: (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', itemToDeleteIdOrName: string) => Promise<void>;
  isLoading: boolean;
}

const skeletonContextValue: SettingsContextType = {
  settings: null,
  cities: [],
  specialties: [],
  beautySpecialties: [],
  timezone: '',
  logoUrl: '',
  heroImageUrl: '',
  currency: 'USD',
  companyBankDetails: [],
  companyExpenses: [],
  coupons: [],
  billingCycleStartDay: 1,
  billingCycleEndDay: 6,
  updateSetting: async () => { },
  addListItem: async () => { },
  updateListItem: async () => { },
  deleteListItem: async () => { },
  isLoading: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Fetching settings...');
      let settingsData = await supabaseService.getSettings();
      console.log('📋 Settings data received:', settingsData);

      // Si no existe configuración, crear configuración vacía
      if (!settingsData) {
        console.log('❌ No settings found, creating empty settings...');
        const emptySettings = {
          cities: [],
          specialties: [],
          beautySpecialties: [],
          coupons: [],
          companyBankDetails: [],
          companyExpenses: [],
          currency: 'USD',
          timezone: 'America/Caracas',
          logoUrl: '',
          heroImageUrl: '',
          billingCycleStartDay: 1,
          billingCycleEndDay: 6
        };

        await supabaseService.updateSettings(emptySettings);
        settingsData = await supabaseService.getSettings();
        console.log('✅ Empty settings created:', settingsData);
        toast({ title: "Configuración Creada", description: "Se ha creado la configuración inicial vacía del sistema." });
      }

      if (settingsData && (!settingsData.coupons || !settingsData.companyExpenses || !settingsData.companyBankDetails)) {
        // En Supabase ya no necesitamos migrar desde colecciones antiguas
        // Simplemente aseguramos que los arrays existan
        const settingsUpdate: Partial<AppSettings> = {};
        let needsUpdate = false;

        if (!settingsData.coupons) {
          settingsUpdate.coupons = [];
          needsUpdate = true;
        }
        if (!settingsData.companyExpenses) {
          settingsUpdate.companyExpenses = [];
          needsUpdate = true;
        }
        if (!settingsData.companyBankDetails) {
          settingsUpdate.companyBankDetails = [];
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log("Initializing missing settings arrays...");
          await supabaseService.updateSettings(settingsUpdate);
          settingsData = await supabaseService.getSettings();
        }
      }

      console.log('✅ Final settings data:', settingsData);
      setSettings(settingsData);
    } catch (error) {
      console.error("❌ Failed to fetch settings:", error);
      toast({ variant: 'destructive', title: "Error de Carga", description: "No se pudo cargar la configuración." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateSetting = useCallback(async (key: keyof AppSettings, value: unknown) => {
    if (!settings) {
      return;
    }

    // Filtrar campos undefined del valor antes de enviar a Supabase
    const cleanValue = value;
    if (typeof cleanValue === 'object' && cleanValue !== null) {
      Object.keys(cleanValue).forEach(k => {
        if ((cleanValue as Record<string, unknown>)[k] === undefined) {
          delete (cleanValue as Record<string, unknown>)[k];
        }
      });
    }

    const newSettings = { ...settings, [key]: cleanValue };

    try {
      await supabaseService.updateSettings({ [key]: cleanValue });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error al actualizar configuración:', error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }, [settings]);

  const addListItem = useCallback(async (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', item: City | string | Omit<BankDetail, 'id'> | Omit<CompanyExpense, 'id'> | Omit<Coupon, 'id'>) => {
    if (!settings) {
      return;
    }

    const list = (settings[listName] as unknown[]) || [];

    // Check for duplicates
    if (listName === 'cities' && typeof item === 'object' && 'name' in item && list.some(c => typeof c === 'object' && c !== null && 'name' in c && typeof ((c as Record<string, unknown>).name) === 'string' && ((c as Record<string, unknown>).name as string).toLowerCase() === (item as City).name.toLowerCase())) {
      toast({ variant: 'destructive', title: 'Elemento duplicado', description: `La ciudad "${(item as City).name}" ya existe.` });
      return;
    }
    if (listName === 'specialties' && typeof item === 'string' && list.map(i => typeof i === 'string' ? (i as string).toLowerCase() : '').includes(item.toLowerCase())) {
      toast({ variant: 'destructive', title: 'Elemento duplicado', description: `"${item}" ya existe en la lista.` });
      return;
    }
    if (listName === 'coupons' && typeof item === 'object' && 'code' in item && list.some(c => typeof c === 'object' && c !== null && 'code' in c && typeof ((c as Record<string, unknown>).code) === 'string' && ((c as Record<string, unknown>).code as string).toUpperCase() === (item as Omit<Coupon, 'id'>).code.toUpperCase())) {
      toast({ variant: 'destructive', title: 'Elemento duplicado', description: `El cupón "${(item as Omit<Coupon, 'id'>).code}" ya existe.` });
      return;
    }

    let newItem;
    if (listName === 'companyExpenses' || listName === 'companyBankDetails' || listName === 'coupons') {
      // Limpiar campos undefined del item antes de crear el nuevo elemento
      if (typeof item === 'object') {
        const cleanItem = { ...item } as Record<string, unknown>;
        Object.keys(cleanItem).forEach(k => {
          if (cleanItem[k] === undefined) {
            delete cleanItem[k];
          }
        });
        newItem = { ...cleanItem, id: `${listName}-${Date.now()}` };
      } else {
        newItem = item;
      }
    } else {
      newItem = item;
    }

    const newList = [...list, newItem];

    try {
      await updateSetting(listName, newList);
    } catch (error) {
      console.error('Error al agregar elemento:', error);
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  }, [settings, updateSetting, toast]);

  const updateListItem = useCallback(async (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', itemIdOrName: string, newItem: City | string | BankDetail | CompanyExpense | Coupon) => {
    if (!settings) return;

    const list = (settings[listName] as unknown[]) || [];
    let newList;

    if (listName === 'cities') {
      newList = list.map(item => (item && (item as City).name === itemIdOrName) ? newItem : item);
    } else if (listName === 'specialties') {
      newList = list.map(item => item === itemIdOrName ? newItem : item);
    } else { // bank, expense, coupon
      newList = list.map(item => (item && (item as { id?: string }).id === itemIdOrName) ? { ...(item as object), ...(newItem as object) } : item);
    }

    await updateSetting(listName, newList);
  }, [settings, updateSetting]);

  const deleteListItem = useCallback(async (listName: 'cities' | 'specialties' | 'companyBankDetails' | 'companyExpenses' | 'coupons', itemToDeleteIdOrName: string) => {
    if (!settings) return;

    const list = (settings[listName] as unknown[]) || [];
    let newList;

    if (listName === 'cities') {
      newList = list.filter(item => item && (item as City).name !== itemToDeleteIdOrName);
    } else if (listName === 'specialties') {
      newList = list.filter(item => item !== itemToDeleteIdOrName);
    } else { // bank, expense, coupon
      newList = list.filter(item => item && (item as { id?: string }).id !== itemToDeleteIdOrName);
    }

    await updateSetting(listName, newList);
  }, [settings, updateSetting]);


  const value: SettingsContextType = {
    settings,
    cities: settings?.cities || [],
    specialties: settings?.specialties || [],
    beautySpecialties: settings?.beautySpecialties || [],
    timezone: settings?.timezone || '',
    logoUrl: settings?.logoUrl || '',
    heroImageUrl: settings?.heroImageUrl || '',
    currency: settings?.currency || 'USD',
    companyBankDetails: settings?.companyBankDetails || [],
    companyExpenses: settings?.companyExpenses || [],
    coupons: settings?.coupons || [],
    billingCycleStartDay: settings?.billingCycleStartDay ?? 1,
    billingCycleEndDay: settings?.billingCycleEndDay ?? 6,
    updateSetting,
    addListItem,
    updateListItem,
    deleteListItem,
    isLoading, // Expose loading state
  };

  if (isLoading) {
    return (
      <SettingsContext.Provider value={skeletonContextValue}>
        {children}
      </SettingsContext.Provider>
    );
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

"use client";

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings';
import { useDynamicData } from '@/hooks/use-dynamic-data';
import type { City } from '@/lib/types';
import { GeneralSettingsCard } from './settings/general-settings-card';
import { ListManagementCard } from './settings/list-management-card';
import { CouponManagementCard } from './settings/coupon-management-card';
import { BankManagementCard } from './settings/bank-management-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Settings,
  MapPin,
  Stethoscope,
  CreditCard,
  Building2,
  Database,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Globe,
  Map
} from 'lucide-react';

export function SettingsTab() {
  const {
    settings,
    updateSetting,
    countries: configCountries,
    states: configStates,
    cities: configCities,
    specialties: configSpecialties,
    beautySpecialties,
    currency,
    timezone,
    billingCycleStartDay,
    billingCycleEndDay,
    coupons,
    companyBankDetails,
    addListItem,
    updateListItem,
    deleteListItem,
  } = useSettings();

  const {
    cities: dynamicCities,
    specialties: dynamicSpecialties,
    citiesWithCount,
    specialtiesWithCount,
    totalActiveDoctors,
    loading: dynamicLoading
  } = useDynamicData();

  const [activeTab, setActiveTab] = useState("general");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<string>('VE');
  const [selectedState, setSelectedState] = useState<string>('Monagas');
  const [selectedStateCountry, setSelectedStateCountry] = useState<string>('VE');

  const [isAddCountryOpen, setIsAddCountryOpen] = useState(false);
  const [isAddStateOpen, setIsAddStateOpen] = useState(false);
  const [isSavingGeo, setIsSavingGeo] = useState(false);

  // Sincronizar países y estados seleccionados al cargar
  useEffect(() => {
    if (configCountries.length > 0 && !configCountries.some(c => c.code === selectedCountry)) {
      setSelectedCountry(configCountries[0].code);
      setSelectedStateCountry(configCountries[0].code);
    }
  }, [configCountries]);

  useEffect(() => {
    const statesForCountry = configStates.filter(s => s.country === selectedCountry);
    if (statesForCountry.length > 0 && !statesForCountry.some(s => s.name === selectedState)) {
      setSelectedState(statesForCountry[0].name);
    }
  }, [selectedCountry, configStates]);

  const handleQuickAddCountry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingGeo(true);
    const formData = new FormData(e.currentTarget);
    const code = String(formData.get('code') || '').trim().toUpperCase();
    const name = String(formData.get('name') || '').trim();
    const flag = String(formData.get('flag') || '🏳️').trim();
    const phoneCode = String(formData.get('phoneCode') || '+1').trim();
    const currency = String(formData.get('currency') || 'USD').trim().toUpperCase();

    try {
      await addListItem('countries', { code, name, flag, phoneCode, currency, isActive: true });
      setSelectedCountry(code);
      setSelectedStateCountry(code);
      setIsAddCountryOpen(false);
    } catch (err) {
      console.error('Error adding country:', err);
    } finally {
      setIsSavingGeo(false);
    }
  };

  const handleQuickAddState = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSavingGeo(true);
    const formData = new FormData(e.currentTarget);
    const country = String(formData.get('country') || selectedCountry).trim().toUpperCase();
    const name = String(formData.get('name') || '').trim();
    const code = String(formData.get('code') || '').trim().toUpperCase();

    try {
      await addListItem('states', { country, name, code });
      setSelectedState(name);
      setIsAddStateOpen(false);
    } catch (err) {
      console.error('Error adding state:', err);
    } finally {
      setIsSavingGeo(false);
    }
  };

  const countryOptions = configCountries.length > 0 
    ? configCountries.map(c => ({ label: `${c.flag || '🏳️'} ${c.name} (${c.code})`, value: c.code }))
    : [{ label: '🇻🇪 Venezuela (VE)', value: 'VE' }];

  const filteredStatesForSelectedCountry = configStates.filter(s => s.country === selectedCountry);
  const stateOptions = filteredStatesForSelectedCountry.length > 0
    ? filteredStatesForSelectedCountry.map(s => ({ label: s.name, value: s.name }))
    : [{ label: 'Añadir estado para este país...', value: '' }];

  const displayCities = dynamicCities.length > 0 ? dynamicCities : configCities.map(c => c.name);
  const displaySpecialties = dynamicSpecialties.length > 0 ? dynamicSpecialties : configSpecialties;

  if (!settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Cargando configuración...</p>
          <p className="text-xs text-muted-foreground">Si esto no carga, verifica la consola del navegador</p>
        </div>
      </div>
    );
  }

  const handleAddBeautySpecialty = async (specialty: string) => {
    const currentSpecialties = beautySpecialties || [];
    const newSpecialties = [...currentSpecialties, specialty];
    await updateSetting('beautySpecialties', newSpecialties);
  };

  const handleRemoveBeautySpecialty = async (specialty: string) => {
    const currentSpecialties = beautySpecialties || [];
    const newSpecialties = currentSpecialties.filter(s => s !== specialty);
    await updateSetting('beautySpecialties', newSpecialties);
  };

  const tabConfig = [
    {
      value: "general",
      icon: Settings,
      label: "General",
      count: null
    },
    {
      value: "realtime",
      icon: Database,
      label: "Datos Reales",
      count: dynamicCities.length + dynamicSpecialties.length
    },
    {
      value: "cities",
      icon: MapPin,
      label: "Ciudades",
      count: displayCities.length
    },
    {
      value: "specialties",
      icon: Stethoscope,
      label: "Especialidades",
      count: displaySpecialties.length
    },
    {
      value: "coupons",
      icon: CreditCard,
      label: "Cupones",
      count: coupons.length
    },
    {
      value: "banking",
      icon: Building2,
      label: "Bancario",
      count: companyBankDetails.length
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header con estadísticas mejorado */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-6 w-6 text-primary" />
            Configuración del Sistema
          </CardTitle>
          <CardDescription className="text-base">
            Gestiona todos los ajustes y configuraciones de la plataforma SUMA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-background rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-primary">{configCities.length}</div>
              <div className="text-xs text-muted-foreground">Ciudades</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-primary">{configSpecialties.length}</div>
              <div className="text-xs text-muted-foreground">Especialidades</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-primary">{coupons.length}</div>
              <div className="text-xs text-muted-foreground">Cupones</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-primary">{companyBankDetails.length}</div>
              <div className="text-xs text-muted-foreground">Cuentas Bancarias</div>
            </div>
            <div className="text-center p-3 bg-background rounded-lg border shadow-sm md:col-span-1 col-span-2">
              <div className="text-2xl font-bold text-primary">{beautySpecialties?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Especialidades de Belleza</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navegación móvil mejorada */}
      <div className="md:hidden">
        <Button
          variant="outline"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            {tabConfig.find(tab => tab.value === activeTab)?.label}
          </span>
          {showMobileMenu ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>

        {showMobileMenu && (
          <div className="mt-2 space-y-1">
            {tabConfig.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "ghost"}
                onClick={() => {
                  setActiveTab(tab.value);
                  setShowMobileMenu(false);
                }}
                className="w-full justify-start"
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
                {tab.count !== null && (
                  <Badge variant="secondary" className="ml-auto">
                    {tab.count}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs de configuración mejorados */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* TabsList solo visible en desktop */}
        <div className="hidden md:block">
          <TabsList className="grid w-full grid-cols-5 gap-2 h-12">
            {tabConfig.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="general" className="space-y-6 mt-0">
          <GeneralSettingsCard
            logoUrl={settings.logoUrl}
            heroImageUrl={settings.heroImageUrl}
            currency={currency}
            timezone={timezone}
            beautySpecialties={beautySpecialties}
            allSpecialties={configSpecialties}
            billingCycleStartDay={billingCycleStartDay}
            billingCycleEndDay={billingCycleEndDay}
            onSave={updateSetting}
            onAddBeautySpecialty={handleAddBeautySpecialty}
            onRemoveBeautySpecialty={handleRemoveBeautySpecialty}
          />
        </TabsContent>

        <TabsContent value="realtime" className="space-y-6 mt-0">
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">📊 Datos Reales de la Base de Datos</h2>
              <p className="text-muted-foreground">
                Esta sección muestra únicamente los datos reales que están siendo utilizados por los doctores registrados
              </p>
            </div>

            {/* Estadísticas Generales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Ciudades en Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dynamicCities.length}</div>
                  <p className="text-xs text-muted-foreground">Ciudades con doctores registrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Especialidades en Uso</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dynamicSpecialties.length}</div>
                  <p className="text-xs text-muted-foreground">Especialidades con doctores registrados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Médicos Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{totalActiveDoctors}</div>
                  <p className="text-xs text-muted-foreground">Total de médicos activos</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Estado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {dynamicLoading ? "⏳" : "✅"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dynamicLoading ? "Cargando datos..." : "Datos actualizados"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ciudades Reales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Ciudades en Uso
                </CardTitle>
                <CardDescription>
                  Ciudades donde actualmente hay doctores registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dynamicLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando ciudades...</span>
                  </div>
                ) : dynamicCities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {citiesWithCount.map((city, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                        <span className="font-medium text-blue-900">{city.name}</span>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          {city.doctorCount} {city.doctorCount === 1 ? 'médico' : 'médicos'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay ciudades en uso actualmente</p>
                    <p className="text-sm">Los doctores aparecerán aquí cuando se registren</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Especialidades Reales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Especialidades en Uso
                </CardTitle>
                <CardDescription>
                  Especialidades que actualmente usan los doctores registrados
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dynamicLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Cargando especialidades...</span>
                  </div>
                ) : dynamicSpecialties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {specialtiesWithCount.map((specialty, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                        <span className="font-medium text-green-900">{specialty.name}</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {specialty.doctorCount} {specialty.doctorCount === 1 ? 'médico' : 'médicos'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay especialidades en uso actualmente</p>
                    <p className="text-sm">Los doctores aparecerán aquí cuando se registren</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cities" className="space-y-6 mt-0">
          {/* Sub-navegación Geográfica: Países, Estados, Ciudades */}
          <Tabs defaultValue="cities-list" className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div>
                <h3 className="text-lg font-bold">Gestión Geográfica del Sistema</h3>
                <p className="text-xs text-muted-foreground">Administra países, estados y ciudades donde opera la plataforma SUMA.</p>
              </div>
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="countries-list" className="text-xs sm:text-sm gap-1.5">
                  <Globe className="h-4 w-4" />
                  Países ({configCountries.length})
                </TabsTrigger>
                <TabsTrigger value="states-list" className="text-xs sm:text-sm gap-1.5">
                  <Map className="h-4 w-4" />
                  Estados ({configStates.length})
                </TabsTrigger>
                <TabsTrigger value="cities-list" className="text-xs sm:text-sm gap-1.5">
                  <MapPin className="h-4 w-4" />
                  Ciudades ({configCities.length})
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: PAÍSES */}
            <TabsContent value="countries-list" className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-semibold text-emerald-800 mb-1">🌎 Países Habilitados</h4>
                <p className="text-sm text-emerald-700">
                  Aquí defines los países donde está disponible SUMA. Al registrar un nuevo país, los médicos y clínicas podrán seleccionarlo para sus cuentas y consultorios.
                </p>
              </div>

              <ListManagementCard
                title="Países Configurados"
                description="Listado maestro de países habilitados en la plataforma"
                listName="countries"
                items={configCountries.map(c => ({
                  id: c.code,
                  flag: c.flag || '🏳️',
                  name: c.name,
                  code: c.code,
                  phoneCode: c.phoneCode || '',
                  currency: c.currency || 'USD'
                }))}
                onAddItem={(item) => addListItem('countries', {
                  code: String(item.code || '').trim().toUpperCase(),
                  name: String(item.name || '').trim(),
                  flag: String(item.flag || '🏳️').trim(),
                  phoneCode: String(item.phoneCode || '+1').trim(),
                  currency: String(item.currency || 'USD').trim().toUpperCase(),
                  isActive: true
                })}
                onUpdateItem={(id, item) => updateListItem('countries', id, {
                  code: String(item.code || id).trim().toUpperCase(),
                  name: String(item.name || '').trim(),
                  flag: String(item.flag || '🏳️').trim(),
                  phoneCode: String(item.phoneCode || '+1').trim(),
                  currency: String(item.currency || 'USD').trim().toUpperCase(),
                  isActive: true
                })}
                onDeleteItem={(id) => deleteListItem('countries', id)}
                columns={[
                  { header: 'Bandera', key: 'flag' },
                  { header: 'Nombre del País', key: 'name' },
                  { header: 'Código ISO', key: 'code' },
                  { header: 'Prefijo Tel.', key: 'phoneCode' },
                  { header: 'Moneda', key: 'currency' }
                ]}
                itemSchema={{
                  flag: { label: 'Bandera Emoji (ej. 🇻🇪, 🇦🇷, 🇨🇴)', type: 'text', placeholder: '🇨🇴', required: true },
                  name: { label: 'Nombre del País', type: 'text', placeholder: 'Colombia', required: true },
                  code: { label: 'Código ISO (2 letras: VE, AR, CO, MX...)', type: 'text', placeholder: 'CO', required: true },
                  phoneCode: { label: 'Prefijo Telefónico (ej. +57)', type: 'text', placeholder: '+57', required: true },
                  currency: { label: 'Moneda Oficial (USD, ARS, COP, etc.)', type: 'text', placeholder: 'COP', required: true }
                }}
                itemNameSingular="País"
              />
            </TabsContent>

            {/* TAB: ESTADOS */}
            <TabsContent value="states-list" className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-800 mb-1">🗺️ Estados y Provincias</h4>
                <p className="text-sm text-purple-700">
                  Estados, departamentos o provincias asociadas a cada país. Permiten a los médicos organizar sus consultorios por región.
                </p>
              </div>

              <ListManagementCard
                title="Estados y Provincias Configurados"
                description="Listado de estados por país almacenados en base de datos"
                listName="states"
                items={configStates.map(s => {
                  const foundCountry = configCountries.find(c => c.code === s.country);
                  return {
                    id: `${s.country}-${s.name}`,
                    country: foundCountry ? `${foundCountry.flag || '🏳️'} ${foundCountry.name} (${s.country})` : s.country,
                    name: s.name,
                    code: s.code || ''
                  };
                })}
                onAddItem={(item) => addListItem('states', {
                  name: String(item.name || '').trim(),
                  code: String(item.code || '').trim().toUpperCase(),
                  country: String(item.country || selectedStateCountry).trim().toUpperCase()
                })}
                onUpdateItem={(id, item) => updateListItem('states', id, {
                  name: String(item.name || '').trim(),
                  code: String(item.code || '').trim().toUpperCase(),
                  country: String(item.country || selectedStateCountry).trim().toUpperCase()
                })}
                onDeleteItem={(id) => deleteListItem('states', id)}
                columns={[
                  { header: 'País', key: 'country' },
                  { header: 'Estado / Provincia', key: 'name' },
                  { header: 'Código Abreviado', key: 'code' }
                ]}
                itemSchema={{
                  country: {
                    label: 'País',
                    type: 'select',
                    options: countryOptions,
                    value: selectedStateCountry,
                    onChange: (val) => setSelectedStateCountry(val),
                    onAddOption: () => setIsAddCountryOpen(true),
                    addOptionLabel: '+ Nuevo País',
                    required: true
                  },
                  name: { label: 'Nombre del Estado / Provincia', type: 'text', placeholder: 'Monagas', required: true },
                  code: { label: 'Código Abreviado (ej. MO, BA)', type: 'text', placeholder: 'MO' }
                }}
                itemNameSingular="Estado"
              />
            </TabsContent>

            {/* TAB: CIUDADES Y TARIFAS */}
            <TabsContent value="cities-list" className="space-y-4">
              {/* Información de Ciudades Reales */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">📊 Ciudades con Médicos Activos ({citiesWithCount.length})</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Estas son las ciudades donde actualmente hay doctores registrados en el sistema:
                </p>
                {dynamicLoading ? (
                  <p className="text-sm text-blue-600">Cargando ciudades...</p>
                ) : citiesWithCount.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {citiesWithCount.map((city, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                        {city.name} ({city.doctorCount})
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-blue-600">No hay ciudades en uso actualmente</p>
                )}
              </div>

              <ListManagementCard
                title="Ciudades y Tarifas Configuradas"
                description="Ciudades, estados y países almacenados en base de datos con sus respectivas tarifas de suscripción"
                listName="cities"
                items={configCities.map(c => {
                  const countryCode = c.country || 'VE';
                  const foundCountry = configCountries.find(cn => cn.code === countryCode);
                  const countryLabel = foundCountry ? `${foundCountry.flag || '🇻🇪'} ${foundCountry.name}` : (countryCode === 'AR' ? '🇦🇷 Argentina' : '🇻🇪 Venezuela');
                  return {
                    id: `${countryCode}-${c.state || ''}-${c.name}`,
                    country: countryLabel,
                    state: c.state || 'Principal',
                    name: c.name,
                    subscriptionFee: c.subscriptionFee ?? 25
                  };
                })}
                onAddItem={(item) => addListItem('cities', {
                  name: String(item.name || '').trim(),
                  state: String(item.state || selectedState).trim(),
                  country: String(item.country || selectedCountry).trim().toUpperCase(),
                  subscriptionFee: Number(item.subscriptionFee) || 25
                } as City)}
                onUpdateItem={(id, item) => updateListItem('cities', id, {
                  name: String(item.name || '').trim(),
                  state: String(item.state || selectedState).trim(),
                  country: String(item.country || selectedCountry).trim().toUpperCase(),
                  subscriptionFee: Number(item.subscriptionFee) || 25
                } as City)}
                onDeleteItem={(id) => deleteListItem('cities', id)}
                columns={[
                  { header: 'País', key: 'country' },
                  { header: 'Estado / Provincia', key: 'state' },
                  { header: 'Ciudad', key: 'name' },
                  { header: 'Tarifa de Suscripción', key: 'subscriptionFee', isCurrency: true }
                ]}
                itemSchema={{
                  country: {
                    label: 'País',
                    type: 'select',
                    options: countryOptions,
                    value: selectedCountry,
                    onChange: (val) => {
                      setSelectedCountry(val);
                      const firstSt = configStates.find(s => s.country === val)?.name || '';
                      setSelectedState(firstSt);
                    },
                    onAddOption: () => setIsAddCountryOpen(true),
                    addOptionLabel: '+ Nuevo País',
                    required: true
                  },
                  state: {
                    label: 'Estado / Provincia',
                    type: 'select',
                    options: stateOptions,
                    value: selectedState,
                    onChange: (val) => setSelectedState(val),
                    onAddOption: () => {
                      setSelectedStateCountry(selectedCountry);
                      setIsAddStateOpen(true);
                    },
                    addOptionLabel: '+ Nuevo Estado',
                    required: true
                  },
                  name: {
                    label: 'Nombre de la Ciudad',
                    type: 'text',
                    placeholder: 'Escribe el nombre de la ciudad nueva (ej. Maturín)',
                    required: true
                  },
                  subscriptionFee: {
                    label: 'Tarifa Mensual ($)',
                    type: 'number',
                    defaultValue: 25,
                    required: true
                  }
                }}
                itemNameSingular="Ciudad"
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-6 mt-0">
          {/* Información de Especialidades Reales */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">👨‍⚕️ Especialidades con Médicos Activos ({specialtiesWithCount.length})</h3>
            <p className="text-sm text-green-800 mb-3">
              Estas son las especialidades que actualmente usan los doctores registrados:
            </p>
            {dynamicLoading ? (
              <p className="text-sm text-green-600">Cargando especialidades...</p>
            ) : specialtiesWithCount.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {specialtiesWithCount.map((specialty, index) => (
                  <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">
                    {specialty.name} ({specialty.doctorCount})
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600">No hay especialidades en uso actualmente</p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>⚙️ Gestión de Especialidades</CardTitle>
              <CardDescription>
                Administra las especialidades médicas disponibles. Los médicos eligen de esta lista al registrarse.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🩺 Cómo funciona</h4>
                  <p className="text-sm text-green-700">
                    Tú defines las especialidades disponibles y los médicos eligen una al registrarse.
                    En la sección "Datos Reales" puedes ver cuántos médicos hay en cada especialidad.
                  </p>
                </div>

                <ListManagementCard
                  title="Especialidades Configuradas"
                  description="Especialidades que aparecerán en los formularios de registro de doctores"
                  listName="specialties"
                  items={configSpecialties.map(s => ({ id: s, name: s }))}
                  onAddItem={(item) => addListItem('specialties', (item as { name: string }).name)}
                  onUpdateItem={(id, item) => updateListItem('specialties', id, (item as { name: string }).name)}
                  onDeleteItem={(id) => deleteListItem('specialties', id)}
                  columns={[{ header: 'Nombre', key: 'name' }]}
                  itemSchema={{ name: { label: 'Nombre de la Especialidad', type: 'text' } }}
                  itemNameSingular="Especialidad"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6 mt-0">
          <CouponManagementCard
            coupons={coupons}
            onAddCoupon={(coupon) => addListItem('coupons', coupon)}
            onUpdateCoupon={(id, coupon) => updateListItem('coupons', id, coupon)}
            onDeleteCoupon={(id) => deleteListItem('coupons', id)}
          />
        </TabsContent>

        <TabsContent value="banking" className="space-y-6 mt-0">
          <BankManagementCard
            bankDetails={companyBankDetails}
            onAddBankDetail={(detail) => addListItem('companyBankDetails', detail)}
            onUpdateBankDetail={(id, detail) => updateListItem('companyBankDetails', id, detail)}
            onDeleteBankDetail={(id) => deleteListItem('companyBankDetails', id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

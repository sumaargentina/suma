"use client";

import { useState } from 'react';
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
  Menu
} from 'lucide-react';

export function SettingsTab() {
  const { 
    settings, 
    updateSetting,
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
    loading: dynamicLoading 
  } = useDynamicData();

  const [activeTab, setActiveTab] = useState("general");
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Usar datos dinámicos cuando estén disponibles, sino usar configuración
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    {dynamicCities.map((city, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border">
                        <span className="font-medium text-blue-900">{city}</span>
                        <Badge variant="secondary">{index + 1}</Badge>
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
                    {dynamicSpecialties.map((specialty, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border">
                        <span className="font-medium text-green-900">{specialty}</span>
                        <Badge variant="secondary">{index + 1}</Badge>
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
          {/* Información de Ciudades Reales */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">📊 Ciudades en Uso (Base de Datos)</h3>
            <p className="text-sm text-blue-800 mb-3">
              Estas son las ciudades donde actualmente hay doctores registrados:
            </p>
            {dynamicLoading ? (
              <p className="text-sm text-blue-600">Cargando ciudades...</p>
            ) : displayCities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displayCities.map((city, index) => (
                  <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {city}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-blue-600">No hay ciudades en uso actualmente</p>
            )}
          </div>

          {/* Mostrar datos dinámicos en lugar de configuración */}
          <Card>
            <CardHeader>
              <CardTitle>🏙️ Ciudades Reales de la Base de Datos</CardTitle>
              <CardDescription>
                Estas son las ciudades donde actualmente hay doctores registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dynamicLoading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Cargando ciudades...</p>
                </div>
              ) : displayCities.length > 0 ? (
                <div className="space-y-3">
                  {displayCities.map((city, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-blue-900">{city}</h3>
                          <p className="text-sm text-blue-600">Ciudad con doctores registrados</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Ciudad Real
                      </Badge>
                    </div>
                  ))}
                  <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-800">
                      ✅ <strong>{displayCities.length} ciudades</strong> con doctores registrados en la base de datos
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay ciudades registradas</h3>
                  <p className="text-gray-500">Los doctores aparecerán aquí cuando se registren en el sistema</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⚙️ Gestión de Ciudades</CardTitle>
              <CardDescription>
                Agrega nuevas ciudades al sistema. Las ciudades aparecerán automáticamente cuando se registren doctores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">💡 Información Importante</h4>
                  <p className="text-sm text-yellow-700">
                    Las ciudades se crean automáticamente cuando los doctores se registran. 
                    Puedes agregar ciudades adicionales aquí para que aparezcan en los formularios de registro.
                  </p>
                </div>
                
                <ListManagementCard 
                  title="Ciudades Configuradas"
                  description="Ciudades que aparecerán en los formularios de registro de doctores"
                  listName="cities"
                  items={configCities.map(c => ({ id: c.name, ...c }))}
                  onAddItem={(item) => addListItem('cities', item as City)}
                  onUpdateItem={(id, item) => updateListItem('cities', id, item as City)}
                  onDeleteItem={(id) => deleteListItem('cities', id)}
                  columns={[
                      { header: 'Ciudad', key: 'name' },
                      { header: 'Tarifa de Suscripción', key: 'subscriptionFee', isCurrency: true }
                  ]}
                  itemSchema={{
                      name: { label: 'Nombre de la Ciudad', type: 'text' },
                      subscriptionFee: { label: 'Tarifa Mensual ($)', type: 'number' }
                  }}
                  itemNameSingular="Ciudad"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialties" className="space-y-6 mt-0">
          {/* Información de Especialidades Reales */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">👨‍⚕️ Especialidades en Uso (Base de Datos)</h3>
            <p className="text-sm text-green-800 mb-3">
              Estas son las especialidades que actualmente usan los doctores registrados:
            </p>
            {dynamicLoading ? (
              <p className="text-sm text-green-600">Cargando especialidades...</p>
            ) : displaySpecialties.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displaySpecialties.map((specialty, index) => (
                  <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                    {specialty}
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
                Agrega nuevas especialidades al sistema. Las especialidades aparecerán automáticamente cuando se registren doctores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">💡 Información Importante</h4>
                  <p className="text-sm text-yellow-700">
                    Las especialidades se crean automáticamente cuando los doctores se registran. 
                    Puedes agregar especialidades adicionales aquí para que aparezcan en los formularios de registro.
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
                  columns={[ { header: 'Nombre', key: 'name' } ]}
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

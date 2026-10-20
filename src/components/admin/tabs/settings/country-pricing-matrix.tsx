"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings";
import type { CountryConfig } from "@/lib/types";
import { normalizeCountryCode } from "@/lib/geo-data";
import {
  Globe,
  DollarSign,
  Stethoscope,
  Building2,
  Store,
  FlaskConical,
  Coins,
  Edit,
  Plus,
  Check,
  Loader2,
  Percent,
  RefreshCw,
} from "lucide-react";

export function CountryPricingMatrix() {
  const {
    countries,
    cities,
    bcvRate,
    getCountryPricing,
    updateSetting,
  } = useSettings();
  const { toast } = useToast();

  const [editingCountry, setEditingCountry] = useState<CountryConfig | null>(null);
  const [isNewCountry, setIsNewCountry] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [syncCityFees, setSyncCityFees] = useState(false);

  // Lista garantizada de países (si algún país base no está en BD aún, lo muestra con sus valores por defecto)
  const displayCountries: CountryConfig[] = React.useMemo(() => {
    const baseCodes = ["VE", "AR", "CO"];
    const map = new Map<string, CountryConfig>();

    for (const code of baseCodes) {
      const p = getCountryPricing(code);
      map.set(code, {
        code: p.code,
        name: p.name,
        flag: p.flag,
        phoneCode: p.phoneCode,
        currency: p.currency,
        currencySymbol: p.currencySymbol,
        rateLabel: p.rateLabel,
        exchangeRate: p.exchangeRate,
        doctorMonthlyFee: p.doctorMonthlyFee,
        clinicMonthlyFee: p.clinicMonthlyFee,
        pharmacyB2BMonthlyFee: p.pharmacyB2BMonthlyFee,
        laboratoryMonthlyFee: p.laboratoryMonthlyFee,
        defaultSellerCommission: p.defaultSellerCommission,
        isActive: true,
      });
    }

    for (const c of countries || []) {
      const norm = normalizeCountryCode(c.code);
      const p = getCountryPricing(norm);
      map.set(norm, {
        ...c,
        code: norm,
        name: c.name || p.name,
        flag: c.flag || p.flag,
        phoneCode: c.phoneCode || p.phoneCode,
        currency: c.currency || p.currency,
        currencySymbol: c.currencySymbol || p.currencySymbol,
        rateLabel: c.rateLabel || p.rateLabel,
        exchangeRate: norm === "VE" ? (bcvRate || p.exchangeRate) : (c.exchangeRate ?? p.exchangeRate),
        doctorMonthlyFee: c.doctorMonthlyFee ?? p.doctorMonthlyFee,
        clinicMonthlyFee: c.clinicMonthlyFee ?? p.clinicMonthlyFee,
        pharmacyB2BMonthlyFee: c.pharmacyB2BMonthlyFee ?? p.pharmacyB2BMonthlyFee,
        laboratoryMonthlyFee: c.laboratoryMonthlyFee ?? p.laboratoryMonthlyFee,
        defaultSellerCommission: c.defaultSellerCommission ?? p.defaultSellerCommission,
        isActive: c.isActive ?? true,
      });
    }

    return Array.from(map.values());
  }, [countries, bcvRate, getCountryPricing]);

  const handleOpenEdit = (c: CountryConfig) => {
    setIsNewCountry(false);
    setSyncCityFees(false);
    setEditingCountry({ ...c });
  };

  const handleOpenNew = () => {
    setIsNewCountry(true);
    setSyncCityFees(false);
    setEditingCountry({
      code: "",
      name: "",
      flag: "🌎",
      phoneCode: "+",
      currency: "USD",
      currencySymbol: "$",
      rateLabel: "Tasa Oficial",
      exchangeRate: 1,
      doctorMonthlyFee: 25,
      clinicMonthlyFee: 200,
      pharmacyB2BMonthlyFee: 200,
      laboratoryMonthlyFee: 50,
      defaultSellerCommission: 20,
      isActive: true,
    });
  };

  const handleSaveCountryPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCountry) return;

    const cleanCode = editingCountry.code.trim().toUpperCase();
    if (!cleanCode || !editingCountry.name.trim()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Ingresa el código ISO (ej. VE, AR, CO, MX) y el nombre del país.",
      });
      return;
    }

    try {
      setIsSaving(true);
      const updatedItem: CountryConfig = {
        ...editingCountry,
        code: cleanCode,
        name: editingCountry.name.trim(),
        flag: editingCountry.flag.trim() || "🏳️",
        phoneCode: editingCountry.phoneCode.trim() || "+1",
        currency: editingCountry.currency.trim().toUpperCase() || "USD",
        currencySymbol: editingCountry.currencySymbol?.trim() || "$",
        rateLabel: editingCountry.rateLabel?.trim() || "Tasa Oficial",
        exchangeRate: Number(editingCountry.exchangeRate || 1),
        doctorMonthlyFee: Number(editingCountry.doctorMonthlyFee ?? 25),
        clinicMonthlyFee: Number(editingCountry.clinicMonthlyFee ?? 200),
        pharmacyB2BMonthlyFee: Number(editingCountry.pharmacyB2BMonthlyFee ?? 200),
        laboratoryMonthlyFee: Number(editingCountry.laboratoryMonthlyFee ?? 50),
        defaultSellerCommission: Number(editingCountry.defaultSellerCommission ?? 20),
        lastRateUpdate: new Date().toISOString(),
        isActive: true,
      };

      const nextList = [...displayCountries];
      const existingIdx = nextList.findIndex((c) => c.code === cleanCode);
      if (existingIdx >= 0) {
        nextList[existingIdx] = updatedItem;
      } else {
        nextList.push(updatedItem);
      }

      await updateSetting("countries", nextList);

      // Si es Venezuela, mantener sincronizada la tasa BCV global
      if (cleanCode === "VE" && updatedItem.exchangeRate && updatedItem.exchangeRate > 0) {
        await updateSetting("bcvRate", updatedItem.exchangeRate);
      }

      // Si marcó sincronizar la tarifa de médico en todas las ciudades de ese país
      if (syncCityFees && cities && cities.length > 0) {
        const updatedCities = cities.map((city) => {
          const cityCountry = normalizeCountryCode(city.country || "VE");
          if (cityCountry === cleanCode) {
            return {
              ...city,
              subscriptionFee: Number(updatedItem.doctorMonthlyFee ?? 25),
            };
          }
          return city;
        });
        await updateSetting("cities", updatedCities);
      }

      toast({
        title: `✅ Tarifas y Tasa de ${updatedItem.flag} ${updatedItem.name} Guardadas`,
        description: `Médico: $${updatedItem.doctorMonthlyFee} • Clínica: $${updatedItem.clinicMonthlyFee} • Farmacia B2B: $${updatedItem.pharmacyB2BMonthlyFee} • Laboratorio: $${updatedItem.laboratoryMonthlyFee} USD.`,
      });
      setEditingCountry(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "No se pudo actualizar la configuración del país.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50/70 via-white to-indigo-50/50 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-teal-600" />
                Centro Internacional de Tarifas, Tasas de Cambio y Planes por País
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 mt-1">
                Define para cada país cuánto paga mensualmente el <strong>Médico</strong>, la <strong>Clínica</strong>, la <strong>Farmacia (Plan B2B)</strong> y el <strong>Laboratorio Clínico</strong>, así como su tasa de cambio local (BCV en Venezuela, Peso en Argentina, TRM en Colombia, etc.).
              </CardDescription>
            </div>
            <Button
              type="button"
              onClick={handleOpenNew}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar Nuevo País
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {displayCountries.map((c) => {
          const rate = Number(c.exchangeRate || 1);
          const sym = c.currencySymbol || c.currency || "Bs.";
          const fmtLocal = (usd: number) =>
            `${sym} ${(usd * rate).toLocaleString("es-VE", {
              maximumFractionDigits: rate > 100 ? 0 : 2,
            })}`;

          return (
            <Card
              key={c.code}
              className="border-2 border-slate-200 hover:border-teal-500/60 transition-all shadow-sm bg-white flex flex-col justify-between"
            >
              <div>
                <CardHeader className="pb-3 border-b bg-slate-50/70">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{c.flag}</span>
                      <div>
                        <CardTitle className="text-lg font-bold text-slate-900">
                          {c.name} ({c.code})
                        </CardTitle>
                        <p className="text-xs text-slate-500">
                          Prefijo {c.phoneCode} • Moneda Local: <strong>{c.currency}</strong>
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]">
                      Activo
                    </Badge>
                  </div>

                  {/* Tasa de cambio oficial del país */}
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-950 flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-700" />
                      {c.rateLabel || "Tasa Oficial"}:
                    </span>
                    <span className="font-extrabold text-amber-900">
                      1 USD = {sym}{" "}
                      {rate.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs">
                  {/* 1. Médico */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 block">
                          Mensualidad Médico
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Registro gratis • Tarifa base país
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 text-sm block">
                        ${c.doctorMonthlyFee ?? 25} USD/mes
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {fmtLocal(Number(c.doctorMonthlyFee ?? 25))}
                      </span>
                    </div>
                  </div>

                  {/* 2. Clínica */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800 block">
                          Plan Integral Clínica
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Desc. 3M (-5%), 6M (-8%), 12M (-15%)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-900 text-sm block">
                        ${c.clinicMonthlyFee ?? 200} USD/mes
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {fmtLocal(Number(c.clinicMonthlyFee ?? 200))}
                      </span>
                    </div>
                  </div>

                  {/* 3. Farmacia (Gratis + Plan B2B) */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50/60 border border-teal-200/70">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-teal-600 shrink-0" />
                      <div>
                        <span className="font-bold text-teal-950 block">
                          Farmacia Plan B2B
                        </span>
                        <span className="text-[10px] text-teal-700 font-medium">
                          Base Récipes: $0 Gratis • Admite Convenio %
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-teal-950 text-sm block">
                        ${c.pharmacyB2BMonthlyFee ?? 200} USD/mes
                      </span>
                      <span className="text-[10px] text-teal-800 font-medium">
                        {fmtLocal(Number(c.pharmacyB2BMonthlyFee ?? 200))}
                      </span>
                    </div>
                  </div>

                  {/* 4. Laboratorio Clínico */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-50/60 border border-indigo-200/70">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-bold text-indigo-950 block">
                          Plan Laboratorio Clínico
                        </span>
                        <span className="text-[10px] text-indigo-700 font-medium">
                          Órdenes por cédula y catálogo
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-indigo-950 text-sm block">
                        ${c.laboratoryMonthlyFee ?? 50} USD/mes
                      </span>
                      <span className="text-[10px] text-indigo-800 font-medium">
                        {fmtLocal(Number(c.laboratoryMonthlyFee ?? 50))}
                      </span>
                    </div>
                  </div>

                  {/* 5. Vendedores */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5 text-purple-600" />
                      Comisión Base Vendedoras:
                    </span>
                    <strong className="text-slate-900">
                      {c.defaultSellerCommission ?? 20}%
                    </strong>
                  </div>
                </CardContent>
              </div>

              <div className="p-4 pt-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenEdit(c)}
                  className="w-full border-teal-600 text-teal-800 hover:bg-teal-50 font-bold text-xs h-9"
                >
                  <Edit className="h-3.5 w-3.5 mr-1.5" />
                  Configurar Precios y Tasa de {c.name}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de Edición de Precios y Tasa por País */}
      <Dialog
        open={!!editingCountry}
        onOpenChange={(open) => !open && setEditingCountry(null)}
      >
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Globe className="h-5 w-5 text-teal-600" />
              {isNewCountry
                ? "Agregar Nuevo País y Tarifas SUMA"
                : `Configurar Tarifas y Tasa — ${editingCountry?.flag} ${editingCountry?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Todos los portales de aterrizaje, formularios de registro y paneles administrativos de este país usarán automáticamente estos precios y su tasa de cambio local.
            </DialogDescription>
          </DialogHeader>

          {editingCountry && (
            <form onSubmit={handleSaveCountryPricing} className="space-y-4 pt-2">
              {/* Identificación del País */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Código ISO *</Label>
                  <Input
                    value={editingCountry.code}
                    disabled={!isNewCountry}
                    onChange={(e) =>
                      setEditingCountry({
                        ...editingCountry,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="VE / AR / CO"
                    required
                  />
                </div>
                <div className="space-y-1 col-span-1 sm:col-span-2">
                  <Label className="text-xs font-semibold">Nombre del País *</Label>
                  <Input
                    value={editingCountry.name}
                    onChange={(e) =>
                      setEditingCountry({ ...editingCountry, name: e.target.value })
                    }
                    placeholder="Venezuela"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Bandera / Prefijo</Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={editingCountry.flag}
                      onChange={(e) =>
                        setEditingCountry({ ...editingCountry, flag: e.target.value })
                      }
                      className="w-12 text-center px-1"
                    />
                    <Input
                      value={editingCountry.phoneCode}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          phoneCode: e.target.value,
                        })
                      }
                      placeholder="+58"
                    />
                  </div>
                </div>
              </div>

              {/* Moneda Local y Tasa de Cambio del País */}
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3">
                <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase">
                  <Coins className="h-4 w-4 text-amber-600" />
                  Moneda Local y Tasa de Cambio Frente al Dólar (1 USD)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Moneda / Símbolo</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={editingCountry.currency}
                        onChange={(e) =>
                          setEditingCountry({
                            ...editingCountry,
                            currency: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="VES"
                        className="bg-white w-20"
                      />
                      <Input
                        value={editingCountry.currencySymbol || ""}
                        onChange={(e) =>
                          setEditingCountry({
                            ...editingCountry,
                            currencySymbol: e.target.value,
                          })
                        }
                        placeholder="Bs."
                        className="bg-white flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nombre de la Tasa</Label>
                    <Input
                      value={editingCountry.rateLabel || ""}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          rateLabel: e.target.value,
                        })
                      }
                      placeholder="Ej: Tasa BCV / TRM / MEP"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Valor por $1 USD *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editingCountry.exchangeRate ?? 1}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          exchangeRate: Number(e.target.value),
                        })
                      }
                      className="bg-white font-bold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Precios Mensuales de Planes por Rol en este País */}
              <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
                <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5 uppercase">
                  <DollarSign className="h-4 w-4 text-teal-600" />
                  Tarifas Mensuales Oficiales en {editingCountry.name || "este País"} (USD)
                </Label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 bg-white p-3 rounded-lg border">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                      1. Mensualidad Médico (USD)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={editingCountry.doctorMonthlyFee ?? 25}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          doctorMonthlyFee: Number(e.target.value),
                        })
                      }
                      className="font-bold"
                    />
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncCityFees}
                        onChange={(e) => setSyncCityFees(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Actualizar todas las ciudades de {editingCountry.code || "este país"} a este monto
                    </label>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                      2. Plan Integral Clínica (USD/mes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={editingCountry.clinicMonthlyFee ?? 200}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          clinicMonthlyFee: Number(e.target.value),
                        })
                      }
                      className="font-bold"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Usado en Landing y Registro de Clínicas de este país
                    </span>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border">
                    <Label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-teal-600" />
                      3. Farmacia Plan B2B (USD/mes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={editingCountry.pharmacyB2BMonthlyFee ?? 200}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          pharmacyB2BMonthlyFee: Number(e.target.value),
                        })
                      }
                      className="font-bold"
                    />
                    <span className="text-[10px] text-teal-700 block">
                      El plan base de récipes siempre es Gratis ($0)
                    </span>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-lg border">
                    <Label className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <FlaskConical className="h-3.5 w-3.5 text-indigo-600" />
                      4. Plan Laboratorio Clínico (USD/mes)
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={editingCountry.laboratoryMonthlyFee ?? 50}
                      onChange={(e) =>
                        setEditingCountry({
                          ...editingCountry,
                          laboratoryMonthlyFee: Number(e.target.value),
                        })
                      }
                      className="font-bold"
                    />
                    <span className="text-[10px] text-indigo-700 block">
                      Usado en Landing y Registro de Laboratorios ($50 base)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700">
                      % Comisión Vendedores en {editingCountry.code || "País"}:
                    </Label>
                    <div className="flex items-center gap-1 w-24">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editingCountry.defaultSellerCommission ?? 20}
                        onChange={(e) =>
                          setEditingCountry({
                            ...editingCountry,
                            defaultSellerCommission: Number(e.target.value),
                          })
                        }
                        className="h-8 text-xs font-bold"
                      />
                      <span className="text-xs font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCountry(null)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Guardar Tarifas del País
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

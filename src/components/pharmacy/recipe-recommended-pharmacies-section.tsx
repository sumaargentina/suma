"use client";

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { PharmacyShowcaseModal } from './pharmacy-showcase-modal';
import {
  Store,
  MapPin,
  Sparkles,
  Award,
  ChevronRight,
  Building2,
  Loader2,
  Pill,
  CheckCircle2,
  Ticket,
  AlertCircle
} from 'lucide-react';

interface RecipeRecommendedPharmaciesSectionProps {
  doctorId?: string | null;
  doctorName?: string;
  defaultCity?: string;
  prescriptionText?: string;
  recipeCode?: string;
  recipeId?: string;
  patientName?: string;
  patientCedula?: string;
}

export function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function matchPrescriptionWithCatalog(prescriptionText: string, products: any[]) {
  if (!prescriptionText || !Array.isArray(products) || products.length === 0) {
    return { matchedAvailable: [], matchedOutOfStock: [], promoCount: 0 };
  }

  const normRx = normalizeText(prescriptionText);
  const matchedAvailable: any[] = [];
  const matchedOutOfStock: any[] = [];

  for (const prod of products) {
    const prodNameNorm = normalizeText(prod.name || '');
    const genNameNorm = normalizeText(prod.genericName || prod.generic_name || '');

    // Extraer palabras clave principales del medicamento (>= 4 letras, ignorando palabras genéricas)
    const stopWords = new Set(['caja', 'tabletas', 'tableta', 'capsulas', 'capsula', 'comprimidos', 'jarabe', 'ampolla', 'sobre', 'crema', 'gotas', 'para', 'con']);
    const nameTokens = prodNameNorm
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4 && !stopWords.has(w));
    const genTokens = genNameNorm
      .split(/[^a-z0-9]+/)
      .filter(w => w.length >= 4 && !stopWords.has(w));

    const primaryToken = nameTokens[0];
    const genericToken = genTokens[0];

    const isMatch =
      (primaryToken && normRx.includes(primaryToken)) ||
      (genericToken && normRx.includes(genericToken));

    if (isMatch) {
      const stockQty = prod.stockQuantity ?? prod.stock_quantity;
      const hasStock = stockQty === null || stockQty === undefined ? Boolean(prod.isAvailable ?? prod.is_available) : Number(stockQty) > 0 && Boolean(prod.isAvailable ?? prod.is_available);

      if (hasStock) {
        matchedAvailable.push(prod);
      } else {
        matchedOutOfStock.push(prod);
      }
    }
  }

  const promoCount = matchedAvailable.filter(p => p.isPromotion || p.is_promotion).length;
  return { matchedAvailable, matchedOutOfStock, promoCount };
}

export function RecipeRecommendedPharmaciesSection({
  doctorId,
  doctorName,
  defaultCity,
  prescriptionText,
  recipeCode,
  recipeId,
  patientName,
  patientCedula
}: RecipeRecommendedPharmaciesSectionProps) {
  const [recommendedPharmacies, setRecommendedPharmacies] = useState<any[]>([]);
  const [cityPharmacies, setCityPharmacies] = useState<any[]>([]);
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [selectedPharmacy, setSelectedPharmacy] = useState<any | null>(null);
  const [isSelectedRecommended, setIsSelectedRecommended] = useState(false);

  useEffect(() => {
    async function fetchPharmaciesForRecipe() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ mode: 'recipe' });
        if (doctorId) params.set('doctorId', doctorId);
        if (selectedCity) params.set('city', selectedCity);

        const recipeRes = await fetch(`/api/pharmacy/sponsorships?${params.toString()}`);

        if (recipeRes.ok) {
          const data = await recipeRes.json();
          const recList = data.recommendedPharmacies || [];
          const cityList = data.cityPharmacies || [];
          const allList = data.allPharmacies || [];

          setRecommendedPharmacies(recList);
          setAllPharmacies(allList);

          // Si el filtro de ciudad no arrojó farmacias pero existen farmacias activas en la red, mostrar todas las disponibles
          const recIds = new Set(recList.map((r: any) => r.id));
          const fallbackOther = allList.filter((p: any) => !recIds.has(p.id));
          setCityPharmacies(cityList.length > 0 ? cityList : fallbackOther);
        }
      } catch (e) {
        console.error('Error cargando farmacias para el récipe:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchPharmaciesForRecipe();
  }, [doctorId, selectedCity]);

  const availableCities = Array.from(
    new Set(allPharmacies.map(p => p.city).filter(Boolean))
  ).sort();

  const getBranchesForPharmacy = (pharm: any) => {
    const chain = (pharm.chainName || pharm.chain_name || '').trim().toLowerCase();
    if (!chain) return [pharm];
    const matches = allPharmacies.filter(
      p => (p.chainName || p.chain_name || p.name || '').trim().toLowerCase() === chain
    );
    return matches.length > 0 ? matches : [pharm];
  };

  const handleOpenPharmacyShowcase = (pharm: any, isRecommended: boolean) => {
    setSelectedPharmacy(pharm);
    setIsSelectedRecommended(isRecommended);

    // Módulo 2: Registrar clic en tarjeta para métricas ROI de la alianza
    if (pharm.sponsorshipId) {
      fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pharm.sponsorshipId,
          action: 'track_metric',
          metric: 'card_click'
        })
      }).catch(() => {});
    }
  };

  if (loading && recommendedPharmacies.length === 0 && cityPharmacies.length === 0) {
    return (
      <div className="print:hidden p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
        Verificando disponibilidad de tu récipe en farmacias recomendadas y de tu ciudad...
      </div>
    );
  }

  if (recommendedPharmacies.length === 0 && cityPharmacies.length === 0) {
    return null;
  }

  const renderPharmacyBannerCard = (pharm: any, isRecommended: boolean) => {
    const branches = getBranchesForPharmacy(pharm);
    const hasMultipleBranches = branches.length > 1;
    const displayName = pharm.chainName || pharm.name;

    // Módulo 1: Semáforo de Disponibilidad Automático contra el Catálogo de la Farmacia
    const { matchedAvailable, matchedOutOfStock, promoCount } = matchPrescriptionWithCatalog(
      prescriptionText || '',
      pharm.products || []
    );

    return (
      <div
        key={pharm.id}
        onClick={() => handleOpenPharmacyShowcase(pharm, isRecommended)}
        className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between ${
          isRecommended
            ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-teal-50/30 ring-1 ring-amber-300/60 shadow-sm'
            : 'border-slate-200 bg-white hover:border-teal-300'
        }`}
      >
        <div>
          {/* Panel Publicitario / Banner Superior */}
          <div className="relative h-24 w-full bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 overflow-hidden">
            {pharm.bannerUrl ? (
              <img
                src={pharm.bannerUrl}
                alt={displayName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-end pr-4 opacity-20">
                <Pill className="h-16 w-16 text-teal-200" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />

            {/* Badges superiores */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
              {isRecommended ? (
                <Badge className="bg-amber-400 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 border-0 shadow-xs flex items-center gap-1">
                  <Award className="h-3 w-3 text-slate-950" />
                  {pharm.sponsorshipScope === 'national'
                    ? 'Franquicia Recomendada'
                    : 'Recomendada por tu Médico'}
                </Badge>
              ) : (
                <Badge className="bg-slate-900/75 text-teal-200 border border-teal-500/30 text-[10px] font-semibold px-2 py-0.5">
                  Farmacia de la Ciudad
                </Badge>
              )}

              <div className="flex items-center gap-1">
                {pharm.is24Hours && (
                  <Badge className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0 border-0">
                    24H
                  </Badge>
                )}
                {pharm.deliveryAvailable && (
                  <Badge className="bg-teal-500 text-slate-950 text-[9px] font-bold px-1.5 py-0 border-0">
                    Delivery
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Cuerpo de la Tarjeta Publicitaria */}
          <div className="p-3.5 pt-0 space-y-2">
            <div className="flex items-end gap-3 -mt-6 relative z-10">
              <div className="h-13 w-13 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0">
                {pharm.logoUrl ? (
                  <img src={pharm.logoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-6 w-6 text-teal-700" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-6">
                <h4 className="font-extrabold text-slate-900 text-sm truncate leading-tight group-hover:text-teal-700 transition-colors">
                  {displayName}
                  {pharm.branchName ? ` - ${pharm.branchName}` : ''}
                </h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                  <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                  {pharm.city} {pharm.address ? `• ${pharm.address}` : ''}
                </p>
              </div>
            </div>

            {/* Módulo 1: Semáforo de Disponibilidad del Récipe */}
            {matchedAvailable.length > 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 text-[11px] text-emerald-950 font-semibold flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    🟢 {matchedAvailable.length} med. de tu récipe disponible(s)
                  </span>
                </span>
                {promoCount > 0 && (
                  <Badge className="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0 border-0 shrink-0">
                    🔥 {promoCount} en Promo
                  </Badge>
                )}
              </div>
            ) : matchedOutOfStock.length > 0 ? (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5 text-[11px] text-rose-900 font-medium flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                <span className="truncate">🔴 Medicamento agotado temporalmente (0 disp.)</span>
              </div>
            ) : null}

            {/* Módulo 4: Cupón Negociado entre el Médico y la Farmacia */}
            {pharm.hasPatientCoupon && pharm.couponCode && (
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200/80 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-950 flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1 truncate">
                  <Ticket className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  Cupón: <code className="font-mono font-black text-indigo-800">{pharm.couponCode}</code>
                </span>
                <Badge className="bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0 border-0 shrink-0">
                  {pharm.couponDiscountPercent ? `-${pharm.couponDiscountPercent}% Dto.` : 'Beneficio SUMA'}
                </Badge>
              </div>
            )}

            {pharm.promotionalTagline && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-950 font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{pharm.promotionalTagline}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-3.5 pb-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 font-medium flex items-center gap-1">
            {hasMultipleBranches ? (
              <>
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
                {branches.length} sucursales (Ver más cercana)
              </>
            ) : (
              <>
                <Store className="h-3.5 w-3.5 text-teal-600" />
                Cotizar, apartar o ver catálogo
              </>
            )}
          </span>
          <span className="font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
            Abrir Tarjeta <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="print:hidden bg-gradient-to-b from-slate-50 via-white to-teal-50/20 border-t border-slate-200 p-4 sm:p-6 space-y-5">
      {/* Encabezado y Filtro de Ciudad */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Store className="h-4 w-4" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Farmacias Recomendadas, Semáforo de Disponibilidad y Reserva en 1 Clic
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            El sistema verifica automáticamente qué farmacias tienen disponibles los medicamentos de tu récipe. <strong>Eres libre de elegir la farmacia de tu preferencia.</strong>
          </p>
        </div>

        {availableCities.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-slate-600">Ciudad:</span>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-800 shadow-2xs"
            >
              <option value="">Todas las ciudades</option>
              {availableCities.map(city => (
                <option key={city} value={city}>
                  📍 {city}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 1. Farmacias Recomendadas por el Médico Tratante */}
      {recommendedPharmacies.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[11px] border-0">
              ⭐ Recomendadas por Dr(a). {doctorName || 'tu Médico Tratante'}
            </Badge>
            <span className="text-[11px] text-slate-500">
              Con stock verificado para pacientes SUMA y beneficios exclusivos
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recommendedPharmacies.map(pharm => renderPharmacyBannerCard(pharm, true))}
          </div>
        </div>
      )}

      {/* 2. Otras Farmacias Aliadas de la Ciudad */}
      {cityPharmacies.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              {selectedCity ? `Farmacias en ${selectedCity}` : 'Farmacias Aliadas en la Red SUMA'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {cityPharmacies.slice(0, 6).map(pharm => renderPharmacyBannerCard(pharm, false))}
          </div>
        </div>
      )}

      {/* Modal de Tarjeta de Presentación, Reserva en 1 Clic y Catálogo de la Farmacia */}
      <PharmacyShowcaseModal
        isOpen={Boolean(selectedPharmacy)}
        onClose={() => setSelectedPharmacy(null)}
        pharmacy={selectedPharmacy}
        allBranches={selectedPharmacy ? getBranchesForPharmacy(selectedPharmacy) : []}
        isDoctorRecommended={isSelectedRecommended}
        recommendingDoctorName={doctorName}
        doctorId={doctorId || undefined}
        prescriptionText={prescriptionText}
        recipeCode={recipeCode}
        recipeId={recipeId}
        patientName={patientName}
        patientCedula={patientCedula}
      />
    </div>
  );
}

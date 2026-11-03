"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  AlertCircle,
  Navigation,
  Compass
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

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
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
    const stopWords = new Set([
      'caja',
      'tabletas',
      'tableta',
      'capsulas',
      'capsula',
      'comprimidos',
      'jarabe',
      'ampolla',
      'sobre',
      'crema',
      'gotas',
      'para',
      'con'
    ]);
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
      const hasStock =
        stockQty === null || stockQty === undefined
          ? Boolean(prod.isAvailable ?? prod.is_available)
          : Number(stockQty) > 0 && Boolean(prod.isAvailable ?? prod.is_available);

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

export interface BranchSelectionContext {
  patientLat?: number | null;
  patientLng?: number | null;
  targetCity?: string | null;
  prescriptionText?: string | null;
}

export function getChainKeyForPharmacy(pharm: any): string {
  if (!pharm) return '';
  if (pharm.parentPharmacyId || pharm.parent_pharmacy_id) {
    return `hq:${pharm.parentPharmacyId || pharm.parent_pharmacy_id}`;
  }
  if (pharm.isHeadquarters || pharm.is_headquarters) {
    return `hq:${pharm.id}`;
  }
  const chainName = (pharm.chainName || pharm.chain_name || '').trim().toLowerCase();
  if (chainName && (pharm.isChain || pharm.is_chain)) {
    return `chain:${chainName}`;
  }
  return `single:${pharm.id}`;
}

/**
 * Algoritmo Inteligente de Enrutamiento de Sucursales SUMA:
 * Determina cuál de todas las sucursales de una cadena o Casa Matriz recomendarle al paciente y por qué:
 * 1. Convenio directo con una sucursal específica (si el médico pactó con esa sede puntual).
 * 2. Cercanía geográfica (Distancia GPS exacta en km o coincidencia con la ciudad del paciente/médico).
 * 3. Disponibilidad de stock verificada para los medicamentos del récipe.
 * 4. Servicios operativos clave (Abierta 24 Horas y Delivery activo).
 */
export function selectBestBranchForPatient(
  branches: any[],
  ctx: BranchSelectionContext
): {
  bestBranch: any;
  rankedBranches: Array<any & { _branchScore: number; _distanceKm: number | null; _selectionReason: string }>;
  selectionReason: string;
} {
  if (!Array.isArray(branches) || branches.length === 0) {
    return { bestBranch: null, rankedBranches: [], selectionReason: '' };
  }

  const normTargetCity = normalizeText(ctx.targetCity || '');

  const scored = branches.map(branch => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Distancia GPS si el paciente activó su ubicación y la sucursal tiene coordenadas
    let distanceKm: number | null = null;
    if (
      ctx.patientLat !== null &&
      ctx.patientLat !== undefined &&
      ctx.patientLng !== null &&
      ctx.patientLng !== undefined &&
      branch.latitude &&
      branch.longitude
    ) {
      distanceKm = calculateDistanceKm(
        ctx.patientLat,
        ctx.patientLng,
        Number(branch.latitude),
        Number(branch.longitude)
      );
      // Hasta 300 puntos para sucursales cercanas (< 20km)
      score += Math.max(20, 300 - distanceKm * 14);
      reasons.push(`A ${distanceKm} km de tu ubicación`);
    }

    // 2. Coincidencia de ciudad (paciente o consultorio médico)
    const normBranchCity = normalizeText(branch.city || '');
    const isSameCity = Boolean(normTargetCity && normBranchCity && normBranchCity === normTargetCity);
    if (isSameCity) {
      score += 180;
      if (distanceKm === null) {
        reasons.push(`En tu ciudad (${branch.city})`);
      }
    }

    // 3. Stock real de los medicamentos prescritos en el récipe
    const { matchedAvailable, matchedOutOfStock } = matchPrescriptionWithCatalog(
      ctx.prescriptionText || '',
      branch.products || []
    );
    if (matchedAvailable.length > 0) {
      score += matchedAvailable.length * 50;
      reasons.push(`${matchedAvailable.length} med. en stock`);
    } else if (matchedOutOfStock.length > 0) {
      score -= 80;
    }

    // 4. Convenio directo con una sucursal específica
    if (branch.isDirectBranchSponsorship && !branch.isHeadquarters) {
      score += 110;
      reasons.push('Sede directa sugerida por tu médico');
    }

    // 5. Horario 24 Horas y Delivery
    if (branch.is24Hours || branch.is_24_hours) {
      score += 25;
      reasons.push('Abierta 24H');
    }
    if (branch.deliveryAvailable || branch.delivery_available) {
      score += 15;
      if (reasons.length < 2) reasons.push('Delivery activo');
    }

    const selectionReason =
      reasons.length > 0
        ? reasons.slice(0, 2).join(' • ')
        : branch.city
        ? `Sede principal en ${branch.city}`
        : 'Sede principal autorizada';

    return {
      ...branch,
      _branchScore: score,
      _distanceKm: distanceKm,
      _selectionReason: selectionReason
    };
  });

  scored.sort((a, b) => b._branchScore - a._branchScore);

  const winner = scored[0];
  return {
    bestBranch: winner,
    rankedBranches: scored,
    selectionReason: winner?._selectionReason || 'Sede recomendada'
  };
}

export function groupPharmaciesByChainWithOptimalBranch(
  pharmaciesList: any[],
  allPharmaciesPool: any[],
  ctx: BranchSelectionContext
) {
  const groupsMap = new Map<string, any[]>();

  for (const pharm of pharmaciesList) {
    // Excluir sucursales no aprobadas por su Casa Matriz
    if (
      pharm.branchApprovalStatus &&
      pharm.branchApprovalStatus !== 'approved'
    ) {
      continue;
    }
    const key = getChainKeyForPharmacy(pharm);
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(pharm);
  }

  const result: Array<{
    chainKey: string;
    bestBranch: any;
    allChainBranches: any[];
    selectionReason: string;
  }> = [];

  for (const [chainKey, groupItems] of groupsMap.entries()) {
    // Buscar todas las sucursales aprobadas de la misma cadena en el pool general para que el selector tenga todas las sedes
    let allBranchesOfChain = groupItems;
    if (chainKey.startsWith('hq:') || chainKey.startsWith('chain:')) {
      const poolMatches = allPharmaciesPool.filter(p => {
        if (p.branchApprovalStatus && p.branchApprovalStatus !== 'approved') return false;
        return getChainKeyForPharmacy(p) === chainKey;
      });
      if (poolMatches.length > 0) {
        // Preservar metadatos de patrocinio del grupo en las sucursales del pool
        const templateSponsor = groupItems[0];
        allBranchesOfChain = poolMatches.map(pm => {
          const existingInGroup = groupItems.find(g => g.id === pm.id);
          if (existingInGroup) return existingInGroup;
          return {
            ...pm,
            isDoctorRecommended: templateSponsor?.isDoctorRecommended,
            sponsorshipId: templateSponsor?.sponsorshipId,
            sponsorshipScope: templateSponsor?.sponsorshipScope,
            promotionalTagline: pm.promotionalTagline || templateSponsor?.promotionalTagline,
            hasPatientCoupon: templateSponsor?.hasPatientCoupon,
            couponCode: templateSponsor?.couponCode,
            couponDiscountPercent: templateSponsor?.couponDiscountPercent,
            couponDescription: templateSponsor?.couponDescription,
            products: pm.products && pm.products.length > 0 ? pm.products : templateSponsor?.products || []
          };
        });
      }
    }

    const { bestBranch, rankedBranches, selectionReason } = selectBestBranchForPatient(
      allBranchesOfChain,
      ctx
    );

    if (bestBranch) {
      result.push({
        chainKey,
        bestBranch,
        allChainBranches: rankedBranches,
        selectionReason
      });
    }
  }

  return result;
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
  const [selectedCity, setSelectedCity] = useState<string>(defaultCity || '');
  const [loading, setLoading] = useState(true);

  // Geolocalización del paciente para recomendar la sucursal más cercana
  const [patientCoords, setPatientCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  // Permite al paciente cambiar manualmente qué sucursal de una cadena desea ver en la tarjeta
  const [branchOverrides, setBranchOverrides] = useState<Record<string, string>>({});

  const [selectedPharmacy, setSelectedPharmacy] = useState<any | null>(null);
  const [selectedPharmacyBranches, setSelectedPharmacyBranches] = useState<any[]>([]);
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

          const recChainKeys = new Set(recList.map((r: any) => getChainKeyForPharmacy(r)));
          const fallbackOther = allList.filter((p: any) => !recChainKeys.has(getChainKeyForPharmacy(p)));
          const filteredCityList = cityList.filter((p: any) => !recChainKeys.has(getChainKeyForPharmacy(p)));
          setCityPharmacies(filteredCityList.length > 0 ? filteredCityList : fallbackOther);
        }
      } catch (e) {
        console.error('Error cargando farmacias para el récipe:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchPharmaciesForRecipe();
  }, [doctorId, selectedCity]);

  const handleRequestPatientLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPatientCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLocatingGps(false);
      },
      () => {
        setLocatingGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const availableCities = useMemo(() => {
    return Array.from(new Set(allPharmacies.map(p => p.city).filter(Boolean))).sort();
  }, [allPharmacies]);

  const selectionContext: BranchSelectionContext = useMemo(
    () => ({
      patientLat: patientCoords?.lat ?? null,
      patientLng: patientCoords?.lng ?? null,
      targetCity: selectedCity || defaultCity || null,
      prescriptionText: prescriptionText || ''
    }),
    [patientCoords, selectedCity, defaultCity, prescriptionText]
  );

  // Agrupamos por Cadena / Casa Matriz y seleccionamos la Sucursal Óptima para el paciente
  const groupedRecommended = useMemo(
    () =>
      groupPharmaciesByChainWithOptimalBranch(
        recommendedPharmacies,
        allPharmacies,
        selectionContext
      ),
    [recommendedPharmacies, allPharmacies, selectionContext]
  );

  const groupedCityPharmacies = useMemo(
    () =>
      groupPharmaciesByChainWithOptimalBranch(
        cityPharmacies,
        allPharmacies,
        selectionContext
      ),
    [cityPharmacies, allPharmacies, selectionContext]
  );

  const handleOpenPharmacyShowcase = (
    pharm: any,
    chainBranches: any[],
    isRecommended: boolean
  ) => {
    setSelectedPharmacy(pharm);
    setSelectedPharmacyBranches(chainBranches.length > 0 ? chainBranches : [pharm]);
    setIsSelectedRecommended(isRecommended);

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
        Calculando la sucursal más cercana y verificando stock para tu récipe...
      </div>
    );
  }

  if (groupedRecommended.length === 0 && groupedCityPharmacies.length === 0) {
    return null;
  }

  const renderPharmacyChainCard = (
    group: {
      chainKey: string;
      bestBranch: any;
      allChainBranches: any[];
      selectionReason: string;
    },
    isRecommended: boolean
  ) => {
    const { chainKey, bestBranch, allChainBranches, selectionReason } = group;
    const overrideBranchId = branchOverrides[chainKey];
    const activePharm =
      (overrideBranchId && allChainBranches.find(b => b.id === overrideBranchId)) || bestBranch;

    const hasMultipleBranches = allChainBranches.length > 1;
    const displayName = activePharm.chainName || activePharm.name;
    const activeReason = activePharm._selectionReason || selectionReason;

    // Semáforo de Disponibilidad Automático contra el Catálogo de la Sucursal seleccionada
    const { matchedAvailable, matchedOutOfStock, promoCount } = matchPrescriptionWithCatalog(
      prescriptionText || '',
      activePharm.products || []
    );

    return (
      <div
        key={chainKey}
        onClick={() => handleOpenPharmacyShowcase(activePharm, allChainBranches, isRecommended)}
        className={`group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg flex flex-col justify-between ${
          isRecommended
            ? 'border-amber-300 bg-gradient-to-br from-amber-50/40 via-white to-teal-50/30 ring-1 ring-amber-300/60 shadow-sm'
            : 'border-slate-200 bg-white hover:border-teal-300'
        }`}
      >
        <div>
          {/* Panel Publicitario / Banner Superior */}
          <div className="relative h-24 w-full bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 overflow-hidden">
            {activePharm.bannerUrl ? (
              <img
                src={activePharm.bannerUrl}
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
                  {activePharm.sponsorshipScope === 'national' || hasMultipleBranches
                    ? 'Cadena Recomendada por tu Médico'
                    : 'Recomendada por tu Médico'}
                </Badge>
              ) : (
                <Badge className="bg-slate-900/75 text-teal-200 border border-teal-500/30 text-[10px] font-semibold px-2 py-0.5">
                  Farmacia Aliada SUMA
                </Badge>
              )}

              <div className="flex items-center gap-1">
                {activePharm._distanceKm !== null && activePharm._distanceKm !== undefined && (
                  <Badge className="bg-sky-500 text-white text-[9px] font-extrabold px-1.5 py-0 border-0">
                    📍 {activePharm._distanceKm} km
                  </Badge>
                )}
                {activePharm.is24Hours && (
                  <Badge className="bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0 border-0">
                    24H
                  </Badge>
                )}
                {activePharm.deliveryAvailable && (
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
                {activePharm.logoUrl ? (
                  <img src={activePharm.logoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-6 w-6 text-teal-700" />
                )}
              </div>
              <div className="min-w-0 flex-1 pt-6">
                <h4 className="font-extrabold text-slate-900 text-sm truncate leading-tight group-hover:text-teal-700 transition-colors">
                  {displayName}
                  {activePharm.branchName ? ` - ${activePharm.branchName}` : ''}
                </h4>
                <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                  <MapPin className="h-3 w-3 text-teal-600 shrink-0" />
                  {activePharm.city} {activePharm.address ? `• ${activePharm.address}` : ''}
                </p>
              </div>
            </div>

            {/* Algoritmo Inteligente: Explicación de por qué se recomienda esta sucursal y selector rápido */}
            {hasMultipleBranches && (
              <div
                onClick={e => e.stopPropagation()}
                className="bg-teal-50/90 border border-teal-200/90 rounded-xl p-2 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1.5 text-[10px]">
                  <span className="font-extrabold text-teal-900 flex items-center gap-1 truncate">
                    <Compass className="h-3 w-3 text-teal-600 shrink-0" />
                    Sede sugerida: {activeReason}
                  </span>
                  <Badge className="bg-teal-700 text-white text-[9px] px-1.5 py-0 border-0 shrink-0">
                    {allChainBranches.length} sucursales
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-600 shrink-0">
                    Cambiar sede:
                  </span>
                  <select
                    value={activePharm.id}
                    aria-label="Seleccionar sucursal de la cadena"
                    onChange={e =>
                      setBranchOverrides(prev => ({
                        ...prev,
                        [chainKey]: e.target.value
                      }))
                    }
                    className="flex-1 h-7 rounded-lg border border-teal-300 bg-white px-2 text-[11px] font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-teal-600"
                  >
                    {allChainBranches.map((b, idx) => (
                      <option key={b.id} value={b.id}>
                        {idx === 0 ? '⭐ ' : '📍 '}
                        {b.branchName || b.name} ({b.city})
                        {b._distanceKm !== null && b._distanceKm !== undefined
                          ? ` — a ${b._distanceKm} km`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

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
                <span className="truncate">🔴 Medicamento agotado en esta sede</span>
              </div>
            ) : null}

            {/* Módulo 4: Cupón Negociado entre el Médico y la Farmacia */}
            {activePharm.hasPatientCoupon && activePharm.couponCode && (
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-amber-50 border border-indigo-200/80 rounded-xl px-2.5 py-1.5 text-[11px] text-indigo-950 flex items-center justify-between gap-2">
                <span className="font-bold flex items-center gap-1 truncate">
                  <Ticket className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  Cupón: <code className="font-mono font-black text-indigo-800">{activePharm.couponCode}</code>
                </span>
                <Badge className="bg-indigo-600 text-white text-[9px] font-extrabold px-1.5 py-0 border-0 shrink-0">
                  {activePharm.couponDiscountPercent ? `-${activePharm.couponDiscountPercent}% Dto.` : 'Beneficio SUMA'}
                </Badge>
              </div>
            )}

            {activePharm.promotionalTagline && (
              <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl px-2.5 py-1.5 text-[11px] text-amber-950 font-medium flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{activePharm.promotionalTagline}</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-3.5 pb-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-600 font-medium flex items-center gap-1">
            {hasMultipleBranches ? (
              <>
                <Building2 className="h-3.5 w-3.5 text-teal-600" />
                Sede seleccionada: {activePharm.branchName || activePharm.city}
              </>
            ) : (
              <>
                <Store className="h-3.5 w-3.5 text-teal-600" />
                Cotizar, apartar o ver catálogo
              </>
            )}
          </span>
          <span className="font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
            Abrir Sede <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="print:hidden bg-gradient-to-b from-slate-50 via-white to-teal-50/20 border-t border-slate-200 p-4 sm:p-6 space-y-5">
      {/* Encabezado, Botón GPS y Filtro de Ciudad */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Store className="h-4 w-4" />
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
              Farmacias Recomendadas, Selección Inteligente de Sucursal y Reserva en 1 Clic
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Si una cadena tiene múltiples sucursales, SUMA selecciona automáticamente la sede óptima para ti por <strong>cercanía, ciudad y stock de tu récipe</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRequestPatientLocation}
            disabled={locatingGps}
            className={`h-8 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              patientCoords
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-teal-300 bg-teal-50/60 text-teal-800 hover:bg-teal-100'
            }`}
          >
            {locatingGps ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Navigation className="h-3.5 w-3.5" />
            )}
            {patientCoords ? '📍 Ordenado por tu GPS' : 'Usar mi GPS (Sede más cercana)'}
          </Button>

          {availableCities.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-600">Ciudad:</span>
              <select
                value={selectedCity}
                aria-label="Filtrar farmacias por ciudad"
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
      </div>

      {/* 1. Farmacias y Cadenas Recomendadas por el Médico Tratante */}
      {groupedRecommended.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[11px] border-0">
              ⭐ Recomendadas por Dr(a). {doctorName || 'tu Médico Tratante'}
            </Badge>
            <span className="text-[11px] text-slate-500">
              Algoritmo inteligente activo: muestra la sucursal más conveniente según tu ubicación y disponibilidad de medicamentos
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {groupedRecommended.map(group => renderPharmacyChainCard(group, true))}
          </div>
        </div>
      )}

      {/* 2. Otras Farmacias Aliadas de la Ciudad */}
      {groupedCityPharmacies.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-teal-600" />
              {selectedCity ? `Farmacias en ${selectedCity}` : 'Otras Farmacias y Cadenas en la Red SUMA'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {groupedCityPharmacies.slice(0, 6).map(group => renderPharmacyChainCard(group, false))}
          </div>
        </div>
      )}

      {/* Modal de Tarjeta de Presentación, Reserva en 1 Clic y Catálogo de la Farmacia */}
      <PharmacyShowcaseModal
        isOpen={Boolean(selectedPharmacy)}
        onClose={() => setSelectedPharmacy(null)}
        pharmacy={selectedPharmacy}
        allBranches={selectedPharmacyBranches}
        allPharmacies={allPharmacies}
        isDoctorRecommended={isSelectedRecommended}
        recommendingDoctorName={doctorName}
        doctorId={doctorId || undefined}
        prescriptionText={prescriptionText}
        recipeCode={recipeCode}
        recipeId={recipeId}
        patientName={patientName}
        patientCedula={patientCedula}
        patientCity={selectedCity || defaultCity}
      />
    </div>
  );
}

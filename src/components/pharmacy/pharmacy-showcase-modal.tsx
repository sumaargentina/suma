"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Store,
  Search,
  MapPin,
  Phone,
  Clock,
  Navigation,
  MessageCircle,
  Pill,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Tag,
  Truck,
  Star,
  Building2,
  Compass,
  Ticket,
  ShoppingBag,
  RefreshCw,
  Info,
} from 'lucide-react';
import type { Pharmacy, PharmacyProduct } from '@/lib/types';
import { formatWhatsAppPhone } from './send-to-pharmacy-modal';
import { matchPrescriptionWithCatalog } from './recipe-recommended-pharmacies-section';
import { useToast } from '@/hooks/use-toast';

export interface PharmacyShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pharmacy: (Pharmacy & {
    isDoctorRecommended?: boolean;
    sponsorshipId?: string | null;
    hasPatientCoupon?: boolean;
    couponCode?: string | null;
    couponDiscountPercent?: number | null;
    couponDescription?: string | null;
    products?: PharmacyProduct[];
  }) | null;
  allPharmacies?: Pharmacy[];
  allBranches?: Pharmacy[];
  isDoctorRecommended?: boolean;
  recommendingDoctorName?: string;
  doctorId?: string;
  recipeId?: string;
  recipeCode?: string;
  patientName?: string;
  patientCedula?: string;
  patientCity?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  prescriptionText?: string;
  recipeUrl?: string;
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

export function PharmacyShowcaseModal({
  isOpen,
  onClose,
  pharmacy,
  allPharmacies = [],
  allBranches = [],
  isDoctorRecommended,
  recommendingDoctorName,
  doctorId,
  recipeId,
  recipeCode,
  patientName = 'Paciente',
  patientCedula,
  patientCity,
  doctorName: doctorNameProp,
  doctorSpecialty,
  prescriptionText = '',
  recipeUrl = '',
}: PharmacyShowcaseModalProps) {
  const doctorName = doctorNameProp || recommendingDoctorName;
  const effectiveAllPharmacies = allPharmacies.length > 0 ? allPharmacies : allBranches;
  const { toast } = useToast();

  const [activeBranch, setActiveBranch] = useState<any | null>(null);
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'reserve' | 'promotions' | 'catalog'>('overview');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

  // Estado Módulo 3 & 5: Cotizar o Apartar Récipe en 1 Clic + Recompra Crónica
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isChronicTreatment, setIsChronicTreatment] = useState(false);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);

  useEffect(() => {
    if (pharmacy && isOpen) {
      setActiveBranch({
        ...pharmacy,
        ...(isDoctorRecommended !== undefined ? { isDoctorRecommended } : {}),
      });
      setProductSearch('');
      setActiveTab('overview');
      setOrderSuccess(null);
      if (Array.isArray(pharmacy.products) && pharmacy.products.length > 0) {
        setProducts(pharmacy.products);
      }
    }
  }, [pharmacy, isOpen, isDoctorRecommended]);

  const chainBranches = useMemo(() => {
    if (!pharmacy) return [];
    const chainName = (pharmacy.chainName || pharmacy.chain_name || '').trim().toLowerCase();
    if (!chainName && !pharmacy.isChain && !pharmacy.is_chain) {
      return [pharmacy];
    }
    const targetChain = chainName || pharmacy.name.toLowerCase();
    const matches = effectiveAllPharmacies.filter((p) => {
      const pChain = (p.chainName || p.chain_name || '').trim().toLowerCase();
      return pChain === targetChain || p.id === pharmacy.id;
    });
    const list = matches.length > 0 ? matches : [pharmacy];

    return [...list].sort((a, b) => {
      if (userCoords && a.latitude && a.longitude && b.latitude && b.longitude) {
        const distA = calculateDistanceKm(userCoords.lat, userCoords.lng, Number(a.latitude), Number(a.longitude));
        const distB = calculateDistanceKm(userCoords.lat, userCoords.lng, Number(b.latitude), Number(b.longitude));
        return distA - distB;
      }
      if (patientCity) {
        const aInCity = (a.city || '').toLowerCase().includes(patientCity.toLowerCase()) ? 0 : 1;
        const bInCity = (b.city || '').toLowerCase().includes(patientCity.toLowerCase()) ? 0 : 1;
        if (aInCity !== bInCity) return aInCity - bInCity;
      }
      return (a.city || '').localeCompare(b.city || '');
    });
  }, [pharmacy, effectiveAllPharmacies, userCoords, patientCity]);

  useEffect(() => {
    async function fetchCatalog() {
      if (!activeBranch || !isOpen) return;
      try {
        setLoadingProducts(true);
        const ids = Array.from(new Set([activeBranch.id, ...chainBranches.map((b) => b.id)])).join(',');
        const res = await fetch(`/api/pharmacy/products?pharmacyIds=${encodeURIComponent(ids)}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error('Error cargando catálogo de la farmacia:', e);
      } finally {
        setLoadingProducts(false);
      }
    }
    fetchCatalog();
  }, [activeBranch?.id, chainBranches.length, isOpen]);

  const isProdTrulyAvailable = (p: PharmacyProduct) => {
    const qty = p.stockQuantity ?? p.stock_quantity;
    if (qty !== null && qty !== undefined) {
      return Number(qty) > 0 && Boolean(p.isAvailable);
    }
    return Boolean(p.isAvailable);
  };

  // Módulo 1: Match inteligente entre el récipe del paciente y el catálogo de esta farmacia
  const recipeMatch = useMemo(
    () => matchPrescriptionWithCatalog(prescriptionText, products),
    [prescriptionText, products]
  );

  const prescriptionKeywords = useMemo(() => {
    if (!prescriptionText) return [];
    const lines = prescriptionText
      .split(/\n|,|;/)
      .map((l) => l.replace(/^\d+[\)\.\-\s]*/, '').split(':')[0].trim())
      .filter((l) => l.length >= 3 && !l.toLowerCase().includes('indicaciones'));
    return lines.slice(0, 5);
  }, [prescriptionText]);

  const promotions = useMemo(
    () => products.filter((p) => p.isPromotion && isProdTrulyAvailable(p)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.genericName || '').toLowerCase().includes(q) ||
        (p.presentation || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.usageIndications || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Cálculo de subtotal estimado de los productos que hicieron Match con el Récipe + Cupón del Médico (Módulo 4)
  const hasCoupon = Boolean(pharmacy?.hasPatientCoupon && pharmacy?.couponCode);
  const couponCode = pharmacy?.couponCode || null;
  const couponPercent = Number(pharmacy?.couponDiscountPercent || 0);
  const couponDesc = pharmacy?.couponDescription || null;

  const estimatedSubtotal = useMemo(() => {
    return recipeMatch.matchedAvailable.reduce((acc, p) => {
      const price = p.promoPrice ?? p.referencePrice ?? 0;
      return acc + Number(price || 0);
    }, 0);
  }, [recipeMatch.matchedAvailable]);

  const estimatedFinalUsd = useMemo(() => {
    if (estimatedSubtotal <= 0) return 0;
    if (hasCoupon && couponPercent > 0) {
      return Math.max(0, estimatedSubtotal * (1 - couponPercent / 100));
    }
    return estimatedSubtotal;
  }, [estimatedSubtotal, hasCoupon, couponPercent]);

  const handleFindNearestBranch = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      toast({
        variant: 'destructive',
        title: 'Geolocalización no disponible',
        description: 'Tu navegador no permite detectar la ubicación GPS.',
      });
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserCoords(coords);
        setLocatingUser(false);
        const withCoords = chainBranches.filter((b) => b.latitude && b.longitude);
        if (withCoords.length > 0) {
          const sorted = [...withCoords].sort(
            (a, b) =>
              calculateDistanceKm(coords.lat, coords.lng, Number(a.latitude), Number(a.longitude)) -
              calculateDistanceKm(coords.lat, coords.lng, Number(b.latitude), Number(b.longitude))
          );
          setActiveBranch(sorted[0]);
          toast({
            title: 'Sucursal más cercana localizada',
            description: `Se seleccionó ${sorted[0].branchName || sorted[0].name} (${sorted[0].city}).`,
          });
        }
      },
      () => {
        setLocatingUser(false);
        toast({
          variant: 'destructive',
          title: 'Permiso de ubicación denegado',
          description: 'Puedes elegir manualmente la sucursal de tu ciudad en la lista.',
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (!pharmacy || !activeBranch) return null;

  const displayName =
    activeBranch.chainName || activeBranch.chain_name || activeBranch.name;
  const branchLabel = activeBranch.branchName || activeBranch.branch_name;
  const banner =
    activeBranch.bannerUrl ||
    activeBranch.banner_url ||
    activeBranch.bannerImage ||
    activeBranch.banner_image ||
    pharmacy.bannerUrl ||
    pharmacy.banner_url;
  const logo =
    activeBranch.logoUrl ||
    activeBranch.logo_url ||
    pharmacy.logoUrl ||
    pharmacy.logo_url;
  const tagline =
    activeBranch.promotionalTagline ||
    activeBranch.promotional_tagline ||
    pharmacy.promotionalTagline ||
    pharmacy.promotional_tagline;
  const is24h = Boolean(activeBranch.is24Hours || activeBranch.is_24_hours);
  const hasDelivery = Boolean(activeBranch.deliveryAvailable || activeBranch.delivery_available);
  const contactPhone = activeBranch.whatsapp || activeBranch.phone || pharmacy.phone;

  const mapsQuery =
    activeBranch.latitude && activeBranch.longitude
      ? `${activeBranch.latitude},${activeBranch.longitude}`
      : encodeURIComponent(`${displayName} ${activeBranch.address || ''} ${activeBranch.city || ''}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const trackWhatsAppClick = () => {
    if (pharmacy?.sponsorshipId) {
      fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pharmacy.sponsorshipId,
          action: 'track_metric',
          metric: 'whatsapp_click',
        }),
      }).catch(() => {});
    }
  };

  const handleContactWhatsApp = (customProduct?: PharmacyProduct) => {
    trackWhatsAppClick();
    if (!contactPhone) {
      toast({
        variant: 'destructive',
        title: 'Teléfono no registrado',
        description: 'Esta sucursal aún no tiene un número de WhatsApp configurado.',
      });
      return;
    }
    const cleanPhone = formatWhatsAppPhone(contactPhone);
    const fullBranchTitle = branchLabel ? `${displayName} (Sucursal ${branchLabel})` : displayName;

    const lines = [
      `¡Hola, *${fullBranchTitle}*! 👋`,
      `Vengo desde mi Récipe Digital en *SUMA Salud*${pharmacy.isDoctorRecommended && doctorName ? ` (Recomendada por el Dr(a). ${doctorName})` : ''}.`,
      hasCoupon ? `🎟️ *Cupón Aplicado:* ${couponCode} (${couponPercent}% Dto.)` : null,
      '',
      customProduct
        ? `Quisiera consultar por el producto: *${customProduct.name}* ${customProduct.presentation ? `(${customProduct.presentation})` : ''}${customProduct.isPromotion && customProduct.promoLabel ? ` [Promoción: ${customProduct.promoLabel}]` : ''}.`
        : `Quisiera consultar disponibilidad para surtir mi récipe médico:`,
      !customProduct && prescriptionText ? `\n📋 *MEDICAMENTOS:*\n${prescriptionText}` : null,
      recipeCode ? `\n📄 *Código Récipe:* ${recipeCode}` : null,
      patientName ? `👤 *Paciente:* ${patientName}${patientCedula ? ` (C.I.: ${patientCedula})` : ''}` : null,
      recipeUrl ? `🔗 *Verificación en línea:* ${recipeUrl}` : null,
    ].filter(Boolean);

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  // Módulo 3 & 5: Enviar Reserva / Cotización en 1 Clic
  const handleSubmitOneClickOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingOrder(true);
      const res = await fetch('/api/pharmacy/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeId: recipeId || null,
          recipeCode: recipeCode || null,
          pharmacyId: activeBranch.id,
          doctorId: doctorId || null,
          patientName: patientName || 'Paciente SUMA',
          patientCedula: patientCedula || null,
          patientPhone: orderPhone.trim() || null,
          deliveryType,
          deliveryAddress: deliveryType === 'delivery' ? orderAddress.trim() : null,
          prescriptionText: prescriptionText || 'Solicitud desde catálogo de farmacia',
          matchedItems: recipeMatch.matchedAvailable.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.promoPrice ?? p.referencePrice ?? null,
            stockQuantity: p.stockQuantity ?? p.stock_quantity ?? null,
          })),
          couponCode: hasCoupon ? couponCode : null,
          discountPercentage: hasCoupon ? couponPercent : 0,
          quotedTotalUsd: estimatedFinalUsd > 0 ? Number(estimatedFinalUsd.toFixed(2)) : null,
          patientNotes: orderNotes.trim() || null,
          isChronicTreatment,
          refillIntervalDays: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar pedido');

      setOrderSuccess(data);
      toast({
        title: '✅ Solicitud recibida por la Farmacia',
        description:
          deliveryType === 'delivery'
            ? 'Tu pedido con Delivery ha sido registrado. La farmacia te confirmará de inmediato.'
            : 'Tus medicamentos han sido solicitados para retiro en mostrador.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al enviar solicitud',
        description: err.message,
      });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const renderStockBadge = (prod: PharmacyProduct) => {
    const qty = prod.stockQuantity ?? prod.stock_quantity;
    const avail = isProdTrulyAvailable(prod);

    if (!avail) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
          <XCircle className="h-3 w-3" /> Sin disponibilidad {qty === 0 ? '(0 disp.)' : ''}
        </span>
      );
    }

    if (qty !== null && qty !== undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Disponible ({qty} unid. para SUMA)
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Disponible en sede
      </span>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 rounded-2xl border-0 shadow-2xl">
        {/* ─── BANNER PUBLICITARIO DE LA FARMACIA ─── */}
        <div className="relative h-40 sm:h-48 w-full bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 shrink-0 overflow-hidden">
          {banner ? (
            <img
              src={banner}
              alt={`Publicidad ${displayName}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-between px-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/40 via-teal-800 to-slate-900">
              <div className="space-y-1 max-w-md">
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-300 block">
                  Red Oficial de Farmacias SUMA
                </span>
                <h2 className="text-2xl font-black text-white">{displayName}</h2>
                {tagline && <p className="text-xs text-emerald-100">{tagline}</p>}
              </div>
              <Pill className="h-24 w-24 text-white/10 -rotate-12" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

          {/* Badges Superiores */}
          <div className="absolute top-3 left-3 right-10 flex flex-wrap items-center gap-1.5 z-10">
            {activeBranch.isDoctorRecommended && (
              <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 font-extrabold text-[11px] px-2.5 py-1 shadow-md border-0 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-slate-950" />
                Recomendada por {doctorName ? `Dr(a). ${doctorName}` : 'tu Médico'}
              </Badge>
            )}
            {hasCoupon && (
              <Badge className="bg-indigo-600 text-white font-extrabold text-[11px] px-2.5 py-1 shadow-md border-0 flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" />
                Cupón {couponCode} (-{couponPercent}%)
              </Badge>
            )}
            {is24h && (
              <Badge className="bg-blue-600/95 text-white border-0 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Abierto 24 Horas
              </Badge>
            )}
            {hasDelivery && (
              <Badge className="bg-emerald-500/95 text-white border-0 text-[10px] font-bold px-2.5 py-0.5 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Servicio Delivery
              </Badge>
            )}
          </div>

          {/* Identidad superpuesta en la base del Banner */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3 z-10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white p-1.5 shadow-xl border-2 border-white shrink-0 flex items-center justify-center overflow-hidden">
                {logo ? (
                  <img src={logo} alt={displayName} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-black text-xl">
                    {displayName.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-white min-w-0">
                <DialogHeader className="text-left space-y-0">
                  <DialogTitle className="text-lg sm:text-2xl font-black text-white truncate">
                    {displayName}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-emerald-200 font-medium truncate">
                    {branchLabel ? `Sucursal ${branchLabel} • ` : ''}
                    {activeBranch.city}
                    {activeBranch.state ? `, ${activeBranch.state}` : ''}
                  </DialogDescription>
                </DialogHeader>
                {tagline && (
                  <p className="text-[11px] text-amber-200 font-semibold mt-1 line-clamp-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 shrink-0" /> {tagline}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── NAVEGACIÓN DE PESTAÑAS DE LA TARJETA ─── */}
        <div className="bg-white border-b border-slate-200 px-4 pt-2 flex items-center gap-1.5 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Ubicación ({chainBranches.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reserve')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reserve'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-emerald-700 hover:bg-emerald-50/40'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
            Cotizar / Apartar Récipe (1 Clic)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('promotions')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'promotions'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Tag className="h-3.5 w-3.5 text-amber-500" />
            Promociones ({promotions.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/60'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pill className="h-3.5 w-3.5 text-teal-600" />
            Catálogo y Cantidades SUMA ({products.length})
          </button>
        </div>

        {/* ─── CONTENIDO SCROLLABLE ─── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* PESTAÑA 1: UBICACIÓN, SEMÁFORO DEL RÉCIPE Y SUCURSALES */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Módulo 4: Cupón Exclusivo del Médico (si aplica) */}
              {hasCoupon && (
                <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-teal-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                      <Ticket className="h-5 w-5 text-amber-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                          Beneficio Acordado con tu Médico
                        </span>
                        <Badge className="bg-amber-400 text-slate-950 font-black text-[10px] border-0">
                          -{couponPercent}% DTO
                        </Badge>
                      </div>
                      <p className="text-xs text-indigo-100 mt-0.5">
                        Presenta o aplica el cupón <strong className="font-mono bg-white/20 px-1.5 py-0.5 rounded text-white">{couponCode}</strong> en esta farmacia. {couponDesc || ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab('reserve')}
                    className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-xl shrink-0"
                  >
                    Usar Cupón y Apartar
                  </Button>
                </div>
              )}

              {/* Módulo 1: Semáforo Inteligente de Disponibilidad del Récipe */}
              {prescriptionText && (recipeMatch.matchedAvailable.length > 0 || recipeMatch.matchedOutOfStock.length > 0) && (
                <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Semáforo de Disponibilidad para tu Récipe Médico
                      </span>
                      <p className="text-[11px] text-emerald-800">
                        Encontramos <strong>{recipeMatch.matchedAvailable.length} medicamento(s) disponible(s)</strong> de tu récipe en el inventario SUMA de esta farmacia:
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setActiveTab('reserve')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-8 shrink-0"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                      Apartar o Pedir Delivery (1 Clic)
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recipeMatch.matchedAvailable.map((m) => (
                      <div key={m.id} className="bg-white border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{m.name}</p>
                          <p className="text-[10px] text-emerald-700 font-semibold">
                            {m.stockQuantity !== null && m.stockQuantity !== undefined
                              ? `🟢 ${m.stockQuantity} unidades dispuestas para clientes SUMA`
                              : '🟢 Disponible en sede'}
                          </p>
                        </div>
                        {(m.promoPrice || m.referencePrice) && (
                          <span className="text-xs font-black text-emerald-800 shrink-0">
                            ${Number(m.promoPrice || m.referencePrice).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tarjeta de la Sucursal Seleccionada */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Tarjeta de Presentación Oficial
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-1">
                      {displayName} {branchLabel ? `— Sucursal ${branchLabel}` : ''}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors"
                    >
                      <Navigation className="h-3.5 w-3.5 text-emerald-400" />
                      Cómo llegar (Google Maps)
                    </a>
                    <Button
                      size="sm"
                      onClick={() => handleContactWhatsApp()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      Enviar Récipe por WhatsApp
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">
                        Dirección en {activeBranch.city}{activeBranch.state ? `, ${activeBranch.state}` : ''}
                      </span>
                      <span className="text-slate-600 mt-0.5 block">
                        {activeBranch.address || 'Dirección principal registrada en SUMA'}
                      </span>
                      {userCoords && activeBranch.latitude && activeBranch.longitude && (
                        <span className="text-[11px] font-bold text-emerald-700 mt-1 inline-block">
                          📍 A {calculateDistanceKm(userCoords.lat, userCoords.lng, Number(activeBranch.latitude), Number(activeBranch.longitude))} km de tu ubicación actual
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl">
                    <Phone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 block">Atención y Contacto Directo</span>
                      <span className="text-slate-600 mt-0.5 block">
                        {contactPhone || 'Consultar en mostrador'}
                      </span>
                      <span className="text-[11px] text-teal-700 font-semibold mt-1 block">
                        {is24h ? '🕒 Servicio continuo 24 Horas' : '🕒 Horario comercial de atención'}
                        {hasDelivery ? ' • 🛵 Delivery disponible' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Selector de Sucursales para Franquicias */}
              {chainBranches.length > 1 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-teal-600" />
                        Sucursales de {displayName} ({chainBranches.length} sedes disponibles)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Selecciona la sucursal más cercana a tu ubicación para ver su dirección exacta y mapa.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFindNearestBranch}
                      disabled={locatingUser}
                      className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50 rounded-xl h-8"
                    >
                      {locatingUser ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Compass className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
                      )}
                      Buscar sucursal más cercana por GPS
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                    {chainBranches.map((branch, idx) => {
                      const isSelected = branch.id === activeBranch.id;
                      const bLabel = branch.branchName || branch.branch_name || branch.name;
                      const dist =
                        userCoords && branch.latitude && branch.longitude
                          ? calculateDistanceKm(
                              userCoords.lat,
                              userCoords.lng,
                              Number(branch.latitude),
                              Number(branch.longitude)
                            )
                          : null;

                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => setActiveBranch(branch)}
                          className={`text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-500'
                              : 'border-slate-200 hover:border-teal-300 bg-slate-50/50'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {bLabel}
                              </span>
                              {idx === 0 && (
                                <Badge className="bg-teal-600 text-white border-0 text-[9px] px-1.5 py-0">
                                  Más cercana
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] font-semibold text-teal-700 mt-0.5">
                              {branch.city}{branch.state ? `, ${branch.state}` : ''}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">{branch.address}</p>
                          </div>
                          {dist !== null && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                              {dist} km
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2 (MÓDULOS 3, 4 Y 5): COTIZAR O APARTAR MI RÉCIPE EN 1 CLIC (MOSTRADOR O DELIVERY + RECOMPRA CRÓNICA) */}
          {activeTab === 'reserve' && (
            <div className="space-y-4">
              {orderSuccess ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto" />
                  <h3 className="text-lg font-extrabold text-emerald-950">
                    ¡Solicitud enviada a {displayName}!
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    La farmacia recibió tu récipe <strong>{recipeCode || ''}</strong> para{' '}
                    <strong>{deliveryType === 'delivery' ? 'Envío Delivery a Domicilio' : 'Retiro en Mostrador'}</strong>.
                    {isChronicTreatment && ' Además, activamos tu recordatorio mensual de recompra de tratamiento.'}
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleContactWhatsApp()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                      Confirmar también por WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitOneClickOrder} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-emerald-600" />
                        Cotizar o Apartar mi Récipe en 1 Clic
                      </h3>
                      <p className="text-xs text-slate-500">
                        Aparta tus medicamentos en mostrador o solicita Delivery directo desde SUMA.
                      </p>
                    </div>
                    {hasCoupon && (
                      <Badge className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-1 border-0">
                        🎟️ Cupón {couponCode} (-{couponPercent}% aplicado)
                      </Badge>
                    )}
                  </div>

                  {/* Resumen de medicamentos detectados */}
                  {recipeMatch.matchedAvailable.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase block">
                        Medicamentos disponibles en {displayName}:
                      </span>
                      {recipeMatch.matchedAvailable.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            • {m.name} {m.stockQuantity != null ? `(${m.stockQuantity} disp. SUMA)` : ''}
                          </span>
                          {(m.promoPrice || m.referencePrice) && (
                            <span className="font-bold text-emerald-700">
                              ${Number(m.promoPrice || m.referencePrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                      {estimatedSubtotal > 0 && (
                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold">
                          <span>Total Estimado {hasCoupon && couponPercent > 0 ? `(con -${couponPercent}% Cupón ${couponCode})` : ''}:</span>
                          <span className="text-sm text-emerald-700">${estimatedFinalUsd.toFixed(2)} USD</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Modalidad de Entrega */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        deliveryType === 'pickup'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      🏪 Apartar para Retiro en Sede
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                        Pasa por el mostrador sin hacer fila
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                        deliveryType === 'delivery'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-600'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      🛵 Solicitar Delivery a Domicilio
                      <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                        Recibe tus medicamentos en casa
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Tu Teléfono / WhatsApp de Contacto *</Label>
                      <Input
                        required
                        value={orderPhone}
                        onChange={(e) => setOrderPhone(e.target.value)}
                        placeholder="Ej: +58 414 1234567"
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    {deliveryType === 'delivery' && (
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Dirección Exacta de Entrega *</Label>
                        <Input
                          required
                          value={orderAddress}
                          onChange={(e) => setOrderAddress(e.target.value)}
                          placeholder="Urbanización, calle, casa/edificio y referencia..."
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Notas adicionales para el farmacéutico (Opcional)</Label>
                    <Textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Ej: Pago por Pago Móvil al confirmar monto exacto..."
                      className="text-xs rounded-xl"
                    />
                  </div>

                  {/* Módulo 5: Recompra de Tratamiento Crónico / Mensual */}
                  <label className="flex items-start gap-2.5 bg-teal-50/70 border border-teal-200 rounded-xl p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChronicTreatment}
                      onChange={(e) => setIsChronicTreatment(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-teal-600"
                    />
                    <div className="text-xs">
                      <span className="font-bold text-teal-950 flex items-center gap-1">
                        <RefreshCw className="h-3.5 w-3.5 text-teal-600" />
                        Este es un tratamiento mensual / continuo (Programar Recompra)
                      </span>
                      <span className="text-[11px] text-teal-800 block mt-0.5">
                        SUMA y la farmacia te avisarán a los 25 días antes de que se agoten tus medicamentos para reponerlos con tu beneficio SUMA.
                      </span>
                    </div>
                  </label>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={submittingOrder}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl h-10 px-5"
                    >
                      {submittingOrder && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      Enviar Reserva / Cotización a la Farmacia
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* PESTAÑA 3: PRODUCTOS EN PROMOCIÓN */}
          {activeTab === 'promotions' && (
            <div className="space-y-3">
              {loadingProducts ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-7 w-7 text-emerald-600 animate-spin" />
                  <p className="text-xs text-slate-500">Cargando promociones de la farmacia...</p>
                </div>
              ) : promotions.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <Tag className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">Sin promociones cargadas en este momento</p>
                  <p className="text-xs text-slate-500">
                    Puedes consultar todo el listado de medicamentos disponibles en la pestaña de Catálogo.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {promotions.map((prod) => (
                    <div
                      key={prod.id}
                      className="bg-white border border-amber-200/90 hover:border-amber-400 rounded-2xl p-3.5 shadow-xs flex flex-col justify-between gap-3 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <Pill className="h-6 w-6 text-emerald-600/60" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 border-0 text-[10px] font-extrabold px-2 py-0">
                              {prod.promoLabel || 'PROMOCIÓN'}
                            </Badge>
                            {renderStockBadge(prod)}
                          </div>
                          <h4 className="font-bold text-sm text-slate-900 mt-1">{prod.name}</h4>
                          {(prod.genericName || prod.presentation) && (
                            <p className="text-[11px] text-slate-500">
                              {[prod.genericName, prod.presentation].filter(Boolean).join(' • ')}
                            </p>
                          )}
                          {prod.description && (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{prod.description}</p>
                          )}
                          {prod.usageIndications && (
                            <p className="text-[10px] text-teal-800 bg-teal-50 px-2 py-1 rounded mt-1">
                              <strong>Indicaciones:</strong> {prod.usageIndications}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {prod.promoPrice && (
                            <span className="text-sm font-black text-emerald-700">
                              ${Number(prod.promoPrice).toFixed(2)}
                            </span>
                          )}
                          {prod.referencePrice && prod.promoPrice && (
                            <span className="text-[11px] text-slate-400 line-through">
                              ${Number(prod.referencePrice).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleContactWhatsApp(prod)}
                          className="shrink-0 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-xl h-8 font-bold"
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          Pedir
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 4: CATÁLOGO DE MEDICAMENTOS, CANTIDADES DISPUESTAS PARA SUMA E INDICACIONES */}
          {activeTab === 'catalog' && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar medicamento por nombre, principio activo o indicaciones..."
                    className="pl-9 h-9 text-xs rounded-xl bg-slate-50"
                  />
                </div>

                {prescriptionKeywords.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Buscar de mi récipe:
                    </span>
                    {prescriptionKeywords.map((kw, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setProductSearch(kw)}
                        className="text-[11px] bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full font-semibold transition-colors"
                      >
                        💊 {kw}
                      </button>
                    ))}
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="text-[11px] text-slate-500 hover:text-slate-800 underline ml-1"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                )}
              </div>

              {loadingProducts ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
                  <p className="text-xs text-slate-500">Consultando catálogo y cantidades disponibles...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
                  <Pill className="h-8 w-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">
                    {products.length === 0
                      ? 'Esta farmacia aún no ha publicado productos en su catálogo'
                      : `No se encontraron coincidencias para "${productSearch}"`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map((prod) => {
                    const avail = isProdTrulyAvailable(prod);
                    return (
                      <div
                        key={prod.id}
                        className="bg-white border border-slate-200/90 hover:border-teal-300 rounded-2xl p-3.5 flex flex-col justify-between gap-2.5 shadow-2xs"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-14 w-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {prod.imageUrl ? (
                              <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <Pill className="h-5 w-5 text-teal-600/60" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-bold text-xs sm:text-sm text-slate-900">{prod.name}</h5>
                              {prod.isPromotion && (
                                <Badge className="bg-amber-400 text-slate-950 border-0 text-[9px] font-bold px-1.5 py-0">
                                  {prod.promoLabel || 'Oferta'}
                                </Badge>
                              )}
                            </div>
                            {(prod.genericName || prod.presentation) && (
                              <p className="text-[11px] text-slate-500">
                                {[prod.genericName, prod.presentation].filter(Boolean).join(' • ')}
                              </p>
                            )}
                            {prod.description && (
                              <p className="text-[11px] text-slate-600 mt-1">{prod.description}</p>
                            )}
                            {prod.usageIndications && (
                              <p className="text-[10px] text-teal-900 bg-teal-50/80 border border-teal-100 px-2 py-1 rounded-lg mt-1">
                                <strong className="font-bold">Indicaciones:</strong> {prod.usageIndications}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderStockBadge(prod)}
                            {(prod.promoPrice || prod.referencePrice) && (
                              <span className="text-xs font-extrabold text-slate-900">
                                ${Number(prod.promoPrice || prod.referencePrice).toFixed(2)}
                              </span>
                            )}
                          </div>

                          {avail && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleContactWhatsApp(prod)}
                              className="shrink-0 text-xs text-emerald-700 hover:bg-emerald-50 rounded-lg h-7 px-2.5 font-bold"
                            >
                              <MessageCircle className="h-3.5 w-3.5 mr-1" />
                              Pedir
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

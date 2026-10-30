"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MapPin, Pill, Phone, Clock, ShieldCheck, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import type { Pharmacy } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  priority?: boolean;
}

export function PharmacyCard({ pharmacy, priority = false }: PharmacyCardProps) {
  const [bannerError, setBannerError] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);

  const isChainBranch = pharmacy.isChain || Boolean(pharmacy.chainName || pharmacy.chain_name);
  const displayName = pharmacy.chainName || pharmacy.chain_name || pharmacy.name;
  const branchName = isChainBranch ? (pharmacy.branchName || pharmacy.branch_name) : null;
  const is24Hours = Boolean(pharmacy.is24Hours || pharmacy.is_24_hours);
  const cityState = [pharmacy.city, pharmacy.state || 'Venezuela'].filter(Boolean).join(', ');
  const phone = pharmacy.phone;
  const lat = pharmacy.latitude;
  const lng = pharmacy.longitude;

  const logo = (!logoError && (pharmacy.logoUrl || pharmacy.logo_url)) || null;
  const banner = (!bannerError && (pharmacy.bannerUrl || pharmacy.banner_url || pharmacy.bannerImage || pharmacy.banner_image)) || null;

  const mapsQuery = (lat && lng) 
    ? `${lat},${lng}` 
    : encodeURIComponent(`${displayName} ${pharmacy.address || ''} ${pharmacy.city || ''}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  return (
    <Card className="group relative overflow-hidden bg-white hover:shadow-xl transition-all duration-300 border-slate-200/80 hover:border-emerald-300 rounded-2xl flex flex-col justify-between">
      {/* ─── BANNER SUPERIOR ─── */}
      <div className="relative h-28 sm:h-32 w-full overflow-hidden bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900">
        {banner ? (
          <img
            src={banner}
            alt={`Banner de ${displayName}`}
            onError={() => setBannerError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full relative flex items-center justify-between px-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-600/50 via-teal-800 to-slate-900">
            {/* Patrón decorativo suave */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#a7f3d0_1px,transparent_1px)] [background-size:16px_16px]" />
            <div className="text-white/20 font-bold text-xs uppercase tracking-widest relative z-1">
              Farmacia Aliada
            </div>
            <Pill className="h-16 w-16 text-white/10 -rotate-12 relative z-1" />
          </div>
        )}

        {/* Gradiente sutil para legibilidad de badges */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Badges superiores flotantes */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
          {is24Hours && (
            <Badge className="bg-blue-600/90 hover:bg-blue-600 text-white backdrop-blur-md border-0 text-[10px] font-bold px-2 py-0.5 shadow-sm flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              24 Horas
            </Badge>
          )}
          <Badge className="bg-emerald-500/95 hover:bg-emerald-500 text-white backdrop-blur-md border-0 text-[10px] font-bold px-2 py-0.5 shadow-sm flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Aliada SUMA
          </Badge>
        </div>
      </div>

      {/* ─── CONTENIDO DE LA TARJETA ─── */}
      <div className="px-4 pb-4 sm:px-5 sm:pb-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header con Foto de Perfil / Logotipo solapado sobre el Banner */}
          <div className="flex items-end justify-between -mt-7 mb-3 relative z-10">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
              {logo ? (
                <img
                  src={logo}
                  alt={displayName}
                  onError={() => setLogoError(true)}
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-emerald-600 font-bold text-sm">
                  {displayName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {branchName && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1 rounded-full line-clamp-1 max-w-[180px]">
                Sucursal {branchName}
              </span>
            )}
          </div>

          {/* Nombre comercial */}
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug group-hover:text-emerald-700 transition-colors line-clamp-1">
              {displayName}
            </h3>
            {isChainBranch && !branchName && pharmacy.name !== displayName && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {pharmacy.name}
              </p>
            )}
          </div>

          {/* Información de ubicación y contacto */}
          <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div className="line-clamp-2 leading-relaxed">
                <span className="font-semibold text-slate-800">{cityState}</span>
                {pharmacy.address && (
                  <span className="text-slate-500 block text-[11px] mt-0.5">
                    {pharmacy.address}
                  </span>
                )}
              </div>
            </div>

            {phone && (
              <div className="flex items-center gap-2 text-slate-600 pt-0.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <a
                  href={`tel:${phone}`}
                  className="font-medium text-emerald-700 hover:underline text-xs"
                >
                  {phone}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-1 rounded-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Despacha Récipes SUMA
          </span>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Navigation className="h-3.5 w-3.5 text-emerald-600" />
            <span>Ver mapa</span>
          </a>
        </div>
      </div>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * MINITARJETA COMPACTA DE FARMACIA ALIADA
 * ────────────────────────────────────────────────────────────────────────── */
interface PharmacyMiniCardProps {
  pharmacy: Pharmacy;
  onClick: () => void;
  className?: string;
}

export function PharmacyMiniCard({ pharmacy, onClick, className }: PharmacyMiniCardProps) {
  const [logoError, setLogoError] = React.useState(false);

  const isChainBranch = pharmacy.isChain || Boolean(pharmacy.chainName || pharmacy.chain_name);
  const displayName = pharmacy.chainName || pharmacy.chain_name || pharmacy.name;
  const branchName = isChainBranch ? (pharmacy.branchName || pharmacy.branch_name) : null;
  const is24Hours = Boolean(pharmacy.is24Hours || pharmacy.is_24_hours);
  const city = pharmacy.city || pharmacy.state || '';
  const logo = (!logoError && (pharmacy.logoUrl || pharmacy.logo_url)) || null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left bg-white hover:bg-emerald-50/40 border border-slate-200/90 hover:border-emerald-400 rounded-xl p-2.5 md:p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 flex items-center gap-2.5 md:gap-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer",
        className
      )}
    >
      {/* Logo un poquito más grande y apreciable */}
      <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-slate-50 border border-slate-100 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 group-hover:border-emerald-200 transition-colors">
        {logo ? (
          <img
            src={logo}
            alt={displayName}
            onError={() => setLogoError(true)}
            className="w-full h-full object-contain p-1"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-xs md:text-sm">
            {displayName.substring(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info fina pero más legible */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-1.5">
          <p className="font-bold text-slate-900 text-xs md:text-sm leading-tight truncate group-hover:text-emerald-700 transition-colors">
            {displayName}
          </p>
          {is24Hours && (
            <span className="shrink-0 text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200/70 px-1.5 py-0.5 rounded">
              24h
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px] md:text-xs text-slate-500 truncate leading-none">
          <MapPin className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="truncate">
            {branchName ? `${branchName}${city ? ` · ${city}` : ''}` : (city || 'Aliada SUMA')}
          </span>
        </div>

        <div className="flex items-center gap-1 pt-0.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-100/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Récipe SUMA
          </span>
        </div>
      </div>
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * SECCIÓN DE FARMACIAS ALIADAS (1 LÍNEA + VER MÁS DESPLEGABLE + MODAL)
 * ────────────────────────────────────────────────────────────────────────── */
interface AlliedPharmaciesSectionProps {
  pharmacies: Pharmacy[];
  defaultExpanded?: boolean;
}

export function AlliedPharmaciesSection({
  pharmacies,
  defaultExpanded = false,
}: AlliedPharmaciesSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [selectedPharmacy, setSelectedPharmacy] = React.useState<Pharmacy | null>(null);

  if (!pharmacies || pharmacies.length === 0) return null;

  // En una sola línea caben: 2 (móvil), 3 (sm), 4 (md), 5 (lg) para que se aprecien un poquito más grandes
  const SINGLE_ROW_MAX = 5;
  const visibleList = isExpanded ? pharmacies : pharmacies.slice(0, SINGLE_ROW_MAX);
  const hasMoreDesktop = pharmacies.length > SINGLE_ROW_MAX;
  const hasMoreMobileOrTablet = pharmacies.length > 2;

  // Clases responsivas para que cuando NO esté expandido se vea estrictamente 1 sola fila en cualquier pantalla
  const getSingleRowVisibilityClass = (index: number) => {
    if (isExpanded) return '';
    if (index < 2) return ''; // visible en todos (2 cols en móvil)
    if (index === 2) return 'hidden sm:flex'; // 3ra visible desde sm (3 cols)
    if (index === 3) return 'hidden md:flex'; // 4ta visible desde md (4 cols)
    if (index === 4) return 'hidden lg:flex'; // 5ta visible desde lg (5 cols)
    return 'hidden';
  };

  return (
    <div className="space-y-2.5 md:space-y-3">
      {/* Header compacto */}
      <div className="flex items-center justify-between border-b pb-2 border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500/10 rounded-lg">
            <Pill className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <h2 className="text-sm md:text-lg font-bold text-slate-900">Farmacias Aliadas</h2>
            <span className="text-[10px] md:text-xs text-slate-500 hidden sm:inline">
              Toca cualquier farmacia para ver su ficha completa y ubicación
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] md:text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-100">
            {pharmacies.length} {pharmacies.length === 1 ? 'aliada' : 'aliadas'}
          </span>

          {hasMoreMobileOrTablet && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(prev => !prev)}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 rounded-lg",
                !hasMoreDesktop && "lg:hidden"
              )}
            >
              <span>{isExpanded ? 'Ver menos' : 'Ver más'}</span>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>
      </div>

      {/* Grid de minitarjetas un poquito más grandes y apreciables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-3">
        {visibleList.map((pharmacy, idx) => (
          <PharmacyMiniCard
            key={pharmacy.id}
            pharmacy={pharmacy}
            onClick={() => setSelectedPharmacy(pharmacy)}
            className={getSingleRowVisibilityClass(idx)}
          />
        ))}
      </div>

      {/* Botón inferior desplegable "Ver más" / "Ver menos" */}
      {hasMoreMobileOrTablet && (
        <div className={cn("flex justify-center pt-1", !hasMoreDesktop && !isExpanded && "lg:hidden")}>
          <button
            type="button"
            onClick={() => setIsExpanded(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs transition-all cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Mostrar solo una fila</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Ver más farmacias aliadas ({pharmacies.length})</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Modal con la tarjeta completa de la farmacia seleccionada */}
      <Dialog
        open={Boolean(selectedPharmacy)}
        onOpenChange={(open) => {
          if (!open) setSelectedPharmacy(null);
        }}
      >
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0 bg-transparent shadow-2xl">
          <DialogTitle className="sr-only">
            {selectedPharmacy?.chainName || selectedPharmacy?.chain_name || selectedPharmacy?.name || 'Detalle de Farmacia Aliada'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Información de contacto, dirección y ubicación en el mapa de la farmacia aliada SUMA.
          </DialogDescription>
          {selectedPharmacy && (
            <PharmacyCard pharmacy={selectedPharmacy} priority />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

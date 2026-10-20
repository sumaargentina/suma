"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Pill, Phone, Clock, ShieldCheck, Navigation } from 'lucide-react';
import type { Pharmacy } from '@/lib/types';

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

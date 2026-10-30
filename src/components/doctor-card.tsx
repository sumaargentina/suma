"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star, Share2, Copy, Send, Mail, ShieldCheck, User, Banknote } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { findProfessionBySpecialty } from "@/lib/professions-catalog";
import type { Doctor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { user, toggleFavoriteDoctor } = useAuth();
  const { professionsCatalog } = useSettings();
  const { toast } = useToast();

  const resolvedProfession =
    doctor.profession ||
    findProfessionBySpecialty(doctor.specialty, professionsCatalog)?.name ||
    'Médico';

  const hasTitlePrefix = /^(dr\.?|dra\.?|lic\.?|ing\.?|prof\.?)\s/i.test(doctor.name.trim());
  const isDoctorOrDentist =
    resolvedProfession === 'Médico' || resolvedProfession === 'Dentista (Odontólogo)';
  const displayDoctorName = hasTitlePrefix
    ? doctor.name
    : isDoctorOrDentist
      ? `Dr(a). ${doctor.name}`
      : doctor.name;

  const isFavorite = user?.role === 'patient' && user.favoriteDoctorIds?.includes(doctor.id);

  const handleFavoriteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Inicia Sesión",
        description: "Debes iniciar sesión para guardar favoritos.",
      });
      return;
    }
    if (user.role === 'patient') {
      toggleFavoriteDoctor(doctor.id);
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/doctors/${doctor.id}`;
    const shareText = `¡Mira este especialista! Dr. ${doctor.name}, ${doctor.specialty}.`;

    // Usar Web Share API si está disponible (móviles)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dr. ${doctor.name}`,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // Usuario canceló o error, intentar clipboard
        copyToClipboardFallback(shareUrl);
      }
    } else {
      copyToClipboardFallback(shareUrl);
    }
  };

  const copyToClipboardFallback = (url: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        toast({ title: "¡Enlace copiado!" });
      }).catch(() => {
        toast({ variant: "destructive", title: "Error al copiar" });
      });
    } else {
      toast({ variant: "destructive", title: "No compatible" });
    }
  };

  // Ensure this runs only on the client
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/doctors/${doctor.id}` : '';
  const shareText = `¡Echa un vistazo a este especialista! Dr. ${doctor.name}, ${doctor.specialty}.`;
  const encodedShareText = encodeURIComponent(shareText);
  const encodedShareUrl = encodeURIComponent(shareUrl);

  const whatsappLink = `https://api.whatsapp.com/send?text=${encodedShareText}%20${encodedShareUrl}`;
  const telegramLink = `https://t.me/share/url?url=${encodedShareUrl}&text=${encodedShareText}`;
  const facebookLink = `https://www.facebook.com/sharer/sharer.php?u=${encodedShareUrl}`;
  const emailLink = `mailto:?subject=${encodeURIComponent('Recomendación de especialista')}&body=${encodedShareText}%20${encodedShareUrl}`;


  return (
    <div className="relative group h-full">
      {/* Botón de favorito flotante (Ajustado) */}
      {user?.role === 'patient' && (
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 z-20 p-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white hover:scale-110 transition-all duration-300"
        >
          <Heart className={cn("h-4 w-4", isFavorite ? "fill-red-500 text-red-500" : "text-slate-400")} />
        </button>
      )}

      <Link href={`/doctors/${doctor.id}`} className="block h-full">
        {/* DISEÑO MÓVIL COMPACTO Y ESCRITORIO HORIZONTAL */}
        {/* Usamos flex-row desde móvil en adelante, ajustando tamaños */}
        <Card className="flex flex-row h-full overflow-hidden border-slate-200 hover:shadow-xl hover:border-primary/20 transition-all duration-300 bg-white shadow-sm">

          {/* SECCIÓN DE IMAGEN (Más delicada y compacta en computadora) */}
          <div className="relative w-24 sm:w-28 md:w-32 shrink-0 bg-slate-100 overflow-hidden border-r border-slate-100">
            {/* Aspect ratio handled by container height stretching */}
            <div className="absolute inset-0 h-full w-full">
              {doctor.profileImage ? (
                <Image
                  src={doctor.profileImage}
                  alt={`Dr. ${doctor.name}`}
                  fill
                  sizes="(max-width: 640px) 100px, 140px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <User className="h-9 w-9 sm:h-12 sm:w-12 text-slate-300" />
                </div>
              )}
            </div>

            {/* Badge Verificado */}
            {doctor.verificationStatus === 'verified' && (
              <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 z-10">
                {/* Versión Móvil: Solo Icono o muy compacto */}
                <div className="sm:hidden bg-emerald-500 text-white rounded-full p-1 shadow-sm border border-white/20">
                  <ShieldCheck className="w-3 h-3" />
                </div>

                {/* Versión Escritorio: Badge delicado */}
                <Badge className="hidden sm:inline-flex bg-emerald-500/95 hover:bg-emerald-600 text-white border-0 text-[9px] px-1.5 py-0.5 backdrop-blur-sm shadow-sm transition-all">
                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                  Verificado
                </Badge>
              </div>
            )}
          </div>

          {/* SECCIÓN DE CONTENIDO */}
          <CardContent className="flex-1 p-2.5 sm:p-3.5 flex flex-col justify-between gap-1.5 sm:gap-2 min-w-0">
            <div>
              {/* Header: Nombre, Profesión y Especialidad */}
              <div className="mb-1">
                <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug mb-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                  {displayDoctorName}
                </h3>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-teal-50 text-teal-700 border border-teal-200/70">
                    {resolvedProfession}
                  </span>
                  <p className="text-[11px] sm:text-xs font-medium text-primary line-clamp-1">
                    {doctor.specialty}
                  </p>
                </div>
              </div>

              {/* Info: Ubicación y Rating */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-600 mb-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {doctor.city}{doctor.sector ? `, ${doctor.sector}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-slate-900">{doctor.rating || '0'}</span>
                  <span className="text-muted-foreground hidden sm:inline">({doctor.reviewCount || 0})</span>
                </div>
              </div>

              {/* Badges de Seguro */}
              {doctor.acceptedInsurances && doctor.acceptedInsurances.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5 font-sans">
                  {doctor.acceptedInsurances.slice(0, 2).map((ins) => (
                    <span
                      key={ins}
                      className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-slate-100 text-slate-600 border border-slate-200 truncate max-w-[95px]"
                    >
                      {ins}
                    </span>
                  ))}
                  {doctor.acceptedInsurances.length > 2 && (
                    <span className="inline-flex items-center px-1 py-0.2 rounded text-[9px] bg-slate-50 text-slate-400">
                      +{doctor.acceptedInsurances.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Precio de Consulta */}
              <div className="mt-1.5 flex items-center gap-1 text-emerald-700 font-semibold text-xs">
                <Banknote className="h-3.5 w-3.5" />
                {(() => {
                  const prices: number[] = [];
                  if (doctor.addresses && Array.isArray(doctor.addresses)) {
                    doctor.addresses.forEach(addr => {
                      if (addr.consultationFee) prices.push(addr.consultationFee);
                    });
                  }
                  if (doctor.onlineConsultation?.enabled && doctor.onlineConsultation.consultationFee) {
                    prices.push(doctor.onlineConsultation.consultationFee);
                  }
                  // Fallback: Precio base
                  if (doctor.consultationFee) {
                    prices.push(doctor.consultationFee);
                  }

                  if (prices.length === 0) return <span>Consultar precio</span>;
                  const minPrice = Math.min(...prices);
                  return <span>Desde ${new Intl.NumberFormat('en-US').format(minPrice)}</span>;
                })()}
              </div>
            </div>

            {/* Footer: Botones de Acción */}
            <div className="flex items-center gap-1.5 mt-auto pt-1.5 border-t border-slate-100/80">
              <div className="flex-1">
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-7 sm:h-8 text-xs rounded-lg shadow-xs"
                >
                  Reservar
                </Button>
              </div>

              {/* Botón Compartir (Simple y directo) */}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
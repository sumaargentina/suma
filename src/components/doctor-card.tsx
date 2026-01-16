"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star, Share2, Copy, Send, Mail, ShieldCheck, User } from "lucide-react";

import { useAuth } from "@/lib/auth";
import type { Doctor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export function DoctorCard({ doctor }: { doctor: Doctor }) {
  const { user, toggleFavoriteDoctor } = useAuth();
  const { toast } = useToast();

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

          {/* SECCIÓN DE IMAGEN */}
          {/* Móvil: Cuadrado pequeño (w-28 o w-32). Desktop: Rectángulo más grande (w-48) */}
          <div className="relative w-28 sm:w-48 shrink-0 bg-slate-100 overflow-hidden border-r border-slate-100">
            {/* Aspect ratio handled by container height stretching */}
            <div className="absolute inset-0 h-full w-full">
              {doctor.profileImage ? (
                <Image
                  src={doctor.profileImage}
                  alt={`Dr. ${doctor.name}`}
                  fill
                  sizes="(max-width: 640px) 120px, 200px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                  <User className="h-10 w-10 sm:h-16 sm:w-16 text-slate-300" />
                </div>
              )}
            </div>

            {/* Badge Verificado */}
            {doctor.verificationStatus === 'verified' && (
              <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 z-10">
                {/* Versión Móvil: Solo Icono o muy compacto */}
                <div className="sm:hidden bg-emerald-500 text-white rounded-full p-1 shadow-sm border border-white/20">
                  <ShieldCheck className="w-3 h-3" />
                </div>

                {/* Versión Escritorio: Badge completo */}
                <Badge className="hidden sm:inline-flex bg-emerald-500/95 hover:bg-emerald-600 text-white border-0 text-[10px] px-2 py-0.5 backdrop-blur-sm shadow-sm transition-all">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Verificado
                </Badge>
              </div>
            )}
          </div>

          {/* SECCIÓN DE CONTENIDO */}
          <CardContent className="flex-1 p-3 sm:p-5 flex flex-col justify-between gap-2 sm:gap-3 min-w-0">
            <div>
              {/* Header: Nombre y Especialidad */}
              <div className="mb-1 sm:mb-2">
                <h3 className="text-base sm:text-xl font-bold text-slate-900 leading-snug mb-0.5 line-clamp-1 group-hover:text-primary transition-colors">
                  Dr. {doctor.name}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-primary line-clamp-1">
                  {doctor.specialty}
                </p>
              </div>

              {/* Info: Ubicación y Rating */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 mb-2">
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

              {/* Badges de Seguro (Visibles en móvil también) */}
              {doctor.acceptedInsurances && doctor.acceptedInsurances.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {/* En móvil mostramos máximo 2 para no saturar, en desktop 3 */}
                  {doctor.acceptedInsurances.slice(0, 3).map((ins, index) => (
                    <span
                      key={ins}
                      className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200",
                        // Ocultar el 3er elemento en pantallas muy pequeñas si queremos ahorrar espacio, o dejarlo
                        index > 1 ? "hidden sm:inline-flex" : ""
                      )}
                    >
                      {ins}
                    </span>
                  ))}
                  {doctor.acceptedInsurances.length > 2 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] bg-slate-50 text-slate-400">
                      +{doctor.acceptedInsurances.length - (doctor.acceptedInsurances.length > 3 ? 3 : 2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Footer: Botones de Acción */}
            <div className="flex items-center gap-2 mt-auto pt-2 border-t sm:border-t-0 border-slate-50 sm:border-transparent">
              <div className="flex-1">
                <Button
                  size="sm"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-8 sm:h-9 text-xs sm:text-sm rounded-lg shadow-sm"
                >
                  Reservar
                </Button>
              </div>

              {/* Botón Compartir (Simple y directo) */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-lg border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                onClick={handleShare}
              >
                <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
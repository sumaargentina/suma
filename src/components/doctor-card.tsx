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

  const copyToClipboard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/doctors/${doctor.id}`;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "¡Enlace Copiado!",
          description: "El enlace al perfil del doctor ha sido copiado.",
        });
      } catch {
        toast({
          variant: "destructive",
          title: "Error al copiar",
          description: "No se pudo copiar el enlace. Intenta manualmente.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "No compatible",
        description: "Tu navegador no permite copiar al portapapeles.",
      });
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
    <div className="relative h-full">
      {/* Popover de compartir fuera del Link */}
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md backdrop-blur-sm"
            >
              <Share2 className="h-4 w-4 text-slate-600" />
              <span className="sr-only">Compartir</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <div className="flex flex-col gap-1 text-sm">
              <Button variant="ghost" asChild className="justify-start px-2 py-1.5 h-auto">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(whatsappLink, '_blank'); }}>
                  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-2 fill-current text-green-500"><title>WhatsApp</title><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.204-1.634a11.86 11.86 0 005.785 1.65c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                  WhatsApp
                </a>
              </Button>
              <Button variant="ghost" asChild className="justify-start px-2 py-1.5 h-auto">
                <a href={telegramLink} target="_blank" rel="noopener noreferrer" className="flex items-center" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(telegramLink, '_blank'); }}>
                  <Send className="mr-2 h-4 w-4 text-sky-500" />
                  Telegram
                </a>
              </Button>
              <Button variant="ghost" asChild className="justify-start px-2 py-1.5 h-auto">
                <a href={facebookLink} target="_blank" rel="noopener noreferrer" className="flex items-center" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(facebookLink, '_blank'); }}>
                  <svg className="w-4 h-4 mr-2 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><title>Facebook</title><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.019 4.388 10.995 10.125 11.854v-8.385H7.078v-3.47h3.047V9.413c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.513c-1.491 0-1.953.926-1.953 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.068 24 18.092 24 12.073z" /></svg>
                  Facebook
                </a>
              </Button>
              <Button variant="ghost" asChild className="justify-start px-2 py-1.5 h-auto">
                <a href={emailLink} className="flex items-center" onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(emailLink, '_blank'); }}>
                  <Mail className="mr-2 h-4 w-4 text-amber-600" />
                  Correo electrónico
                </a>
              </Button>
              <Button variant="ghost" className="justify-start px-2 py-1.5 h-auto" onClick={e => { e.preventDefault(); e.stopPropagation(); copyToClipboard(e); }}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar enlace
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        {/* Botón de favorito, solo si aplica */}
        {user?.role === 'patient' && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-md backdrop-blur-sm"
            onClick={handleFavoriteClick}
          >
            <Heart className={cn("h-4 w-4", isFavorite ? "fill-red-500 text-red-500" : "text-slate-600")} />
            <span className="sr-only">Marcar como favorito</span>
          </Button>
        )}
      </div>

      {/* El Link solo envuelve la tarjeta y su contenido */}
      <Link href={`/doctors/${doctor.id}`} className="block h-full group">
        <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1 w-full h-full flex flex-col bg-white border-slate-200">
          {/* Image Section */}
          <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden">
            {doctor.profileImage ? (
              <Image
                src={doctor.profileImage}
                alt={`Dr. ${doctor.name}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <User className="w-12 h-12 text-white" />
                </div>
              </div>
            )}

            {/* Verified Badge on Image */}
            {doctor.verificationStatus === 'verified' && (
              <div className="absolute bottom-3 left-3">
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white shadow-lg px-2.5 py-1 gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verificado
                </Badge>
              </div>
            )}
          </div>

          {/* Content Section */}
          <CardContent className="p-5 flex flex-col flex-grow">
            {/* Name and Specialty */}
            <div className="mb-3">
              <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1 line-clamp-1">
                Dr. {doctor.name}
              </h3>
              <p className="text-sm font-medium text-blue-600">
                {doctor.specialty}
              </p>
            </div>

            {/* Location and Rating */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-slate-500">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">{doctor.city}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span className="font-bold text-slate-900">{doctor.rating || '0'}</span>
                <span className="text-sm text-slate-500">
                  ({doctor.reviewCount || 0})
                </span>
              </div>
            </div>

            {/* Insurances */}
            {doctor.acceptedInsurances && doctor.acceptedInsurances.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {doctor.acceptedInsurances.slice(0, 2).map((ins) => (
                  <span
                    key={ins}
                    className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-md font-medium truncate max-w-[120px]"
                  >
                    {ins}
                  </span>
                ))}
                {doctor.acceptedInsurances.length > 2 && (
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-md font-medium">
                    +{doctor.acceptedInsurances.length - 2} más
                  </span>
                )}
              </div>
            )}

            {/* CTA Button */}
            <div className="mt-auto">
              <Button
                tabIndex={-1}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
                size="default"
              >
                Reservar Cita
              </Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
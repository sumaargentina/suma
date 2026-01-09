"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Star, Share2, Copy, Send, Mail, ShieldCheck } from "lucide-react";

import { useAuth } from "@/lib/auth";
import type { Doctor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  // Instagram no permite compartir directo, sugerimos copiar el enlace
  const emailLink = `mailto:?subject=${encodeURIComponent('Recomendación de especialista')}&body=${encodedShareText}%20${encodedShareUrl}`;


  return (
    <div className="relative h-full">
      {/* Popover de compartir fuera del Link */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/70 hover:bg-background"
            >
              <Share2 className="h-5 w-5 text-primary" />
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
              <Button variant="ghost" className="justify-start px-2 py-1.5 h-auto" onClick={e => { e.preventDefault(); e.stopPropagation(); copyToClipboard(e); }}>
                <svg className="w-4 h-4 mr-2 text-pink-500" viewBox="0 0 24 24" fill="currentColor"><title>Instagram</title><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.241 1.308 3.608.058 1.266.069 1.646.069 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.241 1.246-3.608 1.308-1.266.058-1.646.069-4.85.069s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.241-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.515 2.497 5.782 2.225 7.148 2.163 8.414 2.105 8.794 2.163 12 2.163zm0-2.163C8.741 0 8.332.012 7.052.07 5.771.128 4.659.388 3.678 1.37 2.697 2.352 2.437 3.464 2.379 4.745 2.321 6.025 2.309 6.434 2.309 12c0 5.566.012 5.975.07 7.255.058 1.281.318 2.393 1.299 3.375.981.981 2.093 1.241 3.374 1.299 1.28.058 1.689.07 7.255.07s5.975-.012 7.255-.07c1.281-.058 2.393-.318 3.374-1.299.981-.981 1.241-2.093 1.299-3.374.058-1.28.07-1.689.07-7.255s-.012-5.975-.07-7.255c-.058-1.281-.318-2.393-1.299-3.374C19.393.388 18.281.128 17 .07 15.719.012 15.309 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" /></svg>
                Instagram (copia el enlace y pégalo en la app)
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
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/70 hover:bg-background"
            onClick={handleFavoriteClick}
          >
            <Heart className={cn("h-5 w-5 text-red-500", isFavorite ? "fill-current" : "fill-none")} />
            <span className="sr-only">Marcar como favorito</span>
          </Button>
        )}
      </div>
      {/* El Link solo envuelve la tarjeta y su contenido */}
      <Link href={`/doctors/${doctor.id}`} className="block h-full group">
        <Card className="doctor-card overflow-hidden transition-shadow duration-300 group-hover:shadow-lg w-full h-full flex flex-col relative">
          <CardContent className="p-4 flex flex-col flex-grow">
            <div className="flex items-center gap-4 flex-grow">
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0">
                <Image
                  src={doctor.profileImage || 'https://placehold.co/400x400.png'}
                  alt={`Dr. ${doctor.name}`}
                  fill
                  sizes="(max-width: 640px) 96px, 112px"
                  className="rounded-lg object-cover"
                  data-ai-hint={doctor.aiHint}
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-headline leading-tight">{doctor.name}</h3>
                  {doctor.verificationStatus === 'verified' && (
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Verificado</span>
                    </div>
                  )}
                </div>
                <p className="text-primary font-medium text-sm">{doctor.specialty}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="h-3 w-3" />
                  <span>{doctor.city}</span>
                </div>
                <div className="flex items-center gap-1 text-xs mt-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold">{doctor.rating}</span>
                  <span className="text-muted-foreground">
                    ({doctor.reviewCount} reseñas)
                  </span>
                </div>
              </div>
            </div>
            {doctor.acceptedInsurances && doctor.acceptedInsurances.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {doctor.acceptedInsurances.slice(0, 2).map((ins) => (
                  <span key={ins} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded-full font-medium border border-blue-100 truncate max-w-[100px]">
                    {ins}
                  </span>
                ))}
                {doctor.acceptedInsurances.length > 2 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full font-medium border border-gray-200">
                    +{doctor.acceptedInsurances.length - 2}
                  </span>
                )}
              </div>
            )}
            <div className="mt-auto pt-4">
              <Button tabIndex={-1} className="w-full" size="sm">Reservar Cita</Button>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
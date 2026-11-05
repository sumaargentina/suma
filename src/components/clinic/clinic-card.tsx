"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
    MapPin,
    Building2,
    Star,
    ShieldCheck,
    ChevronRight,
    Heart,
    Share2,
    MessageCircle,
} from 'lucide-react';
import { Clinic } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { EntitySilhouette, isRealImageUrl } from '@/components/ui/entity-silhouette';

interface ClinicCardProps {
    clinic: Clinic;
    priority?: boolean;
}

export function ClinicCard({ clinic, priority = false }: ClinicCardProps) {
    const { user, updateUser } = useAuth();
    const { toast } = useToast();

    const isFavorite = user?.role === 'patient' && user.favoriteClinicIds?.includes(clinic.id);

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user || user.role !== 'patient') {
            toast({
                variant: "destructive",
                title: "Inicia sesión",
                description: "Debes iniciar sesión para guardar favoritos.",
            });
            return;
        }

        const currentFavorites = user.favoriteClinicIds || [];
        let newFavorites: string[];

        if (currentFavorites.includes(clinic.id)) {
            newFavorites = currentFavorites.filter(id => id !== clinic.id);
            toast({ title: "Eliminado de favoritos" });
        } else {
            newFavorites = [...currentFavorites, clinic.id];
            toast({ title: "Añadido a favoritos", description: clinic.name });
        }

        updateUser({ favoriteClinicIds: newFavorites });
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const shareUrl = `${window.location.origin}/clinica/${clinic.slug || clinic.id}`;
        const shareText = `¡Mira este centro médico! ${clinic.name}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: clinic.name,
                    text: shareText,
                    url: shareUrl,
                });
            } catch {
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
            });
        }
    };

    const clinicUrl = `/clinica/${clinic.slug || clinic.id}`;
    const displayPhone = (clinic.whatsapp || clinic.phone || '').trim();
    const cleanDigits = displayPhone.replace(/\D/g, '');
    const locationText = [clinic.city, clinic.sector || clinic.state].filter(Boolean).join(', ');
    const fullLocation = [locationText, clinic.address].filter(Boolean).join(' • ') || 'Sede Principal';
    const insurances = clinic.acceptedInsurances || [];
    const institutionLabel =
        clinic.plan === 'hospital_gratuito' || clinic.institutionType === 'public_hospital'
            ? 'Hospital'
            : 'Clínica';

    return (
        <Card className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col justify-between h-full">
            {/* Cabecera Institucional de Fachada / Imagen de Sede */}
            <Link href={clinicUrl} className="block relative h-20 sm:h-28 bg-slate-900 overflow-hidden">
                {isRealImageUrl(clinic.bannerImage || clinic.logoUrl) ? (
                    <Image
                        src={clinic.bannerImage || clinic.logoUrl || ''}
                        alt={clinic.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 380px"
                        priority={priority}
                        className="object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <EntitySilhouette type="clinic" variant="banner" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/25 to-transparent" />

                {/* Etiquetas Superiores Izquierda: Identificador de Clínica + Verificada */}
                <div className="absolute top-2 left-2 sm:top-2.5 sm:left-3 flex items-center gap-1 z-10">
                    <span className="bg-white/95 text-slate-900 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide px-1.5 sm:px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Building2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-teal-700 shrink-0" />
                        {institutionLabel}
                    </span>
                    {clinic.verificationStatus === 'verified' && (
                        <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded shadow-xs">
                            <ShieldCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                            <span className="hidden sm:inline">Verificada</span>
                        </Badge>
                    )}
                </div>

                {/* Acciones Superiores Derecha: Favorito + Compartir */}
                <div className="absolute top-2 right-2 sm:top-2.5 sm:right-3 flex items-center gap-1 z-10">
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        title="Guardar en favoritos"
                        className={cn(
                            "p-1 sm:p-1.5 rounded-full transition-all backdrop-blur-xs",
                            isFavorite
                                ? "bg-red-500 text-white shadow-xs"
                                : "bg-white/90 text-slate-500 hover:text-red-500 hover:bg-white"
                        )}
                    >
                        <Heart className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isFavorite && "fill-current")} />
                    </button>
                    <button
                        type="button"
                        onClick={handleShare}
                        title="Compartir clínica"
                        className="p-1 sm:p-1.5 rounded-full bg-white/90 text-slate-600 hover:text-slate-900 hover:bg-white transition-all backdrop-blur-xs"
                    >
                        <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </button>
                </div>

                {/* Calificación en esquina inferior derecha de la cabecera */}
                {clinic.rating && clinic.rating > 0 ? (
                    <div className="absolute bottom-1.5 right-2 sm:bottom-2 sm:right-3 z-10 flex items-center gap-0.5 text-white text-[10px] sm:text-xs font-bold bg-slate-950/60 backdrop-blur-xs px-1.5 py-0.5 rounded">
                        <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-amber-400 text-amber-400" />
                        <span>{clinic.rating.toFixed(1)}</span>
                    </div>
                ) : null}
            </Link>

            {/* Cuerpo Principal Sobrio y Directo */}
            <div className="p-2.5 sm:p-3.5 pt-2.5 flex-1 flex flex-col justify-between gap-2.5">
                <Link href={clinicUrl} className="block space-y-1.5">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Avatar className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg border border-slate-200 bg-white shadow-2xs shrink-0">
                            {isRealImageUrl(clinic.logoUrl || clinic.bannerImage) && (
                                <AvatarImage
                                    src={clinic.logoUrl || clinic.bannerImage}
                                    alt={clinic.name}
                                    className="object-contain p-1 bg-white"
                                />
                            )}
                            <AvatarFallback className="rounded-lg p-0 overflow-hidden">
                                <EntitySilhouette type="clinic" variant="avatar" />
                            </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                            <h3 className="text-xs sm:text-[15px] font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                                {clinic.name}
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-500 truncate flex items-center gap-1 mt-0.5" title={fullLocation}>
                                <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-slate-400 shrink-0" />
                                <span className="truncate">{locationText || fullLocation}</span>
                            </p>
                        </div>
                    </div>

                    {clinic.description && (
                        <p className="text-[11px] sm:text-xs text-slate-600 line-clamp-1 leading-relaxed hidden sm:block">
                            {clinic.description}
                        </p>
                    )}
                </Link>

                {/* Pie Limpio: Seguros / WhatsApp a la izquierda + Botón Ver Clínica a la derecha */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                    <div className="hidden sm:flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
                        {insurances.length > 0 ? (
                            <>
                                {insurances.slice(0, 2).map(ins => (
                                    <span
                                        key={ins}
                                        className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200 truncate max-w-[100px]"
                                    >
                                        {ins}
                                    </span>
                                ))}
                                {insurances.length > 2 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shrink-0">
                                        +{insurances.length - 2}
                                    </span>
                                )}
                            </>
                        ) : cleanDigits.length >= 7 ? (
                            <a
                                href={`https://wa.me/${cleanDigits}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold transition-colors"
                            >
                                <MessageCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                                WhatsApp
                            </a>
                        ) : (
                            <span className="text-[11px] font-medium text-slate-500 truncate">
                                Especialistas y Servicios
                            </span>
                        )}
                    </div>

                    <Link
                        href={clinicUrl}
                        className="w-full sm:w-auto inline-flex items-center justify-center shrink-0 rounded-lg px-2.5 sm:px-3.5 h-7 sm:h-8 text-[11px] sm:text-xs font-semibold bg-primary hover:bg-primary/90 text-white shadow-2xs transition-all"
                    >
                        Ver Clínica
                        <ChevronRight className="ml-0.5 sm:ml-1 h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                </div>
            </div>
        </Card>
    );
}

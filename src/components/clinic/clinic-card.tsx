"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Building2, Star, ShieldCheck, ChevronRight, Phone, Heart, Share2 } from 'lucide-react';
import { Clinic } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface ClinicCardProps {
    clinic: Clinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
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

    return (
        <Card className="group overflow-hidden border-0 shadow-sm md:shadow-md hover:shadow-lg md:hover:shadow-2xl transition-all duration-300 rounded-xl md:rounded-2xl bg-white relative">
            {/* Botones flotantes - Favorito y Compartir */}
            <div className="absolute top-2 right-2 md:top-3 md:right-3 z-10 flex gap-1">
                {/* Verificado */}
                {clinic.verificationStatus === 'verified' && (
                    <>
                        <div className="md:hidden bg-emerald-500 rounded-full p-1">
                            <ShieldCheck className="w-3 h-3 text-white" />
                        </div>
                        <Badge className="hidden md:inline-flex bg-emerald-500/90 text-white border-0 text-[10px] px-2 py-0.5">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verificado
                        </Badge>
                    </>
                )}

                {/* Favorito */}
                <button
                    onClick={toggleFavorite}
                    className={cn(
                        "p-1.5 rounded-full transition-all shadow-sm",
                        isFavorite ? "bg-red-500 text-white" : "bg-white/90 text-slate-400 hover:text-red-500"
                    )}
                >
                    <Heart className={cn("h-3.5 w-3.5 md:h-4 md:w-4", isFavorite && "fill-current")} />
                </button>

                {/* Compartir */}
                <button
                    onClick={handleShare}
                    className="p-1.5 rounded-full bg-white/90 text-slate-400 hover:text-primary transition-all shadow-sm"
                >
                    <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
            </div>

            {/* Banner Image */}
            <div className="relative h-24 md:h-40 bg-slate-50 overflow-hidden">
                {clinic.bannerImage || clinic.logoUrl ? (
                    <Image
                        src={clinic.bannerImage || clinic.logoUrl || ''}
                        alt={`Portada de ${clinic.name}`}
                        fill
                        className="object-contain p-2 md:p-3"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
                        <Building2 className="h-10 w-10 md:h-14 md:w-14 text-primary/20" />
                    </div>
                )}

                {/* Rating */}
                {clinic.rating && clinic.rating > 0 && (
                    <div className="absolute top-2 left-2 md:top-3 md:left-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-1.5 md:px-2 py-0.5 md:py-1 rounded-full shadow">
                        <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-[10px] md:text-xs font-bold text-slate-700">{clinic.rating.toFixed(1)}</span>
                    </div>
                )}
            </div>

            {/* Avatar/Logo flotante */}
            <div className="relative px-2 md:px-3">
                <div className="-mt-6 md:-mt-8 bg-white p-1 rounded-xl shadow-md ring-2 ring-white w-fit">
                    <Avatar className="h-10 w-10 md:h-14 md:w-14 rounded-lg">
                        <AvatarImage src={clinic.logoUrl} alt={clinic.name} className="object-contain p-0.5 bg-white" />
                        <AvatarFallback className="rounded-lg text-xs md:text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                            {clinic.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            </div>

            {/* Content */}
            <div className="p-2 md:p-4 pt-1 md:pt-2 space-y-1.5 md:space-y-3">
                {/* Nombre */}
                <div>
                    <h3 className="text-sm md:text-lg font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {clinic.name}
                    </h3>

                    {/* Ciudad y tipo */}
                    <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1 text-slate-500">
                        <Building2 className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                        <span className="text-[10px] md:text-xs">Clínica</span>
                        {clinic.city && (
                            <>
                                <span className="text-slate-300">•</span>
                                <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 text-rose-400 shrink-0" />
                                <span className="text-[10px] md:text-xs font-medium truncate">{clinic.city}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Descripción - solo desktop */}
                {clinic.description && (
                    <p className="hidden md:block text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {clinic.description}
                    </p>
                )}

                {/* Info adicional móvil */}
                <div className="md:hidden space-y-1.5">
                    {clinic.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <Phone className="h-3 w-3" />
                            <span>{clinic.phone}</span>
                        </div>
                    )}
                    {clinic.address && (
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{clinic.address}</span>
                        </div>
                    )}
                </div>

                {/* Obras Sociales */}
                {clinic.acceptedInsurances && clinic.acceptedInsurances.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {clinic.acceptedInsurances.slice(0, 2).map(ins => (
                            <span
                                key={ins}
                                className="px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-medium bg-blue-50 text-blue-600 rounded-full border border-blue-100"
                            >
                                {ins}
                            </span>
                        ))}
                        {clinic.acceptedInsurances.length > 2 && (
                            <span className="px-1.5 py-0.5 text-[9px] md:text-[10px] bg-slate-50 text-slate-400 rounded-full">
                                +{clinic.acceptedInsurances.length - 2}
                            </span>
                        )}
                    </div>
                )}

                {/* Botón CTA */}
                <Link
                    href={`/clinica/${clinic.slug || clinic.id}`}
                    className={cn(
                        "flex items-center justify-center w-full rounded-lg md:rounded-xl transition-all",
                        "h-8 md:h-10 text-xs md:text-sm font-semibold",
                        "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                        "text-white shadow-sm md:shadow-md shadow-primary/20"
                    )}
                >
                    Ver Profesionales
                    <ChevronRight className="ml-1 h-3.5 w-3.5 md:h-4 md:w-4" />
                </Link>
            </div>
        </Card>
    );
}

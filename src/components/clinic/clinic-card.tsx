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
    Phone,
    Heart,
    Share2,
    Stethoscope,
    Sparkles,
    MessageCircle,
} from 'lucide-react';
import { Clinic } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

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
    const locationLabel = [clinic.city, clinic.state].filter(Boolean).join(', ') || 'Sede Principal';
    const addressLabel = clinic.sector
        ? `${clinic.sector}${clinic.address ? ` • ${clinic.address}` : ''}`
        : (clinic.address || locationLabel);
    const insurances = clinic.acceptedInsurances || [];

    return (
        <Card className="group relative overflow-hidden border border-slate-200/80 hover:border-primary/40 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 rounded-2xl bg-white flex flex-col justify-between">
            {/* Franja superior interactiva: Etiqueta a la izquierda + Acciones a la derecha */}
            <div className="relative px-3.5 py-2 bg-gradient-to-r from-slate-50 via-teal-50/40 to-sky-50/50 border-b border-slate-100 flex items-center justify-between gap-2">
                {clinic.bannerImage && (
                    <Image
                        src={clinic.bannerImage}
                        alt=""
                        fill
                        sizes="350px"
                        priority={priority}
                        className="object-cover opacity-10 group-hover:opacity-15 transition-opacity pointer-events-none"
                    />
                )}

                {/* Lado Izquierdo: Estado Verificado + Categoría */}
                <div className="relative z-10 flex items-center gap-1.5 min-w-0">
                    {clinic.verificationStatus === 'verified' ? (
                        <Badge className="bg-emerald-500/95 hover:bg-emerald-600 text-white border-0 text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-xs shrink-0">
                            <ShieldCheck className="w-3 h-3 mr-1" />
                            Verificada
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full bg-white/80">
                            Centro Médico
                        </Badge>
                    )}
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700 bg-teal-50/90 border border-teal-200/60 px-2 py-0.5 rounded-full truncate">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse shrink-0" />
                        Citas Online
                    </span>
                </div>

                {/* Lado Derecho: Rating + Favorito + Compartir */}
                <div className="relative z-10 flex items-center gap-1 shrink-0">
                    {clinic.rating && clinic.rating > 0 ? (
                        <div className="flex items-center gap-0.5 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-full">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-bold text-amber-800">{clinic.rating.toFixed(1)}</span>
                        </div>
                    ) : (
                        <div className="hidden sm:flex items-center gap-0.5 bg-white/90 border border-slate-200/70 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-slate-600">
                            <Sparkles className="h-2.5 w-2.5 text-primary" />
                            SUMA
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={toggleFavorite}
                        title="Guardar en favoritos"
                        className={cn(
                            "p-1.5 rounded-full transition-all border",
                            isFavorite
                                ? "bg-red-500 text-white border-red-500 shadow-xs"
                                : "bg-white/90 text-slate-400 border-slate-200/70 hover:text-red-500 hover:border-red-200"
                        )}
                    >
                        <Heart className={cn("h-3 w-3", isFavorite && "fill-current")} />
                    </button>

                    <button
                        type="button"
                        onClick={handleShare}
                        title="Compartir clínica"
                        className="p-1.5 rounded-full bg-white/90 text-slate-400 border border-slate-200/70 hover:text-primary hover:border-primary/30 transition-all"
                    >
                        <Share2 className="h-3 w-3" />
                    </button>
                </div>
            </div>

            {/* Cuerpo Principal Balanceado (Izquierda + Derecha) */}
            <Link href={clinicUrl} className="block p-3.5 space-y-3 flex-1">
                {/* Fila de Identidad: Logo a la izquierda + Nombre en el centro + Píldora de Ciudad a la derecha */}
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="relative shrink-0">
                            <Avatar className="h-12 w-12 rounded-xl border border-slate-200/80 shadow-xs bg-white group-hover:scale-105 transition-transform">
                                <AvatarImage
                                    src={clinic.logoUrl || clinic.bannerImage}
                                    alt={clinic.name}
                                    className="object-contain p-1 bg-white"
                                />
                                <AvatarFallback className="rounded-xl text-xs font-bold bg-gradient-to-br from-primary/15 to-teal-500/15 text-primary">
                                    {clinic.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm md:text-[15px] font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                                {clinic.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 text-[11px]">
                                <Building2 className="h-3 w-3 text-primary shrink-0" />
                                <span className="font-medium text-slate-600 truncate">
                                    {clinic.plan === 'hospital_gratuito' ? 'Hospital / Centro' : 'Clínica Médica'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha de Identidad: Ciudad / Estado destacada */}
                    <div className="shrink-0 text-right bg-slate-50 group-hover:bg-primary/5 border border-slate-200/70 group-hover:border-primary/20 rounded-xl px-2.5 py-1.5 transition-colors max-w-[42%]">
                        <div className="flex items-center justify-end gap-1 text-[11px] font-semibold text-slate-800 truncate">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span className="truncate">{clinic.city || 'Sede'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                            {clinic.state || 'Atención integral'}
                        </p>
                    </div>
                </div>

                {/* Grilla de 2 Columnas (Izquierda: Dirección/Sede | Derecha: Contacto/Servicios) */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50/80 rounded-xl p-2 border border-slate-100 flex flex-col justify-center min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                            Ubicación
                        </span>
                        <p className="text-[11px] font-medium text-slate-700 truncate mt-0.5" title={addressLabel}>
                            {addressLabel}
                        </p>
                    </div>

                    <div className="bg-teal-50/50 rounded-xl p-2 border border-teal-100/80 flex flex-col justify-center min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600/80 flex items-center gap-1">
                            {displayPhone ? (
                                <>
                                    <Phone className="h-2.5 w-2.5 text-teal-600 shrink-0" />
                                    Contacto Directo
                                </>
                            ) : (
                                <>
                                    <Stethoscope className="h-2.5 w-2.5 text-teal-600 shrink-0" />
                                    Modalidad
                                </>
                            )}
                        </span>
                        <p className="text-[11px] font-semibold text-teal-900 truncate mt-0.5">
                            {displayPhone || 'Especialistas y Servicios'}
                        </p>
                    </div>
                </div>

                {/* Descripción breve o Seguros distribuidos a lo ancho */}
                {clinic.description ? (
                    <p className="text-[11px] text-slate-500 line-clamp-1 leading-snug">
                        {clinic.description}
                    </p>
                ) : null}
            </Link>

            {/* Barra Inferior Interactiva: Izquierda Info/Seguros/WhatsApp + Derecha Botón CTA */}
            <div className="px-3.5 py-2.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
                    {insurances.length > 0 ? (
                        <>
                            {insurances.slice(0, 2).map(ins => (
                                <span
                                    key={ins}
                                    className="px-2 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200/60 truncate max-w-[95px]"
                                >
                                    {ins}
                                </span>
                            ))}
                            {insurances.length > 2 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-200/70 text-slate-600 rounded-full shrink-0">
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
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/70 text-[10px] font-semibold transition-colors"
                        >
                            <MessageCircle className="h-3 w-3 text-emerald-600 shrink-0" />
                            WhatsApp
                        </a>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 truncate">
                            <Stethoscope className="h-3 w-3 text-primary shrink-0" />
                            Consultas y Servicios
                        </span>
                    )}
                </div>

                <Link
                    href={clinicUrl}
                    className={cn(
                        "inline-flex items-center justify-center shrink-0 rounded-xl px-3 py-1.5 transition-all",
                        "text-xs font-semibold",
                        "bg-gradient-to-r from-primary to-teal-600 hover:from-primary/95 hover:to-teal-700",
                        "text-white shadow-xs hover:shadow-md shadow-primary/20"
                    )}
                >
                    Ver Clínica
                    <ChevronRight className="ml-1 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </Card>
    );
}

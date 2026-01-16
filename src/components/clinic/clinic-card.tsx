"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, ArrowRight, Building2, Star, ShieldCheck, Globe } from 'lucide-react';
import { Clinic } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClinicCardProps {
    clinic: Clinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
    return (
        <Card className="group overflow-hidden border-0 shadow-md hover:shadow-2xl transition-all duration-300 rounded-2xl bg-white">
            {/* Banner Image */}
            <div className="relative h-44 bg-white overflow-hidden">
                {clinic.bannerImage ? (
                    <Image
                        src={clinic.bannerImage}
                        alt={`Portada de ${clinic.name}`}
                        fill
                        className="object-contain p-2"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 flex items-center justify-center">
                        <div className="text-center">
                            <Building2 className="h-16 w-16 text-primary/20 mx-auto" />
                            <span className="text-xs font-medium text-primary/30 uppercase tracking-wider">Centro Médico</span>
                        </div>
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

                {/* Badge Verificado */}
                {clinic.verificationStatus === 'verified' && (
                    <Badge className="absolute top-3 right-3 bg-emerald-500/90 hover:bg-emerald-600 text-white border-0 text-[10px] px-2.5 py-1 backdrop-blur-sm shadow-lg">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Verificado
                    </Badge>
                )}

                {/* Rating badge */}
                {clinic.rating && clinic.rating > 0 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-lg">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-bold text-slate-700">{clinic.rating.toFixed(1)}</span>
                        {clinic.reviewCount && clinic.reviewCount > 0 && (
                            <span className="text-[10px] text-slate-400">({clinic.reviewCount})</span>
                        )}
                    </div>
                )}
            </div>

            <CardHeader className="relative pt-0 pb-3">
                {/* Avatar flotante */}
                <div className="flex justify-between items-start">
                    <div className="-mt-10 bg-white p-1.5 rounded-2xl shadow-lg ring-4 ring-white">
                        <Avatar className="h-20 w-20 rounded-xl">
                            <AvatarImage src={clinic.logoUrl} alt={clinic.name} className="object-contain p-1 bg-white" />
                            <AvatarFallback className="rounded-xl text-xl font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                                {clinic.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Nombre y tipo */}
                <div className="mt-3 space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 line-clamp-1 group-hover:text-primary transition-colors">
                        {clinic.name}
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-slate-500">
                            <Building2 className="h-3.5 w-3.5" />
                            <span className="text-sm">Clínica Médica</span>
                        </div>
                        {clinic.city && (
                            <>
                                <span className="text-slate-300">•</span>
                                <div className="flex items-center gap-1 text-slate-500">
                                    <MapPin className="h-3.5 w-3.5 text-rose-400" />
                                    <span className="text-sm font-medium">{clinic.city}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
                {/* Descripción */}
                {clinic.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                        {clinic.description}
                    </p>
                )}

                {/* Información de contacto */}
                <div className="flex flex-col gap-2">
                    {clinic.phone && (
                        <div className="flex items-center gap-2.5 text-sm text-slate-600">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <Phone className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span>{clinic.phone}</span>
                        </div>
                    )}
                    {clinic.address && (
                        <div className="flex items-center gap-2.5 text-sm text-slate-600">
                            <div className="p-1.5 bg-slate-100 rounded-lg">
                                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                            </div>
                            <span className="line-clamp-1">{clinic.address}</span>
                        </div>
                    )}
                    {clinic.website && (
                        <div className="flex items-center gap-2.5 text-sm text-blue-600">
                            <div className="p-1.5 bg-blue-50 rounded-lg">
                                <Globe className="h-3.5 w-3.5 text-blue-500" />
                            </div>
                            <span className="truncate">{clinic.website}</span>
                        </div>
                    )}
                </div>

                {/* Obras Sociales */}
                {clinic.acceptedInsurances && clinic.acceptedInsurances.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {clinic.acceptedInsurances.slice(0, 3).map(ins => (
                            <Badge
                                key={ins}
                                variant="secondary"
                                className="px-2.5 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 rounded-full"
                            >
                                {ins}
                            </Badge>
                        ))}
                        {clinic.acceptedInsurances.length > 3 && (
                            <Badge
                                variant="outline"
                                className="px-2 py-0.5 text-[10px] bg-slate-50 text-slate-500 border-slate-200 rounded-full"
                            >
                                +{clinic.acceptedInsurances.length - 3} más
                            </Badge>
                        )}
                    </div>
                )}

                {/* Botón CTA */}
                <Button
                    asChild
                    className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md shadow-primary/20 font-semibold group/btn"
                >
                    <Link href={`/clinica/${clinic.slug || clinic.id}`}>
                        Ver Profesionales
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                </Button>
            </CardContent>
        </Card>
    );
}

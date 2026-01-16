"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clinic, ClinicBranch, ClinicService, Doctor } from "@/lib/types";
import { getClinicBySlug, getClinicBranches, getClinicServices, getClinicDoctors } from "@/lib/supabaseService";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeaderWrapper, BottomNav } from "@/components/header";
import {
    Loader2, MapPin, Phone, Clock, Stethoscope, Building2, Users,
    ShieldCheck, Star, ChevronRight, Sparkles, Heart, Share2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ClinicPublicProfilePage() {
    const params = useParams();
    const slug = params?.slug as string;
    const { toast } = useToast();

    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [branches, setBranches] = useState<ClinicBranch[]>([]);
    const [services, setServices] = useState<ClinicService[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"doctors" | "services">("doctors");
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            loadClinicData();
        }
    }, [slug]);

    const loadClinicData = async () => {
        try {
            setIsLoading(true);
            const clinicData = await getClinicBySlug(slug);
            if (!clinicData) {
                notFound();
                return;
            }
            setClinic(clinicData);

            const [branchesData, servicesData, doctorsData] = await Promise.all([
                getClinicBranches(clinicData.id),
                getClinicServices(clinicData.id),
                getClinicDoctors(clinicData.id)
            ]);
            setBranches(branchesData);
            setServices(servicesData);
            setDoctors(doctorsData);
        } catch (error) {
            console.error("Error loading clinic data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Extraer especialidades únicas de los médicos
    const specialties = useMemo(() => {
        const specs = doctors.map(d => d.specialty).filter(Boolean);
        const unique = Array.from(new Set(specs));
        return unique.map(spec => ({
            name: spec,
            count: doctors.filter(d => d.specialty === spec).length
        })).sort((a, b) => b.count - a.count);
    }, [doctors]);

    // Filtrar médicos por especialidad
    const filteredDoctors = useMemo(() => {
        if (!selectedSpecialty) return doctors;
        return doctors.filter(d => d.specialty === selectedSpecialty);
    }, [doctors, selectedSpecialty]);

    // Extraer categorías únicas de servicios
    const serviceCategories = useMemo(() => {
        const cats = services.map(s => s.serviceCategory || "General").filter(Boolean);
        return Array.from(new Set(cats));
    }, [services]);

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/clinica/${slug}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: clinic?.name,
                    text: `¡Mira este centro médico! ${clinic?.name}`,
                    url: shareUrl,
                });
            } catch {
                navigator.clipboard?.writeText(shareUrl);
                toast({ title: "¡Enlace copiado!" });
            }
        } else {
            navigator.clipboard?.writeText(shareUrl);
            toast({ title: "¡Enlace copiado!" });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col min-h-screen bg-background">
                <HeaderWrapper />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </main>
                <BottomNav />
            </div>
        );
    }

    if (!clinic) {
        return notFound();
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <HeaderWrapper />

            <main className="flex-1 pb-24 md:pb-8">
                {/* Banner de portada */}
                <section className="relative h-32 md:h-48 bg-gradient-to-br from-primary/20 to-secondary/20">
                    {clinic.bannerImage ? (
                        <Image
                            src={clinic.bannerImage}
                            alt="Portada"
                            fill
                            className="object-cover"
                            priority
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className="h-16 w-16 text-primary/20" />
                        </div>
                    )}
                    {/* Overlay para mejor contraste */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
                </section>

                {/* Info de clínica */}
                <section className="relative bg-white border-b">
                    <div className="container mx-auto px-3 md:px-4">
                        <div className="flex gap-3 md:gap-4 items-start -mt-10 md:-mt-12">
                            {/* Logo flotante */}
                            <div className="shrink-0 bg-white p-1 rounded-xl shadow-lg border-2 border-white">
                                <div className="relative h-20 w-20 md:h-28 md:w-28 rounded-lg overflow-hidden bg-white">
                                    {clinic.logoUrl ? (
                                        <Image
                                            src={clinic.logoUrl}
                                            alt={clinic.name}
                                            fill
                                            className="object-contain p-1"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
                                            <span className="text-2xl md:text-3xl font-bold text-primary">
                                                {clinic.name.substring(0, 2).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <h1 className="text-lg md:text-2xl font-bold text-slate-900 line-clamp-2">
                                            {clinic.name}
                                        </h1>
                                        {clinic.verificationStatus === 'verified' && (
                                            <div className="flex items-center gap-1 text-emerald-600 text-xs md:text-sm mt-0.5">
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                <span>Verificado</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleShare}
                                        className="p-2 rounded-full bg-slate-100 text-slate-500 hover:text-primary transition-colors shrink-0"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Stats compactos */}
                                <div className="flex flex-wrap gap-2 md:gap-3 mt-2 md:mt-3">
                                    <div className="flex items-center gap-1 text-[11px] md:text-sm text-slate-600">
                                        <Users className="h-3.5 w-3.5 text-primary" />
                                        <span className="font-medium">{doctors.length}</span>
                                        <span className="hidden md:inline">Médicos</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] md:text-sm text-slate-600">
                                        <Stethoscope className="h-3.5 w-3.5 text-secondary" />
                                        <span className="font-medium">{services.length}</span>
                                        <span className="hidden md:inline">Servicios</span>
                                    </div>
                                    {clinic.city && (
                                        <div className="flex items-center gap-1 text-[11px] md:text-sm text-slate-600">
                                            <MapPin className="h-3.5 w-3.5 text-rose-400" />
                                            <span>{clinic.city}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Obras sociales - scroll horizontal */}
                                {clinic.acceptedInsurances && clinic.acceptedInsurances.length > 0 && (
                                    <div className="mt-3 overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                                        <div className="flex gap-1.5">
                                            {clinic.acceptedInsurances.slice(0, 4).map(ins => (
                                                <span key={ins} className="shrink-0 px-2 py-0.5 text-[10px] md:text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                                    {ins}
                                                </span>
                                            ))}
                                            {clinic.acceptedInsurances.length > 4 && (
                                                <span className="shrink-0 px-2 py-0.5 text-[10px] md:text-xs bg-slate-50 text-slate-500 rounded-full">
                                                    +{clinic.acceptedInsurances.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contacto compacto - en línea */}
                        {(clinic.phone || clinic.address) && (
                            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-3">
                                {clinic.phone && (
                                    <a
                                        href={`tel:${clinic.phone}`}
                                        className="flex items-center gap-1.5 text-[11px] md:text-sm text-slate-600 hover:text-green-600 transition-colors"
                                    >
                                        <Phone className="h-3.5 w-3.5 text-green-500" />
                                        <span>{clinic.phone}</span>
                                    </a>
                                )}
                                {clinic.address && (
                                    <div className="flex items-center gap-1.5 text-[11px] md:text-sm text-slate-500">
                                        <MapPin className="h-3.5 w-3.5 text-rose-400" />
                                        <span className="truncate max-w-[200px] md:max-w-none">{clinic.address}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {/* Padding inferior */}
                    <div className="h-3 md:h-4" />
                </section>

                {/* Tabs fijos */}
                <section className="sticky top-0 z-20 bg-white border-b shadow-sm">
                    <div className="container mx-auto px-3 md:px-4">
                        <div className="flex">
                            <button
                                onClick={() => { setActiveTab("doctors"); setSelectedSpecialty(null); }}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === "doctors"
                                        ? "text-primary border-primary"
                                        : "text-slate-500 border-transparent hover:text-slate-700"
                                )}
                            >
                                <Stethoscope className="h-4 w-4 inline-block mr-1.5" />
                                Médicos ({doctors.length})
                            </button>
                            <button
                                onClick={() => setActiveTab("services")}
                                className={cn(
                                    "flex-1 py-3 text-sm font-medium border-b-2 transition-colors",
                                    activeTab === "services"
                                        ? "text-primary border-primary"
                                        : "text-slate-500 border-transparent hover:text-slate-700"
                                )}
                            >
                                <Sparkles className="h-4 w-4 inline-block mr-1.5" />
                                Servicios ({services.length})
                            </button>
                        </div>
                    </div>
                </section>

                {/* Filtro de especialidades (solo en tab médicos) */}
                {activeTab === "doctors" && specialties.length > 1 && (
                    <section className="bg-white border-b py-2">
                        <div className="container mx-auto px-3 md:px-4">
                            <div className="overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                                <div className="flex gap-2 pb-1">
                                    <button
                                        onClick={() => setSelectedSpecialty(null)}
                                        className={cn(
                                            "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                                            !selectedSpecialty
                                                ? "bg-primary text-white"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        )}
                                    >
                                        Todas ({doctors.length})
                                    </button>
                                    {specialties.map(spec => (
                                        <button
                                            key={spec.name}
                                            onClick={() => setSelectedSpecialty(spec.name)}
                                            className={cn(
                                                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                                                selectedSpecialty === spec.name
                                                    ? "bg-primary text-white"
                                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            )}
                                        >
                                            {spec.name} ({spec.count})
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Contenido principal */}
                <section className="container mx-auto px-3 md:px-4 py-4 md:py-6">
                    {/* Tab Médicos */}
                    {activeTab === "doctors" && (
                        <>
                            {filteredDoctors.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border">
                                    <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500">No hay médicos disponibles.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    {filteredDoctors.map((doctor) => (
                                        <Link key={doctor.id} href={`/doctors/${doctor.id}`}>
                                            <Card className="group overflow-hidden hover:shadow-md transition-all border-0 shadow-sm">
                                                <CardContent className="p-3 md:p-4">
                                                    <div className="flex gap-3">
                                                        {/* Foto de perfil del médico */}
                                                        <div className="shrink-0 h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden bg-white border-2 border-slate-200 shadow-sm">
                                                            {doctor.profileImage ? (
                                                                <Image
                                                                    src={doctor.profileImage}
                                                                    alt={doctor.name}
                                                                    width={64}
                                                                    height={64}
                                                                    className="w-full h-full object-contain bg-white"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-sm">
                                                                    {doctor.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="font-semibold text-sm md:text-base text-slate-900 truncate group-hover:text-primary transition-colors">
                                                                Dr. {doctor.name}
                                                            </h3>
                                                            <p className="text-xs md:text-sm text-slate-500 truncate">
                                                                {doctor.specialty}
                                                            </p>
                                                            {(Number(doctor.rating) > 0 || doctor.verificationStatus === 'verified') && (
                                                                <div className="flex items-center gap-2 mt-1.5">
                                                                    {Number(doctor.rating) > 0 && (
                                                                        <div className="flex items-center gap-0.5 text-xs">
                                                                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                                                            <span className="font-medium text-slate-700">{Number(doctor.rating).toFixed(1)}</span>
                                                                        </div>
                                                                    )}
                                                                    {doctor.verificationStatus === 'verified' && (
                                                                        <div className="flex items-center gap-0.5 text-xs text-emerald-600">
                                                                            <ShieldCheck className="h-3 w-3" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors shrink-0 self-center" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Tab Servicios */}
                    {activeTab === "services" && (
                        <>
                            {services.filter(s => s.isActive).length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-xl border">
                                    <Stethoscope className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p className="text-slate-500">No hay servicios disponibles.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                                    {services.filter(s => s.isActive).map((service) => (
                                        <Card key={service.id} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all">
                                            <CardContent className="p-3 md:p-4">
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <h3 className="font-semibold text-sm md:text-base text-slate-900 line-clamp-2">
                                                        {service.name}
                                                    </h3>
                                                    <Badge variant="secondary" className="shrink-0 text-[10px] md:text-xs">
                                                        {service.serviceCategory || "General"}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        <span>{service.duration} min</span>
                                                    </div>
                                                    <div className="font-semibold text-green-600">
                                                        {service.price > 0 ? `$${service.price.toLocaleString()}` : 'Consultar'}
                                                    </div>
                                                </div>

                                                {service.description && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                                                        {service.description}
                                                    </p>
                                                )}

                                                <Button asChild size="sm" className="w-full h-8 text-xs">
                                                    <Link href={`/clinica/${slug}/servicio/${service.id}`}>
                                                        Agendar
                                                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                                    </Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </section>
            </main>

            <BottomNav />

            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}

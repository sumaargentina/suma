"use client";

import { useState, useEffect } from "react";
import { useParams, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Clinic, ClinicBranch, ClinicService, Doctor } from "@/lib/types";
import { getClinicBySlug, getClinicBranches, getClinicServices, getClinicDoctors } from "@/lib/supabaseService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { Loader2, MapPin, Phone, Clock, Stethoscope, Building2, Users, Tag, ShieldCheck } from "lucide-react";

export default function ClinicPublicProfilePage() {
    const params = useParams();
    const slug = params?.slug as string;

    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [branches, setBranches] = useState<ClinicBranch[]>([]);
    const [services, setServices] = useState<ClinicService[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("doctors");

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    if (!clinic) {
        return notFound();
    }

    return (
        <>
            <HeaderWrapper />
            <main className="min-h-screen bg-background pb-20 md:pb-0">
                {/* Hero Section */}
                {/* Hero Section */}
                <section className="relative bg-gradient-to-br from-primary/10 via-background to-background overflow-hidden">
                    {clinic.bannerImage && (
                        <div className="absolute inset-0 z-0">
                            <Image
                                src={clinic.bannerImage}
                                alt="Portada"
                                fill
                                className="object-cover opacity-30"
                                priority
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                        </div>
                    )}
                    <div className="relative z-10 container mx-auto px-4 py-12 md:py-16">
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                            {/* Clinic Logo */}
                            <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-full overflow-hidden bg-white shadow-lg border-4 border-white">
                                <Image
                                    src={clinic.logoUrl || "/images/clinic-placeholder.png"}
                                    alt={clinic.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            {/* Clinic Info */}
                            <div className="text-center md:text-left flex-1">
                                <h1 className="text-3xl md:text-4xl font-bold">{clinic.name}</h1>
                                <p className="text-muted-foreground mt-2 max-w-2xl">{clinic.description || "Centro de salud integral"}</p>
                                <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                                    {clinic.phone && (
                                        <Badge variant="secondary" className="text-sm">
                                            <Phone className="h-3 w-3 mr-1" /> {clinic.phone}
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="text-sm">
                                        <Building2 className="h-3 w-3 mr-1" /> {branches.length} Sedes
                                    </Badge>
                                    <Badge variant="outline" className="text-sm">
                                        <Users className="h-3 w-3 mr-1" /> {doctors.length} Médicos
                                    </Badge>
                                </div>
                                {clinic.acceptedInsurances && clinic.acceptedInsurances.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
                                            <ShieldCheck className="h-4 w-4" /> Coberturas Médicas Aceptadas
                                        </h3>
                                        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                            {clinic.acceptedInsurances.map(ins => (
                                                <span key={ins} className="px-3 py-1 bg-background text-foreground text-sm rounded-full font-medium border shadow-sm">
                                                    {ins}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content Tabs */}
                <section className="container mx-auto px-4 py-8">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-8">
                            <TabsTrigger value="doctors">Médicos</TabsTrigger>
                            <TabsTrigger value="services">Servicios</TabsTrigger>
                        </TabsList>

                        {/* Doctors Tab */}
                        <TabsContent value="doctors">
                            {doctors.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Users className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p>No hay médicos disponibles en este momento.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {doctors.map((doctor) => (
                                        <Card key={doctor.id} className="hover:shadow-md transition-shadow">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative h-16 w-16 rounded-full overflow-hidden">
                                                        <Image
                                                            src={doctor.profileImage || "/images/doctor-placeholder.png"}
                                                            alt={doctor.name}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <CardTitle className="text-lg">{doctor.name}</CardTitle>
                                                        <CardDescription>{doctor.specialty}</CardDescription>
                                                    </div>
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <Button asChild className="w-full">
                                                    <Link href={`/doctors/${doctor.id}`}>Agendar Cita</Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        {/* Services Tab */}
                        <TabsContent value="services">
                            {services.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Stethoscope className="h-16 w-16 mx-auto mb-4 opacity-30" />
                                    <p>No hay servicios disponibles en este momento.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {services.filter(s => s.isActive).map((service) => (
                                        <Card key={service.id}>
                                            <CardHeader className="pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-lg">{service.name}</CardTitle>
                                                    <Badge variant="secondary">{service.serviceCategory || "General"}</Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-4 w-4" /> {service.duration} min
                                                    </span>
                                                    <span className="font-semibold text-green-600">${service.price > 0 ? service.price : 'Consultar'}</span>
                                                </div>
                                                {service.description && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                                                )}

                                                {/* Sub-services / Items Display */}
                                                {service.items && service.items.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t space-y-2">
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opciones / Estudios:</p>
                                                        <div className="space-y-1">
                                                            {service.items.map((item, idx) => (
                                                                <div key={idx} className="flex justify-between text-sm items-center">
                                                                    <span className="text-slate-700">- {item.name}</span>
                                                                    <span className="font-medium text-green-700">${item.price}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <Button asChild className="w-full mt-3">
                                                    <Link href={`/clinica/${slug}/servicio/${service.id}`}>Agendar / Ver Más</Link>
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </TabsContent>


                    </Tabs>
                </section>
            </main>
            <BottomNav />
        </>
    );
}

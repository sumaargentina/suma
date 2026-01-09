import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, ArrowRight, Building2 } from 'lucide-react';
import { Clinic } from '@/lib/types';

interface ClinicCardProps {
    clinic: Clinic;
}

export function ClinicCard({ clinic }: ClinicCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="relative h-40 bg-muted">
                {clinic.bannerImage ? (
                    <Image
                        src={clinic.bannerImage}
                        alt={`Portada de ${clinic.name}`}
                        fill
                        className="object-contain bg-gray-50"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5" />
                )}
            </div>

            <CardHeader className="relative pt-0 pb-2">
                <div className="flex justify-between items-start">
                    <div className="-mt-12 bg-background p-1 rounded-xl shadow-sm">
                        <Avatar className="h-24 w-24 rounded-lg border-2 border-background">
                            <AvatarImage src={clinic.logoUrl} alt={clinic.name} />
                            <AvatarFallback className="rounded-lg text-2xl bg-primary/10 text-primary">
                                {clinic.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                <div className="mt-2">
                    <h3 className="text-xl font-bold line-clamp-1">{clinic.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Building2 className="h-3 w-3" />
                        <span>Clínica Médica</span>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {clinic.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {clinic.description}
                    </p>
                )}

                <div className="flex flex-col gap-2 text-sm">
                    {clinic.phone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{clinic.phone}</span>
                        </div>
                    )}
                    {clinic.address && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{clinic.address}</span>
                        </div>
                    )}
                </div>

                {clinic.acceptedInsurances && clinic.acceptedInsurances.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {clinic.acceptedInsurances.slice(0, 2).map(ins => (
                            <Badge key={ins} variant="secondary" className="px-2 py-0 h-5 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 truncate max-w-[120px]">
                                {ins}
                            </Badge>
                        ))}
                        {clinic.acceptedInsurances.length > 2 && (
                            <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] bg-gray-50">
                                +{clinic.acceptedInsurances.length - 2}
                            </Badge>
                        )}
                    </div>
                )}

                <Button asChild className="w-full group">
                    <Link href={`/clinica/${clinic.slug || clinic.id}`}>
                        Ver Profesionales
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </Button>
            </CardContent>
        </Card >
    );
}

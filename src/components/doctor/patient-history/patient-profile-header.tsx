import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, MapPin, Phone, Mail } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

interface PatientProfileHeaderProps {
    patient: any; // Type Patient when available
}

export function PatientProfileHeader({ patient }: PatientProfileHeaderProps) {
    const age = patient.birth_date
        ? differenceInYears(new Date(), parseISO(patient.birth_date))
        : 'N/A';

    return (
        <Card className="border-l-4 border-l-primary">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Avatar className="h-24 w-24 border-2 border-background shadow-md">
                        <AvatarImage src={patient.profile_image} />
                        <AvatarFallback className="text-2xl">{patient.first_name?.[0]}{patient.last_name?.[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold">{patient.first_name} {patient.last_name}</h1>
                            <Badge variant="secondary" className="text-sm">Paciente</Badge>
                            {patient.gender && <Badge variant="outline">{patient.gender}</Badge>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{age} años ({patient.birth_date})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                <span>{patient.email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                <span>{patient.phone || 'Sin télefono'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{patient.city || 'Ubicación desconocida'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 min-w-[150px]">
                        {/* Acciones Rápidas futuras: "Crear Cita", "Enviar Mensaje" */}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

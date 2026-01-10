import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, MapPin, Phone, Mail, Users } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

interface PatientProfileHeaderProps {
    patient: any; // Type Patient when available
    familyMember?: any; // Datos del familiar si aplica
}

export function PatientProfileHeader({ patient, familyMember }: PatientProfileHeaderProps) {
    // Si hay un familiar, mostramos sus datos como principales
    const displayData = familyMember || patient;
    const isDependent = !!familyMember;

    console.log("Header Patient Data:", patient); // Debug titular name

    // Normalización de campos (API devuelve snake_case, supabaseService camelCase)
    const firstName = displayData.firstName || displayData.first_name || '';
    const lastName = displayData.lastName || displayData.last_name || '';
    const birthDate = displayData.birthDate || displayData.birth_date;
    const email = displayData.email;
    const phone = displayData.phone;
    const gender = displayData.gender;
    const city = displayData.city;
    const profileImage = displayData.profileImage || displayData.profile_image;

    // Datos del titular (solo si es dependiente)
    const holderFirstName = patient?.first_name || patient?.firstName || patient?.name || '';
    const holderLastName = patient?.last_name || patient?.lastName || '';

    const calculateAge = (dob: string) => {
        try {
            return differenceInYears(new Date(), parseISO(dob));
        } catch {
            return 'N/A';
        }
    };

    const age = birthDate ? calculateAge(birthDate) : 'N/A';

    return (
        <Card className={`border-l-4 ${isDependent ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-primary'}`}>
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <Avatar className="h-24 w-24 border-2 border-background shadow-md">
                        <AvatarImage src={profileImage} />
                        <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                            {firstName?.[0]}{lastName?.[0]}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold capitalize">{firstName} {lastName}</h1>
                            {isDependent ? (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Familiar / Dependiente</Badge>
                            ) : (
                                <Badge variant="secondary" className="text-sm">Paciente Titular</Badge>
                            )}
                            {gender && <Badge variant="outline" className="capitalize">{gender}</Badge>}
                        </div>

                        {/* Información de Dependencia */}
                        {isDependent && (
                            <div className="mt-2 text-sm bg-white/50 p-2 rounded-md inline-block border border-amber-100">
                                <p className="flex items-center gap-2 text-amber-900">
                                    <Users className="h-4 w-4" />
                                    Dependiente de: <span className="font-semibold">{holderFirstName} {holderLastName}</span>
                                    <span className="text-xs text-muted-foreground ml-1">(Titular de la cuenta)</span>
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary/70" />
                                <span>{age} años {birthDate && `(${birthDate})`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary/70" />
                                <span>{email || (isDependent ? 'Email del titular' : patient?.email)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-primary/70" />
                                <span>{phone || (isDependent ? 'Teléfono del titular' : patient?.phone) || 'Sin teléfono'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary/70" />
                                <span>{city || patient?.city || 'Ubicación desconocida'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, MapPin, Phone, Mail, Users, Heart, Briefcase, GraduationCap, IdCard, Church, UserCheck } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';

interface PatientProfileHeaderProps {
    patient: any; // Type Patient when available
    familyMember?: any; // Datos del familiar si aplica
}

export function PatientProfileHeader({ patient, familyMember }: PatientProfileHeaderProps) {
    // Si hay un familiar, mostramos sus datos como principales
    const displayData = familyMember || patient;
    const isDependent = !!familyMember;

    // Normalización de campos (API devuelve snake_case, supabaseService camelCase)
    const firstName = displayData.firstName || displayData.first_name || '';
    const lastName = displayData.lastName || displayData.last_name || '';
    const birthDate = displayData.birthDate || displayData.birth_date;
    const email = displayData.email;
    const phone = displayData.phone;
    const gender = displayData.gender;
    const city = displayData.city;
    const profileImage = displayData.profileImage || displayData.profile_image;
    const cedula = displayData?.cedula || patient?.cedula;

    // Nuevos campos adicionales - usar displayData primero (familiar), luego patient
    const bloodType = displayData?.bloodType || displayData?.blood_type || patient?.bloodType || patient?.blood_type;
    const religion = displayData?.religion || patient?.religion;
    const maritalStatus = displayData?.maritalStatus || displayData?.marital_status || patient?.maritalStatus || patient?.marital_status;
    const education = displayData?.education || patient?.education;
    const occupation = displayData?.occupation || patient?.occupation;
    const displayCity = displayData?.city || city;

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

    const age = birthDate ? calculateAge(birthDate) : (patient?.age || 'N/A');

    // Formatear estado civil
    const formatMaritalStatus = (status: string) => {
        const statusMap: Record<string, string> = {
            'soltero': 'Soltero/a',
            'casado': 'Casado/a',
            'divorciado': 'Divorciado/a',
            'viudo': 'Viudo/a',
            'union_libre': 'Unión Libre'
        };
        return statusMap[status] || status;
    };

    // Formatear nivel de estudios
    const formatEducation = (edu: string) => {
        const eduMap: Record<string, string> = {
            'primario': 'Primario',
            'secundario': 'Secundario',
            'terciario': 'Terciario',
            'universitario': 'Universitario',
            'posgrado': 'Posgrado'
        };
        return eduMap[edu] || edu;
    };

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
                            {bloodType && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    <Heart className="h-3 w-3 mr-1" /> {bloodType}
                                </Badge>
                            )}
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

                        {/* Datos principales */}
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
                                <span>{displayCity || patient?.city || 'Ubicación desconocida'}</span>
                            </div>
                        </div>

                        {/* Datos adicionales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-3 text-sm text-muted-foreground border-t pt-3">
                            {cedula && (
                                <div className="flex items-center gap-2">
                                    <IdCard className="h-4 w-4 text-blue-500" />
                                    <span>DNI: {cedula}</span>
                                </div>
                            )}
                            {maritalStatus && (
                                <div className="flex items-center gap-2">
                                    <UserCheck className="h-4 w-4 text-purple-500" />
                                    <span>{formatMaritalStatus(maritalStatus)}</span>
                                </div>
                            )}
                            {education && (
                                <div className="flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-green-500" />
                                    <span>{formatEducation(education)}</span>
                                </div>
                            )}
                            {occupation && (
                                <div className="flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-orange-500" />
                                    <span>{occupation}</span>
                                </div>
                            )}
                            {religion && (
                                <div className="flex items-center gap-2">
                                    <Church className="h-4 w-4 text-indigo-500" />
                                    <span>{religion}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

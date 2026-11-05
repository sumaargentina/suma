"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    User, Calendar, MapPin, Phone, Mail, Users, Heart, Briefcase,
    GraduationCap, IdCard, Church, UserCheck, AlertTriangle, Activity,
    Edit3, Save, Loader2
} from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface PatientProfileHeaderProps {
    patient: any;
    familyMember?: any;
    onUpdated?: () => void;
}

export function PatientProfileHeader({ patient, familyMember, onUpdated }: PatientProfileHeaderProps) {
    const { toast } = useToast();
    const displayData = familyMember || patient;
    const isDependent = !!familyMember;

    const firstName = displayData.firstName || displayData.first_name || displayData.name || '';
    const lastName = displayData.lastName || displayData.last_name || '';
    const birthDate = displayData.birthDate || displayData.birth_date;
    const email = displayData.email;
    const phone = displayData.phone;
    const gender = displayData.gender;
    const city = displayData.city;
    const profileImage = displayData.profileImage || displayData.profile_image;
    const cedula = displayData?.cedula || patient?.cedula;

    const rawBloodType = displayData?.bloodType || displayData?.blood_type || patient?.bloodType || patient?.blood_type || '';
    const rawAllergies = Array.isArray(displayData?.allergies)
        ? displayData.allergies.join(', ')
        : (displayData?.allergies || patient?.allergies || '');
    const rawConditions = displayData?.chronicConditions || displayData?.chronic_conditions || patient?.chronicConditions || patient?.chronic_conditions || '';

    const [bloodType, setBloodType] = useState<string>(rawBloodType);
    const [allergies, setAllergies] = useState<string>(rawAllergies);
    const [chronicConditions, setChronicConditions] = useState<string>(rawConditions);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setBloodType(rawBloodType);
        setAllergies(rawAllergies);
        setChronicConditions(rawConditions);
    }, [rawBloodType, rawAllergies, rawConditions]);

    const religion = displayData?.religion || patient?.religion;
    const maritalStatus = displayData?.maritalStatus || displayData?.marital_status || patient?.maritalStatus || patient?.marital_status;
    const education = displayData?.education || patient?.education;
    const occupation = displayData?.occupation || patient?.occupation;
    const displayCity = displayData?.city || city;

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

    const handleSaveClinicalAlerts = async () => {
        if (!patient?.id) return;
        try {
            setIsSaving(true);
            const res = await fetch('/api/patients/update', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: patient.id,
                    data: {
                        bloodType: bloodType || null,
                        allergies: allergies.trim() || null,
                        chronicConditions: chronicConditions.trim() || null,
                    }
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'No se pudo actualizar la ficha médica.');
            }

            toast({
                title: 'Ficha Clínica Actualizada',
                description: 'Las alergias, grupo sanguíneo y condiciones quedaron guardadas en el perfil del paciente.'
            });
            setIsEditOpen(false);
            if (onUpdated) onUpdated();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: error.message || 'Ocurrió un problema actualizando los datos.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <>
            <Card className={`border-l-4 ${isDependent ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-primary'}`}>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Avatar className="h-24 w-24 border-2 border-background shadow-md">
                            <AvatarImage src={profileImage} />
                            <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                                {firstName?.[0]}{lastName?.[0] || firstName?.[1] || ''}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-2 w-full">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl font-bold capitalize">{firstName} {lastName}</h1>
                                    {isDependent ? (
                                        <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Familiar / Dependiente</Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-sm">Paciente Titular</Badge>
                                    )}
                                    {gender && <Badge variant="outline" className="capitalize">{gender}</Badge>}
                                    {bloodType && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
                                            <Heart className="h-3 w-3 mr-1 fill-red-500 text-red-500" /> {bloodType}
                                        </Badge>
                                    )}
                                </div>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditOpen(true)}
                                    className="h-8 text-xs gap-1.5 border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100"
                                >
                                    <Edit3 className="h-3.5 w-3.5 text-amber-700" />
                                    Editar Alergias / Datos Clínicos
                                </Button>
                            </div>

                            {/* Badges de Alergias y Condiciones Crónicas */}
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {allergies ? (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                        <span><strong>Alergias:</strong> {allergies}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">Sin alergias registradas</span>
                                )}

                                {chronicConditions && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
                                        <Activity className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                        <span><strong>Condiciones / Antecedentes:</strong> {chronicConditions}</span>
                                    </div>
                                )}
                            </div>

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
                                        <span>DNI/CI: {cedula}</span>
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

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Datos Clínicos y Alergias del Paciente</DialogTitle>
                        <DialogDescription>
                            Esta información es compartida entre el perfil del paciente y su Ficha Técnica para alertar en futuras consultas.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="modal-blood-type">Grupo Sanguíneo</Label>
                            <select
                                id="modal-blood-type"
                                value={bloodType}
                                onChange={(e) => setBloodType(e.target.value)}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Sin especificar</option>
                                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                                    <option key={bt} value={bt}>{bt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="modal-allergies">Alergias Conocidas (Medicamentos, Alimentos, etc.)</Label>
                            <Input
                                id="modal-allergies"
                                value={allergies}
                                onChange={(e) => setAllergies(e.target.value)}
                                placeholder="Ej: Penicilina, AINES, Yodo, Ninguna..."
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="modal-conditions">Condiciones Activas / Antecedentes</Label>
                            <Input
                                id="modal-conditions"
                                value={chronicConditions}
                                onChange={(e) => setChronicConditions(e.target.value)}
                                placeholder="Ej: Hipertensión Arterial, Diabetes Tipo 2, Asma..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveClinicalAlerts} disabled={isSaving} className="gap-1.5">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Guardar en Ficha
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

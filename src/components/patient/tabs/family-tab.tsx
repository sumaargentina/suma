"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
    getFamilyMembers,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember
} from '@/lib/supabaseService';
import { FamilyMember, FamilyRelationship } from '@/lib/types';
import { format, differenceInYears } from 'date-fns';
import { es } from 'date-fns/locale';
import { DOCUMENT_TYPES, COUNTRY_CODES, DocumentType } from '@/lib/types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Pencil, Trash2, Users, Baby, User, Link as LinkIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// Definido localmente para evitar problemas de importación
const FAMILY_RELATIONSHIP_LABELS: Record<FamilyRelationship, string> = {
    hijo: 'Hijo',
    hija: 'Hija',
    padre: 'Padre',
    madre: 'Madre',
    abuelo: 'Abuelo',
    abuela: 'Abuela',
    nieto: 'Nieto',
    nieta: 'Nieta',
    conyuge: 'Cónyuge',
    hermano: 'Hermano',
    hermana: 'Hermana',
    otro: 'Otro',
};

const RELATIONSHIPS: FamilyRelationship[] = [
    'hijo', 'hija', 'padre', 'madre', 'abuelo', 'abuela',
    'nieto', 'nieta', 'conyuge', 'hermano', 'hermana', 'otro'
];

const getRelationshipIcon = (relationship: FamilyRelationship) => {
    if (['hijo', 'hija', 'nieto', 'nieta'].includes(relationship)) {
        return <Baby className="h-4 w-4" />;
    }
    return <User className="h-4 w-4" />;
};

const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
};

export function FamilyTab() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [members, setMembers] = useState<FamilyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
    const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(null);
    const [memberToLink, setMemberToLink] = useState<FamilyMember | null>(null);
    const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
    const [linkIdentifier, setLinkIdentifier] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        documentType: 'DNI' as DocumentType,
        cedula: '',
        birthDate: '',
        gender: '',
        email: '',
        phoneCode: '+54',
        phoneNum: '',
        relationship: '' as FamilyRelationship | '',
        relationshipDetail: '',
        // Campos médicos adicionales
        bloodType: '',
        religion: '',
        maritalStatus: '',
        education: '',
        occupation: '',
        city: '',
    });

    useEffect(() => {
        if (user?.id) {
            loadMembers();
        }
    }, [user?.id]);

    const loadMembers = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const data = await getFamilyMembers(user.id);
            setMembers(data);
        } catch (error) {
            console.error('Error loading family members:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudieron cargar los familiares."
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            documentType: 'DNI',
            cedula: '',
            birthDate: '',
            gender: '',
            email: '',
            phoneCode: '+54',
            phoneNum: '',
            relationship: '',
            relationshipDetail: '',
            bloodType: '',
            religion: '',
            maritalStatus: '',
            education: '',
            occupation: '',
            city: '',
        });
        setEditingMember(null);
    };

    const handleOpenDialog = (member?: FamilyMember) => {
        if (member) {
            setEditingMember(member);
            const phoneMatch = member.phone ? COUNTRY_CODES.find(c => member.phone?.startsWith(c.code)) : null;
            const code = phoneMatch ? phoneMatch.code : '+54';
            const num = member.phone ? member.phone.replace(code, '').trim() : '';

            setFormData({
                firstName: member.firstName,
                lastName: member.lastName,
                documentType: member.documentType || 'DNI',
                cedula: member.cedula || '',
                birthDate: member.birthDate,
                gender: member.gender || '',
                email: member.email || '',
                phoneCode: code,
                phoneNum: num,
                relationship: member.relationship,
                relationshipDetail: member.relationshipDetail || '',
                bloodType: member.bloodType || '',
                religion: member.religion || '',
                maritalStatus: member.maritalStatus || '',
                education: member.education || '',
                occupation: member.occupation || '',
                city: member.city || '',
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        resetForm();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id || !formData.relationship) return;

        setIsSubmitting(true);
        try {
            if (editingMember) {
                // Update
                await updateFamilyMember(editingMember.id, {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    documentType: formData.documentType,
                    cedula: formData.cedula || undefined,
                    birthDate: formData.birthDate,
                    gender: formData.gender || undefined,
                    email: formData.email || undefined,
                    phone: formData.phoneNum ? `${formData.phoneCode} ${formData.phoneNum}`.trim() : undefined,
                    relationship: formData.relationship as FamilyRelationship,
                    relationshipDetail: formData.relationshipDetail || undefined,
                    bloodType: formData.bloodType || undefined,
                    religion: formData.religion || undefined,
                    maritalStatus: formData.maritalStatus || undefined,
                    education: formData.education || undefined,
                    occupation: formData.occupation || undefined,
                    city: formData.city || undefined,
                } as any);
                toast({
                    title: "Familiar actualizado",
                    description: `${formData.firstName} ha sido actualizado correctamente.`
                });
            } else {
                // Create
                await addFamilyMember({
                    accountHolderId: user.id,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    documentType: formData.documentType,
                    cedula: formData.cedula || undefined,
                    birthDate: formData.birthDate,
                    gender: formData.gender || undefined,
                    email: formData.email || undefined,
                    phone: formData.phoneNum ? `${formData.phoneCode} ${formData.phoneNum}`.trim() : undefined,
                    relationship: formData.relationship as FamilyRelationship,
                    relationshipDetail: formData.relationshipDetail || undefined,
                    canViewHistory: true,
                    canBookAppointments: true,
                    status: 'active',
                    bloodType: formData.bloodType || undefined,
                    religion: formData.religion || undefined,
                    maritalStatus: formData.maritalStatus || undefined,
                    education: formData.education || undefined,
                    occupation: formData.occupation || undefined,
                    city: formData.city || undefined,
                } as any);
                toast({
                    title: "Familiar agregado",
                    description: `${formData.firstName} ha sido agregado a tu núcleo familiar.`
                });
            }
            handleCloseDialog();
            loadMembers();
        } catch (error) {
            console.error('Error saving family member:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo guardar el familiar."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!memberToDelete) return;

        try {
            await deleteFamilyMember(memberToDelete.id);
            toast({
                title: "Familiar eliminado",
                description: `${memberToDelete.firstName} ha sido eliminado de tu núcleo familiar.`
            });
            setMemberToDelete(null);
            loadMembers();
        } catch (error) {
            console.error('Error deleting family member:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar el familiar."
            });
        }
    };

    const handleOpenLinkDialog = (member: FamilyMember) => {
        setMemberToLink(member);
        setLinkIdentifier('');
        setIsLinkDialogOpen(true);
    };

    const handleLinkAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memberToLink || !linkIdentifier) return;

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/family-members/${memberToLink.id}/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ identifier: linkIdentifier.trim() }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al vincular cuenta');
            }

            toast({
                title: "Cuenta vinculada",
                description: `El familiar ${memberToLink.firstName} ha sido vinculado con la cuenta ${data.linkedTo?.email || ''}.`
            });
            setIsLinkDialogOpen(false);
            setMemberToLink(null);
            loadMembers();
        } catch (error) {
            console.error('Error linking account:', error);
            toast({
                variant: "destructive",
                title: "Error",
                description: error instanceof Error ? error.message : "No se pudo vincular la cuenta."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateAge = (birthDate: string): number => {
        return differenceInYears(new Date(), new Date(birthDate));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="h-6 w-6 text-primary" />
                        Núcleo Familiar
                    </h2>
                    <p className="text-muted-foreground">
                        Agrega a tus familiares para poder agendar citas en su nombre.
                    </p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Familiar
                </Button>
            </div>

            {/* Family Members Grid */}
            {members.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                        <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Sin familiares registrados</h3>
                        <p className="text-muted-foreground mb-4">
                            Agrega a tus hijos, padres, abuelos u otros familiares para agendar citas en su nombre.
                        </p>
                        <Button variant="outline" onClick={() => handleOpenDialog()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar mi primer familiar
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => (
                        <Card key={member.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 bg-primary/10">
                                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                {getInitials(member.firstName, member.lastName)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">
                                                {member.firstName} {member.lastName}
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-1">
                                                {getRelationshipIcon(member.relationship)}
                                                {FAMILY_RELATIONSHIP_LABELS[member.relationship]}
                                                {member.relationshipDetail && ` (${member.relationshipDetail})`}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="secondary">
                                        {calculateAge(member.birthDate)} años
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Fecha de nacimiento:</span>
                                    <span className="font-medium text-foreground">
                                        {format(new Date(member.birthDate), 'dd MMM yyyy', { locale: es })}
                                    </span>
                                </div>
                                {member.cedula && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>{member.documentType || 'DNI'}:</span>
                                        <span className="font-medium text-foreground">{member.cedula}</span>
                                    </div>
                                )}
                                {member.email && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Email:</span>
                                        <span className="font-medium text-foreground truncate max-w-[150px]">{member.email}</span>
                                    </div>
                                )}
                                {member.phone && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Teléfono:</span>
                                        <span className="font-medium text-foreground">{member.phone}</span>
                                    </div>
                                )}

                                {member.linkedPatientId && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Cuenta:</span>
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                            Vinculada
                                        </Badge>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-3 border-t mt-3">
                                    {!member.linkedPatientId && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => handleOpenLinkDialog(member)}
                                        >
                                            <LinkIcon className="h-3 w-3 mr-2" />
                                            Vincular
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleOpenDialog(member)}
                                    >
                                        <Pencil className="h-3 w-3 mr-2" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                        onClick={() => setMemberToDelete(member)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMember ? 'Editar Familiar' : 'Agregar Familiar'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingMember
                                ? 'Modifica los datos del familiar.'
                                : 'Ingresa los datos del familiar que deseas agregar a tu núcleo.'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Nombre *</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="Juan"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Apellido *</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="Pérez"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="relationship">Relación *</Label>
                                <Select
                                    value={formData.relationship}
                                    onValueChange={(val) => setFormData({ ...formData, relationship: val as FamilyRelationship })}
                                    required
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RELATIONSHIPS.map((rel) => (
                                            <SelectItem key={rel} value={rel}>
                                                {FAMILY_RELATIONSHIP_LABELS[rel]}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="birthDate">Fecha de Nacimiento *</Label>
                                <Input
                                    id="birthDate"
                                    type="date"
                                    value={formData.birthDate}
                                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        {formData.relationship === 'otro' && (
                            <div className="space-y-2">
                                <Label htmlFor="relationshipDetail">Especificar relación</Label>
                                <Input
                                    id="relationshipDetail"
                                    value={formData.relationshipDetail}
                                    onChange={(e) => setFormData({ ...formData, relationshipDetail: e.target.value })}
                                    placeholder="Ej: Primo, Tío, etc."
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="cedula">Documento de Identidad (opcional)</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={formData.documentType}
                                        onValueChange={(val) => setFormData({ ...formData, documentType: val as DocumentType })}
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {DOCUMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        id="cedula"
                                        value={formData.cedula}
                                        onChange={(e) => {
                                            // Solo permitir números y máximo 9 dígitos
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
                                            setFormData({ ...formData, cedula: val });
                                        }}
                                        placeholder="Número"
                                        className="flex-1"
                                        maxLength={9}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gender">Género</Label>
                                <Select
                                    value={formData.gender}
                                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="masculino">Masculino</SelectItem>
                                        <SelectItem value="femenino">Femenino</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                        <SelectItem value="no_especificar">No especificar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email (opcional)</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="familiar@email.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono (opcional)</Label>
                                <div className="flex gap-2">
                                    <Select
                                        value={formData.phoneCode}
                                        onValueChange={(val) => setFormData({ ...formData, phoneCode: val })}
                                    >
                                        <SelectTrigger className="w-[120px]">
                                            <SelectValue placeholder="País" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COUNTRY_CODES.map(c => (
                                                <SelectItem key={c.code} value={c.code}>
                                                    <span className="flex items-center gap-2">
                                                        <span>{c.flag}</span>
                                                        <span>{c.code}</span>
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        id="phone"
                                        value={formData.phoneNum}
                                        onChange={(e) => setFormData({ ...formData, phoneNum: e.target.value })}
                                        placeholder="11 1234 5678"
                                        className="flex-1"
                                        type="tel"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Información Médica Adicional (Opcional) */}
                        <div className="border-t pt-4 mt-4">
                            <p className="text-sm font-medium text-muted-foreground mb-3">Información Médica (Opcional)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bloodType">Tipo de Sangre</Label>
                                    <Select
                                        value={formData.bloodType}
                                        onValueChange={(val) => setFormData({ ...formData, bloodType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A+">A+</SelectItem>
                                            <SelectItem value="A-">A-</SelectItem>
                                            <SelectItem value="B+">B+</SelectItem>
                                            <SelectItem value="B-">B-</SelectItem>
                                            <SelectItem value="AB+">AB+</SelectItem>
                                            <SelectItem value="AB-">AB-</SelectItem>
                                            <SelectItem value="O+">O+</SelectItem>
                                            <SelectItem value="O-">O-</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="maritalStatus">Estado Civil</Label>
                                    <Select
                                        value={formData.maritalStatus}
                                        onValueChange={(val) => setFormData({ ...formData, maritalStatus: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="soltero">Soltero/a</SelectItem>
                                            <SelectItem value="casado">Casado/a</SelectItem>
                                            <SelectItem value="divorciado">Divorciado/a</SelectItem>
                                            <SelectItem value="viudo">Viudo/a</SelectItem>
                                            <SelectItem value="union_libre">Unión Libre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="education">Nivel de Estudios</Label>
                                    <Select
                                        value={formData.education}
                                        onValueChange={(val) => setFormData({ ...formData, education: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="primario">Primario</SelectItem>
                                            <SelectItem value="secundario">Secundario</SelectItem>
                                            <SelectItem value="terciario">Terciario</SelectItem>
                                            <SelectItem value="universitario">Universitario</SelectItem>
                                            <SelectItem value="posgrado">Posgrado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="occupation">Ocupación</Label>
                                    <Input
                                        id="occupation"
                                        value={formData.occupation}
                                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                        placeholder="Ej: Docente"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="religion">Religión</Label>
                                    <Input
                                        id="religion"
                                        value={formData.religion}
                                        onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                                        placeholder="Ej: Católica"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">Ciudad</Label>
                                    <Input
                                        id="city"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="Ej: Buenos Aires"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !formData.relationship}>
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {editingMember ? 'Guardar Cambios' : 'Agregar Familiar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!memberToDelete} onOpenChange={(open) => !open && setMemberToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar familiar?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará a <strong>{memberToDelete?.firstName} {memberToDelete?.lastName}</strong> de tu núcleo familiar.
                            Las citas existentes no se verán afectadas, pero no podrás agendar nuevas citas para este familiar.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Link Account Dialog */}
            <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Vincular con Cuenta Existente</DialogTitle>
                        <DialogDescription>
                            Si tu familiar ya tiene una cuenta en SUMA, puedes vincularla aquí ingresando su correo electrónico o DNI.
                            Esto permitirá sincronizar su historial médico.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleLinkAccount} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="linkIdentifier">Correo Electrónico o DNI del Familiar</Label>
                            <Input
                                id="linkIdentifier"
                                value={linkIdentifier}
                                onChange={(e) => setLinkIdentifier(e.target.value)}
                                placeholder="familiar@email.com o 12345678"
                                required
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !linkIdentifier}>
                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Vincular Cuenta
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

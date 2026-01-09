"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';
import type { Doctor } from '@/lib/types';

export function InsurancesTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [doctor, setDoctor] = useState<Doctor | null>(null);
    const [insurances, setInsurances] = useState<string[]>([]);
    const [newInsurance, setNewInsurance] = useState('');

    useEffect(() => {
        const loadData = async () => {
            if (user?.id) {
                try {
                    setLoading(true);
                    const data = await supabaseService.getDoctor(user.id);
                    if (data) {
                        setDoctor(data);
                        setInsurances(data.acceptedInsurances || []);
                    }
                } catch (error) {
                    console.error("Error loading doctor data", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        loadData();
    }, [user]);

    const handleAddInsurance = () => {
        if (!newInsurance.trim()) return;
        if (insurances.includes(newInsurance.trim())) {
            toast({ variant: "destructive", title: "Ya existe", description: "Esta cobertura ya está en tu lista." });
            setNewInsurance('');
            return;
        }
        setInsurances([...insurances, newInsurance.trim()]);
        setNewInsurance('');
    };

    const handleRemoveInsurance = (ins: string) => {
        setInsurances(insurances.filter(i => i !== ins));
    };

    const handleSave = async () => {
        if (!doctor) return;
        setLoading(true);
        try {
            await supabaseService.updateDoctor(doctor.id, {
                acceptedInsurances: insurances
            });
            toast({ title: "Guardado", description: "La lista de coberturas ha sido actualizada." });
        } catch (error) {
            console.error("Error saving insurances", error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron guardar los cambios." });
        } finally {
            setLoading(false);
        }
    };

    if (!doctor && loading) return <div>Cargando...</div>;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                    Gestión de Coberturas Médicas
                </CardTitle>
                <CardDescription>
                    Administra las Obras Sociales y Prepagas que aceptas en tu consultorio.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="grid gap-2 flex-1">
                            <Label htmlFor="insurance-name" className="sr-only">Nombre de la Cobertura</Label>
                            <Input
                                id="insurance-name"
                                placeholder="Ej. OSDE, Swiss Medical, Galeno..."
                                value={newInsurance}
                                onChange={(e) => setNewInsurance(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddInsurance();
                                    }
                                }}
                            />
                        </div>
                        <Button onClick={handleAddInsurance} className="shrink-0">
                            <Plus className="mr-2 h-4 w-4" /> Agregar
                        </Button>
                    </div>

                    <div className="border rounded-md p-4 min-h-[100px] space-y-2">
                        <Label className="text-sm text-muted-foreground mb-2 block">Coberturas Activas ({insurances.length})</Label>

                        {insurances.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {insurances.map((ins) => (
                                    <div key={ins} className="flex items-center gap-1 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                                        <span>{ins}</span>
                                        <button
                                            onClick={() => handleRemoveInsurance(ins)}
                                            className="text-muted-foreground hover:text-destructive ml-1.5 transition-colors"
                                            title={`Eliminar ${ins}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground opacity-60">
                                <ShieldCheck className="h-10 w-10 mb-2" />
                                <p className="text-sm">No has agregado ninguna cobertura aún.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Guardar Cambios
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

"use client";

import React, { useState, useMemo } from 'react';
import { useSettings } from '@/lib/settings';
import { DEFAULT_PROFESSIONS_CATALOG } from '@/lib/professions-catalog';
import type { ProfessionCategory, SpecialtyConfigItem } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Stethoscope,
  Search,
  Plus,
  Trash2,
  FileText,
  Pill,
  ChevronDown,
  ChevronRight,
  Loader2,
  FolderPlus,
  CheckCircle2
} from 'lucide-react';

export function ProfessionsSpecialtiesCard() {
  const { professionsCatalog, updateSetting } = useSettings();
  const { toast } = useToast();

  const catalog: ProfessionCategory[] = useMemo(
    () => (professionsCatalog && professionsCatalog.length > 0 ? professionsCatalog : DEFAULT_PROFESSIONS_CATALOG),
    [professionsCatalog]
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfessionFilter, setSelectedProfessionFilter] = useState<string>('all');
  const [expandedProfessions, setExpandedProfessions] = useState<Record<string, boolean>>({
    'Médico': true,
    'Psicólogo': true,
    'Dentista (Odontólogo)': true,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Modal para agregar Especialidad
  const [isAddSpecialtyOpen, setIsAddSpecialtyOpen] = useState(false);
  const [newSpecProfession, setNewSpecProfession] = useState<string>(catalog[0]?.name || 'Médico');
  const [newSpecName, setNewSpecName] = useState('');
  const [newSpecHasMedicalRecord, setNewSpecHasMedicalRecord] = useState(true);
  const [newSpecHasPrescription, setNewSpecHasPrescription] = useState(true);

  // Modal para agregar Profesión
  const [isAddProfessionOpen, setIsAddProfessionOpen] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [newProfHasMedicalRecord, setNewProfHasMedicalRecord] = useState(true);
  const [newProfHasPrescription, setNewProfHasPrescription] = useState(false);

  const totalSpecialtiesCount = useMemo(
    () => catalog.reduce((acc, p) => acc + p.specialties.length, 0),
    [catalog]
  );

  const persistCatalog = async (updatedCatalog: ProfessionCategory[], successMessage?: string) => {
    setIsSaving(true);
    try {
      const flatSpecialties = Array.from(
        new Set(updatedCatalog.flatMap(p => p.specialties.map(s => s.name)))
      );
      await updateSetting('professionsCatalog', updatedCatalog);
      await updateSetting('specialties', flatSpecialties);
      if (successMessage) {
        toast({ title: 'Guardado en Base de Datos', description: successMessage });
      }
    } catch (err) {
      console.error('Error guardando catálogo de profesiones:', err);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: 'No se pudo actualizar el catálogo en la base de datos.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Cambiar switch de Historia Médica o Récipe para toda una Profesión
  const handleToggleProfessionCapability = async (
    profName: string,
    field: 'hasMedicalRecord' | 'hasPrescription',
    value: boolean
  ) => {
    const updated = catalog.map(p => {
      if (p.name !== profName) return p;
      return {
        ...p,
        defaultHasMedicalRecord: field === 'hasMedicalRecord' ? value : p.defaultHasMedicalRecord,
        defaultHasPrescription: field === 'hasPrescription' ? value : p.defaultHasPrescription,
        specialties: p.specialties.map(s => ({
          ...s,
          [field]: value,
        })),
      };
    });
    await persistCatalog(
      updated,
      `Se actualizó ${field === 'hasMedicalRecord' ? 'Historia Médica' : 'Récipe Médico'} para todas las especialidades de ${profName}.`
    );
  };

  // Cambiar switch de Historia Médica o Récipe para una Especialidad individual
  const handleToggleSpecialtyCapability = async (
    profName: string,
    specName: string,
    field: 'hasMedicalRecord' | 'hasPrescription',
    value: boolean
  ) => {
    const updated = catalog.map(p => {
      if (p.name !== profName) return p;
      return {
        ...p,
        specialties: p.specialties.map(s =>
          s.name === specName ? { ...s, [field]: value } : s
        ),
      };
    });
    await persistCatalog(updated);
  };

  // Agregar nueva Especialidad a una Profesión
  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSpecName.trim();
    if (!cleanName || !newSpecProfession) return;

    const targetProf = catalog.find(p => p.name === newSpecProfession);
    if (targetProf?.specialties.some(s => s.name.toLowerCase() === cleanName.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Especialidad duplicada',
        description: `"${cleanName}" ya existe dentro de ${newSpecProfession}.`,
      });
      return;
    }

    const updated = catalog.map(p => {
      if (p.name !== newSpecProfession) return p;
      return {
        ...p,
        specialties: [
          ...p.specialties,
          {
            name: cleanName,
            hasMedicalRecord: newSpecHasMedicalRecord,
            hasPrescription: newSpecHasPrescription,
          },
        ],
      };
    });

    await persistCatalog(updated, `Especialidad "${cleanName}" agregada a ${newSpecProfession}.`);
    setNewSpecName('');
    setIsAddSpecialtyOpen(false);
  };

  // Agregar nueva Profesión (Nivel 1)
  const handleAddProfession = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProfName.trim();
    if (!cleanName) return;

    if (catalog.some(p => p.name.toLowerCase() === cleanName.toLowerCase())) {
      toast({
        variant: 'destructive',
        title: 'Profesión duplicada',
        description: `La profesión "${cleanName}" ya existe.`,
      });
      return;
    }

    const slug = cleanName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');

    const newProf: ProfessionCategory = {
      id: slug,
      name: cleanName,
      defaultHasMedicalRecord: newProfHasMedicalRecord,
      defaultHasPrescription: newProfHasPrescription,
      specialties: [
        {
          name: `${cleanName} general`,
          hasMedicalRecord: newProfHasMedicalRecord,
          hasPrescription: newProfHasPrescription,
        },
      ],
    };

    const updated = [...catalog, newProf];
    await persistCatalog(updated, `Profesión "${cleanName}" creada exitosamente.`);
    setExpandedProfessions(prev => ({ ...prev, [cleanName]: true }));
    setNewProfName('');
    setIsAddProfessionOpen(false);
  };

  // Eliminar una Especialidad
  const handleDeleteSpecialty = async (profName: string, specName: string) => {
    const updated = catalog.map(p => {
      if (p.name !== profName) return p;
      return {
        ...p,
        specialties: p.specialties.filter(s => s.name !== specName),
      };
    });
    await persistCatalog(updated, `Especialidad "${specName}" eliminada de ${profName}.`);
  };

  // Eliminar una Profesión completa
  const handleDeleteProfession = async (profName: string) => {
    if (!confirm(`¿Seguro que deseas eliminar la profesión "${profName}" y todas sus especialidades?`)) {
      return;
    }
    const updated = catalog.filter(p => p.name !== profName);
    await persistCatalog(updated, `Profesión "${profName}" eliminada.`);
  };

  // Filtrar catálogo según profesión y búsqueda
  const filteredCatalog = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return catalog
      .filter(p => selectedProfessionFilter === 'all' || p.name === selectedProfessionFilter)
      .map(p => {
        if (!q) return p;
        const profMatches = p.name.toLowerCase().includes(q);
        const matchingSpecs = p.specialties.filter(s => s.name.toLowerCase().includes(q));
        if (profMatches) return p;
        return { ...p, specialties: matchingSpecs };
      })
      .filter(p => p.specialties.length > 0 || p.name.toLowerCase().includes(q));
  }, [catalog, selectedProfessionFilter, searchTerm]);

  const toggleExpand = (profName: string) => {
    setExpandedProfessions(prev => ({ ...prev, [profName]: !prev[profName] }));
  };

  return (
    <Card className="border-teal-100 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
              <Stethoscope className="h-5 w-5 text-teal-600" />
              Catálogo por Niveles: Profesiones y Especialidades ({catalog.length} Profesiones · {totalSpecialtiesCount} Especialidades)
            </CardTitle>
            <CardDescription className="mt-1">
              Configura las profesiones (Nivel 1), sus especialidades (Nivel 2) y define con interruptores cuáles tienen acceso a <strong>Historia Médica</strong> y <strong>Récipe Médico</strong>.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddProfessionOpen(true)}
              className="border-teal-200 text-teal-800 hover:bg-teal-50"
            >
              <FolderPlus className="h-4 w-4 mr-1.5" />
              + Nueva Profesión
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                const defaultProf = selectedProfessionFilter !== 'all' ? selectedProfessionFilter : (catalog[0]?.name || 'Médico');
                setNewSpecProfession(defaultProf);
                const profObj = catalog.find(p => p.name === defaultProf);
                setNewSpecHasMedicalRecord(profObj?.defaultHasMedicalRecord ?? true);
                setNewSpecHasPrescription(profObj?.defaultHasPrescription ?? false);
                setIsAddSpecialtyOpen(true);
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              + Nueva Especialidad
            </Button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar profesión o especialidad (ej: Cardiología, Psicología, Ortodoncia, Fisioterapia...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div>
            <Select value={selectedProfessionFilter} onValueChange={setSelectedProfessionFilter}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Filtrar por Profesión" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectItem value="all">Todas las Profesiones ({catalog.length})</SelectItem>
                {catalog.map(p => (
                  <SelectItem key={p.id || p.name} value={p.name}>
                    {p.name} ({p.specialties.length})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isSaving && (
          <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 px-3 py-2 rounded-lg">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Guardando cambios en la base de datos...
          </div>
        )}

        <div className="space-y-3">
          {filteredCatalog.map((prof) => {
            const isExpanded = Boolean(expandedProfessions[prof.name] || searchTerm.trim().length > 0 || selectedProfessionFilter !== 'all');
            const allHaveRecord = prof.specialties.length > 0 && prof.specialties.every(s => s.hasMedicalRecord);
            const allHavePrescription = prof.specialties.length > 0 && prof.specialties.every(s => s.hasPrescription);

            return (
              <div
                key={prof.id || prof.name}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs"
              >
                {/* Cabecera de Profesión (Nivel 1) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 bg-slate-50/80 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => toggleExpand(prof.name)}
                      className="flex items-center gap-2 text-left font-bold text-slate-900 hover:text-teal-700 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-teal-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="text-sm md:text-base">{prof.name}</span>
                    </button>
                    <Badge variant="secondary" className="text-xs font-medium">
                      {prof.specialties.length} especialidades
                    </Badge>
                  </div>

                  {/* Controles masivos de la Profesión */}
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <FileText className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium text-slate-700">Historia Médica (Todas):</span>
                      <Switch
                        checked={allHaveRecord}
                        onCheckedChange={(val) =>
                          handleToggleProfessionCapability(prof.name, 'hasMedicalRecord', val)
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <Pill className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="font-medium text-slate-700">Récipe Médico (Todas):</span>
                      <Switch
                        checked={allHavePrescription}
                        onCheckedChange={(val) =>
                          handleToggleProfessionCapability(prof.name, 'hasPrescription', val)
                        }
                        disabled={isSaving}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-teal-700 hover:bg-teal-50"
                      onClick={() => {
                        setNewSpecProfession(prof.name);
                        setNewSpecHasMedicalRecord(allHaveRecord);
                        setNewSpecHasPrescription(allHavePrescription);
                        setIsAddSpecialtyOpen(true);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Añadir
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                      onClick={() => handleDeleteProfession(prof.name)}
                      title={`Eliminar profesión ${prof.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Lista de Especialidades (Nivel 2) */}
                {isExpanded && (
                  <div className="divide-y divide-slate-100">
                    {prof.specialties.map((spec: SpecialtyConfigItem) => (
                      <div
                        key={spec.name}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 hover:bg-slate-50/60 transition-colors"
                      >
                        <div className="flex items-center gap-2 pl-4">
                          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                          <span className="text-sm font-medium text-slate-800">{spec.name}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pl-4 sm:pl-0">
                          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <Switch
                              checked={spec.hasMedicalRecord}
                              onCheckedChange={(val) =>
                                handleToggleSpecialtyCapability(prof.name, spec.name, 'hasMedicalRecord', val)
                              }
                              disabled={isSaving}
                            />
                            <span className={spec.hasMedicalRecord ? "font-semibold text-blue-700" : "text-slate-400"}>
                              Historia Médica
                            </span>
                          </label>

                          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                            <Switch
                              checked={spec.hasPrescription}
                              onCheckedChange={(val) =>
                                handleToggleSpecialtyCapability(prof.name, spec.name, 'hasPrescription', val)
                              }
                              disabled={isSaving}
                            />
                            <span className={spec.hasPrescription ? "font-semibold text-emerald-700" : "text-slate-400"}>
                              Récipe Médico
                            </span>
                          </label>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-600"
                            onClick={() => handleDeleteSpecialty(prof.name, spec.name)}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Dialog: Nueva Especialidad */}
      <Dialog open={isAddSpecialtyOpen} onOpenChange={setIsAddSpecialtyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Especialidad</DialogTitle>
            <DialogDescription>
              Selecciona la profesión a la que pertenece e indica si utiliza Historia Médica y Récipe Médico.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSpecialty} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>1. Profesión / Categoría</Label>
              <Select
                value={newSpecProfession}
                onValueChange={(val) => {
                  setNewSpecProfession(val);
                  const p = catalog.find(item => item.name === val);
                  if (p) {
                    setNewSpecHasMedicalRecord(p.defaultHasMedicalRecord);
                    setNewSpecHasPrescription(p.defaultHasPrescription);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {catalog.map(p => (
                    <SelectItem key={p.id || p.name} value={p.name}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>2. Nombre de la Especialidad</Label>
              <Input
                placeholder="Ej: Cardiología infantil, Ortodoncia invisible..."
                value={newSpecName}
                onChange={(e) => setNewSpecName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Lleva Historia Médica / Clínica</p>
                  <p className="text-xs text-slate-500">Habilita el módulo de evoluciones e historial clínico del paciente</p>
                </div>
                <Switch
                  checked={newSpecHasMedicalRecord}
                  onCheckedChange={setNewSpecHasMedicalRecord}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Emite Récipe Médico</p>
                  <p className="text-xs text-slate-500">Habilita la prescripción de medicamentos y récipes digitales</p>
                </div>
                <Switch
                  checked={newSpecHasPrescription}
                  onCheckedChange={setNewSpecHasPrescription}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddSpecialtyOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                Guardar Especialidad
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nueva Profesión */}
      <Dialog open={isAddProfessionOpen} onOpenChange={setIsAddProfessionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nueva Profesión (Nivel 1)</DialogTitle>
            <DialogDescription>
              Crea una nueva categoría profesional y define sus permisos por defecto.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddProfession} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nombre de la Profesión</Label>
              <Input
                placeholder="Ej: Optometrista, Kinesiólogo..."
                value={newProfName}
                onChange={(e) => setNewProfName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Lleva Historia Médica por defecto</p>
                  <p className="text-xs text-slate-500">Sus especialidades tendrán acceso a historias clínicas</p>
                </div>
                <Switch
                  checked={newProfHasMedicalRecord}
                  onCheckedChange={setNewProfHasMedicalRecord}
                />
              </div>

              <div className="flex items-center justify-between border-t pt-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Emite Récipe Médico por defecto</p>
                  <p className="text-xs text-slate-500">Sus especialidades podrán emitir récipes farmacológicos</p>
                </div>
                <Switch
                  checked={newProfHasPrescription}
                  onCheckedChange={setNewProfHasPrescription}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddProfessionOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-teal-600 hover:bg-teal-700 text-white">
                Crear Profesión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

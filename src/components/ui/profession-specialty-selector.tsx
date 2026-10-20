"use client";

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSettings } from '@/lib/settings';
import { DEFAULT_PROFESSIONS_CATALOG, findProfessionBySpecialty } from '@/lib/professions-catalog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Search, Stethoscope, FileText, Pill, Check, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProfessionSpecialtyValue {
  profession: string;
  specialty: string;
  hasMedicalRecord: boolean;
  hasPrescription: boolean;
}

interface ProfessionSpecialtySelectorProps {
  profession?: string;
  specialty?: string;
  onChange: (val: ProfessionSpecialtyValue) => void;
  disabled?: boolean;
  showCapabilitiesBadge?: boolean;
  className?: string;
}

export function ProfessionSpecialtySelector({
  profession: propProfession,
  specialty: propSpecialty,
  onChange,
  disabled = false,
  showCapabilitiesBadge = true,
  className,
}: ProfessionSpecialtySelectorProps) {
  const { professionsCatalog } = useSettings();
  const catalog = useMemo(
    () => (professionsCatalog && professionsCatalog.length > 0 ? professionsCatalog : DEFAULT_PROFESSIONS_CATALOG),
    [professionsCatalog]
  );

  // Resolver profesión inicial a partir de la especialidad si no viene explícita
  const resolvedInitialProfession = useMemo(() => {
    if (propProfession && catalog.some(p => p.name.toLowerCase() === propProfession.toLowerCase())) {
      return catalog.find(p => p.name.toLowerCase() === propProfession.toLowerCase())!.name;
    }
    if (propSpecialty && propSpecialty !== 'Pendiente') {
      const matched = findProfessionBySpecialty(propSpecialty, catalog);
      if (matched) return matched.name;
    }
    return catalog[0]?.name || 'Médico';
  }, [propProfession, propSpecialty, catalog]);

  const [selectedProfession, setSelectedProfession] = useState<string>(resolvedInitialProfession);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(
    propSpecialty && propSpecialty !== 'Pendiente' ? propSpecialty : ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (propProfession && propProfession !== selectedProfession) {
      setSelectedProfession(propProfession);
    } else if (!propProfession && propSpecialty && propSpecialty !== 'Pendiente') {
      const matched = findProfessionBySpecialty(propSpecialty, catalog);
      if (matched && matched.name !== selectedProfession) {
        setSelectedProfession(matched.name);
      }
    }
    if (propSpecialty !== undefined && propSpecialty !== 'Pendiente' && propSpecialty !== selectedSpecialty) {
      setSelectedSpecialty(propSpecialty);
    }
  }, [propProfession, propSpecialty, catalog]);

  // Cerrar el dropdown de búsqueda rápida al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentProfessionObj = useMemo(
    () => catalog.find(p => p.name === selectedProfession) || catalog[0],
    [catalog, selectedProfession]
  );

  const currentSpecialties = useMemo(
    () => currentProfessionObj?.specialties || [],
    [currentProfessionObj]
  );

  const currentSpecialtyObj = useMemo(
    () => currentSpecialties.find(s => s.name.toLowerCase() === selectedSpecialty.toLowerCase()),
    [currentSpecialties, selectedSpecialty]
  );

  // Resultados de búsqueda rápida en todas las profesiones y especialidades (priorizando iniciales)
  const quickSearchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const normalize = (str: string) =>
      str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const normQ = normalize(q);

    type QuickItem = {
      profession: string;
      specialty: string;
      hasMedicalRecord: boolean;
      hasPrescription: boolean;
    };

    const startsWithSpec: QuickItem[] = [];
    const startsWithWordOrProf: QuickItem[] = [];
    const containsMatch: QuickItem[] = [];

    for (const prof of catalog) {
      const normProf = normalize(prof.name);
      for (const spec of prof.specialties) {
        const normSpec = normalize(spec.name);
        const item: QuickItem = {
          profession: prof.name,
          specialty: spec.name,
          hasMedicalRecord: spec.hasMedicalRecord,
          hasPrescription: spec.hasPrescription,
        };

        if (normSpec.startsWith(normQ)) {
          startsWithSpec.push(item);
        } else if (
          normSpec.split(/[\s\-(),/]+/).some((w) => w.startsWith(normQ)) ||
          normProf.startsWith(normQ)
        ) {
          startsWithWordOrProf.push(item);
        } else if (normSpec.includes(normQ) || normProf.includes(normQ)) {
          containsMatch.push(item);
        }
      }
    }
    return [...startsWithSpec, ...startsWithWordOrProf, ...containsMatch].slice(0, 15);
  }, [catalog, searchQuery]);

  // Opciones para el selector de 1° Nivel (Profesiones)
  const professionOptions: SearchableSelectOption[] = useMemo(
    () =>
      catalog.map((prof) => ({
        value: prof.name,
        label: prof.name,
        badge: `${prof.specialties.length} esp.`,
      })),
    [catalog]
  );

  // Opciones para el selector de 2° Nivel (Especialidades de la profesión actual)
  const currentSpecialtyOptions: SearchableSelectOption[] = useMemo(
    () =>
      currentSpecialties.map((spec) => ({
        value: spec.name,
        label: spec.name,
        sublabel: selectedProfession,
        badge: spec.hasPrescription ? 'Récipe + Historia' : spec.hasMedicalRecord ? 'Historia' : undefined,
        meta: {
          profession: selectedProfession,
          hasMedicalRecord: spec.hasMedicalRecord,
          hasPrescription: spec.hasPrescription,
        },
      })),
    [currentSpecialties, selectedProfession]
  );

  // Opciones de respaldo de otras profesiones si el usuario escribe directamente una especialidad en el 2° Nivel
  const allOtherSpecialtyOptions: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = [];
    for (const prof of catalog) {
      if (prof.name === selectedProfession) continue;
      for (const spec of prof.specialties) {
        list.push({
          value: spec.name,
          label: spec.name,
          sublabel: `Categoría: ${prof.name}`,
          badge: spec.hasPrescription ? 'Récipe + Historia' : spec.hasMedicalRecord ? 'Historia' : undefined,
          meta: {
            profession: prof.name,
            hasMedicalRecord: spec.hasMedicalRecord,
            hasPrescription: spec.hasPrescription,
          },
        });
      }
    }
    return list;
  }, [catalog, selectedProfession]);

  const handleProfessionChange = (newProfName: string) => {
    setSelectedProfession(newProfName);
    const profObj = catalog.find(p => p.name === newProfName);
    const firstSpec = profObj?.specialties?.[0];
    if (firstSpec) {
      setSelectedSpecialty(firstSpec.name);
      onChange({
        profession: newProfName,
        specialty: firstSpec.name,
        hasMedicalRecord: firstSpec.hasMedicalRecord,
        hasPrescription: firstSpec.hasPrescription,
      });
    }
  };

  const handleSpecialtyChange = (newSpecName: string, option?: SearchableSelectOption) => {
    const targetProfName = (option?.meta?.profession as string) || selectedProfession;
    if (targetProfName !== selectedProfession) {
      setSelectedProfession(targetProfName);
    }
    setSelectedSpecialty(newSpecName);

    const profObj = catalog.find(p => p.name === targetProfName) || currentProfessionObj;
    const specObj = profObj?.specialties.find(s => s.name === newSpecName);
    onChange({
      profession: targetProfName,
      specialty: newSpecName,
      hasMedicalRecord: specObj ? specObj.hasMedicalRecord : (profObj?.defaultHasMedicalRecord ?? true),
      hasPrescription: specObj ? specObj.hasPrescription : (profObj?.defaultHasPrescription ?? false),
    });
  };

  const handleQuickSelect = (item: {
    profession: string;
    specialty: string;
    hasMedicalRecord: boolean;
    hasPrescription: boolean;
  }) => {
    setSelectedProfession(item.profession);
    setSelectedSpecialty(item.specialty);
    setSearchQuery('');
    setIsSearchOpen(false);
    onChange(item);
  };

  return (
    <div className={cn("space-y-3 rounded-xl border border-teal-100 bg-teal-50/30 p-3.5", className)}>
      {/* Buscador Rápido Directo */}
      <div ref={searchContainerRef} className="relative">
        <Label className="text-xs font-semibold text-teal-900 flex items-center gap-1.5 mb-1.5">
          <Sparkles className="h-3.5 w-3.5 text-teal-600" />
          Búsqueda Rápida de Profesión o Especialidad
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            disabled={disabled}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Escribe para buscar rápido (ej: Cardiología, Psicología infantil, Ortodoncia, Nutrición...)"
            className="pl-9 pr-8 h-9 text-xs bg-white border-teal-200 focus-visible:ring-teal-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Resultados instantáneos */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
            {quickSearchResults.length > 0 ? (
              quickSearchResults.map((item, idx) => {
                const isCurrent =
                  item.profession === selectedProfession && item.specialty === selectedSpecialty;
                return (
                  <button
                    key={`${item.profession}-${item.specialty}-${idx}`}
                    type="button"
                    onClick={() => handleQuickSelect(item)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 hover:bg-teal-50/70 transition-colors flex items-center justify-between gap-2",
                      isCurrent && "bg-teal-50"
                    )}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span className="text-teal-700 font-semibold">{item.profession}</span>
                        <span className="text-slate-400">→</span>
                        <span>{item.specialty}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.hasMedicalRecord && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                            Historia Médica
                          </span>
                        )}
                        {item.hasPrescription && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                            Récipe Médico
                          </span>
                        )}
                      </div>
                    </div>
                    {isCurrent && <Check className="h-4 w-4 text-teal-600 shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-xs text-slate-500 text-center">
                No se encontraron coincidencias para "{searchQuery}". Usa los selectores por nivel abajo.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selección por 2 Niveles con Escritura Directa: 1° Profesión -> 2° Especialidad */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-700">
            1. Profesión / Categoría (puedes escribir) *
          </Label>
          <SearchableSelect
            options={professionOptions}
            value={selectedProfession}
            onValueChange={handleProfessionChange}
            disabled={disabled}
            placeholder="Selecciona o escribe la profesión..."
            searchPlaceholder="Escribe iniciales (ej: Med, Psic, Odo)..."
            emptyMessage="No se encontró esa profesión."
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium text-slate-700">
            2. Especialidad de {selectedProfession} (puedes escribir) *
          </Label>
          <SearchableSelect
            options={currentSpecialtyOptions}
            fallbackOptionsOnSearch={allOtherSpecialtyOptions}
            value={selectedSpecialty}
            onValueChange={handleSpecialtyChange}
            disabled={disabled || currentSpecialties.length === 0}
            placeholder="Selecciona o escribe la especialidad..."
            searchPlaceholder={`Escribe iniciales en ${selectedProfession}...`}
            emptyMessage="No se encontró esa especialidad."
          />
        </div>
      </div>

      {/* Resumen de Selección y Módulos Habilitados */}
      {showCapabilitiesBadge && selectedSpecialty && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-teal-100/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Stethoscope className="h-3.5 w-3.5 text-teal-600 shrink-0" />
            <span className="font-semibold text-teal-900">{selectedProfession}:</span>
            <span className="font-bold text-slate-900">{selectedSpecialty}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(currentSpecialtyObj?.hasMedicalRecord ?? currentProfessionObj?.defaultHasMedicalRecord) ? (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] gap-1 py-0">
                <FileText className="h-3 w-3" /> Con Historia Clínica
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0">
                Sin Historia Clínica
              </Badge>
            )}

            {(currentSpecialtyObj?.hasPrescription ?? currentProfessionObj?.defaultHasPrescription) ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1 py-0">
                <Pill className="h-3 w-3" /> Emite Récipe Médico
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] py-0">
                Sin Récipe Farmacológico
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

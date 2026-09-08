"use client";

import * as React from "react";
import { MapPin, Search, X, Check, Globe, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatesByCountry } from "@/lib/geo-data";
import { cn } from "@/lib/utils";

interface LocationFilterPopoverProps {
  selectedState?: string;
  selectedCity?: string;
  onLocationChange: (state: string, city: string) => void;
  className?: string;
  variant?: "desktop" | "sheet";
}

export function LocationFilterPopover({
  selectedState = "all",
  selectedCity = "all",
  onLocationChange,
  className,
  variant = "desktop",
}: LocationFilterPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [activeStateTab, setActiveStateTab] = React.useState<string>(
    selectedState !== "all" ? selectedState : "all"
  );

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Cargar todos los estados y ciudades de Venezuela
  const states = React.useMemo(() => getStatesByCountry("VE"), []);

  // Lista aplanada de todas las ciudades con su respectivo estado para búsqueda global
  const allCitiesWithState = React.useMemo(() => {
    const list: { cityName: string; stateName: string }[] = [];
    states.forEach((s) => {
      s.cities.forEach((c) => {
        list.push({ cityName: c.name, stateName: s.name });
      });
    });
    return list;
  }, [states]);

  // Actualizar activeStateTab cuando selectedState cambia
  React.useEffect(() => {
    if (selectedState && selectedState !== "all") {
      setActiveStateTab(selectedState);
    }
  }, [selectedState]);

  // Filtrado reactivo en tiempo real con las letras que escribe el usuario
  const trimmedSearch = searchTerm.trim().toLowerCase();

  // Estados filtrados por la búsqueda
  const filteredStates = React.useMemo(() => {
    if (!trimmedSearch) return states;
    return states.filter((s) => s.name.toLowerCase().includes(trimmedSearch));
  }, [states, trimmedSearch]);

  // Ciudades filtradas por la búsqueda
  const filteredCities = React.useMemo(() => {
    if (!trimmedSearch) {
      if (activeStateTab === "all") {
        return [];
      }
      const st = states.find((s) => s.name === activeStateTab);
      return st ? st.cities.map((c) => ({ cityName: c.name, stateName: st.name })) : [];
    }

    // Si hay texto de búsqueda, filtrar todas las ciudades que coincidan por nombre o por estado
    return allCitiesWithState.filter(
      (item) =>
        item.cityName.toLowerCase().includes(trimmedSearch) ||
        item.stateName.toLowerCase().includes(trimmedSearch)
    );
  }, [allCitiesWithState, states, trimmedSearch, activeStateTab]);

  // Helper para resaltar coincidencias
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text;
    return (
      <>
        {text.slice(0, index)}
        <span className="bg-amber-200 text-amber-900 font-bold px-0.5 rounded">
          {text.slice(index, index + query.length)}
        </span>
        {text.slice(index + query.length)}
      </>
    );
  };

  // Texto del botón Trigger
  const getButtonLabel = () => {
    if (selectedCity && selectedCity !== "all") {
      if (selectedState && selectedState !== "all") {
        return `${selectedCity}, ${selectedState}`;
      }
      return selectedCity;
    }
    if (selectedState && selectedState !== "all") {
      return `Todo ${selectedState}`;
    }
    return "Toda Venezuela";
  };

  const handleSelectAllCountry = () => {
    onLocationChange("all", "all");
    setSearchTerm("");
    setOpen(false);
  };

  const handleSelectStateOnly = (stateName: string) => {
    onLocationChange(stateName, "all");
    setActiveStateTab(stateName);
    setSearchTerm("");
    setOpen(false);
  };

  const handleSelectCity = (stateName: string, cityName: string) => {
    onLocationChange(stateName, cityName);
    setActiveStateTab(stateName);
    setSearchTerm("");
    setOpen(false);
  };

  const hasActiveFilter = selectedState !== "all" || selectedCity !== "all";

  // CONTENIDO COMÚN (Buscador + Resultados)
  const renderFilterBody = (isInsideSheet: boolean) => (
    <div className={cn("space-y-3", isInsideSheet && "bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200")}>
      {/* Buscador de letras en vivo */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-rose-500" />
            Buscar por letra o ciudad:
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleSelectAllCountry}
              className="text-[11px] text-rose-600 hover:underline font-bold"
            >
              Restablecer ubicación
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribe: M, Ma, Maturín, Miranda..."
            className="pl-9 pr-8 h-10 text-xs md:text-sm bg-white border-slate-200 rounded-xl focus-visible:ring-rose-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Contenido Scrolleable */}
      <ScrollArea className={cn("rounded-xl bg-white border border-slate-100 p-2", isInsideSheet ? "h-[280px]" : "h-[300px]")}>
        {/* Opción Global: Toda Venezuela */}
        {!trimmedSearch && (
          <button
            type="button"
            onClick={handleSelectAllCountry}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs md:text-sm font-medium transition-colors mb-1.5",
              selectedState === "all" && selectedCity === "all"
                ? "bg-rose-50 text-rose-700 font-semibold border border-rose-200"
                : "hover:bg-slate-50 text-slate-700 border border-transparent"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold">Toda Venezuela 🇻🇪</div>
                <div className="text-[11px] text-slate-400 font-normal">Mostrar médicos de todo el país</div>
              </div>
            </div>
            {selectedState === "all" && selectedCity === "all" && (
              <Check className="w-4 h-4 text-rose-600 shrink-0" />
            )}
          </button>
        )}

        {/* VISTA 1: CUANDO EL USUARIO ESCRIBE UNA O MÁS LETRAS (Búsqueda en Vivo) */}
        {trimmedSearch ? (
          <div className="space-y-3 p-1">
            {/* Coincidencias de Estados */}
            {filteredStates.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                  Estados que coinciden ({filteredStates.length})
                </div>
                <div className="space-y-1">
                  {filteredStates.map((st) => (
                    <button
                      key={st.name}
                      type="button"
                      onClick={() => handleSelectStateOnly(st.name)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors",
                        selectedState === st.name && selectedCity === "all"
                          ? "bg-rose-50 text-rose-700 font-bold"
                          : "hover:bg-slate-100 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Estado {highlightMatch(st.name, trimmedSearch)}</span>
                        <span className="text-[10px] text-slate-400">({st.cities.length} ciudades)</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 py-0 font-normal">
                        Todo el estado
                      </Badge>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coincidencias de Ciudades */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">
                Ciudades que coinciden ({filteredCities.length})
              </div>
              {filteredCities.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No se encontraron ciudades con &quot;{trimmedSearch}&quot;
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredCities.slice(0, 50).map((item) => {
                    const isSelected = selectedCity === item.cityName;
                    return (
                      <button
                        key={`${item.stateName}-${item.cityName}`}
                        type="button"
                        onClick={() => handleSelectCity(item.stateName, item.cityName)}
                        className={cn(
                          "w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors",
                          isSelected
                            ? "bg-rose-50 text-rose-700 font-bold border border-rose-200"
                            : "hover:bg-slate-50 text-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>{highlightMatch(item.cityName, trimmedSearch)}</span>
                          <span className="text-[10px] text-slate-400">({item.stateName})</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VISTA 2: NAVEGACIÓN POR ESTADO */
          <div className="space-y-2 p-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Elige un Estado
            </div>

            {/* Chips de Estado */}
            <div className="flex flex-wrap gap-1 px-1 mb-2">
              {states.map((st) => (
                <button
                  key={st.name}
                  type="button"
                  onClick={() => setActiveStateTab(st.name)}
                  className={cn(
                    "text-[11px] px-2.5 py-1 rounded-lg transition-all font-medium",
                    activeStateTab === st.name
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {st.name}
                </button>
              ))}
            </div>

            {/* Detalle del Estado Activo */}
            {activeStateTab !== "all" && (
              <div className="mt-3 pt-2 border-t space-y-1">
                {/* Botón para ver TODO el Estado */}
                <button
                  type="button"
                  onClick={() => handleSelectStateOnly(activeStateTab)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold transition-colors",
                    selectedState === activeStateTab && selectedCity === "all"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : "bg-rose-50/70 hover:bg-rose-100/70 text-rose-700"
                  )}
                >
                  <span>🌟 Ver todos los médicos de {activeStateTab}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Lista de Ciudades del Estado Activo */}
                <div className="pt-1.5 space-y-0.5">
                  {states
                    .find((s) => s.name === activeStateTab)
                    ?.cities.map((cityObj) => {
                      const isSelected = selectedCity === cityObj.name;
                      return (
                        <button
                          key={cityObj.name}
                          type="button"
                          onClick={() => handleSelectCity(activeStateTab, cityObj.name)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs transition-colors",
                            isSelected
                              ? "bg-rose-50 text-rose-700 font-bold"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {cityObj.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Si está dentro del Sheet lateral, renderizar directamente INLINE (sin popover anidado)
  if (variant === "sheet") {
    return (
      <div className={cn("w-full space-y-2", className)}>
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-semibold text-slate-500">Ubicación Seleccionada:</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              hasActiveFilter ? "bg-rose-50 text-rose-700 border-rose-200" : "text-slate-500"
            )}
          >
            {getButtonLabel()}
          </Badge>
        </div>
        {renderFilterBody(true)}
      </div>
    );
  }

  // Si es en la barra principal Desktop, renderizar con Popover flotante
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "h-11 px-3.5 border-0 bg-slate-50/90 hover:bg-slate-100 focus:ring-0 rounded-xl font-medium text-slate-700 text-xs md:text-sm flex items-center gap-2 transition-all",
            hasActiveFilter && "bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200/60 shadow-xs",
            className
          )}
        >
          <MapPin className={cn("h-4 w-4 shrink-0", hasActiveFilter ? "text-rose-500" : "text-slate-500")} />
          <span className="truncate max-w-[140px] md:max-w-[170px]">{getButtonLabel()}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[340px] sm:w-[390px] p-3 shadow-2xl rounded-2xl border-slate-200 bg-white z-50"
      >
        {renderFilterBody(false)}
      </PopoverContent>
    </Popover>
  );
}

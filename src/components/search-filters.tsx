"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, MapPin, Filter, Star, DollarSign, X,
    Stethoscope, SlidersHorizontal, ShieldCheck, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSettings } from "@/lib/settings";
import { DEFAULT_PROFESSIONS_CATALOG, findProfessionBySpecialty } from "@/lib/professions-catalog";
import { getCitiesByState, normalizeCountryCode } from "@/lib/geo-data";
import { LocationFilterPopover } from "@/components/location-filter-popover";

interface SearchFiltersProps {
    specialties: string[];
    cities: string[];
    maxPrice?: number;
}

export function SearchFilters({ specialties, cities, maxPrice = 100000 }: SearchFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { professionsCatalog } = useSettings();
    const catalog = React.useMemo(
        () => (professionsCatalog && professionsCatalog.length > 0 ? professionsCatalog : DEFAULT_PROFESSIONS_CATALOG),
        [professionsCatalog]
    );

    // Estados locales
    const [query, setQuery] = React.useState(searchParams.get("q") || "");
    const [profession, setProfession] = React.useState(searchParams.get("profession") || "all");
    const [specialty, setSpecialty] = React.useState(searchParams.get("specialty") || "all");
    const [country, setCountry] = React.useState(
        normalizeCountryCode(searchParams.get("country") || user?.country || "VE")
    );
    const [state, setState] = React.useState(searchParams.get("state") || "all");
    const [city, setCity] = React.useState(searchParams.get("city") || "all");
    const [minRating, setMinRating] = React.useState(Number(searchParams.get("minRating")) || 0);
    const [priceRange, setPriceRange] = React.useState([
        Number(searchParams.get("minPrice")) || 0,
        Number(searchParams.get("maxPrice")) || maxPrice
    ]);
    const [verifiedOnly, setVerifiedOnly] = React.useState(searchParams.get("verified") === "true");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSearching, setIsSearching] = React.useState(false);

    // Ciudades del país activo combinadas con ciudades registradas
    const availableCities = React.useMemo(() => {
        const countryCities = getCitiesByState(country).map(c => c.name);
        const combined = new Set([
            ...countryCities,
            ...(cities || [])
        ]);
        return Array.from(combined).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
    }, [cities, country]);

    // Ref para el timeout del debounce
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    // Flag para controlar que el auto-select de la ciudad/país del usuario ocurra al cargar la página
    const hasAppliedUserCityRef = React.useRef(false);

    // Opciones buscables para 1° Nivel: Profesión
    const professionFilterOptions: SearchableSelectOption[] = React.useMemo(
        () => [
            { value: "all", label: "Todas las profesiones" },
            ...catalog.map((p) => ({
                value: p.name,
                label: p.name,
                badge: `${p.specialties.length}`,
            })),
        ],
        [catalog]
    );

    // Opciones buscables para 2° Nivel: Especialidad (filtradas por 1° Nivel por defecto)
    const specialtyFilterOptions: SearchableSelectOption[] = React.useMemo(() => {
        const defaultOpt: SearchableSelectOption = {
            value: "all",
            label: profession === "all" ? "Todas las especialidades" : `Todo en ${profession}`,
        };

        if (profession !== "all") {
            const foundProf = catalog.find((p) => p.name.toLowerCase() === profession.toLowerCase());
            if (foundProf) {
                return [
                    defaultOpt,
                    ...foundProf.specialties.map((s) => ({
                        value: s.name,
                        label: s.name,
                        sublabel: foundProf.name,
                        meta: { profession: foundProf.name },
                    })),
                ];
            }
        }

        // Si está en "Todas las profesiones", agrupar primero las de Médico y luego el resto con su categoría
        const list: SearchableSelectOption[] = [defaultOpt];
        const seen = new Set<string>();
        for (const prof of catalog) {
            for (const s of prof.specialties) {
                if (!seen.has(s.name)) {
                    seen.add(s.name);
                    list.push({
                        value: s.name,
                        label: s.name,
                        sublabel: prof.name,
                        meta: { profession: prof.name },
                    });
                }
            }
        }
        return list;
    }, [profession, catalog]);

    // Opciones de respaldo de otras profesiones si el usuario filtró por una profesión y escribe otra especialidad
    const fallbackSpecialtyFilterOptions: SearchableSelectOption[] = React.useMemo(() => {
        if (profession === "all") return [];
        const list: SearchableSelectOption[] = [];
        for (const prof of catalog) {
            if (prof.name.toLowerCase() === profession.toLowerCase()) continue;
            for (const s of prof.specialties) {
                list.push({
                    value: s.name,
                    label: s.name,
                    sublabel: `Categoría: ${prof.name}`,
                    meta: { profession: prof.name },
                });
            }
        }
        return list;
    }, [profession, catalog]);

    // Sincronizar estados locales cuando los searchParams de la URL cambian
    React.useEffect(() => {
        const urlQuery = searchParams.get("q") || "";
        const urlProfession = searchParams.get("profession") || "all";
        const urlSpecialty = searchParams.get("specialty") || "all";
        const urlCountry = searchParams.get("country");
        const urlState = searchParams.get("state") || "all";
        const urlCity = searchParams.get("city") || "all";
        setQuery(urlQuery);
        setProfession(urlProfession);
        setSpecialty(urlSpecialty);
        if (urlCountry) {
            setCountry(normalizeCountryCode(urlCountry));
        } else if (user?.country) {
            setCountry(normalizeCountryCode(user.country));
        }
        setState(urlState);
        setCity(urlCity);
        setMinRating(Number(searchParams.get("minRating")) || 0);
        setPriceRange([
            Number(searchParams.get("minPrice")) || 0,
            Number(searchParams.get("maxPrice")) || maxPrice
        ]);
        setVerifiedOnly(searchParams.get("verified") === "true");
    }, [searchParams, maxPrice, user?.country]);

    // Función para construir URL con parámetros actuales o con overrides
    const buildSearchUrl = React.useCallback((overrides?: {
        q?: string;
        profession?: string;
        specialty?: string;
        country?: string;
        state?: string;
        city?: string;
        minRating?: number;
        minPrice?: number;
        maxPrice?: number;
        verified?: boolean;
    }) => {
        const params = new URLSearchParams();
        
        const countryVal = normalizeCountryCode(
            overrides?.country !== undefined ? overrides.country : (user?.role === 'patient' && user.country ? user.country : country)
        );
        params.set("country", countryVal);

        const qVal = overrides?.q !== undefined ? overrides.q : query;
        if (qVal) params.set("q", qVal);

        const profVal = overrides?.profession !== undefined ? overrides.profession : profession;
        if (profVal && profVal !== "all") params.set("profession", profVal);

        const specVal = overrides?.specialty !== undefined ? overrides.specialty : specialty;
        if (specVal && specVal !== "all") params.set("specialty", specVal);

        const stateVal = overrides?.state !== undefined ? overrides.state : state;
        if (stateVal && stateVal !== "all") params.set("state", stateVal);

        const cityVal = overrides?.city !== undefined ? overrides.city : city;
        if (cityVal && cityVal !== "all") params.set("city", cityVal);

        const ratingVal = overrides?.minRating !== undefined ? overrides.minRating : minRating;
        if (ratingVal > 0) params.set("minRating", ratingVal.toString());

        const minP = overrides?.minPrice !== undefined ? overrides.minPrice : priceRange[0];
        if (minP > 0) params.set("minPrice", minP.toString());

        const maxP = overrides?.maxPrice !== undefined ? overrides.maxPrice : priceRange[1];
        if (maxP < maxPrice) params.set("maxPrice", maxP.toString());

        const verVal = overrides?.verified !== undefined ? overrides.verified : verifiedOnly;
        if (verVal) params.set("verified", "true");

        return `/find-a-doctor?${params.toString()}`;
    }, [query, profession, specialty, country, state, city, minRating, priceRange, maxPrice, verifiedOnly, user]);

    // Auto-select country & city for logged-in user (especialmente pacientes)
    React.useEffect(() => {
        if (!user) return;
        const userCountry = normalizeCountryCode(user.country || "VE");

        // Siempre garantizar que si el usuario tiene país diferente al de la URL (o no hay country en URL), se filtre por su país
        const currentUrlCountry = searchParams.get("country");
        if (user.role === 'patient' && (!currentUrlCountry || normalizeCountryCode(currentUrlCountry) !== userCountry)) {
            setCountry(userCountry);
            const params = new URLSearchParams(searchParams.toString());
            params.set("country", userCountry);
            if (!hasAppliedUserCityRef.current && !searchParams.has("city") && !searchParams.has("state")) {
                if (user.city) {
                    setCity(user.city);
                    params.set("city", user.city);
                }
                if (user.state) {
                    setState(user.state);
                    params.set("state", user.state);
                }
            }
            hasAppliedUserCityRef.current = true;
            router.replace(`?${params.toString()}`, { scroll: false });
            return;
        }

        if (hasAppliedUserCityRef.current) return;
        
        if (searchParams.has("city") || searchParams.has("state") || searchParams.has("specialty") || searchParams.has("q")) {
            hasAppliedUserCityRef.current = true;
            return;
        }

        if (user.role === 'patient' && (user.city || user.country)) {
            hasAppliedUserCityRef.current = true;
            setCountry(userCountry);
            if (user.city) setCity(user.city);
            if (user.state) setState(user.state);

            const params = new URLSearchParams();
            params.set("country", userCountry);
            if (user.city) params.set("city", user.city);
            if (user.state) params.set("state", user.state);
            router.replace(`?${params.toString()}`, { scroll: false });
        } else {
            hasAppliedUserCityRef.current = true;
        }
    }, [user, searchParams, router]);

    // Búsqueda en tiempo real con debounce
    const handleQueryChange = (value: string) => {
        setQuery(value);
        setIsSearching(true);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            router.push(buildSearchUrl({ q: value }), { scroll: false });
            setIsSearching(false);
        }, 300);
    };

    // Cambiar profesión (Nivel 1)
    const handleProfessionChange = (newProfession: string) => {
        setProfession(newProfession);
        setSpecialty("all");
        router.push(buildSearchUrl({ profession: newProfession, specialty: "all" }), { scroll: false });
    };

    // Cambiar especialidad (Nivel 2)
    const handleSpecialtyChange = (newSpecialty: string, option?: SearchableSelectOption) => {
        setSpecialty(newSpecialty);
        if (newSpecialty !== "all") {
            const targetProf = (option?.meta?.profession as string) || findProfessionBySpecialty(newSpecialty, catalog)?.name;
            if (targetProf && targetProf !== profession) {
                setProfession(targetProf);
                router.push(buildSearchUrl({ profession: targetProf, specialty: newSpecialty }), { scroll: false });
                return;
            }
        }
        router.push(buildSearchUrl({ specialty: newSpecialty }), { scroll: false });
    };

    // Cambiar ubicación (País / Estado / Ciudad)
    const handleLocationChange = (newState: string, newCity: string, newCountry?: string) => {
        const targetCountry = normalizeCountryCode(newCountry || country);
        setCountry(targetCountry);
        setState(newState);
        setCity(newCity);
        router.push(buildSearchUrl({ country: targetCountry, state: newState, city: newCity }), { scroll: false });
    };

    // Limpiar timeout al desmontar
    React.useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Búsqueda manual (botón o Enter)
    const handleSearch = () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        router.push(buildSearchUrl());
        setIsOpen(false);
        setIsSearching(false);
    };

    // Limpiar todos los filtros (preservando el país activo)
    const handleClearFilters = () => {
        const targetCountry = normalizeCountryCode(user?.country || country || "VE");
        setQuery("");
        setProfession("all");
        setSpecialty("all");
        setCountry(targetCountry);
        setState("all");
        setCity("all");
        setMinRating(0);
        setPriceRange([0, maxPrice]);
        setVerifiedOnly(false);
        hasAppliedUserCityRef.current = true;
        router.push(`/find-a-doctor?country=${targetCountry}`, { scroll: false });
        setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
        }
    };

    // Filtros activos
    const activeFiltersCount = [
        profession !== "all",
        specialty !== "all",
        state !== "all" || city !== "all",
        minRating > 0,
        priceRange[0] > 0 || priceRange[1] < maxPrice,
        verifiedOnly
    ].filter(Boolean).length;

    // Estrellas para rating
    const RatingStars = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange(value === star ? 0 : star)}
                    className={cn(
                        "p-1.5 rounded-lg transition-all duration-200 hover:scale-110",
                        star <= value
                            ? "bg-amber-100 text-amber-500"
                            : "bg-slate-100 text-slate-300 hover:bg-slate-200"
                    )}
                >
                    <Star className={cn("h-5 w-5", star <= value && "fill-amber-400")} />
                </button>
            ))}
        </div>
    );

    return (
        <div className="w-full space-y-4">
            {/* BARRA DE BÚSQUEDA PRINCIPAL */}
            <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />

                <div className="relative flex flex-col md:flex-row gap-2 md:gap-0 md:items-center bg-white/80 backdrop-blur-xl p-2 md:p-1.5 rounded-2xl shadow-xl border border-white/50 transition-all duration-300 hover:shadow-2xl hover:border-primary/20">

                    {/* Input de Búsqueda */}
                    <div className="relative flex-1 group">
                        <div className={cn(
                            "absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all duration-200",
                            isSearching
                                ? "bg-primary text-white animate-pulse"
                                : "bg-primary/10 text-primary group-focus-within:bg-primary group-focus-within:text-white"
                        )}>
                            <Search className="h-4 w-4" />
                        </div>
                        <Input
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Buscar médico, clínica o especialidad..."
                            className="pl-12 h-12 md:h-14 border-0 bg-transparent text-base md:text-lg focus-visible:ring-0 shadow-none placeholder:text-slate-400 font-medium"
                        />
                        {/* Indicador de búsqueda en tiempo real */}
                        {isSearching && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                        {/* Botón para limpiar texto */}
                        {query && !isSearching && (
                            <button
                                type="button"
                                onClick={() => handleQueryChange("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {/* Divider Desktop */}
                    <div className="hidden md:block w-px h-10 bg-gradient-to-b from-transparent via-slate-200 to-transparent mx-2" />

                    {/* Filtros Desktop */}
                    <div className="hidden md:flex items-center gap-2">
                        {/* Nivel 1: Profesión (con filtro por escritura) */}
                        <div className="w-[175px]">
                            <SearchableSelect
                                options={professionFilterOptions}
                                value={profession}
                                onValueChange={handleProfessionChange}
                                placeholder="Profesión"
                                searchPlaceholder="Escribe profesión..."
                                triggerClassName="h-11 border-0 bg-slate-50/80 hover:bg-slate-100 rounded-xl font-medium text-slate-700"
                            />
                        </div>

                        {/* Nivel 2: Especialidad (con filtro por escritura) */}
                        <div className="w-[195px]">
                            <SearchableSelect
                                options={specialtyFilterOptions}
                                fallbackOptionsOnSearch={fallbackSpecialtyFilterOptions}
                                value={specialty}
                                onValueChange={handleSpecialtyChange}
                                placeholder="Especialidad"
                                searchPlaceholder="Escribe especialidad..."
                                triggerClassName="h-11 border-0 bg-slate-50/80 hover:bg-slate-100 rounded-xl font-medium text-slate-700"
                            />
                        </div>

                        {/* Ubicación: País, Estado y Ciudad con Búsqueda en Vivo */}
                        <LocationFilterPopover
                            selectedCountry={country}
                            selectedState={state}
                            selectedCity={city}
                            onLocationChange={handleLocationChange}
                            lockCountry={user?.role === 'patient'}
                            variant="desktop"
                        />

                        {/* Botón Filtros Avanzados Desktop */}
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-11 w-11 rounded-xl transition-all duration-200",
                                        activeFiltersCount > 0
                                            ? "bg-primary/10 text-primary hover:bg-primary/20"
                                            : "hover:bg-slate-100 text-slate-500"
                                    )}
                                >
                                    <SlidersHorizontal className="h-5 w-5" />
                                    {activeFiltersCount > 0 && (
                                        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                            {activeFiltersCount}
                                        </span>
                                    )}
                                </Button>
                            </SheetTrigger>

                            {/* Sheet Content (compartido desktop/mobile) */}
                            <SheetContent side="right" className="w-full sm:w-[420px] overflow-y-auto p-0">
                                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b p-5 sm:p-6">
                                    <div className="flex items-start justify-between">
                                        <SheetHeader className="text-left flex-1 pr-3">
                                            <SheetTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <SlidersHorizontal className="h-5 w-5" />
                                                </div>
                                                Filtros Avanzados
                                            </SheetTitle>
                                            <SheetDescription className="text-xs sm:text-sm text-slate-500 mt-1">
                                                Personaliza tu búsqueda para encontrar exactamente lo que necesitas
                                            </SheetDescription>
                                        </SheetHeader>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsOpen(false)}
                                            className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors shrink-0 -mr-2 -mt-1"
                                            title="Cerrar filtros"
                                        >
                                            <X className="h-5 w-5" />
                                            <span className="sr-only">Cerrar</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    {/* Nivel 1: Profesión */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4" /> 1° Nivel: Profesión / Categoría
                                        </Label>
                                        <SearchableSelect
                                            options={professionFilterOptions}
                                            value={profession}
                                            onValueChange={handleProfessionChange}
                                            placeholder="Selecciona o escribe profesión..."
                                            searchPlaceholder="Escribe las iniciales de la profesión..."
                                            triggerClassName="w-full h-12 rounded-xl bg-slate-50 border-slate-200 font-medium"
                                        />
                                    </div>

                                    {/* Nivel 2: Especialidad */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Sparkles className="h-4 w-4" /> 2° Nivel: Especialidad
                                        </Label>
                                        <SearchableSelect
                                            options={specialtyFilterOptions}
                                            fallbackOptionsOnSearch={fallbackSpecialtyFilterOptions}
                                            value={specialty}
                                            onValueChange={handleSpecialtyChange}
                                            placeholder="Selecciona o escribe especialidad..."
                                            searchPlaceholder="Escribe las iniciales de la especialidad..."
                                            triggerClassName="w-full h-12 rounded-xl bg-slate-50 border-slate-200 font-medium"
                                        />
                                    </div>

                                    {/* Ubicación: País, Estado y Ciudad con Búsqueda en Vivo */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin className="h-4 w-4" /> Ubicación (País / Estado / Ciudad)
                                        </Label>
                                        <LocationFilterPopover
                                            selectedCountry={country}
                                            selectedState={state}
                                            selectedCity={city}
                                            onLocationChange={handleLocationChange}
                                            lockCountry={user?.role === 'patient'}
                                            variant="sheet"
                                        />
                                    </div>

                                    <Separator className="bg-slate-100" />

                                    {/* Rango de Precio */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <DollarSign className="h-4 w-4" /> Precio Consulta
                                            </Label>
                                            <div className="px-3 py-1.5 bg-primary/10 rounded-lg">
                                                <span className="text-sm font-bold text-primary">
                                                    ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="pt-2 pb-4">
                                            <Slider
                                                value={priceRange}
                                                min={0}
                                                max={maxPrice}
                                                step={1000}
                                                minStepsBetweenThumbs={1}
                                                onValueChange={setPriceRange}
                                                className="py-4"
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>$0</span>
                                            <span>${maxPrice.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <Separator className="bg-slate-100" />

                                    {/* Rating */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                                <Star className="h-4 w-4" /> Calificación Mínima
                                            </Label>
                                            {minRating > 0 && (
                                                <Badge variant="secondary" className="bg-amber-50 text-amber-600 border-amber-200">
                                                    {minRating}+ estrellas
                                                </Badge>
                                            )}
                                        </div>
                                        <RatingStars value={minRating} onChange={setMinRating} />
                                        <p className="text-xs text-slate-400">
                                            {minRating > 0
                                                ? `Mostrar médicos con ${minRating} o más estrellas`
                                                : "Mostrar todos los médicos"
                                            }
                                        </p>
                                    </div>

                                    <Separator className="bg-slate-100" />

                                    {/* Solo Verificados */}
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-emerald-100">
                                                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <Label htmlFor="verified-switch" className="text-base font-semibold text-slate-800 cursor-pointer">
                                                    Solo Verificados
                                                </Label>
                                                <p className="text-xs text-slate-500">Profesionales con credenciales validadas</p>
                                            </div>
                                        </div>
                                        <Switch
                                            id="verified-switch"
                                            checked={verifiedOnly}
                                            onCheckedChange={setVerifiedOnly}
                                            className="data-[state=checked]:bg-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Footer Sticky */}
                                <SheetFooter className="sticky bottom-0 bg-white/95 backdrop-blur-lg border-t p-6 flex-col gap-3">
                                    <Button
                                        onClick={handleSearch}
                                        className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 font-bold"
                                    >
                                        <Sparkles className="h-5 w-5 mr-2" />
                                        Aplicar Filtros
                                        {activeFiltersCount > 0 && (
                                            <Badge className="ml-2 bg-white/20 text-white border-0">{activeFiltersCount}</Badge>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={handleClearFilters}
                                        className="w-full h-12 rounded-xl text-slate-500 hover:text-slate-700"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Limpiar Filtros
                                    </Button>
                                </SheetFooter>
                            </SheetContent>
                        </Sheet>

                        {/* Botón Buscar Desktop */}
                        <Button
                            onClick={handleSearch}
                            className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02]"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                    </div>

                    {/* MOBILE: Botones */}
                    <div className="flex md:hidden gap-2">
                        <Button
                            type="button"
                            onClick={() => setIsOpen(true)}
                            variant="outline"
                            className={cn(
                                "flex-1 h-12 border-slate-200 rounded-xl font-medium transition-all",
                                activeFiltersCount > 0
                                    ? "bg-primary/5 border-primary/20 text-primary"
                                    : "bg-slate-50 text-slate-700"
                            )}
                        >
                            <SlidersHorizontal className="h-4 w-4 mr-2" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <Badge className="ml-2 h-5 min-w-[20px] p-0 flex items-center justify-center rounded-full bg-primary text-white text-[10px]">
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>

                        <Button
                            onClick={handleSearch}
                            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white font-bold shadow-lg shadow-primary/25"
                        >
                            <Search className="h-4 w-4 mr-2" />
                            Buscar
                        </Button>
                    </div>
                </div>
            </div>

            {/* CHIPS DE FILTROS ACTIVOS */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="text-xs font-medium text-slate-400 mr-1">Filtros:</span>

                    {profession !== "all" && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => handleProfessionChange("all")}
                        >
                            <Stethoscope className="h-3 w-3 text-teal-600" />
                            {profession}
                            <X className="h-3 w-3 text-teal-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {specialty !== "all" && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => handleSpecialtyChange("all")}
                        >
                            <Stethoscope className="h-3 w-3 text-primary" />
                            {specialty}
                            <X className="h-3 w-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {(state !== "all" || city !== "all") && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => handleLocationChange("all", "all")}
                        >
                            <MapPin className="h-3 w-3 text-rose-500" />
                            {city !== "all" ? (state !== "all" ? `${city}, ${state}` : city) : `Todo ${state}`}
                            <X className="h-3 w-3 text-rose-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {minRating > 0 && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setMinRating(0); router.push(buildSearchUrl({ minRating: 0 }), { scroll: false }); }}
                        >
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {minRating}+ estrellas
                            <X className="h-3 w-3 text-amber-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-green-50 border border-green-200 text-green-700 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setPriceRange([0, maxPrice]); router.push(buildSearchUrl({ minPrice: 0, maxPrice }), { scroll: false }); }}
                        >
                            <DollarSign className="h-3 w-3 text-green-500" />
                            ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                            <X className="h-3 w-3 text-green-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {verifiedOnly && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setVerifiedOnly(false); router.push(buildSearchUrl({ verified: false }), { scroll: false }); }}
                        >
                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                            Verificados
                            <X className="h-3 w-3 text-emerald-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-xs text-slate-500 hover:text-red-500 rounded-full"
                        onClick={handleClearFilters}
                    >
                        Limpiar todo
                    </Button>
                </div>
            )}
        </div>
    );
}

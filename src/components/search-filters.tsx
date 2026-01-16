"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Search, MapPin, Filter, Star, DollarSign, X,
    Stethoscope, SlidersHorizontal, ShieldCheck, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface SearchFiltersProps {
    specialties: string[];
    cities: string[];
    maxPrice?: number;
}

export function SearchFilters({ specialties, cities, maxPrice = 100000 }: SearchFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    // Estados locales
    const [query, setQuery] = React.useState(searchParams.get("q") || "");
    const [specialty, setSpecialty] = React.useState(searchParams.get("specialty") || "all");
    const [city, setCity] = React.useState(searchParams.get("city") || "all");
    const [minRating, setMinRating] = React.useState(Number(searchParams.get("minRating")) || 0);
    const [priceRange, setPriceRange] = React.useState([
        Number(searchParams.get("minPrice")) || 0,
        Number(searchParams.get("maxPrice")) || maxPrice
    ]);
    const [verifiedOnly, setVerifiedOnly] = React.useState(searchParams.get("verified") === "true");
    const [isOpen, setIsOpen] = React.useState(false);
    const [isSearching, setIsSearching] = React.useState(false);

    // Ref para el timeout del debounce
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    // Flag para controlar si ya se aplicó la ciudad inicial del usuario
    const hasAppliedUserCityRef = React.useRef(false);

    // Función para construir URL con parámetros actuales
    const buildSearchUrl = React.useCallback((currentQuery: string) => {
        const params = new URLSearchParams();
        if (currentQuery) params.set("q", currentQuery);
        if (specialty && specialty !== "all") params.set("specialty", specialty);
        if (city && city !== "all") params.set("city", city);
        if (minRating > 0) params.set("minRating", minRating.toString());
        if (priceRange[0] > 0) params.set("minPrice", priceRange[0].toString());
        if (priceRange[1] < maxPrice) params.set("maxPrice", priceRange[1].toString());
        if (verifiedOnly) params.set("verified", "true");
        return `/find-a-doctor?${params.toString()}`;
    }, [specialty, city, minRating, priceRange, maxPrice, verifiedOnly]);

    // Auto-select city for patient - SOLO UNA VEZ al cargar la página
    React.useEffect(() => {
        // Solo aplicar si:
        // 1. No se ha aplicado antes
        // 2. No hay ciudad en la URL
        // 3. El usuario es paciente y tiene ciudad configurada
        if (
            !hasAppliedUserCityRef.current &&
            !searchParams.get("city") &&
            user?.role === 'patient' &&
            user.city
        ) {
            hasAppliedUserCityRef.current = true;
            setCity(user.city);
            const params = new URLSearchParams(searchParams.toString());
            params.set("city", user.city);
            router.replace(`?${params.toString()}`, { scroll: false });
        }
    }, [user]); // Solo se ejecuta cuando cambia user, no searchParams

    // Búsqueda en tiempo real con debounce
    const handleQueryChange = (value: string) => {
        setQuery(value);
        setIsSearching(true);

        // Cancelar el timeout anterior
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Si el valor está vacío y no hay otros filtros, limpiar inmediatamente
        if (!value && specialty === "all" && city === "all" && minRating === 0 && !verifiedOnly) {
            router.push("/find-a-doctor", { scroll: false });
            setIsSearching(false);
            return;
        }

        // Debounce de 300ms para búsqueda en tiempo real
        debounceRef.current = setTimeout(() => {
            router.push(buildSearchUrl(value), { scroll: false });
            setIsSearching(false);
        }, 300);
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
        router.push(buildSearchUrl(query));
        setIsOpen(false);
        setIsSearching(false);
    };

    // Limpiar filtros
    const handleClearFilters = () => {
        setQuery("");
        setSpecialty("all");
        setCity("all");
        setMinRating(0);
        setPriceRange([0, maxPrice]);
        setVerifiedOnly(false);
        router.push("/find-a-doctor");
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
        specialty !== "all",
        city !== "all",
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
                        {/* Especialidad */}
                        <Select value={specialty} onValueChange={setSpecialty}>
                            <SelectTrigger className="w-[160px] h-11 border-0 bg-slate-50/80 hover:bg-slate-100 focus:ring-0 rounded-xl font-medium text-slate-700">
                                <div className="flex items-center gap-2">
                                    <Stethoscope className="h-4 w-4 text-primary" />
                                    <SelectValue placeholder="Especialidad" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todas</SelectItem>
                                {specialties.map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Ciudad */}
                        <Select value={city} onValueChange={setCity}>
                            <SelectTrigger className="w-[160px] h-11 border-0 bg-slate-50/80 hover:bg-slate-100 focus:ring-0 rounded-xl font-medium text-slate-700">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-rose-500" />
                                    <SelectValue placeholder="Ciudad" />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="all">Todas</SelectItem>
                                {cities.map((c) => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

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
                                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-lg border-b p-6">
                                    <SheetHeader className="text-left">
                                        <SheetTitle className="text-2xl font-bold flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-primary/10">
                                                <SlidersHorizontal className="h-5 w-5 text-primary" />
                                            </div>
                                            Filtros Avanzados
                                        </SheetTitle>
                                        <SheetDescription>
                                            Personaliza tu búsqueda para encontrar exactamente lo que necesitas
                                        </SheetDescription>
                                    </SheetHeader>
                                </div>

                                <div className="p-6 space-y-8">
                                    {/* Especialidad */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <Stethoscope className="h-4 w-4" /> Especialidad
                                        </Label>
                                        <Select value={specialty} onValueChange={setSpecialty}>
                                            <SelectTrigger className="w-full h-14 rounded-xl bg-slate-50 border-slate-200 font-medium">
                                                <SelectValue placeholder="Seleccionar especialidad" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-[300px]">
                                                <SelectItem value="all">Todas las especialidades</SelectItem>
                                                {specialties.map((s) => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Ciudad */}
                                    <div className="space-y-3">
                                        <Label className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                            <MapPin className="h-4 w-4" /> Ubicación
                                        </Label>
                                        <Select value={city} onValueChange={setCity}>
                                            <SelectTrigger className="w-full h-14 rounded-xl bg-slate-50 border-slate-200 font-medium">
                                                <SelectValue placeholder="Seleccionar ciudad" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-[300px]">
                                                <SelectItem value="all">Todas las ciudades</SelectItem>
                                                {cities.map((c) => (
                                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button
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
                            </SheetTrigger>
                        </Sheet>

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

                    {specialty !== "all" && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setSpecialty("all"); handleSearch(); }}
                        >
                            <Stethoscope className="h-3 w-3 text-primary" />
                            {specialty}
                            <X className="h-3 w-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {city !== "all" && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setCity("all"); handleSearch(); }}
                        >
                            <MapPin className="h-3 w-3 text-rose-500" />
                            {city}
                            <X className="h-3 w-3 text-slate-400 group-hover:text-red-500 transition-colors" />
                        </Badge>
                    )}

                    {minRating > 0 && (
                        <Badge
                            variant="secondary"
                            className="pl-2.5 pr-1.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 gap-1.5 rounded-full shadow-sm cursor-pointer group transition-all"
                            onClick={() => { setMinRating(0); handleSearch(); }}
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
                            onClick={() => { setPriceRange([0, maxPrice]); handleSearch(); }}
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
                            onClick={() => { setVerifiedOnly(false); handleSearch(); }}
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

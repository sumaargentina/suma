
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { HeaderWrapper, BottomNav } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Calendar as CalendarIcon,
  Search,
  HeartPulse,
  Scan,
  BrainCircuit,
  Baby,
  Shield,
  Bone,
  ChevronDown,
  List,
  Stethoscope,
  Wind,
  Star,
  Sparkles,
  Loader2,
  MapPin,
  DollarSign,
  Filter,
  X,
  Users,
  Zap,
  ChevronRight,
  List as ListIcon,
  Grid as GridIcon,
  LayoutGrid as GridCompactIcon,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as firestoreService from '@/lib/firestoreService';
import { type Doctor } from "@/lib/types";
import { DoctorCard } from "@/components/doctor-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useSettings } from "@/lib/settings";
import { useDynamicData } from "@/hooks/use-dynamic-data";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
// Removed mock data import - using only Firestore data
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import Image from 'next/image';

const specialtyIcons: Record<string, React.ElementType> = {
  Cardiología: HeartPulse,
  Dermatología: Scan,
  Neurología: BrainCircuit,
  Pediatría: Baby,
  Oncología: Shield,
  Ortopedia: Bone,
  Ginecología: Stethoscope,
  Neumonología: Wind,
  "Medicina Estética": Sparkles,
};

const specialtyColors: Record<string, string> = {
  Cardiología: "bg-red-500/10 text-red-600",
  Dermatología: "bg-blue-500/10 text-blue-600",
  Neurología: "bg-purple-500/10 text-purple-600",
  Pediatría: "bg-pink-500/10 text-pink-600",
  Oncología: "bg-orange-500/10 text-orange-600",
  Ortopedia: "bg-green-500/10 text-green-600",
  Ginecología: "bg-indigo-500/10 text-indigo-600",
  Neumonología: "bg-cyan-500/10 text-cyan-600",
  "Medicina Estética": "bg-rose-500/10 text-rose-600",
};

export default function FindDoctorPage() {
  const { beautySpecialties } = useSettings();
  const { specialties, cities } = useDynamicData();
  const { user } = useAuth();
  const { toast } = useToast();
  const [allDoctors, setAllDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros básicos (siempre visibles)
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  
  // Filtros avanzados
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState([0]);
  const [priceRange, setPriceRange] = useState([0, 200]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [showAllSpecialties, setShowAllSpecialties] = useState(false);
  const [initialLocationSet, setInitialLocationSet] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState<'card' | 'list' | 'grid-compact'>('card');

  // Alternar entre las tres vistas
  const handleToggleMobileView = () => {
    setMobileViewMode((prev) => {
      if (prev === 'card') return 'list';
      if (prev === 'list') return 'grid-compact';
      return 'card';
    });
  };

  // Debounce para la búsqueda de texto
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
      const fetchDocs = async () => {
        setIsLoading(true);
        try {
          const docs = await firestoreService.getDoctors();
          console.log('📊 Médicos cargados de Firestore:', docs.length);
          
          const activeDocs = docs.filter(d => d.status === 'active');
          
          setAllDoctors(activeDocs);
          setFilteredDoctors(activeDocs);
        } catch (error) {
          console.error("Failed to fetch doctors from Firestore.", error);
          
          // No usar datos de prueba - mostrar lista vacía
          setAllDoctors([]);
          setFilteredDoctors([]);
          
          toast({
            variant: "destructive",
            title: "Error de red",
            description: "No se pudieron cargar los médicos desde la base de datos. Mostrando datos de prueba.",
          });
        } finally {
          setIsLoading(false);
        }
      }
      fetchDocs();
  }, [toast]);
  
  useEffect(() => {
    if (user && !initialLocationSet && user.city) {
        setLocation(user.city);
        setInitialLocationSet(true);
    }
  }, [user, initialLocationSet]);

  const handleSearch = useCallback(() => {
    let results = allDoctors;

    // Filtro por especialidad
    if (specialty && specialty !== "all") {
      results = results.filter(
        (d) => d.specialty.toLowerCase() === specialty.toLowerCase()
      );
    }

    // Filtro por ubicación
    if (location && location !== "all") {
      results = results.filter(
        (d) => d.city.toLowerCase() === location.toLowerCase()
      );
    }

    // Filtro por búsqueda de texto
    if (debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase();
      results = results.filter(
        (d) => {
          const nameMatch = d.name.toLowerCase().includes(term);
          const specialtyMatch = d.specialty.toLowerCase().includes(term);
          const cityMatch = d.city.toLowerCase().includes(term);
          const descriptionMatch = d.description.toLowerCase().includes(term);
          
          return nameMatch || specialtyMatch || cityMatch || descriptionMatch;
        }
      );
    }

    // Filtro por calificación
    if (ratingFilter[0] > 0) {
      results = results.filter((d) => d.rating >= ratingFilter[0]);
    }

    // Filtro por precio
    results = results.filter(
      (d) => d.consultationFee >= priceRange[0] && d.consultationFee <= priceRange[1]
    );

    // Filtro por disponibilidad (fecha)
    if (date) {
      const dayOfWeek = date.getDay();
      const dayKeyMapping: Record<number, keyof Doctor['schedule']> = {
        0: 'sunday',
        1: 'monday', 
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday'
      };
      
      const dayKey = dayKeyMapping[dayOfWeek] as keyof Doctor['schedule'];
      results = results.filter((d) => {
        const daySchedule = d.schedule[dayKey];
        return daySchedule.active && daySchedule.slots.length > 0;
      });
    }

    setFilteredDoctors(results);
  }, [allDoctors, specialty, location, debouncedSearchTerm, ratingFilter, priceRange, date]);

  // Ejecutar búsqueda cuando cambien los filtros
  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const topRatedDoctors = useMemo(() => {
    return [...allDoctors]
      .filter((d) => d.rating >= 4.9)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6);
  }, [allDoctors]);

  const beautyDoctors = useMemo(() => {
    if (!beautySpecialties || beautySpecialties.length === 0) {
        return [];
    }
    return allDoctors.filter((d) => beautySpecialties.includes(d.specialty));
  }, [allDoctors, beautySpecialties]);

  const visibleSpecialties = showAllSpecialties
    ? specialties
    : specialties.slice(0, 6);

  const clearFilters = () => {
    setSpecialty("all");
    setLocation("all");
    setSearchTerm("");
    setDebouncedSearchTerm("");
    setRatingFilter([0]);
    setPriceRange([0, 200]);
    setDate(undefined);
  };

  const hasActiveFilters = specialty !== "all" || location !== "all" || debouncedSearchTerm || ratingFilter[0] > 0 || priceRange[0] > 0 || priceRange[1] < 200 || date;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <HeaderWrapper />
      <main className="flex-1 pb-20 md:pb-0">
        {/* Header simplificado */}
        <div className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-b">
          <div className="container py-4 md:py-8">
            <div className="text-center mb-4 md:mb-6">
              <h1 className="text-xl md:text-4xl font-bold font-headline mb-1 md:mb-2">
                Encuentra a Tu Especialista
              </h1>
              <p className="text-muted-foreground text-xs md:text-lg max-w-2xl mx-auto">
                Conectamos pacientes con los mejores médicos especialistas.
              </p>
            </div>

            {/* Búsqueda rápida */}
            <div className="max-w-2xl mx-auto mb-4 md:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar médico, especialidad o ciudad..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-10 md:h-12 text-sm md:text-base"
                />
                {searchTerm !== debouncedSearchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Filtros principales colapsables en móvil */}
            <div className="space-y-4">
              <div className="md:hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value="filters">
                    <AccordionTrigger className="text-base font-semibold px-2 py-2">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros de búsqueda
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      {/* Filtros rápidos y avanzados (móvil) */}
                      <div className="bg-card border rounded-lg p-3 space-y-4">
                        {/* Filtros rápidos */}
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm">Filtros Rápidos</h3>
                          {hasActiveFilters && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearFilters}
                              className="text-muted-foreground hover:text-foreground text-xs"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Limpiar
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {/* Ciudad */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Ciudad
                            </label>
                            <Select value={location} onValueChange={setLocation}>
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Todas las ciudades" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todas las ciudades</SelectItem>
                                {cities.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* Fecha */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              Fecha
                            </label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9 text-xs",
                                    !date && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-3 w-3" />
                                  {date ? (
                                    format(date, "dd/MM", { locale: es })
                                  ) : (
                                    <span>Elige fecha</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={date}
                                  onSelect={setDate}
                                  initialFocus
                                  locale={es}
                                  disabled={(date) => {
                                    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                                      return true;
                                    }
                                    const dayOfWeek = date.getDay();
                                    const dayKeyMapping: Record<number, keyof Doctor['schedule']> = {
                                      0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
                                    };
                                    const dayKey = dayKeyMapping[dayOfWeek] as keyof Doctor['schedule'];
                                    const hasAvailableDoctors = allDoctors.some((d) => {
                                      const daySchedule = d.schedule[dayKey];
                                      return daySchedule.active && daySchedule.slots.length > 0;
                                    });
                                    return !hasAvailableDoctors;
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          {/* Botón de filtros avanzados */}
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Filter className="h-3 w-3" />
                              Más filtros
                            </label>
                            <Button
                              variant="outline"
                              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                              className="w-full h-9 text-xs justify-between"
                            >
                              <span>Avanzados</span>
                              <ChevronRight className={cn(
                                "h-3 w-3 transition-transform",
                                showAdvancedFilters && "rotate-90"
                              )} />
                            </Button>
                          </div>
                        </div>
                        {/* Filtros avanzados expandibles */}
                        {showAdvancedFilters && (
                          <div className="border-t pt-4 space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                              {/* Calificación */}
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <Star className="h-3 w-3" />
                                  Calificación mínima: {ratingFilter[0]} ⭐
                                </label>
                                <Slider
                                  value={ratingFilter}
                                  onValueChange={setRatingFilter}
                                  max={5}
                                  min={0}
                                  step={0.5}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>0</span>
                                  <span>5</span>
                                </div>
                              </div>
                              {/* Precio */}
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  Precio: ${priceRange[0]} - ${priceRange[1]}
                                </label>
                                <Slider
                                  value={priceRange}
                                  onValueChange={setPriceRange}
                                  max={200}
                                  min={0}
                                  step={10}
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>$0</span>
                                  <span>$200</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
              {/* Filtros escritorio (igual que antes) */}
              <div className="hidden md:block">
                {/* Filtros rápidos y avanzados (escritorio) */}
                <div className="bg-card border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Filtros Rápidos</h3>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpiar
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Ciudad */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Ciudad
                      </label>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Todas las ciudades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las ciudades</SelectItem>
                          {cities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Fecha */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        Fecha
                      </label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 text-sm",
                              !date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {date ? (
                              format(date, "dd/MM", { locale: es })
                            ) : (
                              <span>Elige fecha</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={es}
                            disabled={(date) => {
                              if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                                return true;
                              }
                              const dayOfWeek = date.getDay();
                              const dayKeyMapping: Record<number, keyof Doctor['schedule']> = {
                                0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday'
                              };
                              const dayKey = dayKeyMapping[dayOfWeek] as keyof Doctor['schedule'];
                              const hasAvailableDoctors = allDoctors.some((d) => {
                                const daySchedule = d.schedule[dayKey];
                                return daySchedule.active && daySchedule.slots.length > 0;
                              });
                              return !hasAvailableDoctors;
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {/* Botón de filtros avanzados */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Filter className="h-3 w-3" />
                        Más filtros
                      </label>
                      <Button
                        variant="outline"
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="w-full h-9 text-sm justify-between"
                      >
                        <span>Avanzados</span>
                        <ChevronRight className={cn(
                          "h-3 w-3 transition-transform",
                          showAdvancedFilters && "rotate-90"
                        )} />
                      </Button>
                    </div>
                  </div>
                  {/* Filtros avanzados expandibles */}
                  {showAdvancedFilters && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Calificación */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            Calificación mínima: {ratingFilter[0]} ⭐
                          </label>
                          <Slider
                            value={ratingFilter}
                            onValueChange={setRatingFilter}
                            max={5}
                            min={0}
                            step={0.5}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0</span>
                            <span>5</span>
                          </div>
                        </div>
                        {/* Precio */}
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Precio: ${priceRange[0]} - ${priceRange[1]}
                          </label>
                          <Slider
                            value={priceRange}
                            onValueChange={setPriceRange}
                            max={200}
                            min={0}
                            step={10}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>$0</span>
                            <span>$200</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Especialidades */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-base">Especialidades</label>
                  <Badge variant="secondary" className="text-xs">
                    {allDoctors.length} médicos
                  </Badge>
                </div>
                
                {/* Vista móvil - Botones compactos */}
                <div className="md:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <Button
                      variant={specialty === "all" ? "default" : "outline"}
                      onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                      className="flex-shrink-0 h-10 px-3 gap-1 text-xs"
                    >
                      <List className="h-3 w-3" />
                      Todas
                      <Badge variant="secondary" className="text-xs ml-1">
                        {allDoctors.length}
                      </Badge>
                    </Button>
                    {!showAllSpecialties && specialties.slice(0, 6).map((s) => {
                      const Icon = specialtyIcons[s] || Search;
                      const colorClass = specialtyColors[s] || "bg-gray-500/10 text-gray-600";
                      const doctorCount = allDoctors.filter(d => d.specialty === s).length;
                      return (
                        <Button
                          key={s}
                          variant={specialty === s ? "default" : "outline"}
                          onClick={() => {
                            setSpecialty(s);
                            setShowAllSpecialties(false);
                          }}
                          className="flex-shrink-0 h-10 px-3 gap-1 text-xs"
                        >
                          <div className={cn(
                            "p-1 rounded-full",
                            specialty === s ? "bg-primary/10" : colorClass
                          )}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="whitespace-nowrap">{s}</span>
                          <Badge variant="secondary" className="text-xs ml-1">
                            {doctorCount}
                          </Badge>
                        </Button>
                      );
                    })}
                  </div>
                  {showAllSpecialties && (
                    <div className="mt-2 bg-card border rounded-lg shadow-lg p-2 flex flex-col gap-1 z-20">
                      {specialties.map((s) => {
                        const Icon = specialtyIcons[s] || Search;
                        const colorClass = specialtyColors[s] || "bg-gray-500/10 text-gray-600";
                        const doctorCount = allDoctors.filter(d => d.specialty === s).length;
                        return (
                          <Button
                            key={s}
                            variant={specialty === s ? "default" : "outline"}
                            onClick={() => {
                              setSpecialty(s);
                              setShowAllSpecialties(false);
                            }}
                            className="w-full justify-start gap-2 text-xs px-2 py-2"
                          >
                            <div className={cn(
                              "p-1 rounded-full",
                              specialty === s ? "bg-primary/10" : colorClass
                            )}>
                              <Icon className="h-3 w-3" />
                            </div>
                            <span className="flex-1 text-left">{s}</span>
                            <Badge variant="secondary" className="text-xs ml-1">
                              {doctorCount}
                            </Badge>
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Vista escritorio - Grid */}
                <div className="hidden md:flex flex-wrap gap-3">
                  <Button
                    variant={specialty === "all" ? "default" : "outline"}
                    onClick={() => setSpecialty("all")}
                    className="flex-col h-auto p-4 gap-2 hover:scale-105 transition-all duration-200 min-w-[100px]"
                  >
                    <List className="h-6 w-6" />
                    <span className="text-sm font-medium">Todas</span>
                    <Badge variant="secondary" className="text-xs">
                      {allDoctors.length}
                    </Badge>
                  </Button>
                  
                  {visibleSpecialties.map((s) => {
                    const Icon = specialtyIcons[s] || Search;
                    const colorClass = specialtyColors[s] || "bg-gray-500/10 text-gray-600";
                    const doctorCount = allDoctors.filter(d => d.specialty === s).length;
                    
                    return (
                      <Button
                        key={s}
                        variant={specialty === s ? "default" : "outline"}
                        onClick={() => {
                          setSpecialty(s);
                          setShowAllSpecialties(false);
                        }}
                        className="flex-col h-auto p-4 gap-2 hover:scale-105 transition-all duration-200 min-w-[100px]"
                      >
                        <div className={cn(
                          "p-2 rounded-full",
                          specialty === s ? "bg-primary/10" : colorClass
                        )}>
                        <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-sm font-medium text-center leading-tight">{s}</span>
                        <Badge variant="secondary" className="text-xs">
                          {doctorCount}
                        </Badge>
                      </Button>
                    );
                  })}
                  
                  {specialties.length > 6 && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllSpecialties(!showAllSpecialties)}
                      className="flex-col h-auto p-4 gap-2 hover:scale-105 transition-all duration-200 min-w-[100px]"
                    >
                      <ChevronDown
                        className={cn(
                          "h-6 w-6 transition-transform",
                          showAllSpecialties && "rotate-180"
                        )}
                      />
                      <span className="text-sm font-medium text-center">
                        {showAllSpecialties ? "Ver menos" : "Ver más"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8 md:py-12 space-y-12 md:space-y-16">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-48 md:h-64 space-y-4">
              <Loader2 className="h-8 w-8 md:h-12 md:w-12 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm md:text-base">Cargando especialistas...</p>
            </div>
          ) : (
            <>
              {/* Resultados de búsqueda */}
              <div>
                <div className="mb-4 md:mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl md:text-2xl font-bold">Resultados de la Búsqueda</h2>
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="text-xs md:text-sm">
                        Filtros activos
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 text-muted-foreground text-sm">
                    <span className="flex items-center gap-1 md:gap-2">
                      <Users className="h-3 w-3 md:h-4 md:w-4" />
                    {filteredDoctors.length} {filteredDoctors.length === 1 ? "médico encontrado" : "médicos encontrados"}
                    </span>
                    {filteredDoctors.length > 0 && (
                      <span className="flex items-center gap-1 md:gap-2">
                        <Zap className="h-3 w-3 md:h-4 md:w-4" />
                        Disponibles ahora
                      </span>
                    )}
                    {date && (
                      <span className="flex items-center gap-1 md:gap-2">
                        <CalendarIcon className="h-3 w-3 md:h-4 md:w-4" />
                        Disponibles el {format(date, "dd 'de' MMMM", { locale: es })}
                      </span>
                    )}
                    {debouncedSearchTerm && (
                      <span className="flex items-center gap-1 md:gap-2">
                        <Search className="h-3 w-3 md:h-4 md:w-4" />
                        Resultados para &quot;{debouncedSearchTerm}&quot;
                      </span>
                    )}
                  </div>
                  {/* Botón de alternar vista solo en móvil */}
                  <div className="flex md:hidden justify-end mt-2">
                    <button
                      type="button"
                      className="rounded-full p-2 bg-muted border hover:bg-primary/10 transition-colors"
                      onClick={handleToggleMobileView}
                      aria-label="Alternar vista"
                    >
                      {mobileViewMode === 'card' && <ListIcon className="h-5 w-5" />}
                      {mobileViewMode === 'list' && <GridCompactIcon className="h-5 w-5" />}
                      {mobileViewMode === 'grid-compact' && <GridIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {filteredDoctors.length > 0 ? (
                  <>
                    {/* Vista de tarjetas (por defecto) */}
                    <div className={mobileViewMode === 'card' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6' : 'hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6'}>
                      {filteredDoctors.map((doctor) => (
                        <DoctorCard key={doctor.id} doctor={doctor} />
                      ))}
                    </div>
                    {/* Vista compacta solo en móvil */}
                    <div className={mobileViewMode === 'list' ? 'flex flex-col gap-2 md:hidden' : 'hidden'}>
                      {filteredDoctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          className="flex items-center justify-between bg-white border rounded-lg px-3 py-2 shadow-sm hover:bg-primary/5 transition-colors"
                          onClick={() => window.location.href = `/doctors/${doctor.id}`}
                        >
                          <div className="flex flex-col items-start text-left">
                            <span className="font-semibold text-base leading-tight">{doctor.name}</span>
                            <span className="text-xs text-primary font-medium">{doctor.specialty}</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{doctor.city}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="flex items-center gap-1 text-xs"><Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />{doctor.rating}</span>
                            <span className="text-[10px] text-muted-foreground">{doctor.reviewCount} reseñas</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Vista grid-compacta solo en móvil/tablet */}
                    <div className={mobileViewMode === 'grid-compact' ? 'grid grid-cols-2 sm:grid-cols-3 gap-2 md:hidden' : 'hidden'}>
                      {filteredDoctors.map((doctor) => (
                        <button
                          key={doctor.id}
                          className="flex flex-col items-center justify-between bg-white border rounded-lg px-2 py-3 shadow-sm hover:bg-primary/5 transition-colors min-h-[120px]"
                          onClick={() => window.location.href = `/doctors/${doctor.id}`}
                        >
                          <div className="w-14 h-14 mb-2 relative">
                            <Image src={doctor.profileImage} alt={doctor.name} fill className="rounded-full object-cover w-full h-full border" />
                          </div>
                          <span className="font-semibold text-xs text-center leading-tight line-clamp-2">{doctor.name}</span>
                          <span className="text-[10px] text-primary font-medium text-center line-clamp-1">{doctor.specialty}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 justify-center"><MapPin className="h-3 w-3" />{doctor.city}</span>
                          <span className="flex items-center gap-1 text-[10px] justify-center"><Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />{doctor.rating}</span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 md:py-20 bg-muted/30 rounded-lg border-2 border-dashed">
                    <Search className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">No se encontraron médicos</h3>
                    <p className="text-muted-foreground mb-4 md:mb-6 max-w-md mx-auto text-sm md:text-base">
                      No hay médicos que coincidan con tus criterios de búsqueda. 
                      Intenta ajustar los filtros o buscar con términos diferentes.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button onClick={clearFilters} variant="outline" size="sm" className="text-sm">
                        Limpiar filtros
                      </Button>
                      <Button onClick={() => setSpecialty("all")} size="sm" className="text-sm">
                        Ver todos los médicos
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Médicos mejor valorados */}
              {topRatedDoctors.length > 0 && (
              <section>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Star className="text-yellow-400 fill-yellow-400 h-5 w-5 md:h-6 md:w-6" /> 
                    Médicos Mejor Valorados
                    <Badge variant="secondary" className="ml-2 text-xs">
                      ⭐ 4.9+
                    </Badge>
                </h2>
                <Carousel
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent>
                    {topRatedDoctors.map((doctor) => (
                      <CarouselItem
                        key={doctor.id}
                        className="md:basis-1/2 lg:basis-1/3"
                      >
                        <DoctorCard doctor={doctor} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex" />
                  <CarouselNext className="hidden sm:flex" />
                </Carousel>
              </section>
              )}

              {/* Belleza y bienestar */}
              {beautyDoctors.length > 0 && (
                <section>
                  <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 flex items-center gap-2">
                    <Sparkles className="text-pink-400 h-5 w-5 md:h-6 md:w-6" /> 
                    Belleza y Bienestar
                    <Badge variant="secondary" className="ml-2 text-xs">
                      ✨ Especialistas
                    </Badge>
                  </h2>
                  <Carousel
                    opts={{
                      align: "start",
                      loop: false,
                    }}
                    className="w-full"
                  >
                    <CarouselContent>
                      {beautyDoctors.map((doctor) => (
                        <CarouselItem
                          key={doctor.id}
                          className="md:basis-1/2 lg:basis-1/3"
                        >
                          <DoctorCard doctor={doctor} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden sm:flex" />
                    <CarouselNext className="hidden sm:flex" />
                  </Carousel>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  HeartHandshake,
  Ticket,
  Users,
  Stethoscope,
  Loader2,
  Search,
  Building2,
} from 'lucide-react';
import { HeaderWrapper } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HealthCampaign } from '@/lib/types';

export default function PublicHealthCampaignsDirectoryPage() {
  const [campaigns, setCampaigns] = useState<HealthCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');

  useEffect(() => {
    fetch('/api/health-campaigns?publicOnly=true')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const availableCities = Array.from(
    new Set(campaigns.map(c => (c.city || '').trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filtered = campaigns.filter(c => {
    if (selectedCity !== 'ALL' && (c.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      (c.organizerName || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q) ||
      (c.state || '').toLowerCase().includes(q) ||
      (c.specialties || []).some(s => s.toLowerCase().includes(q))
    );
  });

  const organizerRoleLabel: Record<string, string> = {
    pharmacy: 'Farmacia Aliada',
    laboratory: 'Laboratorio Clínico',
    clinic: 'Clínica / Centro Médico',
    doctor: 'Médico Especialista',
    admin: 'SUMA Oficial',
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <HeaderWrapper />

      <main className="flex-1 pb-16">
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-sky-900 text-white py-10 px-4">
          <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <Badge className="bg-emerald-500 text-white text-xs">
                🎟️ Eventos de Salud y Operativos Médicos SUMA
              </Badge>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2.5">
                <HeartHandshake className="h-8 w-8 text-teal-300 shrink-0" />
                Jornadas de Salud Disponibles
              </h1>
              <p className="text-teal-100 text-sm sm:text-base">
                Explora las próximas jornadas de salud organizadas por farmacias, laboratorios, clínicas y médicos de SUMA. Confirma tu asistencia y obtén tu <strong>Ticket Digital de Entrada (Cupo)</strong>.
              </p>
            </div>

            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2.5">
              {availableCities.length > 0 && (
                <select
                  value={selectedCity}
                  onChange={e => setSelectedCity(e.target.value)}
                  className="h-10 rounded-md px-3 bg-white text-slate-900 text-xs font-bold border-0 shadow-xs"
                >
                  <option value="ALL">📍 Todas las ciudades ({campaigns.length})</option>
                  {availableCities.map(city => (
                    <option key={city} value={city}>
                      📍 {city}
                    </option>
                  ))}
                </select>
              )}
              <div className="w-full sm:w-72 relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por ciudad, especialidad u organizador..."
                  className="pl-9 bg-white text-slate-900 border-0 h-10"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 mt-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed border-2 py-16 text-center">
              <CardContent className="space-y-3">
                <HeartHandshake className="h-14 w-14 text-slate-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">
                  No se encontraron jornadas de salud activas
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Pronto se publicarán nuevos eventos y operativos médicos en tu ciudad.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(camp => {
                const reserved = camp.registrations?.length || 0;
                const isLimited = camp.capacityMode === 'limited' && Boolean(camp.maxCapacity && camp.maxCapacity > 0);
                const maxSpots = isLimited ? Number(camp.maxCapacity) : null;
                const remaining = isLimited && maxSpots ? Math.max(0, maxSpots - reserved) : null;
                const soldOut = isLimited && remaining === 0;

                return (
                  <Card
                    key={camp.id}
                    className="overflow-hidden border-slate-200 hover:border-teal-400 transition-all shadow-xs flex flex-col"
                  >
                    <div className="h-44 w-full bg-gradient-to-br from-teal-800 to-sky-900 relative overflow-hidden">
                      {camp.coverImage ? (
                        <img
                          src={camp.coverImage}
                          alt={camp.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <HeartHandshake className="h-14 w-14 text-teal-200/50" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <Badge
                          className={
                            camp.campaignType === 'free'
                              ? 'bg-emerald-600 text-white text-xs'
                              : 'bg-amber-500 text-white text-xs'
                          }
                        >
                          {camp.campaignType === 'free'
                            ? '✨ Gratuita'
                            : camp.pricingMode === 'per_specialist'
                            ? `$${camp.priceAmount || 0} / especialista`
                            : `$${camp.priceAmount || 0} por el evento`}
                        </Badge>
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <Badge
                          className={
                            soldOut
                              ? 'bg-red-600 text-white text-[11px]'
                              : 'bg-slate-900/85 text-white text-[11px] backdrop-blur-xs'
                          }
                        >
                          {isLimited
                            ? soldOut
                              ? '🚫 Cupos Agotados'
                              : `🎟️ Quedan ${remaining} de ${maxSpots} cupos`
                            : `♾️ Cupos Ilimitados`}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-teal-200">
                            <AvatarImage src={camp.organizerLogo || undefined} />
                            <AvatarFallback className="bg-teal-100 text-teal-800 text-[10px] font-bold">
                              {(camp.organizerName || 'SU').slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">
                              {camp.organizerName}
                            </p>
                            <p className="text-[10px] text-teal-700 font-medium">
                              {organizerRoleLabel[camp.organizerRole] || 'Organizador SUMA'}
                            </p>
                          </div>
                        </div>

                        <h3 className="font-extrabold text-base text-slate-900 line-clamp-2">
                          {camp.title}
                        </h3>

                        <div className="text-xs text-slate-600 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span>
                              {camp.startDate} • {camp.startTime} a {camp.endTime}
                            </span>
                          </p>
                          <p className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">
                              {[camp.city, camp.state, camp.address].filter(Boolean).join(', ') ||
                                'Consultar ubicación'}
                            </span>
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {(camp.specialties || []).slice(0, 4).map((s, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[10px] bg-teal-50 text-teal-800"
                            >
                              {s}
                            </Badge>
                          ))}
                          {(camp.specialties?.length || 0) > 4 && (
                            <Badge variant="outline" className="text-[10px]">
                              +{(camp.specialties?.length || 0) - 4} más
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        asChild
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold"
                      >
                        <Link href={`/jornadas/${camp.id}`}>
                          <Ticket className="h-4 w-4 mr-2" />
                          {soldOut ? 'Ver Detalles del Evento' : 'Ver Evento y Sacar mi Cupo'}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

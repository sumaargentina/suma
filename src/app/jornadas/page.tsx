"use client";

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MapPin,
  HeartHandshake,
  Ticket,
  Loader2,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { HeaderWrapper } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { HealthCampaign } from '@/lib/types';

function isCampaignEnded(camp: HealthCampaign): boolean {
  if (camp.status === 'completed' || camp.status === 'cancelled') return true;
  const targetDate = (camp.endDate || camp.startDate || '').trim();
  if (!targetDate) return false;
  const rawTime = (camp.endTime || '23:59').trim();
  const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? `${rawTime}:59` : '23:59:59';
  const expiryMs = Date.parse(`${targetDate}T${normalizedTime}-04:00`);
  if (Number.isNaN(expiryMs)) return false;
  return Date.now() > expiryMs;
}

export default function PublicHealthCampaignsDirectoryPage() {
  const [campaigns, setCampaigns] = useState<HealthCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');

  useEffect(() => {
    fetch('/api/health-campaigns?publicOnly=true')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCampaigns(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const availableCities = useMemo(
    () =>
      Array.from(new Set(campaigns.map(c => (c.city || '').trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [campaigns]
  );

  const activeCount = useMemo(() => campaigns.filter(c => !isCampaignEnded(c)).length, [campaigns]);
  const completedCount = useMemo(() => campaigns.filter(c => isCampaignEnded(c)).length, [campaigns]);

  const filtered = useMemo(() => {
    return campaigns
      .filter(c => {
        const ended = isCampaignEnded(c);
        if (statusFilter === 'active' && ended) return false;
        if (statusFilter === 'completed' && !ended) return false;
        if (selectedCity !== 'ALL' && (c.city || '').toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
        if (selectedRole !== 'ALL' && c.organizerRole !== selectedRole) {
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
      })
      .sort((a, b) => {
        const aEnded = isCampaignEnded(a) ? 1 : 0;
        const bEnded = isCampaignEnded(b) ? 1 : 0;
        if (aEnded !== bEnded) return aEnded - bEnded;
        return (b.startDate || '').localeCompare(a.startDate || '');
      });
  }, [campaigns, statusFilter, selectedCity, selectedRole, search]);

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
          <div className="container max-w-6xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <Badge className="bg-emerald-500 text-white text-xs">
                  🎟️ Red Nacional de Eventos y Jornadas de Salud SUMA
                </Badge>
                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2.5">
                  <HeartHandshake className="h-8 w-8 text-teal-300 shrink-0" />
                  Jornadas de Salud a Nivel Nacional
                </h1>
                <p className="text-teal-100 text-sm sm:text-base">
                  Explora las jornadas de salud organizadas por médicos, clínicas, laboratorios y farmacias aliadas de SUMA. Regístrate en SUMA y obtén tu <strong>Ticket Digital de Entrada (Cupo)</strong> al instante.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/15">
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-teal-100 hover:bg-white/10'
                  }`}
                >
                  🟢 Vigentes / Próximas ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'completed'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-teal-100 hover:bg-white/10'
                  }`}
                >
                  🏁 Culminadas ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-teal-100 hover:bg-white/10'
                  }`}
                >
                  Todas ({campaigns.length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white/10 p-3 rounded-2xl border border-white/15">
              <select
                value={selectedCity}
                onChange={e => setSelectedCity(e.target.value)}
                className="h-10 rounded-lg px-3 bg-white text-slate-900 text-xs font-bold border-0 shadow-xs"
              >
                <option value="ALL">📍 Todas las ciudades del país ({campaigns.length})</option>
                {availableCities.map(city => (
                  <option key={city} value={city}>
                    📍 {city}
                  </option>
                ))}
              </select>

              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="h-10 rounded-lg px-3 bg-white text-slate-900 text-xs font-bold border-0 shadow-xs"
              >
                <option value="ALL">🏥 Todos los entes organizadores</option>
                <option value="doctor">👨‍⚕️ Médicos Especialistas</option>
                <option value="clinic">🏥 Clínicas y Centros Médicos</option>
                <option value="laboratory">🔬 Laboratorios Clínicos</option>
                <option value="pharmacy">💊 Farmacias Aliadas</option>
                <option value="admin">✨ SUMA Oficial</option>
              </select>

              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por ciudad, especialidad u organizador..."
                  className="pl-9 bg-white text-slate-900 border-0 h-10 text-xs"
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
                  {statusFilter === 'active'
                    ? 'No hay jornadas vigentes con este filtro en este momento'
                    : 'No se encontraron jornadas de salud'}
                </h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  {statusFilter === 'active' && completedCount > 0
                    ? 'Puedes consultar las jornadas culminadas cambiando el filtro superior a «Culminadas» o «Todas».'
                    : 'Pronto se publicarán nuevos eventos y operativos médicos en tu ciudad.'}
                </p>
                {statusFilter === 'active' && completedCount > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setStatusFilter('all')}>
                    Ver todas las jornadas ({campaigns.length})
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(camp => {
                const ended = isCampaignEnded(camp);
                const reserved = camp.registrations?.length || 0;
                const isLimited =
                  camp.capacityMode === 'limited' && Boolean(camp.maxCapacity && camp.maxCapacity > 0);
                const maxSpots = isLimited ? Number(camp.maxCapacity) : null;
                const remaining = isLimited && maxSpots ? Math.max(0, maxSpots - reserved) : null;
                const soldOut = isLimited && remaining === 0;

                return (
                  <Card
                    key={camp.id}
                    className={`overflow-hidden transition-all flex flex-col ${
                      ended
                        ? 'border-slate-200 bg-slate-100/80 opacity-80 grayscale-[25%]'
                        : 'border-slate-200 hover:border-teal-400 shadow-xs bg-white'
                    }`}
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
                        {ended ? (
                          <Badge className="bg-slate-800/95 text-slate-100 text-xs font-bold">
                            🏁 Evento Culminado
                          </Badge>
                        ) : (
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
                        )}
                      </div>
                      <div className="absolute bottom-3 right-3">
                        <Badge
                          className={
                            ended
                              ? 'bg-slate-700/90 text-slate-200 text-[11px]'
                              : soldOut
                              ? 'bg-red-600 text-white text-[11px]'
                              : 'bg-slate-900/85 text-white text-[11px] backdrop-blur-xs'
                          }
                        >
                          {ended
                            ? `Finalizó el ${camp.endDate || camp.startDate}`
                            : isLimited
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
                              {camp.startDate}
                              {camp.endDate && camp.endDate !== camp.startDate
                                ? ` al ${camp.endDate}`
                                : ''}{' '}
                              • {camp.startTime} a {camp.endTime}
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
                        variant={ended ? 'outline' : 'default'}
                        className={
                          ended
                            ? 'w-full border-slate-300 text-slate-600 hover:bg-slate-200/60 font-semibold'
                            : 'w-full bg-teal-600 hover:bg-teal-700 text-white font-bold'
                        }
                      >
                        <Link href={`/jornadas/${camp.id}`}>
                          {ended ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Evento Culminado • Ver Resumen
                            </>
                          ) : (
                            <>
                              <Ticket className="h-4 w-4 mr-2" />
                              {soldOut ? 'Ver Detalles del Evento' : 'Ver Evento y Sacar mi Cupo'}
                            </>
                          )}
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

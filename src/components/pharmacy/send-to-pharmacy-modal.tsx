"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Search,
  MapPin,
  Phone,
  Clock,
  ExternalLink,
  MessageCircle,
  Pill,
  Loader2,
  CheckCircle2,
  Building2,
  Filter
} from 'lucide-react';
import type { Pharmacy } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface SendToPharmacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeCode: string;
  patientName?: string;
  patientCedula?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  prescriptionText: string;
  recipeUrl: string;
  defaultCity?: string;
}

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '58' + cleaned.substring(1);
  } else if (
    cleaned.length === 10 &&
    (cleaned.startsWith('414') ||
      cleaned.startsWith('424') ||
      cleaned.startsWith('412') ||
      cleaned.startsWith('416') ||
      cleaned.startsWith('426'))
  ) {
    cleaned = '58' + cleaned;
  }
  return cleaned;
}

export function SendToPharmacyModal({
  isOpen,
  onClose,
  recipeCode,
  patientName = 'Paciente',
  patientCedula,
  doctorName,
  doctorSpecialty,
  prescriptionText,
  recipeUrl,
  defaultCity,
}: SendToPharmacyModalProps) {
  const { toast } = useToast();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      loadPharmacies();
    }
  }, [isOpen]);

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pharmacies');
      if (res.ok) {
        const data = await res.json();
        // Filter only active pharmacies with a phone number
        const active = (data || []).filter(
          (p: any) => (p.status === 'active' || !p.status) && p.phone
        );
        setPharmacies(active);

        // Pre-select city if provided
        if (defaultCity) {
          const match = active.find(
            (p: any) => p.city?.toLowerCase() === defaultCity.toLowerCase()
          );
          if (match && match.city) {
            setSelectedCity(match.city);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando farmacias:', err);
    } finally {
      setLoading(false);
    }
  };

  const cities = useMemo(() => {
    const set = new Set<string>();
    pharmacies.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [pharmacies]);

  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter((p) => {
      if (selectedCity !== 'ALL' && p.city !== selectedCity) {
        return false;
      }
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      const name = (p.name || '').toLowerCase();
      const chain = (p.chainName || p.chain_name || '').toLowerCase();
      const branch = (p.branchName || p.branch_name || '').toLowerCase();
      const address = (p.address || '').toLowerCase();
      const city = (p.city || '').toLowerCase();

      return (
        name.includes(term) ||
        chain.includes(term) ||
        branch.includes(term) ||
        address.includes(term) ||
        city.includes(term)
      );
    });
  }, [pharmacies, selectedCity, searchTerm]);

  const handleSendToPharmacy = (pharmacy: Pharmacy) => {
    const rawPhone = pharmacy.phone;
    if (!rawPhone) {
      toast({
        variant: 'destructive',
        title: 'Teléfono no disponible',
        description: 'Esta farmacia no tiene registrado un número de contacto.',
      });
      return;
    }

    const cleanPhone = formatWhatsAppPhone(rawPhone);
    const pharmacyDisplayName =
      pharmacy.chainName || pharmacy.chain_name
        ? `${pharmacy.chainName || pharmacy.chain_name}${
            pharmacy.branchName || pharmacy.branch_name
              ? ` (${pharmacy.branchName || pharmacy.branch_name})`
              : ''
          }`
        : pharmacy.name;

    const messageLines = [
      `¡Hola, *${pharmacyDisplayName}*! 👋`,
      ``,
      `Soy paciente registrado en *SUMA Salud*.`,
      `Me comunico para consultar la disponibilidad y precio de los siguientes medicamentos indicados en mi récipe médico:`,
      ``,
      `📋 *MEDICAMENTOS PRESCRITOS:*`,
      `${prescriptionText || 'Medicamentos según récipe digital'}`,
      ``,
      doctorName ? `👨‍⚕️ *Médico Tratante:* Dr(a). ${doctorName}${doctorSpecialty ? ` (${doctorSpecialty})` : ''}` : null,
      `👤 *Paciente:* ${patientName}${patientCedula ? ` (C.I.: ${patientCedula})` : ''}`,
      `📄 *Código Récipe:* ${recipeCode}`,
      `🔗 *Verificación Oficial en Línea:* ${recipeUrl}`,
      ``,
      `¿Tienen estos medicamentos disponibles en su sede? Muchas gracias por su atención.`
    ].filter(Boolean);

    const message = messageLines.join('\n');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');

    toast({
      title: 'Abriendo WhatsApp...',
      description: `Contactando a ${pharmacyDisplayName} para consultar disponibilidad.`,
    });

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50/50">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 text-white p-5 sm:p-6 shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-teal-300 bg-teal-900/80 px-2.5 py-0.5 rounded-full border border-teal-600/40">
                Red de Farmacias Aliadas SUMA
              </span>
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <Store className="h-6 w-6 text-teal-300" />
              Enviar Récipe a Farmacia
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-teal-100/90 mt-1">
              Elige una farmacia aliada para consultar disponibilidad y precios de tus medicamentos directamente por WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {/* Resumen Récipe Compacto */}
          <div className="mt-3 bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Pill className="h-4 w-4 text-teal-300 shrink-0" />
              <div className="truncate">
                <span className="text-white/70">Récipe: </span>
                <strong className="font-mono text-teal-200">{recipeCode}</strong>
                {doctorName && (
                  <span className="text-white/80 ml-2 hidden sm:inline">
                    • Dr(a). {doctorName}
                  </span>
                )}
              </div>
            </div>
            <Badge className="bg-emerald-500/80 text-white border-0 text-[10px] shrink-0 font-semibold">
              Válido para Despacho
            </Badge>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="p-4 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre, sucursal o dirección..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 rounded-xl"
            />
          </div>

          {cities.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filtrar por ciudad"
                className="h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-500"
              >
                <option value="ALL">Todas las ciudades ({pharmacies.length})</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Listado de Farmacias */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500 gap-2">
              <Loader2 className="h-7 w-7 text-teal-600 animate-spin" />
              <span className="text-xs">Cargando farmacias disponibles...</span>
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200/80">
              <Store className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 text-sm">No se encontraron farmacias</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No hay farmacias aliadas que coincidan con tus filtros o ciudad seleccionada.
              </p>
            </div>
          ) : (
            filteredPharmacies.map((pharmacy) => {
              const isChain = pharmacy.isChain || Boolean(pharmacy.chainName || pharmacy.chain_name);
              const displayName = pharmacy.chainName || pharmacy.chain_name || pharmacy.name;
              const branch = isChain ? (pharmacy.branchName || pharmacy.branch_name) : null;
              const logo = pharmacy.logoUrl || pharmacy.logo_url;
              const is24Hours = Boolean(pharmacy.is24Hours || pharmacy.is_24_hours);

              return (
                <div
                  key={pharmacy.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/90 hover:border-teal-300 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Info Farmacia */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Logo / Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      {logo ? (
                        <img
                          src={logo}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {displayName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Textos */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors truncate">
                          {displayName}
                        </h4>
                        {branch && (
                          <Badge variant="outline" className="text-[10px] text-teal-700 bg-teal-50 border-teal-200 font-semibold px-2 py-0">
                            Sucursal {branch}
                          </Badge>
                        )}
                        {is24Hours && (
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-semibold px-1.5 py-0 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> 24h
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 flex items-start gap-1 line-clamp-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {pharmacy.city ? `${pharmacy.city} — ` : ''}
                          {pharmacy.address || 'Dirección registrada'}
                        </span>
                      </p>

                      {pharmacy.phone && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{pharmacy.phone}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botón WhatsApp */}
                  <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex items-center justify-end">
                    <Button
                      type="button"
                      onClick={() => handleSendToPharmacy(pharmacy)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all h-9 px-4 flex items-center gap-1.5 w-full sm:w-auto"
                    >
                      <MessageCircle className="h-4 w-4 fill-white" />
                      Consultar por WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Informativo */}
        <div className="p-3.5 bg-slate-100/80 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between gap-3 shrink-0">
          <span className="flex items-center gap-1 text-slate-600">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            Las farmacias aliadas SUMA verifican la autenticidad con el enlace oficial adjunto.
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-600 hover:text-slate-900 h-7"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

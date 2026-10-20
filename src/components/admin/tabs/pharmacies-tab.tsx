"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/lib/settings";
import * as supabaseService from '@/lib/supabaseService';
import type { Pharmacy, DoctorPharmacySponsorship } from '@/lib/types';
import {
  Building2,
  Store,
  MapPin,
  Search,
  Plus,
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  KeyRound,
  FileCheck2,
  Camera,
  ImageIcon,
  Upload,
  Crown,
  Handshake,
  CreditCard,
  Ticket,
  DollarSign,
  Globe,
  Percent,
  Gift,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { normalizeCountryCode, isSameCountry, getCountryDisplay, getSupportedCountries } from '@/lib/geo-data';

export function PharmaciesTab() {
  const { toast } = useToast();
  const { bcvRate, getCountryPricing } = useSettings();
  const effectiveBcv = bcvRate && bcvRate > 0 ? bcvRate : 45;

  const [adminView, setAdminView] = useState<'establishments' | 'alliances' | 'payments'>('establishments');

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [sponsorships, setSponsorships] = useState<DoctorPharmacySponsorship[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('ALL');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'chain' | 'independent' | 'pending'>('all');

  // Modal Crear / Editar Farmacia + Datos Oficiales + Convenio B2B
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Datos Comerciales y Oficiales de la Empresa
  const [isChain, setIsChain] = useState(false);
  const [chainName, setChainName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [independentName, setIndependentName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [rif, setRif] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [regentName, setRegentName] = useState('');
  const [regentLicense, setRegentLicense] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'pending' | 'suspended'>('active');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Convenios Super Admin para el Plan B2B ($200/mes a tasa BCV)
  const [sponsorshipPlanStatus, setSponsorshipPlanStatus] = useState<'inactive' | 'pending_payment' | 'active'>('inactive');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [freeMonths, setFreeMonths] = useState<number>(0);
  const [agreementNotes, setAgreementNotes] = useState('');

  const [locationData, setLocationData] = useState<LocationData>({
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    sector: '',
    address: ''
  });

  // Modal Eliminar
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [pharmacyToDelete, setPharmacyToDelete] = useState<Pharmacy | null>(null);

  // Cargar farmacias, alianzas B2B y pagos de $200/mes
  const loadPharmacies = async () => {
    try {
      setIsLoading(true);
      const [pharmData, sponRes, payRes] = await Promise.all([
        supabaseService.getPharmacies(),
        fetch('/api/pharmacy/sponsorships'),
        fetch('/api/pharmacy/subscription')
      ]);
      setPharmacies(pharmData);

      if (sponRes.ok) {
        const sponData = await sponRes.json();
        setSponsorships(Array.isArray(sponData) ? sponData : []);
      }
      if (payRes.ok) {
        const payData = await payRes.json();
        setPayments(Array.isArray(payData) ? payData : []);
      }
    } catch (error: any) {
      console.error('Error cargando farmacias:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las farmacias aliadas.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPharmacies();
  }, []);

  // Aprobar rápidamente una solicitud pendiente desde el portal
  const handleApproveApplication = async (pharmacy: Pharmacy) => {
    try {
      await supabaseService.updatePharmacy(pharmacy.id, {
        status: 'active',
        verified: true
      });
      toast({
        title: '✅ Solicitud de Farmacia Aprobada',
        description: `${pharmacy.name} ya se encuentra activa para recibir y dispensar récipes médicos en SUMA.`
      });
      await loadPharmacies();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleToggleB2BPlan = async (pharmacy: Pharmacy) => {
    const currentPlan = pharmacy.sponsorshipPlanStatus || (pharmacy as any).sponsorship_plan_status || 'inactive';
    const nextPlan = currentPlan === 'active' ? 'inactive' : 'active';
    try {
      const res = await fetch('/api/pharmacy/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_plan',
          pharmacyId: pharmacy.id,
          planStatus: nextPlan
        })
      });
      if (!res.ok) throw new Error('No se pudo cambiar el estado del Plan B2B');
      toast({
        title: nextPlan === 'active' ? '👑 Plan B2B ($200/mes) Activado' : 'Plan B2B Suspendido',
        description: `${pharmacy.chainName || pharmacy.name} ahora tiene el plan B2B ${nextPlan === 'active' ? 'activo' : 'inactivo'}.`
      });
      await loadPharmacies();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleUpdatePaymentStatus = async (paymentId: string, pharmacyId: string, nextStatus: 'Paid' | 'Rejected') => {
    try {
      const res = await fetch('/api/pharmacy/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: paymentId,
          pharmacyId,
          status: nextStatus
        })
      });
      if (!res.ok) throw new Error('Error actualizando pago');
      toast({
        title: nextStatus === 'Paid' ? '✅ Pago Aprobado y Plan B2B Activado' : 'Pago Rechazado',
        description: nextStatus === 'Paid' ? 'La farmacia ya puede hacer Match con médicos por 30 días.' : 'El pago fue marcado como rechazado.'
      });
      await loadPharmacies();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleAdminAllianceAction = async (sponsorshipId: string, action: 'activate_alliance' | 'pause_alliance') => {
    try {
      const res = await fetch('/api/pharmacy/sponsorships', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sponsorshipId,
          action,
          actorRole: 'pharmacy',
          senderName: 'Administrador SUMA'
        })
      });
      if (!res.ok) throw new Error('Error al cambiar estado de alianza');
      toast({
        title: action === 'activate_alliance' ? 'Alianza Activada por Admin' : 'Alianza Pausada por Admin'
      });
      await loadPharmacies();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // Solicitudes pendientes de aprobación
  const pendingApplications = useMemo(() => {
    return pharmacies.filter(p => p.status === 'pending');
  }, [pharmacies]);

  // Lista única de ciudades con farmacias registradas (filtradas por país si aplica)
  const availableCities = useMemo(() => {
    const citiesSet = new Set<string>();
    pharmacies.forEach(p => {
      if (selectedCountryFilter !== 'ALL' && !isSameCountry(p.country, selectedCountryFilter)) return;
      if (p.city) citiesSet.add(p.city);
    });
    return Array.from(citiesSet).sort();
  }, [pharmacies, selectedCountryFilter]);

  // Farmacias filtradas
  const filteredPharmacies = useMemo(() => {
    return pharmacies.filter(p => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.legalName && p.legalName.toLowerCase().includes(term)) ||
        (p.rif && p.rif.toLowerCase().includes(term)) ||
        (p.chainName && p.chainName.toLowerCase().includes(term)) ||
        (p.branchName && p.branchName.toLowerCase().includes(term)) ||
        (p.email && p.email.toLowerCase().includes(term)) ||
        (p.licenseNumber && p.licenseNumber.toLowerCase().includes(term)) ||
        (p.city && p.city.toLowerCase().includes(term));

      if (!matchSearch) return false;
      if (selectedCountryFilter !== 'ALL' && !isSameCountry(p.country, selectedCountryFilter)) return false;
      if (selectedCityFilter !== 'ALL' && p.city !== selectedCityFilter) return false;

      if (selectedTypeFilter === 'pending' && p.status !== 'pending') return false;
      const pIsChain = p.isChain || !!p.chainName;
      if (selectedTypeFilter === 'chain' && !pIsChain) return false;
      if (selectedTypeFilter === 'independent' && pIsChain) return false;

      return true;
    });
  }, [pharmacies, searchTerm, selectedCountryFilter, selectedCityFilter, selectedTypeFilter]);

  // KPIs
  const stats = useMemo(() => {
    const total = pharmacies.length;
    const b2bActive = pharmacies.filter(
      p => (p.sponsorshipPlanStatus || (p as any).sponsorship_plan_status) === 'active'
    ).length;
    const activeAlliances = sponsorships.filter(s => s.status === 'active').length;
    const b2bRevenue = payments
      .filter(pay => pay.status === 'Paid')
      .reduce((acc, pay) => acc + Number(pay.amount || 0), 0);
    const totalFilled = pharmacies.reduce(
      (sum, p) => sum + (p.totalPrescriptionsFilled || p.total_prescriptions_filled || 0),
      0
    );
    return { total, b2bActive, activeAlliances, b2bRevenue, totalFilled };
  }, [pharmacies, sponsorships, payments]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isBanner = field === 'banner';
    if (isBanner) setUploadingBanner(true);
    else setUploadingLogo(true);
    try {
      const folder = isBanner ? 'pharmacies/banners' : 'pharmacies/logos';
      const publicUrl = await supabaseService.uploadPublicImage(file, 'profile-images', folder);
      if (isBanner) setBannerUrl(publicUrl);
      else setLogoUrl(publicUrl);
      toast({
        title: isBanner ? 'Banner WebP subido' : 'Logotipo WebP subido',
        description: 'Imagen optimizada y cargada exitosamente.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al subir imagen',
        description: err.message || 'No se pudo subir la imagen.'
      });
    } finally {
      if (isBanner) setUploadingBanner(false);
      else setUploadingLogo(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    setIsChain(false);
    setChainName('');
    setBranchName('');
    setIndependentName('');
    setLegalName('');
    setRif('');
    setLicenseNumber('');
    setRegentName('');
    setRegentLicense('');
    setContactName('');
    setContactRole('Representante Legal / Gerente');
    setPhone('');
    setWhatsapp('');
    setEmail('');
    setPassword(Math.random().toString(36).slice(-8) + 'Ab1!');
    setStatus('active');
    setLogoUrl('');
    setBannerUrl('');
    setSponsorshipPlanStatus('inactive');
    setDiscountPercentage(0);
    setFreeMonths(0);
    setAgreementNotes('');
    setLocationData({
      country: 'VE',
      state: 'Monagas',
      city: 'Maturín',
      sector: '',
      address: ''
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (p: Pharmacy) => {
    setIsEditing(true);
    setEditingId(p.id);
    const hasChain = p.isChain || !!p.chainName;
    setIsChain(hasChain);
    setChainName(p.chainName || '');
    setBranchName(p.branchName || '');
    setIndependentName(!hasChain ? p.name : '');
    setLegalName(p.legalName || p.legal_name || p.name || '');
    setRif(p.rif || p.licenseNumber || p.license_number || '');
    setLicenseNumber(p.licenseNumber || p.license_number || '');
    setRegentName(p.regentName || p.regent_name || '');
    setRegentLicense(p.regentLicense || p.regent_license || '');
    setContactName(p.contactName || p.contact_name || '');
    setContactRole(p.contactRole || p.contact_role || '');
    setPhone(p.phone || '');
    setWhatsapp(p.whatsapp || p.phone || '');
    setEmail(p.email || '');
    setPassword('');
    setStatus(p.status || 'active');
    setLogoUrl(p.logoUrl || p.logo_url || '');
    setBannerUrl(p.bannerUrl || p.banner_url || p.bannerImage || p.banner_image || '');
    setSponsorshipPlanStatus((p.sponsorshipPlanStatus || p.sponsorship_plan_status || 'inactive') as any);
    setDiscountPercentage(Number(p.discountPercentage ?? p.discount_percentage ?? 0));
    setFreeMonths(Number(p.freeMonths ?? p.free_months ?? 0));
    setAgreementNotes(p.agreementNotes || p.agreement_notes || '');
    setLocationData({
      country: normalizeCountryCode(p.country),
      state: p.state || 'Monagas',
      city: p.city || 'Maturín',
      sector: '',
      address: p.address || ''
    });
    setIsDialogOpen(true);
  };

  // Cálculo en vivo del Plan B2B según el país seleccionado con descuento y tasa local
  const modalCountryPricing = useMemo(() => getCountryPricing(locationData.country), [getCountryPricing, locationData.country]);

  const netMonthlyUsd = useMemo(() => {
    const validDiscount = Math.min(100, Math.max(0, Number(discountPercentage || 0)));
    return Math.round(modalCountryPricing.pharmacyB2BMonthlyFee * (1 - validDiscount / 100) * 100) / 100;
  }, [discountPercentage, modalCountryPricing.pharmacyB2BMonthlyFee]);

  const netMonthlyBs = useMemo(() => {
    return netMonthlyUsd * modalCountryPricing.exchangeRate;
  }, [netMonthlyUsd, modalCountryPricing.exchangeRate]);

  const handleSavePharmacy = async (e: React.FormEvent) => {
    e.preventDefault();

    let computedName = '';
    if (isChain) {
      if (!chainName.trim() || !branchName.trim()) {
        toast({ variant: 'destructive', title: 'Datos incompletos', description: 'Ingresa el nombre de la cadena y de la sucursal.' });
        return;
      }
      computedName = `${chainName.trim()} - ${branchName.trim()}`;
    } else {
      if (!independentName.trim()) {
        toast({ variant: 'destructive', title: 'Falta nombre comercial', description: 'Ingresa el nombre de la farmacia independiente.' });
        return;
      }
      computedName = independentName.trim();
    }

    const effectiveLic = licenseNumber.trim() || rif.trim();
    if (!effectiveLic || !phone.trim() || !locationData.city || !locationData.address?.trim() || !email.trim() || (!isEditing && !password.trim())) {
      toast({ variant: 'destructive', title: 'Campos obligatorios', description: 'Completa RIF/Permiso Sanitario, teléfono, ubicación y credenciales.' });
      return;
    }

    try {
      setSubmitting(true);

      const payload: Partial<Pharmacy> = {
        name: computedName,
        isChain,
        chainName: isChain ? chainName.trim() : null,
        branchName: isChain ? branchName.trim() : null,
        legalName: legalName.trim() || computedName,
        rif: rif.trim().toUpperCase() || effectiveLic,
        licenseNumber: effectiveLic,
        regentName: regentName.trim() || null,
        regentLicense: regentLicense.trim() || null,
        contactName: contactName.trim() || null,
        contactRole: contactRole.trim() || null,
        phone: phone.trim() || null,
        whatsapp: (whatsapp.trim() || phone.trim()) || null,
        email: email.trim().toLowerCase(),
        address: locationData.address.trim(),
        city: locationData.city.trim(),
        state: locationData.state || 'Monagas',
        country: normalizeCountryCode(locationData.country),
        status,
        logoUrl: logoUrl.trim() || null,
        bannerUrl: bannerUrl.trim() || null,
        sponsorshipPlanStatus: freeMonths > 0 ? 'active' : sponsorshipPlanStatus,
        sponsorshipPlanFee: netMonthlyUsd,
        discountPercentage: Number(discountPercentage || 0),
        freeMonths: Number(freeMonths || 0),
        agreementNotes: agreementNotes.trim() || null
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (isEditing && editingId) {
        await supabaseService.updatePharmacy(editingId, payload);
        toast({ title: 'Farmacia y Convenio Actualizados', description: 'Los datos oficiales y condiciones del Plan B2B han sido guardados.' });
      } else {
        await supabaseService.addPharmacy(payload);
        toast({ title: 'Farmacia Registrada', description: 'La nueva farmacia/sucursal ha sido habilitada.' });
      }

      setIsDialogOpen(false);
      await loadPharmacies();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al procesar',
        description: error.message || 'No se pudo guardar la farmacia.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePharmacy = async () => {
    if (!pharmacyToDelete) return;
    try {
      await supabaseService.deletePharmacy(pharmacyToDelete.id);
      toast({ title: 'Farmacia Eliminada', description: 'El establecimiento ha sido removido del sistema.' });
      setIsDeleteDialogOpen(false);
      setPharmacyToDelete(null);
      await loadPharmacies();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error al eliminar',
        description: error.message || 'No se pudo eliminar la farmacia.'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y KPIs de Gobernanza B2B */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-600" />
            Gobernanza de Farmacias, Convenios y Plan B2B ($200/mes a BCV)
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aprueba solicitudes gratuitas del portal, verifica los datos oficiales de la empresa y configura descuentos (%) o meses gratis en el Plan B2B de $200 USD (Bs. {(200 * effectiveBcv).toLocaleString('es-VE', { maximumFractionDigits: 2 })} a BCV).
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-teal-600 hover:bg-teal-700 text-white shadow-xs">
          <Plus className="h-4 w-4 mr-2" />
          Registrar Farmacia / Sucursal
        </Button>
      </div>

      {/* BANDEJA DE SOLICITUDES PENDIENTES ENVIADAS DESDE EL PORTAL INICIAL */}
      {pendingApplications.length > 0 && (
        <Card className="border-2 border-amber-400 bg-amber-50/60 shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-700" />
                <h3 className="font-bold text-amber-950 text-sm">
                  Solicitudes de Creación de Cuenta Pendientes de Aprobación ({pendingApplications.length})
                </h3>
              </div>
              <Badge className="bg-amber-500 text-slate-950 font-bold text-xs">
                Requiere Revisión del Super Admin
              </Badge>
            </div>

            <div className="grid gap-3">
              {pendingApplications.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-xl p-3.5 border border-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.name}</span>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        RIF: {req.rif || req.licenseNumber}
                      </Badge>
                      {(req.requestedPlan || req.requested_plan) === 'b2b' ? (
                        <Badge className="bg-amber-400 text-slate-950 font-bold text-[10px]">
                          Solicita Plan Alianza B2B ($200/mes BCV)
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Solicita Plan Base Gratuito ($0)
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Razón Social:</strong> {req.legalName || req.legal_name || req.name} •{' '}
                      <strong>Permiso Sanitario:</strong> {req.licenseNumber} •{' '}
                      <strong>Regente:</strong> {req.regentName || req.regent_name || 'Por verificar'} ({req.regentLicense || req.regent_license || 'S/N'})
                    </p>
                    <p className="text-xs text-slate-500">
                      📍 {req.city}, {req.state} ({req.address}) • 👤 Contacto: {req.contactName || req.contact_name || 'N/A'} • ✉️ {req.email} • 📞 {req.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(req)}
                      className="text-xs border-teal-600 text-teal-700 hover:bg-teal-50"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Ver Datos / Configurar Convenio
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApproveApplication(req)}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Aprobar Cuenta Gratis
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50/50 to-white shadow-xs">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-teal-800 uppercase tracking-wider">Total Farmacias</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Sedes registradas</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/60 to-white shadow-xs">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Suscritas Plan $200</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.b2bActive}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Membresías B2B activas</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-xs">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-800 uppercase tracking-wider">Alianzas Activas</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.activeAlliances}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Matches Médico ↔ Farmacia</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Handshake className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-xs">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Ingresos SUMA B2B</p>
              <h3 className="text-2xl font-black text-emerald-800 mt-1">${stats.b2bRevenue}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Recaudado planes $200/mes</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardContent className="pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-700 uppercase tracking-wider">Récipes Dispensados</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.totalFilled}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total histórico</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub-pestañas del Módulo 6 de Gobernanza */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <Button
          type="button"
          size="sm"
          variant={adminView === 'establishments' ? 'default' : 'outline'}
          onClick={() => setAdminView('establishments')}
          className="rounded-xl text-xs font-bold"
        >
          <Store className="h-3.5 w-3.5 mr-1.5" />
          1. Establecimientos, Datos Oficiales y Convenios B2B ({pharmacies.length})
        </Button>

        <Button
          type="button"
          size="sm"
          variant={adminView === 'alliances' ? 'default' : 'outline'}
          onClick={() => setAdminView('alliances')}
          className="rounded-xl text-xs font-bold"
        >
          <Handshake className="h-3.5 w-3.5 mr-1.5" />
          2. Auditoría de Matches, Cupones y ROI Médico ↔ Farmacia ({sponsorships.length})
        </Button>

        <Button
          type="button"
          size="sm"
          variant={adminView === 'payments' ? 'default' : 'outline'}
          onClick={() => setAdminView('payments')}
          className="rounded-xl text-xs font-bold"
        >
          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
          3. Pagos de Membresía B2B Farmacias ({payments.length})
        </Button>
      </div>

      {/* =====================================================================
          VISTA 1: ESTABLECIMIENTOS Y PLAN B2B ($200/MES A BCV)
         ===================================================================== */}
      {adminView === 'establishments' && (
        <>
          <Card className="shadow-xs border-slate-200">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre comercial, razón social, RIF o correo..."
                    className="pl-9 bg-slate-50 border-slate-200"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="w-full md:w-48">
                  <Select
                    value={selectedCountryFilter}
                    onValueChange={(val) => {
                      setSelectedCountryFilter(val);
                      setSelectedCityFilter('ALL');
                    }}
                  >
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <Globe className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <SelectValue placeholder="Todos los países" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">🌎 Todos los países</SelectItem>
                      {getSupportedCountries().map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.flag} {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-52">
                  <Select value={selectedCityFilter} onValueChange={setSelectedCityFilter}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                        <SelectValue placeholder="Todas las ciudades" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las ciudades</SelectItem>
                      {availableCities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full md:w-52">
                  <Select value={selectedTypeFilter} onValueChange={(val: any) => setSelectedTypeFilter(val)}>
                    <SelectTrigger className="bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Tipo de establecimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las farmacias</SelectItem>
                      <SelectItem value="pending">⏳ Solicitudes Pendientes</SelectItem>
                      <SelectItem value="chain">Cadenas (Sucursales)</SelectItem>
                      <SelectItem value="independent">Independientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-slate-200 overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Cargando farmacias aliadas...
                </div>
              ) : filteredPharmacies.length === 0 ? (
                <div className="text-center p-12">
                  <Store className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h4 className="font-semibold text-slate-800">No se encontraron farmacias</h4>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700">Establecimiento / Datos Oficiales</TableHead>
                      <TableHead className="font-semibold text-slate-700">País, Ciudad y Dirección</TableHead>
                      <TableHead className="font-semibold text-slate-700">Contacto / Acceso</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Plan B2B ($200 BCV) y Convenio</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Récipes</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-center">Estado</TableHead>
                      <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPharmacies.map((pharmacy) => {
                      const isChainBranch = pharmacy.isChain || !!pharmacy.chainName;
                      const b2bStatus = pharmacy.sponsorshipPlanStatus || (pharmacy as any).sponsorship_plan_status || 'inactive';
                      const countryMeta = getCountryDisplay(pharmacy.country);
                      const pDiscount = Number(pharmacy.discountPercentage ?? pharmacy.discount_percentage ?? 0);
                      const pFreeMonths = Number(pharmacy.freeMonths ?? pharmacy.free_months ?? 0);
                      const pEffectiveUsd = Math.round(200 * (1 - pDiscount / 100) * 100) / 100;
                      const pEffectiveBs = (pEffectiveUsd * effectiveBcv).toLocaleString('es-VE', { maximumFractionDigits: 0 });

                      return (
                        <TableRow key={pharmacy.id} className="hover:bg-slate-50/80">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                {(pharmacy.logoUrl || pharmacy.logo_url) ? (
                                  <img
                                    src={(pharmacy.logoUrl || pharmacy.logo_url)!}
                                    alt={pharmacy.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Store className="h-5 w-5 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900">
                                  {pharmacy.chainName || pharmacy.name}
                                </div>
                                {isChainBranch && pharmacy.branchName && (
                                  <div className="text-xs text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                    Sucursal {pharmacy.branchName}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  RIF: <span className="font-mono font-semibold text-slate-700">{pharmacy.rif || pharmacy.licenseNumber || 'N/A'}</span>
                                  {(pharmacy.legalName || pharmacy.legal_name) && (
                                    <span> • {pharmacy.legalName || pharmacy.legal_name}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-1 font-semibold text-slate-800 text-xs">
                              <span>{countryMeta.flag}</span>
                              <span>{pharmacy.city}, {pharmacy.state || countryMeta.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              {pharmacy.address}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-xs font-mono text-slate-800">{pharmacy.email}</div>
                            {(pharmacy.contactName || pharmacy.contact_name || pharmacy.phone) && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {pharmacy.contactName || pharmacy.contact_name} {pharmacy.phone ? `• ${pharmacy.phone}` : ''}
                              </div>
                            )}
                          </TableCell>

                          {/* Gobernabilidad del Plan B2B ($200/mes a BCV + Convenio % + Meses Gratis) */}
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                className={
                                  b2bStatus === 'active'
                                    ? 'bg-amber-400 text-slate-950 font-extrabold text-[10px]'
                                    : 'bg-slate-100 text-slate-600 text-[10px]'
                                }
                              >
                                <Crown className="h-3 w-3 mr-1" />
                                {b2bStatus === 'active'
                                  ? `ACTIVO ($${pEffectiveUsd}/mes • Bs.${pEffectiveBs})`
                                  : 'Plan Gratuito (Solo Récipes)'}
                              </Badge>

                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {pDiscount > 0 && (
                                  <span className="text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.2 rounded">
                                    Convenio -{pDiscount}%
                                  </span>
                                )}
                                {pFreeMonths > 0 && (
                                  <span className="text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 px-1.5 py-0.2 rounded">
                                    🎁 {pFreeMonths}m Gratis
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleB2BPlan(pharmacy)}
                                  className="text-[10px] font-bold text-teal-700 hover:underline"
                                >
                                  {b2bStatus === 'active' ? 'Suspender B2B' : 'Activar B2B'}
                                </button>
                                <span className="text-slate-300">•</span>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(pharmacy)}
                                  className="text-[10px] font-bold text-indigo-700 hover:underline"
                                >
                                  Convenio / %
                                </button>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center font-bold text-slate-900">
                            {pharmacy.totalPrescriptionsFilled || pharmacy.total_prescriptions_filled || 0}
                          </TableCell>

                          <TableCell className="text-center">
                            {pharmacy.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3 text-emerald-600" /> Activo
                              </span>
                            ) : pharmacy.status === 'pending' ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                                  <Clock className="h-3 w-3 text-amber-600" /> Solicitud
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleApproveApplication(pharmacy)}
                                  className="text-[10px] font-bold text-emerald-700 hover:underline"
                                >
                                  Aprobar
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <XCircle className="h-3 w-3 text-rose-600" /> Inactivo
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenEdit(pharmacy)}
                                className="h-8 w-8 text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPharmacyToDelete(pharmacy);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 text-slate-600 hover:text-rose-700 hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* =====================================================================
          VISTA 2: AUDITORÍA DE ALIANZAS MÉDICO ↔ FARMACIA, CUPONES Y ROI
         ===================================================================== */}
      {adminView === 'alliances' && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            {sponsorships.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Aún no hay alianzas registradas entre médicos y farmacias.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Médico Patrocinado</TableHead>
                    <TableHead className="font-semibold text-slate-700">Farmacia / Franquicia</TableHead>
                    <TableHead className="font-semibold text-slate-700">Alcance y Acuerdo</TableHead>
                    <TableHead className="font-semibold text-slate-700">Cupón Paciente</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Métricas ROI</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Gobernanza</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sponsorships.map(spon => (
                    <TableRow key={spon.id}>
                      <TableCell>
                        <div className="font-bold text-slate-900 text-xs">
                          Dr(a). {spon.doctor?.name || 'Médico'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {spon.doctor?.specialty} • {spon.doctor?.city}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="font-bold text-teal-900 text-xs">
                          {spon.pharmacy?.chainName || spon.pharmacy?.name || 'Farmacia'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {spon.pharmacy?.city}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="text-xs font-semibold text-slate-800">
                          {spon.scopeType === 'national' ? `🌎 Nacional (${spon.chainName || 'Cadena'})` : `📍 Ciudad (${spon.targetCity || spon.pharmacy?.city})`}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold">
                          {spon.agreementValue || 'En negociación'}
                        </div>
                      </TableCell>

                      <TableCell>
                        {spon.hasPatientCoupon && spon.couponCode ? (
                          <Badge className="bg-amber-100 text-amber-950 border-amber-300 text-[10px] font-bold">
                            <Ticket className="h-3 w-3 mr-1" />
                            {spon.couponCode} ({spon.couponDiscountPercent}% OFF)
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin cupón</span>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-semibold">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded">👁️ {spon.impressionsCount || 0}</span>
                          <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">👆 {spon.cardClicksCount || 0}</span>
                          <span className="bg-amber-50 text-amber-900 px-1.5 py-0.5 rounded">🛵 {spon.ordersCount || 0}</span>
                          <span className="bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded">✅ {spon.dispensedRecipesCount || 0}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          className={
                            spon.status === 'active'
                              ? 'bg-emerald-600 text-white text-[10px]'
                              : spon.status === 'matched'
                              ? 'bg-amber-100 text-amber-900 text-[10px]'
                              : 'bg-slate-100 text-slate-700 text-[10px]'
                          }
                        >
                          {spon.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right">
                        {spon.status === 'active' ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdminAllianceAction(spon.id, 'pause_alliance')}
                            className="h-7 text-[11px] rounded-lg border-amber-300 text-amber-900"
                          >
                            Pausar
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleAdminAllianceAction(spon.id, 'activate_alliance')}
                            className="h-7 text-[11px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Activar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* =====================================================================
          VISTA 3: PAGOS DE MEMBRESÍA B2B FARMACIAS ($200 USD/MES A BCV)
         ===================================================================== */}
      {adminView === 'payments' && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">
                Aún no se han registrado pagos de membresías B2B de farmacias.
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-semibold text-slate-700">Farmacia</TableHead>
                    <TableHead className="font-semibold text-slate-700">Fecha</TableHead>
                    <TableHead className="font-semibold text-slate-700">Método / Referencia</TableHead>
                    <TableHead className="font-semibold text-slate-700">Monto</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-center">Estado</TableHead>
                    <TableHead className="font-semibold text-slate-700 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(pay => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-bold text-slate-900 text-xs">
                        {pay.pharmacyName || 'Farmacia'}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{pay.date}</TableCell>
                      <TableCell className="text-xs text-slate-700">
                        {pay.paymentMethod} • <span className="font-mono">{pay.transactionId}</span>
                      </TableCell>
                      <TableCell className="font-extrabold text-emerald-700 text-xs">
                        ${Number(pay.amount || 200).toFixed(2)} USD
                        <span className="block text-[10px] text-slate-500 font-normal">
                          Eq. Bs. {(Number(pay.amount || 200) * effectiveBcv).toLocaleString('es-VE', { maximumFractionDigits: 2 })} (BCV)
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            pay.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px]'
                              : pay.status === 'Pending'
                              ? 'bg-amber-100 text-amber-900 border-amber-300 text-[10px]'
                              : 'bg-rose-100 text-rose-900 border-rose-300 text-[10px]'
                          }
                        >
                          {pay.status === 'Paid' ? 'Pagado / Activo' : pay.status === 'Pending' ? 'Pendiente' : 'Rechazado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {pay.status !== 'Paid' && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleUpdatePaymentStatus(pay.id, pay.pharmacyId, 'Paid')}
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg mr-1.5"
                          >
                            Aprobar Pago
                          </Button>
                        )}
                        {pay.status === 'Pending' && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdatePaymentStatus(pay.id, pay.pharmacyId, 'Rejected')}
                            className="h-7 text-[11px] text-rose-600 border-rose-200 rounded-lg"
                          >
                            Rechazar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Crear / Editar Farmacia + Datos Oficiales + Convenio B2B ($200/mes a BCV) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Building2 className="h-5 w-5 text-teal-600" />
              {isEditing ? 'Perfil Oficial de Farmacia y Convenio B2B' : 'Registrar Nueva Farmacia o Sucursal'}
            </DialogTitle>
            <DialogDescription>
              Verifica los datos legales de la empresa, las credenciales de acceso para el módulo gratuito de récipes y establece convenios de descuento (%) o meses gratis para el Plan B2B de $200/mes a BCV.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePharmacy} className="space-y-5 pt-2">
            {/* 1. DATOS OFICIALES DE LA EMPRESA */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-teal-600" />
                  1. Datos Oficiales y Legales de la Empresa
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">¿Es Cadena / Franquicia?</span>
                  <Switch checked={isChain} onCheckedChange={setIsChain} />
                </div>
              </div>

              {isChain ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nombre de la Cadena *</Label>
                    <Input
                      placeholder="Ej: Farmatodo"
                      value={chainName}
                      onChange={(e) => setChainName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nombre de la Sucursal / Sede *</Label>
                    <Input
                      placeholder="Ej: Sucursal Tipuro"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nombre Comercial de la Farmacia *</Label>
                  <Input
                    placeholder="Ej: Farmacia La Fé"
                    value={independentName}
                    onChange={(e) => setIndependentName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Razón Social Oficial (Registro Mercantil) *</Label>
                  <Input
                    placeholder="Ej: Inversiones Farmacéuticas La Fé C.A."
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">RIF Fiscal *</Label>
                  <Input
                    placeholder="Ej: J-40123456-7"
                    value={rif}
                    onChange={(e) => setRif(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Permiso Sanitario (MPPS/SACS) *</Label>
                  <Input
                    placeholder="Ej: SACS-FAR-2024"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Farmacéutico Regente</Label>
                  <Input
                    placeholder="Dr(a). Nombre y Apellido"
                    value={regentName}
                    onChange={(e) => setRegentName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Matrícula COLFAR / MPPS</Label>
                  <Input
                    placeholder="Ej: COLFAR-14200"
                    value={regentLicense}
                    onChange={(e) => setRegentLicense(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Representante Legal / Contacto</Label>
                  <Input
                    placeholder="Nombre del Gerente o Representante"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Teléfono / WhatsApp Oficial *</Label>
                  <Input
                    placeholder="Ej: +58 414 1234567"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (!whatsapp) setWhatsapp(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* 2. CONVENIO COMERCIAL Y PLAN B2B ($200/MES A BCV) - EXCLUSIVO SUPER ADMIN */}
            <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50/40 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-xs font-bold text-amber-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <Crown className="h-4 w-4 text-amber-600" />
                  2. Plan Alianza B2B ($200/mes a BCV) y Convenios del Super Admin
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-900">Estado Módulo B2B:</span>
                  <Switch
                    checked={sponsorshipPlanStatus === 'active' || freeMonths > 0}
                    onCheckedChange={(checked) => setSponsorshipPlanStatus(checked ? 'active' : 'inactive')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Descuento por % */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-amber-200">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Percent className="h-3.5 w-3.5 text-teal-600" />
                    Descuento por Convenio (%)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercentage}
                      onChange={(e) => setDiscountPercentage(Math.min(100, Math.max(0, Number(e.target.value || 0))))}
                      className="w-24 font-bold"
                    />
                    <div className="flex flex-wrap gap-1">
                      {[0, 10, 25, 50, 100].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercentage(pct)}
                          className={`text-[10px] px-2 py-1 rounded font-bold border ${
                            discountPercentage === pct
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Meses Gratis */}
                <div className="space-y-1.5 bg-white p-3 rounded-lg border border-amber-200">
                  <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5 text-purple-600" />
                    Otorgar Meses Gratis (Cortesía)
                  </Label>
                  <Select
                    value={String(freeMonths)}
                    onValueChange={(val) => {
                      const m = Number(val);
                      setFreeMonths(m);
                      if (m > 0) setSponsorshipPlanStatus('active');
                    }}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Sin meses gratis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 Meses (Cobro regular)</SelectItem>
                      <SelectItem value="1">🎁 1 Mes Gratis de Plan B2B</SelectItem>
                      <SelectItem value="2">🎁 2 Meses Gratis de Plan B2B</SelectItem>
                      <SelectItem value="3">🎁 3 Meses Gratis de Plan B2B</SelectItem>
                      <SelectItem value="6">🎁 6 Meses Gratis de Plan B2B</SelectItem>
                      <SelectItem value="12">🎁 12 Meses Gratis de Plan B2B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Resumen Financiero Local del País */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Tarifa Mensual Resultante ({modalCountryPricing.flag} Base ${modalCountryPricing.pharmacyB2BMonthlyFee}):</span>{' '}
                  <strong className="text-slate-900 text-sm">${netMonthlyUsd.toFixed(2)} USD / mes</strong>
                  {discountPercentage > 0 && (
                    <span className="ml-1.5 text-emerald-700 font-bold">(-{discountPercentage}% Convenio)</span>
                  )}
                </div>
                <div className="bg-amber-100/80 text-amber-950 font-bold px-2.5 py-1 rounded">
                  Monto a {modalCountryPricing.rateLabel} ({modalCountryPricing.currencySymbol} {modalCountryPricing.exchangeRate}): {modalCountryPricing.currencySymbol} {netMonthlyBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / mes
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Notas del Convenio Comercial (Interno Admin)</Label>
                <Textarea
                  placeholder="Ej: Convenio firmado por 3 meses de prueba + 25% de descuento por volumen de sucursales..."
                  value={agreementNotes}
                  onChange={(e) => setAgreementNotes(e.target.value)}
                  rows={2}
                  className="bg-white text-xs"
                />
              </div>
            </div>

            {/* 3. UBICACIÓN GEOGRÁFICA */}
            <div className="p-3.5 rounded-xl border border-teal-100 bg-teal-50/20 space-y-3">
              <Label className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-teal-600" />
                3. Ubicación Geográfica y Ciudad Oficial *
              </Label>
              <LocationSelector
                country={locationData.country}
                state={locationData.state}
                city={locationData.city}
                address={locationData.address}
                onLocationChange={setLocationData}
                showAddressFields={true}
              />
            </div>

            {/* 4. IDENTIDAD VISUAL */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-4">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <ImageIcon className="h-4 w-4 text-teal-600" />
                4. Identidad Visual (Banner y Logotipo en WebP)
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Banner / Portada</Label>
                    {bannerUrl && (
                      <button
                        type="button"
                        onClick={() => setBannerUrl('')}
                        className="text-[10px] text-rose-500 hover:text-rose-700"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="relative h-20 w-full rounded-md overflow-hidden bg-slate-100 border flex items-center justify-center">
                    {bannerUrl ? (
                      <img src={bannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400">Sin banner</span>
                    )}
                    {uploadingBanner && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-xs font-medium text-teal-700">
                        <Loader2 className="h-4 w-4 animate-spin mr-1" /> Subiendo...
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="cursor-pointer flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingBanner}
                        onChange={(e) => handleUploadImage(e, 'banner')}
                      />
                      <div className="flex items-center justify-center gap-1 text-[11px] py-1.5 px-2 rounded border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium">
                        <Upload className="h-3 w-3" /> Subir archivo
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-slate-700">Logotipo / Avatar</Label>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl('')}
                        className="text-[10px] text-rose-500 hover:text-rose-700"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden bg-slate-100 border flex items-center justify-center shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="h-5 w-5 text-slate-400" />
                      )}
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="cursor-pointer block">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingLogo}
                          onChange={(e) => handleUploadImage(e, 'logo')}
                        />
                        <div className="flex items-center justify-center gap-1 text-[11px] py-1.5 px-2 rounded border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 font-medium">
                          <Upload className="h-3 w-3" /> Subir logotipo
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. CREDENCIALES Y ESTADO DE LA CUENTA */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <KeyRound className="h-4 w-4 text-slate-700" />
                5. Credenciales de Acceso al Portal de Farmacia
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-slate-700">Correo Electrónico de Acceso *</Label>
                  <Input
                    type="email"
                    placeholder="farmacia.sucursal@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-medium text-slate-700">
                      {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-teal-600 hover:underline flex items-center gap-1"
                    >
                      {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isEditing ? 'Dejar en blanco para mantener actual' : 'Contraseña segura'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!isEditing}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <Label className="text-xs font-semibold text-slate-900">Cuenta de Farmacia Activa y Verificada</Label>
                <p className="text-[11px] text-muted-foreground">
                  Al estar activa, la farmacia accede gratis al visor de récipes por cédula y aparece en el directorio de su ciudad.
                </p>
              </div>
              <Switch
                checked={status === 'active'}
                onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Guardar Datos y Convenio' : 'Habilitar Farmacia'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              ¿Eliminar Farmacia Aliada?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el registro de <strong>{pharmacyToDelete?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePharmacy} className="bg-rose-600 hover:bg-rose-700 text-white">
              Eliminar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

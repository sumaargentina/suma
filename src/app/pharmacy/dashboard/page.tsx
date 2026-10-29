"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Store, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  LogOut, 
  Pill, 
  Stethoscope, 
  MapPin, 
  Check, 
  Loader2, 
  ExternalLink,
  Lock,
  FileText,
  AlertCircle,
  Navigation,
  Upload,
  Camera,
  ImageIcon,
  Sparkles,
  Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { uploadPublicImage } from '@/lib/supabaseService';
import { PharmacyCard } from '@/components/pharmacy/pharmacy-card';
import { PharmacyB2BModule } from '@/components/pharmacy/pharmacy-b2b-module';
import { HealthCampaignsManager } from '@/components/medical/health-campaigns-manager';
import { Handshake, Crown, HeartHandshake } from 'lucide-react';

interface PatientData {
  id: string;
  name: string;
  cedula: string;
  age: number | null;
  gender: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

interface PrescriptionRecord {
  id: string;
  recipeCode: string;
  visitDate: string;
  prescription: string;
  treatmentPlan?: string;
  diagnosis?: string;
  prescriptionExpiresAt?: string | null;
  calculatedStatus: 'active' | 'expiring_soon' | 'expired' | 'dispensed';
  recipeStatus: string;
  dispensedByPharmacyId?: string | null;
  dispensedByPharmacyName?: string | null;
  dispensedAt?: string | null;
  dispensationNotes?: string | null;
  doctor: {
    id?: string;
    name: string;
    specialty: string;
    medical_license?: string;
    phone?: string;
    whatsapp?: string;
    city?: string;
  };
  createdAt: string;
}

export default function PharmacyDashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Modal para Suministrar Medicamentos
  const [isDispenseModalOpen, setIsDispenseModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PrescriptionRecord | null>(null);
  const [selectedMedsToDispense, setSelectedMedsToDispense] = useState<string[]>([]);
  const [pharmacistName, setPharmacistName] = useState('');
  const [pharmacistLicense, setPharmacistLicense] = useState('');
  const [dispensationNotes, setDispensationNotes] = useState('');
  const [isDispensing, setIsDispensing] = useState(false);

  // Tabs & Historial
  const [activeTab, setActiveTab] = useState<'search' | 'b2b' | 'campaigns' | 'history' | 'location'>('search');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  // Modal Plan Pro Alianza B2B
  const [isProPlanModalOpen, setIsProPlanModalOpen] = useState(false);
  const [requestingProPlan, setRequestingProPlan] = useState(false);
  const [hasRequestedProPlan, setHasRequestedProPlan] = useState(false);

  // Tab Ubicación y Datos de Sede
  const [locationForm, setLocationForm] = useState({
    name: '',
    branchName: '',
    chainName: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    latitude: '',
    longitude: '',
    logoUrl: '',
    bannerUrl: '',
    promotionalTagline: '',
    is24Hours: false,
    deliveryAvailable: false,
  });
  const [savingLocation, setSavingLocation] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const loadPharmacyData = async () => {
    if (!user?.id) return;
    try {
      setLoadingLocation(true);
      const res = await fetch('/api/pharmacies');
      if (res.ok) {
        const all = await res.json();
        const current = all.find((p: any) => p.id === user.id || p.email === user.email);
        if (current) {
          setLocationForm({
            name: current.name || user.name || '',
            branchName: current.branchName || current.branch_name || '',
            chainName: current.chainName || current.chain_name || '',
            address: current.address || '',
            city: current.city || '',
            state: current.state || 'Monagas',
            phone: current.phone || '',
            latitude: current.latitude ? String(current.latitude) : '',
            longitude: current.longitude ? String(current.longitude) : '',
            logoUrl: current.logoUrl || current.logo_url || '',
            bannerUrl: current.bannerUrl || current.banner_url || current.bannerImage || current.banner_image || '',
            promotionalTagline: current.promotionalTagline || current.promotional_tagline || '',
            is24Hours: Boolean(current.is24Hours || current.is_24_hours),
            deliveryAvailable: Boolean(current.deliveryAvailable || current.delivery_available),
          });
        }
      }
    } catch (e) {
      console.error('Error cargando datos de sede:', e);
    } finally {
      setLoadingLocation(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadPharmacyData();
    }
  }, [user?.id]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl' | 'bannerUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isBanner = field === 'bannerUrl';
    if (isBanner) setUploadingBanner(true);
    else setUploadingLogo(true);

    try {
      const folder = isBanner ? 'pharmacies/banners' : 'pharmacies/logos';
      const publicUrl = await uploadPublicImage(file, 'profile-images', folder);
      setLocationForm(prev => ({ ...prev, [field]: publicUrl }));
      toast({
        title: isBanner ? 'Banner WebP cargado exitosamente' : 'Logotipo WebP cargado exitosamente',
        description: 'La imagen fue optimizada en formato WebP. Haz clic en "Guardar Ubicación y Datos" para publicar.',
      });
    } catch (err: any) {
      console.error('Error subiendo imagen:', err);
      toast({
        variant: 'destructive',
        title: 'Error al subir imagen',
        description: err.message || 'No se pudo subir la imagen.',
      });
    } finally {
      if (isBanner) setUploadingBanner(false);
      else setUploadingLogo(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocalización no soportada',
        description: 'Tu navegador no permite obtener la ubicación GPS.',
      });
      return;
    }
    setLocatingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocationForm(prev => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocatingGPS(false);
        toast({
          title: 'Coordenadas GPS obtenidas',
          description: `Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      (err) => {
        setLocatingGPS(false);
        toast({
          variant: 'destructive',
          title: 'No se pudo obtener la ubicación GPS',
          description: err.message,
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!locationForm.address.trim() || !locationForm.city.trim() || !locationForm.phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos requeridos incompletos',
        description: 'La dirección, ciudad y teléfono/WhatsApp de contacto son obligatorios para que los pacientes puedan consultar disponibilidad.',
      });
      return;
    }

    try {
      setSavingLocation(true);
      const res = await fetch('/api/pharmacies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          name: locationForm.name.trim() || user.name,
          chainName: locationForm.chainName.trim() || null,
          branchName: locationForm.branchName.trim() || null,
          address: locationForm.address.trim(),
          city: locationForm.city.trim(),
          state: locationForm.state.trim() || 'Monagas',
          phone: locationForm.phone.trim(),
          latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : null,
          longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : null,
          is24Hours: locationForm.is24Hours,
          deliveryAvailable: locationForm.deliveryAvailable,
          promotionalTagline: locationForm.promotionalTagline.trim() || null,
          logoUrl: locationForm.logoUrl.trim() || null,
          bannerUrl: locationForm.bannerUrl.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');

      toast({
        title: 'Ubicación y perfil publicitario actualizados',
        description: 'Tu banner WebP, logotipo, eslogan y datos ya son visibles en los récipes y directorio.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err.message || 'No se pudo guardar la información.',
      });
    } finally {
      setSavingLocation(false);
    }
  };

  const loadHistory = async () => {
    if (!user?.id) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`/api/pharmacy/history?pharmacyId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data);
      }
    } catch (err) {
      console.error('Error cargando historial de la farmacia:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Protección de Ruta
  useEffect(() => {
    if (!loading && (!user || (user.role !== 'pharmacy' && user.role !== 'admin'))) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      toast({
        variant: 'destructive',
        title: 'Ingresa un dato de búsqueda',
        description: 'Escribe el número de cédula del paciente o el código del récipe.'
      });
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);
      setPatient(null);
      setPrescriptions([]);

      const res = await fetch('/api/pharmacy/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al realizar la búsqueda');
      }

      if (data.patient) {
        setPatient(data.patient);
      }
      setPrescriptions(data.records || []);

      if ((!data.records || data.records.length === 0) && !data.patient) {
        toast({
          title: 'Sin resultados',
          description: data.message || 'No se encontraron récipes ni pacientes con ese criterio.',
        });
      }
    } catch (error: any) {
      console.error('Error buscando récipe:', error);
      toast({
        variant: 'destructive',
        title: 'Error de búsqueda',
        description: error.message || 'Ocurrió un error al consultar el sistema.'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const parseMedicationLines = (prescriptionText: string): string[] => {
    if (!prescriptionText) return [];
    return prescriptionText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
  };

  const handleOpenDispenseModal = (record: PrescriptionRecord) => {
    setSelectedRecord(record);
    const lines = parseMedicationLines(record.prescription);
    setSelectedMedsToDispense(lines);
    setPharmacistName('');
    setPharmacistLicense('');
    setDispensationNotes('');
    setIsDispenseModalOpen(true);
  };

  const handleConfirmDispense = async () => {
    if (!selectedRecord || !user) return;

    try {
      setIsDispensing(true);

      const branchName = user.branchName || (user as any).branch_name;
      const chainName = user.chainName || (user as any).chain_name;
      const pharmacyName = chainName || user.name || 'Farmacia Aliada';

      const res = await fetch('/api/pharmacy/dispense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: selectedRecord.id,
          pharmacyId: user.id,
          pharmacyName,
          branchName: branchName || undefined,
          city: user.city || undefined,
          pharmacistName: pharmacistName.trim() || undefined,
          pharmacistLicense: pharmacistLicense.trim() || undefined,
          notes: dispensationNotes.trim() || undefined,
          medicationsDelivered: selectedMedsToDispense
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'No se pudo suministrar el medicamento');
      }

      toast({
        title: '✅ Medicamentos Entregados y Récipe Bloqueado',
        description: `Se registró la entrega en el historial de la farmacia con los datos del médico Dr(a). ${selectedRecord.doctor?.name || 'Tratante'}. Ya no podrá ser entregado nuevamente.`,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-900'
      });

      setIsDispenseModalOpen(false);
      setSelectedRecord(null);

      // Refrescar la búsqueda y el historial para reflejar el estado en tiempo real
      handleSearch();
      loadHistory();

    } catch (error: any) {
      console.error('Error en dispensación:', error);
      toast({
        variant: 'destructive',
        title: 'No se pudo suministrar',
        description: error.message || 'Error al procesar la entrega.'
      });
    } finally {
      setIsDispensing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Nombre de display de la farmacia
  const branchDisplayName = user?.branchName || (user as any)?.branch_name;
  const chainDisplayName = user?.chainName || (user as any)?.chain_name;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-teal-50/20">
      
      {/* Barra Superior Unificada de la Farmacia */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Logo SUMA y Nombre de Sede */}
          <div className="flex items-center gap-3 shrink-0">
            <img
              src="/images/logo_suma.png"
              alt="SUMA Logo"
              className="h-9 w-auto object-contain"
            />
            <div className="hidden lg:flex flex-col border-l border-slate-200 pl-3">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 leading-tight truncate max-w-[180px]">
                  {chainDisplayName || user?.name || 'Farmacia Aliada'}
                </span>
                {branchDisplayName && (
                  <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[10px] font-semibold px-1.5 py-0">
                    {branchDisplayName}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Mostrador Activo
              </span>
            </div>
          </div>

          {/* Menú Central Tipo Cápsula (Idéntico a Médico, Admin, Paciente y Vendedora) */}
          <nav className="hidden md:flex items-center justify-center flex-1 mx-2">
            <div className="inline-flex items-center gap-1 bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('search')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'search'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Search className={`h-3.5 w-3.5 ${activeTab === 'search' ? 'text-white' : 'text-teal-600'}`} />
                <span>Mostrador</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('b2b')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'b2b'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <Handshake className={`h-3.5 w-3.5 ${activeTab === 'b2b' ? 'text-white' : 'text-teal-600'}`} />
                <span>Catálogo y Alianzas</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('campaigns')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'campaigns'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <HeartHandshake className={`h-3.5 w-3.5 ${activeTab === 'campaigns' ? 'text-white' : 'text-teal-600'}`} />
                <span>Jornadas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('history');
                  loadHistory();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <FileText className={`h-3.5 w-3.5 ${activeTab === 'history' ? 'text-white' : 'text-teal-600'}`} />
                <span>Historial</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('location');
                  loadPharmacyData();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === 'location'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <MapPin className={`h-3.5 w-3.5 ${activeTab === 'location' ? 'text-white' : 'text-teal-600'}`} />
                <span>Mi Sede</span>
              </button>
            </div>
          </nav>

          {/* Botones Plan Pro y Salir */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsProPlanModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl h-8 px-3 shadow-xs"
            >
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Plan Pro Alianza B2B</span>
              <span className="sm:hidden">Plan Pro</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-xs rounded-xl h-8 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-rose-600"
            >
              <LogOut className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>

        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Selector de Pestañas Móvil (Solo visible en pantallas pequeñas) */}
        <div className="flex md:hidden flex-wrap items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'search' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Mostrador
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('b2b')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'b2b' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <Handshake className="h-3.5 w-3.5" />
            Catálogo B2B
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'campaigns' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <HeartHandshake className="h-3.5 w-3.5" />
            Jornadas
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'history' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Historial
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('location');
              loadPharmacyData();
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'location' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            Mi Sede
          </button>
        </div>

        {activeTab === 'b2b' && user?.id && (
          <PharmacyB2BModule
            pharmacyId={user.id}
            pharmacyData={{
              id: user.id,
              name: locationForm.name || user.name || 'Farmacia Aliada',
              chainName: locationForm.chainName || chainDisplayName,
              branchName: locationForm.branchName || branchDisplayName,
              address: locationForm.address,
              city: locationForm.city || user.city || 'Maturín',
              state: locationForm.state || 'Monagas',
              phone: locationForm.phone,
              logoUrl: locationForm.logoUrl,
              bannerUrl: locationForm.bannerUrl,
              promotionalTagline: locationForm.promotionalTagline,
              is24Hours: locationForm.is24Hours,
              deliveryAvailable: locationForm.deliveryAvailable,
              latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : undefined,
              longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : undefined,
            }}
            onPharmacyUpdated={loadPharmacyData}
          />
        )}

        {activeTab === 'campaigns' && user?.id && (
          <HealthCampaignsManager
            organizerId={user.id}
            organizerRole="pharmacy"
            organizerName={locationForm.chainName || locationForm.name || user.name || 'Farmacia Aliada'}
            organizerLogo={locationForm.logoUrl || undefined}
          />
        )}

        {activeTab === 'search' && (
          <div className="space-y-8">
            {/* Buscador de Récipes en Mostrador */}
            <Card className="border-teal-200 bg-white shadow-md rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 text-white p-6 sm:p-7">
            <div className="max-w-2xl">
              <span className="text-xs uppercase tracking-wider font-bold text-teal-300 bg-teal-900/60 px-2.5 py-1 rounded-full border border-teal-600/40 inline-block mb-2">
                Validación Oficial de Prescripciones
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Búsqueda y Despacho de Récipes
              </h1>
              <p className="text-sm text-teal-100/90 mt-1 leading-relaxed">
                Ingresa el número de cédula del paciente o el código del récipe médico (ej. <code className="bg-teal-950/80 px-1.5 py-0.5 rounded text-teal-200">SUMA-REC-XXXXXXXX</code>) para verificar vigencia y surtir medicamentos.
              </p>
            </div>

            <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ej: V-12345678  ó  SUMA-REC-C55B845C"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 text-base bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border-0 shadow-inner focus-visible:ring-2 focus-visible:ring-teal-400 font-medium"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching}
                className="h-12 px-6 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold shadow-md text-sm shrink-0 transition-all"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Consultar Récipe
              </Button>
            </form>
          </div>
        </Card>

        {/* Datos Básicos del Paciente */}
        {patient && (
          <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden animate-in fade-in-50">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{patient.name}</h3>
                    <p className="text-xs text-muted-foreground">Datos del paciente registrado</p>
                  </div>
                </div>
                <Badge className="bg-slate-100 text-slate-800 border-slate-200 font-mono text-xs px-2.5 py-1">
                  C.I.: {patient.cedula || 'N/A'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Edad:</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {patient.age ? `${patient.age} años` : 'No especificada'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Género:</span>
                  <span className="font-semibold text-slate-800 text-sm capitalize">
                    {patient.gender || 'No especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Teléfono:</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {patient.phone || 'No registrado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Ciudad:</span>
                  <span className="font-semibold text-slate-800 text-sm">
                    {patient.city || 'Venezuela'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listado de Récipes Encontrados */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Pill className="h-5 w-5 text-teal-600" />
                Récipes Médicos ({prescriptions.length})
              </h3>
              <span className="text-xs text-slate-500">
                Ordenados por fecha de emisión más reciente
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200 bg-white/50 p-8 text-center rounded-2xl">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-700">No hay récipes activos</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  El paciente consultado no tiene récipes médicos emitidos a través de SUMA Salud o el código de récipe es inválido.
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                {prescriptions.map((rec) => {
                  const isDispensed = rec.calculatedStatus === 'dispensed';
                  const isExpired = rec.calculatedStatus === 'expired';
                  const isExpiringSoon = rec.calculatedStatus === 'expiring_soon';

                  let formattedVisitDate = 'N/A';
                  try {
                    formattedVisitDate = format(parseISO(rec.visitDate), "dd 'de' MMMM, yyyy", { locale: es });
                  } catch {
                    formattedVisitDate = rec.visitDate;
                  }

                  let formattedExpiryDate = 'Sin fecha límite';
                  try {
                    if (rec.prescriptionExpiresAt) {
                      formattedExpiryDate = format(parseISO(rec.prescriptionExpiresAt), "dd/MM/yyyy");
                    }
                  } catch {
                    formattedExpiryDate = rec.prescriptionExpiresAt || 'Sin fecha límite';
                  }

                  let formattedDispensedDate = '';
                  try {
                    if (rec.dispensedAt) {
                      formattedDispensedDate = format(parseISO(rec.dispensedAt), "dd/MM/yyyy 'a las' hh:mm a");
                    }
                  } catch {
                    formattedDispensedDate = rec.dispensedAt || '';
                  }

                  return (
                    <Card 
                      key={rec.id} 
                      className={`border-2 rounded-2xl overflow-hidden transition-all shadow-xs ${
                        isDispensed
                          ? 'border-amber-300 bg-amber-50/20'
                          : isExpired
                          ? 'border-rose-300 bg-rose-50/20'
                          : 'border-teal-200 bg-white hover:border-teal-300'
                      }`}
                    >
                      {/* Cabecera del Récipe con Estado */}
                      <div className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b ${
                        isDispensed
                          ? 'bg-amber-100/60 border-amber-200'
                          : isExpired
                          ? 'bg-rose-100/60 border-rose-200'
                          : 'bg-teal-50/60 border-teal-100'
                      }`}>
                        
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-lg border shadow-xs text-slate-800">
                            {rec.recipeCode}
                          </span>
                          <span className="text-xs text-slate-600">
                            Emitido: <strong>{formattedVisitDate}</strong>
                          </span>
                        </div>

                        {/* Badges de Estado */}
                        <div>
                          {isDispensed && (
                            <Badge className="bg-amber-600 hover:bg-amber-600 text-white text-xs font-semibold px-2.5 py-1 flex items-center gap-1 shadow-xs">
                              <Lock className="h-3 w-3" /> Suministrado Previamente
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-xs font-semibold px-2.5 py-1 flex items-center gap-1 shadow-xs">
                              <AlertCircle className="h-3 w-3" /> Récipe Vencido
                            </Badge>
                          )}
                          {!isDispensed && !isExpired && isExpiringSoon && (
                            <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-xs font-semibold px-2.5 py-1 flex items-center gap-1 shadow-xs">
                              <Clock className="h-3 w-3" /> Por Vencer
                            </Badge>
                          )}
                          {!isDispensed && !isExpired && !isExpiringSoon && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 flex items-center gap-1 shadow-xs">
                              <CheckCircle2 className="h-3 w-3" /> Vigente para Despacho
                            </Badge>
                          )}
                        </div>

                      </div>

                      {/* Cuerpo de la Prescripción */}
                      <CardContent className="p-5 sm:p-6 space-y-5">
                        
                        {/* Datos del Médico Tratante */}
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-teal-600 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-800">Dr(a). {rec.doctor.name}</span>
                              <span className="text-slate-500 ml-1.5">• {rec.doctor.specialty}</span>
                              {rec.doctor.medical_license && (
                                <span className="text-slate-500 ml-1.5">({rec.doctor.medical_license})</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-slate-600">
                            {rec.prescriptionExpiresAt && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-teal-600" />
                                Vigencia: <strong>{formattedExpiryDate}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Listado de Medicamentos Uno por Uno con Control Estricto de Récipe */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <Label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Pill className="h-3.5 w-3.5 text-teal-600" />
                              Medicamentos Prescritos (Bajo Control de Récipe)
                            </Label>
                            <Badge variant="outline" className="text-[10px] border-teal-200 bg-teal-50 text-teal-900 font-semibold">
                              <Lock className="h-3 w-3 mr-1 text-teal-700" />
                              Medicamentos Delicados • Entrega Única
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {parseMedicationLines(rec.prescription).map((medLine, mIdx) => {
                              const cleanMedLine = medLine.replace(/\s*\[SOLO CON R[EÉ]CIPE\s*\-\s*ENTREGA [UÚ]NICA\]/gi, '').trim();
                              return (
                                <div
                                  key={mIdx}
                                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                    isDispensed
                                      ? 'bg-amber-50/70 border-amber-300'
                                      : 'bg-teal-50/30 border-teal-200/80'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5">
                                    <span className={`h-6 w-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                                      isDispensed ? 'bg-amber-600 text-white' : 'bg-teal-600 text-white'
                                    }`}>
                                      {mIdx + 1}
                                    </span>
                                    <div>
                                      <p className={`text-sm font-bold ${isDispensed ? 'text-amber-950 line-through decoration-amber-600/60' : 'text-slate-900'}`}>
                                        {cleanMedLine.replace(/^\d+[\.\)\-]\s*/, '')}
                                      </p>
                                      {isDispensed ? (
                                        <p className="text-xs font-bold text-rose-700 mt-1 flex items-center gap-1">
                                          <Lock className="h-3.5 w-3.5 shrink-0" />
                                          ⛔ Ya no se puede entregar más este medicamento porque ya se entregó en: {rec.dispensedByPharmacyName || 'Farmacia Aliada'} ({formattedDispensedDate})
                                        </p>
                                      ) : (
                                        <p className="text-[11px] text-teal-800 mt-0.5 flex items-center gap-1">
                                          <Lock className="h-3 w-3 text-teal-600" />
                                          Sujeto a récipe médico • Al marcarse entregado quedará bloqueado en todas las farmacias
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="shrink-0 self-end sm:self-center">
                                    {isDispensed ? (
                                      <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-[10px] font-bold">
                                        ⛔ Entregado — Bloqueado
                                      </Badge>
                                    ) : isExpired ? (
                                      <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">
                                        Récipe Vencido
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 text-[10px] font-semibold">
                                        Disponible para entregar
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Diagnóstico (si aplica) */}
                        {rec.diagnosis && (
                          <div className="text-xs text-slate-600">
                            <strong className="text-slate-800">Diagnóstico Presuntivo / Definitivo:</strong> {rec.diagnosis}
                          </div>
                        )}

                        {/* ALERTA: Si ya fue suministrado (CONTROL ANTI-DOBLE ENTREGA) */}
                        {isDispensed && (
                          <div className="bg-amber-100/90 border-2 border-amber-400 rounded-xl p-4 flex items-start gap-3 text-amber-950 shadow-xs">
                            <AlertTriangle className="h-5 w-5 text-amber-800 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                              <p className="font-extrabold text-amber-950 text-sm uppercase">
                                ⛔ YA NO SE PUEDE ENTREGAR MÁS ESTE MEDICAMENTO — RÉCIPE YA DESPACHADO
                              </p>
                              <p className="leading-relaxed">
                                Este récipe (emitido por <strong>Dr(a). {rec.doctor.name}</strong>) ya fue entregado en: <strong>{rec.dispensedByPharmacyName || 'Farmacia Aliada'}</strong> el <strong>{formattedDispensedDate}</strong>.
                              </p>
                              {rec.dispensationNotes && (
                                <p className="text-amber-900 font-medium bg-white/70 px-2.5 py-1.5 rounded-lg border border-amber-300 mt-1">
                                  Detalle de entrega registrada: &quot;{rec.dispensationNotes}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* ALERTA: Si está vencido */}
                        {isExpired && (
                          <div className="bg-rose-100/80 border-2 border-rose-300 rounded-xl p-4 flex items-start gap-3 text-rose-950">
                            <ShieldAlert className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-rose-900 text-sm">
                                ⛔ RÉCIPE EXPIRADO
                              </p>
                              <p className="leading-relaxed">
                                La validez médica para surtir este récipe culminó el <strong>{formattedExpiryDate}</strong>. Indique al paciente acudir a consulta para renovar su tratamiento.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Acciones del Mostrador */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-3 flex-wrap">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/ver-recipe/${rec.id}`, '_blank')}
                            className="text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Ver formato oficial completo
                          </Button>

                          {/* Botón de Suministro */}
                          {isDispensed ? (
                            <Button disabled className="bg-slate-200 text-slate-500 cursor-not-allowed text-xs font-semibold">
                              <Lock className="h-3.5 w-3.5 mr-1.5" />
                              Ya Suministrado
                            </Button>
                          ) : isExpired ? (
                            <Button disabled className="bg-slate-200 text-slate-500 cursor-not-allowed text-xs font-semibold">
                              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                              Expirado
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => handleOpenDispenseModal(rec)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-xs transition-all"
                            >
                              <Check className="h-4 w-4 mr-1.5" />
                              Suministrar Medicamentos
                            </Button>
                          )}
                        </div>

                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )}

        {/* Tab Historial de Suministros y Estadísticas de Médicos */}
        {activeTab === 'history' && (() => {
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          const todayDeliveries = historyRecords.filter(r => r.dispensedAt && r.dispensedAt.startsWith(todayStr)).length;
          const uniquePatientsCount = new Set(historyRecords.map(r => r.patientCedula !== 'N/A' ? r.patientCedula : r.patientName)).size;

          // Agrupar estadísticas por Médico Prescriptor
          const doctorStatsMap = new Map<string, {
            name: string;
            specialty: string;
            license: string;
            city: string;
            count: number;
            lastDispensedAt: string;
          }>();

          historyRecords.forEach((item) => {
            const key = item.doctorId || item.doctorName || 'Médico Tratante';
            const existing = doctorStatsMap.get(key);
            if (existing) {
              existing.count += 1;
              if (item.dispensedAt && item.dispensedAt > existing.lastDispensedAt) {
                existing.lastDispensedAt = item.dispensedAt;
              }
            } else {
              doctorStatsMap.set(key, {
                name: item.doctorName || 'Médico Tratante',
                specialty: item.doctorSpecialty || 'Especialista',
                license: item.doctorLicense || '',
                city: item.doctorCity || '',
                count: 1,
                lastDispensedAt: item.dispensedAt || ''
              });
            }
          });

          const doctorStatsList = Array.from(doctorStatsMap.values()).sort((a, b) => b.count - a.count);

          const filteredHistory = historyRecords.filter((item) => {
            if (!historySearch.trim()) return true;
            const q = historySearch.toLowerCase();
            return (
              (item.patientName || '').toLowerCase().includes(q) ||
              (item.patientCedula || '').toLowerCase().includes(q) ||
              (item.doctorName || '').toLowerCase().includes(q) ||
              (item.doctorSpecialty || '').toLowerCase().includes(q) ||
              (item.recipeCode || '').toLowerCase().includes(q) ||
              (item.prescription || '').toLowerCase().includes(q)
            );
          });

          return (
            <div className="space-y-6 animate-in fade-in-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-teal-600" />
                    Historial de Récipes Entregados y Estadísticas Médicas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Control estricto de medicamentos entregados bajo récipe, pacientes atendidos y médicos prescriptores.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="text-xs border-slate-200 self-start sm:self-auto"
                >
                  {loadingHistory ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Actualizar Estadísticas
                </Button>
              </div>

              {/* KPI Cards de Estadísticas de la Farmacia */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-teal-200 bg-white shadow-2xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">Total Récipes Entregados</span>
                      <span className="text-2xl font-extrabold text-teal-900 mt-1 block">{historyRecords.length}</span>
                      <span className="text-[11px] text-teal-700 font-medium">Auditados y bloqueados</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                      <Pill className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-emerald-200 bg-white shadow-2xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">Entregados Hoy</span>
                      <span className="text-2xl font-extrabold text-emerald-900 mt-1 block">{todayDeliveries}</span>
                      <span className="text-[11px] text-emerald-700 font-medium">Jornada del día</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-white shadow-2xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">Médicos Prescriptores</span>
                      <span className="text-2xl font-extrabold text-blue-900 mt-1 block">{doctorStatsList.length}</span>
                      <span className="text-[11px] text-blue-700 font-medium">Con récipes recibidos</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-indigo-200 bg-white shadow-2xs">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase text-slate-500 block">Pacientes Atendidos</span>
                      <span className="text-2xl font-extrabold text-indigo-900 mt-1 block">{uniquePatientsCount}</span>
                      <span className="text-[11px] text-indigo-700 font-medium">Pacientes únicos</span>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Estadísticas por Médico Prescriptor */}
              {doctorStatsList.length > 0 && (
                <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
                  <CardHeader className="py-3.5 px-5 bg-slate-50 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-teal-600" />
                      Estadísticas de Récipes por Médico Tratante ({doctorStatsList.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {doctorStatsList.map((docStat, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              Dr(a). {docStat.name}
                            </p>
                            <p className="text-[11px] text-teal-700 font-medium truncate">
                              {docStat.specialty}
                              {docStat.license ? ` • M.P.: ${docStat.license}` : ''}
                            </p>
                            {docStat.lastDispensedAt && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Última entrega: {format(parseISO(docStat.lastDispensedAt), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-teal-600 hover:bg-teal-600 text-white font-bold text-xs px-2.5 py-1 shrink-0">
                            {docStat.count} {docStat.count === 1 ? 'récipe' : 'récipes'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Buscador en el Historial */}
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filtrar historial por cédula, paciente, médico tratante, código de récipe o medicamento..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-10 bg-white border-slate-200 h-10 text-xs"
                />
              </div>

              <Card className="shadow-xs border-slate-200 overflow-hidden bg-white">
                <CardContent className="p-0">
                  {loadingHistory ? (
                    <div className="flex items-center justify-center p-12 text-muted-foreground text-sm">
                      <Loader2 className="h-5 w-5 animate-spin mr-2 text-teal-600" />
                      Cargando historial de suministros...
                    </div>
                  ) : filteredHistory.length === 0 ? (
                    <div className="text-center p-12">
                      <Pill className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-semibold text-slate-800 text-sm">No se encontraron récipes en el historial</h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Cuando valides y suministres medicamentos en el mostrador, se guardarán aquí junto con el médico que los emitió.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead className="font-semibold text-slate-700">Fecha y Hora</TableHead>
                          <TableHead className="font-semibold text-slate-700">Código Récipe</TableHead>
                          <TableHead className="font-semibold text-slate-700">Paciente</TableHead>
                          <TableHead className="font-semibold text-slate-700">Médico Prescriptor</TableHead>
                          <TableHead className="font-semibold text-slate-700">Medicamentos Entregados</TableHead>
                          <TableHead className="font-semibold text-slate-700">Detalle / Auditoría</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Récipe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/80">
                            <TableCell className="text-xs font-medium text-slate-700 whitespace-nowrap">
                              {item.dispensedAt ? format(parseISO(item.dispensedAt), "dd/MM/yyyy 'a las' hh:mm a") : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200 px-2 py-0.5 rounded">
                                {item.recipeCode}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-slate-900 text-xs">{item.patientName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">C.I.: {item.patientCedula}</div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              <div className="font-bold text-slate-900">Dr(a). {item.doctorName}</div>
                              {item.doctorSpecialty && (
                                <span className="block text-[11px] text-teal-700 font-medium">{item.doctorSpecialty}</span>
                              )}
                              {item.doctorLicense && (
                                <span className="block text-[10px] text-slate-500 font-mono">M.P.: {item.doctorLicense}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-slate-800 max-w-xs whitespace-pre-wrap">
                              {item.prescription?.replace(/\s*\[SOLO CON R[EÉ]CIPE\s*\-\s*ENTREGA [UÚ]NICA\]/gi, '')}
                            </TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-[180px]" title={item.dispensationNotes || ''}>
                              <span className="line-clamp-2">{item.dispensationNotes || 'Entregado y bloqueado'}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(`/ver-recipe/${item.id}`, '_blank')}
                                className="text-xs text-teal-700 hover:text-teal-800 hover:bg-teal-50 h-7 px-2"
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ver
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })()}

        {/* Tab Mi Sede y Ubicación en Mapa */}
        {activeTab === 'location' && (
          <div className="space-y-6 animate-in fade-in-50">
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-7">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/30 flex-shrink-0">
                    <MapPin className="h-6 w-6 text-emerald-300" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">
                      Ubicación de la Sede y Datos Públicos
                    </h2>
                    <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
                      Configura la dirección y coordenadas exactas para aparecer en el Mapa interactivo de SUMA y el Buscador público de Farmacias.
                    </p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 sm:p-8">
                {loadingLocation ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
                    <span className="text-xs text-slate-500">Cargando datos de la sede...</span>
                  </div>
                ) : (
                  <form onSubmit={handleSaveLocation} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Nombre de Cadena / Franquicia (Opcional, ej: Farmatodo)
                        </Label>
                        <Input
                          value={locationForm.chainName}
                          onChange={(e) => setLocationForm({ ...locationForm, chainName: e.target.value })}
                          placeholder="Ej: Farmatodo / Locatel / Farmacia Independiente"
                          className="rounded-xl h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Nombre de Sucursal / Sede
                        </Label>
                        <Input
                          value={locationForm.branchName}
                          onChange={(e) => setLocationForm({ ...locationForm, branchName: e.target.value })}
                          placeholder="Ej: Sucursal Las Avenidas / Sede Central"
                          className="rounded-xl h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Ciudad <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={locationForm.city}
                          onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                          placeholder="Ej: Maturín"
                          className="rounded-xl h-11"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Estado
                        </Label>
                        <Input
                          value={locationForm.state}
                          onChange={(e) => setLocationForm({ ...locationForm, state: e.target.value })}
                          placeholder="Ej: Monagas"
                          className="rounded-xl h-11"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Dirección Completa / Punto de Referencia <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={locationForm.address}
                          onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                          placeholder="Ej: Av. Las Avenidas, frente al C.C. Bolívar"
                          className="rounded-xl h-11"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Teléfono / WhatsApp de Contacto <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          value={locationForm.phone}
                          onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                          placeholder="Ej: +58 414 1234567"
                          className="rounded-xl h-11"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          Eslogan / Mensaje Publicitario (Se muestra en el Récipe)
                        </Label>
                        <Input
                          value={locationForm.promotionalTagline}
                          onChange={(e) => setLocationForm({ ...locationForm, promotionalTagline: e.target.value })}
                          placeholder="Ej: 15% de descuento en hipertensivos y delivery gratis con tu récipe SUMA"
                          className="rounded-xl h-11"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-wrap items-center gap-6 pt-2">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            id="is24HoursCheck"
                            checked={locationForm.is24Hours}
                            onChange={(e) => setLocationForm({ ...locationForm, is24Hours: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            🕒 Horario de Atención 24 Horas
                          </span>
                        </label>

                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            id="deliveryAvailableCheck"
                            checked={locationForm.deliveryAvailable}
                            onChange={(e) => setLocationForm({ ...locationForm, deliveryAvailable: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            🛵 Servicio de Delivery a Domicilio Disponible
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Sección de Imagen de Marca: Banner y Logotipo */}
                    <div className="bg-gradient-to-br from-slate-50 to-teal-50/30 border border-teal-200/60 rounded-2xl p-6 space-y-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-teal-600" />
                          <span>Identidad Visual (Foto de Portada y Logotipo Oficial)</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Estas imágenes aparecerán destacadas en tu tarjeta del directorio y buscador público de SUMA Salud.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1. Banner / Portada */}
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                              Foto de Portada / Banner
                            </Label>
                            {locationForm.bannerUrl && (
                              <button
                                type="button"
                                onClick={() => setLocationForm({ ...locationForm, bannerUrl: '' })}
                                className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Quitar
                              </button>
                            )}
                          </div>

                          {/* Preview Banner */}
                          <div className="relative h-28 w-full rounded-lg overflow-hidden bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                            {locationForm.bannerUrl ? (
                              <img
                                src={locationForm.bannerUrl}
                                alt="Vista previa del banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-3 text-slate-400">
                                <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-40" />
                                <span className="text-[11px] block">Sin banner personalizado</span>
                                <span className="text-[10px] text-slate-400/80">Se mostrará gradiente SUMA por defecto</span>
                              </div>
                            )}

                            {uploadingBanner && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-teal-700">
                                <Loader2 className="h-4 w-4 animate-spin" /> Subiendo banner...
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingBanner}
                                onChange={(e) => handleUploadImage(e, 'bannerUrl')}
                              />
                              <div className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-teal-300 bg-teal-50/50 hover:bg-teal-100/70 text-teal-800 font-semibold text-xs transition-colors">
                                <Upload className="h-3.5 w-3.5" />
                                {uploadingBanner ? 'Cargando...' : 'Subir Imagen de Portada'}
                              </div>
                            </label>
                          </div>
                          <p className="text-[10px] text-slate-400">Recomendado: 1200 x 400 px (horizontal, JPG/PNG/WebP)</p>
                        </div>

                        {/* 2. Logotipo / Foto de Perfil */}
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Camera className="h-3.5 w-3.5 text-teal-600" />
                              Logotipo de la Farmacia
                            </Label>
                            {locationForm.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setLocationForm({ ...locationForm, logoUrl: '' })}
                                className="text-[11px] text-rose-500 hover:text-rose-700 flex items-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" /> Quitar
                              </button>
                            )}
                          </div>

                          {/* Preview Logo */}
                          <div className="flex items-center gap-4">
                            <div className="relative h-20 w-20 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 flex-shrink-0 flex items-center justify-center shadow-xs">
                              {locationForm.logoUrl ? (
                                <img
                                  src={locationForm.logoUrl}
                                  alt="Vista previa del logo"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-2 text-slate-400">
                                  <Camera className="h-5 w-5 mx-auto opacity-40 mb-0.5" />
                                  <span className="text-[9px] block">Sin logo</span>
                                </div>
                              )}

                              {uploadingLogo && (
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                                  <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              <label className="cursor-pointer block">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingLogo}
                                  onChange={(e) => handleUploadImage(e, 'logoUrl')}
                                />
                                <div className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-teal-300 bg-teal-50/50 hover:bg-teal-100/70 text-teal-800 font-semibold text-xs transition-colors">
                                  <Upload className="h-3.5 w-3.5" />
                                  {uploadingLogo ? 'Cargando...' : 'Subir Logotipo'}
                                </div>
                              </label>
                              <p className="text-[10px] text-slate-400">Recomendado: Cuadrado 400 x 400 px con fondo transparente o blanco.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vista Previa en Vivo de la Tarjeta */}
                      <div className="pt-2">
                        <Label className="text-xs font-bold text-slate-700 block mb-2">
                          Vista previa en tiempo real de tu tarjeta pública:
                        </Label>
                        <div className="max-w-md">
                          <PharmacyCard
                            pharmacy={{
                              id: user?.id || 'preview',
                              name: locationForm.name || user?.name || 'Nombre de la Farmacia',
                              email: user?.email || '',
                              chainName: locationForm.chainName,
                              branchName: locationForm.branchName,
                              address: locationForm.address || 'Dirección de la farmacia...',
                              city: locationForm.city || 'Ciudad',
                              state: locationForm.state || 'Monagas',
                              phone: locationForm.phone || '+58 414 0000000',
                              is24Hours: locationForm.is24Hours,
                              logoUrl: locationForm.logoUrl,
                              bannerUrl: locationForm.bannerUrl,
                              latitude: locationForm.latitude ? parseFloat(locationForm.latitude) : undefined,
                              longitude: locationForm.longitude ? parseFloat(locationForm.longitude) : undefined,
                              isChain: Boolean(locationForm.chainName),
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Geolocation Section */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-emerald-600" />
                            <span>Coordenadas Geográficas (Para el Pin en el Mapa SUMA)</span>
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Si estás en la farmacia, puedes capturar las coordenadas GPS exactas automáticamente con un clic.
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleGetCurrentLocation}
                          disabled={locatingGPS}
                          className="text-xs border-teal-300 text-teal-700 hover:bg-teal-50 rounded-xl self-start sm:self-auto h-9"
                        >
                          {locatingGPS ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Navigation className="h-3.5 w-3.5 mr-1.5 text-teal-600" />
                          )}
                          Capturar GPS Actual
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Latitud</Label>
                          <Input
                            value={locationForm.latitude}
                            onChange={(e) => setLocationForm({ ...locationForm, latitude: e.target.value })}
                            placeholder="Ej: 9.746900"
                            className="font-mono text-xs rounded-xl bg-white h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-600">Longitud</Label>
                          <Input
                            value={locationForm.longitude}
                            onChange={(e) => setLocationForm({ ...locationForm, longitude: e.target.value })}
                            placeholder="Ej: -63.183100"
                            className="font-mono text-xs rounded-xl bg-white h-10"
                          />
                        </div>
                      </div>

                      {locationForm.latitude && locationForm.longitude && (
                        <div className="pt-2 flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${locationForm.latitude},${locationForm.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-700 hover:underline inline-flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
                            Comprobar ubicación en Google Maps
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                      <Button
                        type="submit"
                        disabled={savingLocation}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-6 h-10 shadow-sm"
                      >
                        {savingLocation && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Guardar Ubicación y Datos
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </main>

      {/* Modal de Confirmación de Suministro */}
      <Dialog open={isDispenseModalOpen} onOpenChange={setIsDispenseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Pill className="h-5 w-5 text-emerald-600" />
              Confirmar Suministro de Medicamentos
            </DialogTitle>
            <DialogDescription>
              Estás a punto de despachar el récipe <strong className="font-mono text-slate-800">{selectedRecord?.recipeCode}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Attribution Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
              <span className="font-bold block uppercase tracking-wider text-[10px] text-emerald-800">
                Atribución y Auditoría del Récipe:
              </span>
              <p>
                Farmacia: <strong>{chainDisplayName || user?.name} {branchDisplayName ? `(Sucursal ${branchDisplayName})` : ''}</strong> ({user?.city || 'Venezuela'}).
              </p>
              {selectedRecord?.doctor && (
                <p>
                  Médico Prescriptor: <strong>Dr(a). {selectedRecord.doctor.name}</strong> ({selectedRecord.doctor.specialty})
                </p>
              )}
              {patient && (
                <p>
                  Paciente: <strong>{patient.name}</strong> (C.I.: {patient.cedula})
                </p>
              )}
            </div>

            {/* Selección de medicamentos entregados bajo récipe */}
            {selectedRecord && parseMedicationLines(selectedRecord.prescription).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-800">
                  Medicamentos bajo Récipe a Entregar (Selecciona los que estás entregando):
                </Label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl border border-slate-200 bg-slate-50/60">
                  {parseMedicationLines(selectedRecord.prescription).map((line, idx) => {
                    const cleanLine = line.replace(/\s*\[SOLO CON R[EÉ]CIPE\s*\-\s*ENTREGA [UÚ]NICA\]/gi, '').trim();
                    const checked = selectedMedsToDispense.includes(line);
                    return (
                      <label
                        key={idx}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-teal-300 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMedsToDispense(prev => [...prev, line]);
                            } else {
                              setSelectedMedsToDispense(prev => prev.filter(item => item !== line));
                            }
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-slate-800 flex-1">{cleanLine}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Nombre del Farmacéutico en Mostrador (Opcional)
              </Label>
              <Input
                placeholder="Ej: Lcdo. Juan Pérez"
                value={pharmacistName}
                onChange={(e) => setPharmacistName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Notas de Entrega / Lote (Opcional)
              </Label>
              <Textarea
                placeholder="Ej: Entregado lote #A124 bajo control estricto de récipe..."
                value={dispensationNotes}
                onChange={(e) => setDispensationNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-950 leading-tight">
              🔒 <strong>Control Estricto de Medicamentos por Récipe:</strong> Al confirmar, este medicamento quedará marcado como <strong>&quot;Ya entregado en {chainDisplayName || user?.name}&quot;</strong> y ninguna otra farmacia podrá volver a entregarlo.
            </div>
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDispenseModalOpen(false)}
              disabled={isDispensing}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDispense}
              disabled={isDispensing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isDispensing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar y Bloquear Récipe
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Plan Pro Alianza B2B (exclusivo para farmacias que han iniciado sesión) */}
      <Dialog open={isProPlanModalOpen} onOpenChange={setIsProPlanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 mb-1">
              <Badge className="bg-amber-500 text-slate-950 font-extrabold px-3 py-1">
                <Crown className="h-3.5 w-3.5 mr-1 inline" />
                Plan Pro Alianza B2B
              </Badge>
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                🎁 ¡1er Mes 100% Gratis!
              </Badge>
            </div>
            <DialogTitle className="text-2xl font-extrabold text-slate-900">
              Potencia tu Farmacia con el Plan Pro Alianza B2B
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Aparece recomendada directamente dentro de los récipes de los médicos especialistas de tu ciudad y publica tu catálogo promocional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 text-white p-5 rounded-2xl border border-teal-500/30">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block">
                    Beneficio de Activación SUMA
                  </span>
                  <h4 className="text-xl font-extrabold mt-0.5">
                    1er Mes 100% Gratis • Luego $200 USD / mes (a tasa BCV)
                  </h4>
                  <p className="text-xs text-teal-100/90 mt-1">
                    Incluye soporte para convenios corporativos (% de descuento y meses de cortesía con Administración).
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h4 className="text-sm font-bold text-slate-900">
                ¿Qué incluye el Plan Pro Alianza B2B?
              </h4>
              <ul className="space-y-2.5 text-sm">
                {[
                  "Todo lo incluido en tu Cuenta Gratuita de Dispensación y Directorio",
                  "Match y Negociación B2B directa con médicos por ciudad o a nivel nacional",
                  "Aparición destacada como 'Farmacia Recomendada por tu Médico' dentro del récipe digital",
                  "Carga de catálogo de medicamentos (Excel masivo + Carga manual con imágenes WebP y stock)",
                  "Tarjeta comercial con Logo, Banner Publicitario y productos en promoción",
                  "Activación de Cupones de Descuento y botón de pedidos directos por WhatsApp",
                  "Estadísticas en tiempo real (ROI): vistas en récipes, clics en tu farmacia y conversiones",
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="bg-teal-600 rounded-full p-1 mt-0.5 shrink-0">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                    <span className="text-slate-700 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsProPlanModalOpen(false)}
            >
              Cerrar
            </Button>
            <Button
              type="button"
              disabled={requestingProPlan}
              onClick={async () => {
                if (!user?.id) return;
                try {
                  setRequestingProPlan(true);
                  const res = await fetch('/api/pharmacies', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: user.id,
                      requestedPlan: 'b2b',
                    }),
                  });
                  if (!res.ok) {
                    throw new Error('No se pudo registrar la solicitud del Plan Pro.');
                  }
                  setHasRequestedProPlan(true);
                  setIsProPlanModalOpen(false);
                  setActiveTab('b2b');
                  toast({
                    title: '👑 ¡Solicitud de Plan Pro Alianza B2B Enviada!',
                    description: 'Hemos registrado tu solicitud con tu 1er Mes Gratis.Ya puedes explorar y configurar tu módulo B2B.',
                  });
                } catch (err: any) {
                  toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: err.message || 'No se pudo procesar la solicitud.',
                  });
                } finally {
                  setRequestingProPlan(false);
                }
              }}
              className="bg-gradient-to-r from-amber-500 to-teal-600 hover:from-amber-600 hover:to-teal-700 text-white font-extrabold"
            >
              {requestingProPlan ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              {hasRequestedProPlan
                ? 'Ir a Mi Módulo Plan Pro Alianza B2B'
                : 'Solicitar Plan Pro Alianza B2B (1er Mes Gratis)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

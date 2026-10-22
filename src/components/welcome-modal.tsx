"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import {
  User,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Heart,
  Briefcase,
  GraduationCap,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { DOCUMENT_TYPES, DocumentType, Patient } from '@/lib/types';
import { CountryCodeSelect } from '@/components/ui/country-code-select';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';
import { validateCedula } from '@/lib/validation-utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const { user, updateUser } = useAuth();
  const { cities, isLoading } = useSettings();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const { toast } = useToast();
  const [fetchedCities, setFetchedCities] = useState<any[]>([]);
  const [isFetchingCities, setIsFetchingCities] = useState(false);

  // Fallback: Fetch cities via API if settings context is empty
  useEffect(() => {
    const fetchCitiesDirectly = async () => {
      if (cities.length === 0 && !isLoading) {
        setIsFetchingCities(true);
        try {
          const response = await fetch('/api/settings/cities');
          const data = await response.json();

          if (data?.cities && Array.isArray(data.cities)) {
            setFetchedCities(data.cities);
          }
        } catch (err) {
          console.error("Error fetching cities fallback:", err);
        } finally {
          setIsFetchingCities(false);
        }
      }
    };
    fetchCitiesDirectly();
  }, [cities.length, isLoading]);

  // Estado para el formulario de perfil
  const [birthDate, setBirthDate] = useState<string>('');
  const [gender, setGender] = useState<'masculino' | 'femenino' | ''>('');
  const [documentType, setDocumentType] = useState<DocumentType>('Cédula');
  const [cedulaPrefix, setCedulaPrefix] = useState<'V' | 'E'>('V');
  const [cedulaNumber, setCedulaNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [phone, setPhone] = useState('');
  const [locationData, setLocationData] = useState<LocationData>({
    country: 'VE',
    state: '',
    city: '',
    sector: '',
    address: ''
  });
  // Campos opcionales adicionales
  const [bloodType, setBloodType] = useState('');
  const [religion, setReligion] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [education, setEducation] = useState('');
  const [occupation, setOccupation] = useState('');

  // Validaciones en tiempo real de duplicados
  const [cedulaError, setCedulaError] = useState('');
  const [isCheckingCedula, setIsCheckingCedula] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  useEffect(() => {
    const clean = cedulaNumber.replace(/\D/g, '');
    if (!clean || clean.length < 5) {
      setCedulaError('');
      setIsCheckingCedula(false);
      return;
    }

    let cancelled = false;
    setIsCheckingCedula(true);
    const timer = setTimeout(async () => {
      try {
        const finalCedula = documentType === 'Cédula'
          ? `${cedulaPrefix}-${clean}`
          : cedulaNumber.trim().toUpperCase();
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'cedula',
            value: finalCedula,
            excludeId: user?.id
          })
        });
        const data = await res.json();
        if (!cancelled) {
          setCedulaError(data.isUnique === false ? (data.message || 'Esta cédula ya está siendo usada.') : '');
        }
      } catch {
        // Ignore network glitch
      } finally {
        if (!cancelled) setIsCheckingCedula(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [cedulaNumber, cedulaPrefix, documentType, user?.id]);

  useEffect(() => {
    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 7) {
      setPhoneError('');
      setIsCheckingPhone(false);
      return;
    }

    let cancelled = false;
    setIsCheckingPhone(true);
    const timer = setTimeout(async () => {
      try {
        const fullPhone = `${countryCode}${clean}`;
        const res = await fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'phone',
            value: fullPhone,
            excludeId: user?.id
          })
        });
        const data = await res.json();
        if (!cancelled) {
          setPhoneError(data.isUnique === false ? (data.message || 'Este número telefónico ya está siendo usado.') : '');
        }
      } catch {
        // Ignore
      } finally {
        if (!cancelled) setIsCheckingPhone(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone, countryCode, user?.id]);

  const steps = [
    {
      title: "¡Bienvenido a SUMA! 🎉",
      description: "Estamos emocionados de tenerte con nosotros. Completa tu perfil para comenzar.",
      icon: Sparkles,
      color: "text-blue-600"
    },
    {
      title: "Información Personal",
      description: "Cuéntanos un poco más sobre ti para personalizar tu experiencia.",
      icon: User,
      color: "text-green-600"
    },
    {
      title: "Información de Contacto",
      description: "Ayúdanos a mantenerte informado sobre tus citas y servicios.",
      icon: Phone,
      color: "text-purple-600"
    },
    {
      title: "Información Adicional",
      description: "Estos datos son opcionales pero útiles para tu atención médica.",
      icon: Heart,
      color: "text-rose-600"
    },
    {
      title: "¡Listo para empezar!",
      description: "Tu perfil está completo. Ya puedes explorar todos los servicios de SUMA.",
      icon: CheckCircle,
      color: "text-emerald-600"
    }
  ];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!birthDate || !gender || !cedulaNumber.trim()) {
        toast({
          variant: 'destructive',
          title: 'Campos obligatorios',
          description: 'Por favor completa tu fecha de nacimiento, género y documento de identidad.'
        });
        return;
      }
      if (cedulaError) {
        toast({
          variant: 'destructive',
          title: 'Documento en uso',
          description: cedulaError
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (!phone.trim() || !locationData.state || !locationData.city) {
        toast({
          variant: 'destructive',
          title: 'Campos obligatorios',
          description: 'Por favor ingresa tu teléfono, estado y ciudad.'
        });
        return;
      }
      if (phoneError) {
        toast({
          variant: 'destructive',
          title: 'Teléfono en uso',
          description: phoneError
        });
        return;
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteProfile = async () => {
    if (!user) return;

    const rawCedula = cedulaNumber.trim();
    const finalCedula = documentType === 'Cédula' 
      ? `${cedulaPrefix}-${rawCedula.replace(/\D/g, '')}` 
      : rawCedula.toUpperCase();

    if (!birthDate || !gender || !rawCedula || !phone || !locationData.state || !locationData.city) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos obligatorios incluyendo Documento, Teléfono, Estado y Ciudad.'
      });
      return;
    }

    if (cedulaError || phoneError) {
      toast({
        variant: 'destructive',
        title: 'Datos duplicados',
        description: cedulaError || phoneError
      });
      return;
    }

    const cedValidation = validateCedula(finalCedula, documentType);
    if (!cedValidation.isValid) {
      toast({
        variant: 'destructive',
        title: 'Documento inválido',
        description: documentType === 'Cédula' 
          ? 'Por favor ingresa un número de cédula válido (entre 6 y 10 dígitos).' 
          : 'Por favor ingresa un número de documento válido.'
      });
      return;
    }

    try {
      // Verificar en servidor que Cédula y Teléfono sean únicos
      const [cedRes, phoneRes] = await Promise.all([
        fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'cedula', value: finalCedula, excludeId: user.id })
        }).then(r => r.json()),
        fetch('/api/validate-unique', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'phone', value: `${countryCode}${phone}`, excludeId: user.id })
        }).then(r => r.json())
      ]);

      if (cedRes.isUnique === false) {
        setCedulaError(cedRes.message || 'Esta cédula ya está siendo usada.');
        toast({
          variant: 'destructive',
          title: 'Cédula en uso',
          description: cedRes.message || 'Esta cédula ya está siendo usada.'
        });
        setCurrentStep(1);
        return;
      }

      if (phoneRes.isUnique === false) {
        setPhoneError(phoneRes.message || 'Este número telefónico ya está siendo usado.');
        toast({
          variant: 'destructive',
          title: 'Teléfono en uso',
          description: phoneRes.message || 'Este número telefónico ya está siendo usado.'
        });
        setCurrentStep(2);
        return;
      }

      // Calcular edad
      const today = new Date();
      const birth = new Date(birthDate);
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }

      const updateData = {
        age: calculatedAge,
        birthDate: birthDate,
        gender: gender || null,
        documentType: documentType || 'Cédula',
        cedula: finalCedula,
        phone: phone ? `${countryCode}${phone}` : null,
        country: locationData.country || 'VE',
        state: locationData.state || null,
        city: locationData.city || null,
        sector: locationData.sector || null,
        address: locationData.address || null,
        bloodType: (bloodType || null) as Patient['bloodType'],
        religion: religion || null,
        maritalStatus: (maritalStatus || null) as Patient['maritalStatus'],
        education: education || null,
        occupation: occupation || null,
        profileCompleted: true
      };

      await updateUser(updateData);

      toast({
        title: "¡Perfil Completado!",
        description: "Tu información ha sido guardada correctamente.",
      });

      setCurrentStep(4);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar la información del perfil. Inténtalo de nuevo.",
      });
    }
  };

  const handleFinish = () => {
    onClose();
    router.push('/find-a-doctor');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              <Card className="text-center p-4">
                <div className="w-11 h-11 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                  <User className="w-5 h-5 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Perfil Completo</h4>
                <p className="text-xs text-gray-500 mt-1">Información personal</p>
              </Card>
              <Card className="text-center p-4">
                <div className="w-11 h-11 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <h4 className="font-medium text-sm">Contacto</h4>
                <p className="text-xs text-gray-500 mt-1">Datos de comunicación</p>
              </Card>
              <Card className="text-center p-4">
                <div className="w-11 h-11 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2.5">
                  <MapPin className="w-5 h-5 text-orange-600" />
                </div>
                <h4 className="font-medium text-sm">Ubicación</h4>
                <p className="text-xs text-gray-500 mt-1">Ciudad de residencia</p>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Fecha de Nacimiento *
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                />
                {birthDate && (
                  <p className="text-xs text-green-600 font-medium">
                    Edad calculada: {new Date().getFullYear() - new Date(birthDate).getFullYear() - (new Date().getMonth() < new Date(birthDate).getMonth() || (new Date().getMonth() === new Date(birthDate).getMonth() && new Date().getDate() < new Date(birthDate).getDate()) ? 1 : 0)} años
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Género *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino' | '')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                >
                  <option value="" disabled>Selecciona tu sexo</option>
                  <option value="masculino">Hombre (Masculino)</option>
                  <option value="femenino">Mujer (Femenino)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-3">
              <div className="space-y-1.5">
                <Label htmlFor="welcome-docType" className="text-xs font-medium text-gray-700">
                  Tipo de Documento
                </Label>
                <Select
                  value={documentType}
                  onValueChange={(val) => setDocumentType(val as DocumentType)}
                >
                  <SelectTrigger id="welcome-docType" className="w-full h-10">
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="welcome-cedula" className="text-xs font-medium text-gray-700">
                  {documentType === 'Pasaporte' 
                    ? 'Nro. de Pasaporte *' 
                    : documentType === 'DNI' 
                    ? 'Nro. de DNI *' 
                    : 'Nro. de Cédula de Identidad *'}
                </Label>
                {documentType === 'Cédula' ? (
                  <div className="flex gap-2 relative">
                    <Select value={cedulaPrefix} onValueChange={(val: 'V' | 'E') => setCedulaPrefix(val)}>
                      <SelectTrigger className="w-[95px] h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V - Ven</SelectItem>
                        <SelectItem value="E">E - Ext</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <input
                        id="welcome-cedula"
                        type="tel"
                        placeholder="Ej. 12345678"
                        value={cedulaNumber}
                        onChange={(e) => setCedulaNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className={cn(
                          "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 h-10",
                          cedulaError
                            ? "border-red-500 focus:ring-red-500 bg-red-50/30"
                            : "border-gray-300 focus:ring-blue-500"
                        )}
                        required
                      />
                      {isCheckingCedula && (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      id="welcome-cedula"
                      type="text"
                      placeholder={documentType === 'Pasaporte' ? 'Ej. ABC123456' : 'Ej. 12345678'}
                      value={cedulaNumber}
                      onChange={(e) => setCedulaNumber(e.target.value.toUpperCase().slice(0, 20))}
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 h-10",
                        cedulaError
                          ? "border-red-500 focus:ring-red-500 bg-red-50/30"
                          : "border-gray-300 focus:ring-blue-500"
                      )}
                      required
                    />
                    {isCheckingCedula && (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                    )}
                  </div>
                )}
                {cedulaError ? (
                  <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {cedulaError}
                  </p>
                ) : (
                  <p className="text-[11px] text-gray-500">
                    🔒 No se podrá modificar después por motivos de seguridad médica.
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-purple-600" />
                Teléfono / WhatsApp *
              </label>
              <div className="flex gap-2">
                <CountryCodeSelect
                  value={countryCode}
                  onChange={setCountryCode}
                  className="w-[110px]"
                />
                <div className="relative flex-1">
                  <input
                    type="tel"
                    placeholder="Ej: 412 123 4567"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('0')) val = val.slice(1);
                      setPhone(val);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 h-10",
                      phoneError
                        ? "border-red-500 focus:ring-red-500 bg-red-50/30"
                        : "border-gray-300 focus:ring-blue-500"
                    )}
                  />
                  {isCheckingPhone && (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-3" />
                  )}
                </div>
              </div>
              {phoneError && (
                <p className="text-xs font-medium text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {phoneError}
                </p>
              )}
            </div>

            <div className="border-t pt-3">
              <h4 className="text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                Ubicación Geográfica y Dirección
              </h4>
              <LocationSelector
                country={locationData.country}
                state={locationData.state}
                city={locationData.city}
                sector={locationData.sector}
                address={locationData.address}
                onLocationChange={setLocationData}
                showAddressFields={true}
                compact={true}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Tipo de Sangre
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Estado Civil
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union_libre">Unión Libre</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Nivel de Estudios
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="primario">Primario</option>
                  <option value="secundario">Secundario</option>
                  <option value="terciario">Terciario</option>
                  <option value="universitario">Universitario</option>
                  <option value="posgrado">Posgrado</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" />
                  Ocupación / Trabajo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Contador, Docente..."
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Religión
              </label>
              <input
                type="text"
                placeholder="Ej: Católica, Evangélica... (opcional)"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-5">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                ¡Perfil Completado! 🎉
              </h3>
              <p className="text-sm text-gray-600">
                Tu perfil está completo. Ya puedes explorar todos los servicios de SUMA y
                comenzar a buscar médicos especialistas.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <div className="shrink-0 px-6 py-4 border-b bg-slate-50/70">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            {steps[currentStep].description}
          </DialogDescription>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {renderStepContent()}
        </div>

        <div className="shrink-0 flex justify-between items-center px-6 py-3.5 border-t bg-slate-50">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && currentStep < 4 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                Atrás
              </Button>
            )}

            {currentStep < 3 && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={
                  (currentStep === 1 && (!!cedulaError || isCheckingCedula)) ||
                  (currentStep === 2 && (!!phoneError || isCheckingPhone))
                }
                className="flex items-center gap-2"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 3 && (
              <Button
                size="sm"
                onClick={handleCompleteProfile}
                disabled={!!cedulaError || !!phoneError}
                className="flex items-center gap-2"
              >
                Completar Perfil
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 4 && (
              <Button size="sm" onClick={handleFinish} className="flex items-center gap-2">
                ¡Empezar!
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

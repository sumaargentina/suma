"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
  GraduationCap
} from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';
import { COUNTRY_CODES, DOCUMENT_TYPES, DocumentType } from '@/lib/types';
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
            console.log("Cities fetched via API:", data.cities);
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

  const displayCities = cities.length > 0 ? cities : fetchedCities;
  const loadingCities = isLoading || isFetchingCities;

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

  const steps = [
    {
      title: "¡Bienvenido a SUMA! 🎉",
      description: "Estamos emocionados de tenerte con nosotros. Para brindarte la mejor experiencia, necesitamos que completes tu perfil.",
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

    // Validación de campos obligatorios
    if (!birthDate || !gender || !rawCedula || !phone || !locationData.state || !locationData.city) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos obligatorios incluyendo Documento, Teléfono, Estado y Ciudad.'
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
      // Verificar que la Cédula sea única
      const allPatients = await supabaseService.getPatients();
      const existingPatient = allPatients.find(p =>
        p.cedula && p.cedula.toLowerCase().replace(/[-.\s]/g, '') === finalCedula.toLowerCase().replace(/[-.\s]/g, '') && p.id !== user.id
      );

      if (existingPatient) {
        toast({
          variant: 'destructive',
          title: 'Documento ya registrado',
          description: 'Este documento de identidad ya está registrado por otro usuario.'
        });
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
        bloodType: bloodType || null,
        religion: religion || null,
        maritalStatus: maritalStatus || null,
        education: education || null,
        occupation: occupation || null,
        profileCompleted: true
      };

      console.log('Guardando perfil con datos:', updateData);
      await updateUser(updateData);

      toast({
        title: "¡Perfil Completado!",
        description: "Tu información ha sido guardada correctamente.",
      });

      setCurrentStep(4); // Ir al paso final
      // Cerrar la modal tras un pequeño delay para UX
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
    router.push('/find-a-doctor'); // Redirigir a buscar médicos
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <Card className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Perfil Completo</h4>
                <p className="text-xs text-gray-500 mt-1">Información personal</p>
              </Card>
              <Card className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6 text-purple-600" />
                </div>
                <h4 className="font-medium text-sm">Contacto</h4>
                <p className="text-xs text-gray-500 mt-1">Datos de comunicación</p>
              </Card>
              <Card className="text-center p-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <h4 className="font-medium text-sm">Ubicación</h4>
                <p className="text-xs text-gray-500 mt-1">Ciudad de residencia</p>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Información Personal
              </h3>
              <p className="text-gray-600 text-sm">
                Cuéntanos un poco más sobre ti para personalizar tu experiencia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de Nacimiento
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    if (e.target.value) {
                      const ageCalc = new Date().getFullYear() - new Date(e.target.value).getFullYear();
                      // Ajuste simple, una librería como date-fns es más precisa pero esto sirve para feedback visual inmediato
                      /* const today = new Date();
                      const birth = new Date(e.target.value);
                      let ageCalc = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                          ageCalc--;
                      } */
                    }
                  }}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {birthDate && (
                  <p className="text-sm text-green-600 font-medium">
                    Edad calculada: {new Date().getFullYear() - new Date(birthDate).getFullYear() - (new Date().getMonth() < new Date(birthDate).getMonth() || (new Date().getMonth() === new Date(birthDate).getMonth() && new Date().getDate() < new Date(birthDate).getDate()) ? 1 : 0)} años
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino' | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  <div className="flex gap-2">
                    <Select value={cedulaPrefix} onValueChange={(val: 'V' | 'E') => setCedulaPrefix(val)}>
                      <SelectTrigger className="w-[100px] h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V - Ven</SelectItem>
                        <SelectItem value="E">E - Ext</SelectItem>
                      </SelectContent>
                    </Select>
                    <input
                      id="welcome-cedula"
                      type="tel"
                      placeholder="Ej. 12345678"
                      value={cedulaNumber}
                      onChange={(e) => setCedulaNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-10"
                      required
                    />
                  </div>
                ) : (
                  <input
                    id="welcome-cedula"
                    type="text"
                    placeholder={documentType === 'Pasaporte' ? 'Ej. ABC123456' : 'Ej. 12345678'}
                    value={cedulaNumber}
                    onChange={(e) => setCedulaNumber(e.target.value.toUpperCase().slice(0, 20))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-10"
                    required
                  />
                )}
                <p className="text-[11px] text-gray-500">
                  🔒 No se podrá modificar después por motivos de seguridad médica.
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                <Phone className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Información de Contacto y Ubicación
              </h3>
              <p className="text-gray-600 text-xs">
                Selecciona tu país, estado y ciudad para conectarte con los mejores especialistas de tu zona.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-600" />
                  Teléfono / WhatsApp
                </label>
                <div className="flex gap-2">
                  <CountryCodeSelect
                    value={countryCode}
                    onChange={setCountryCode}
                    className="w-[110px]"
                  />
                  <input
                    type="tel"
                    placeholder="Ej: 412 123 4567"
                    value={phone}
                    onChange={(e) => {
                      // Solo números, sin ceros iniciales
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.startsWith('0')) val = val.slice(1);
                      setPhone(val);
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
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
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                <Heart className="w-8 h-8 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Información Adicional
              </h3>
              <p className="text-gray-600 text-sm">
                Estos datos son opcionales pero útiles para tu atención médica.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Tipo de Sangre
                </label>
                <select
                  value={bloodType}
                  onChange={(e) => setBloodType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Estado Civil
                </label>
                <select
                  value={maritalStatus}
                  onChange={(e) => setMaritalStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="soltero">Soltero/a</option>
                  <option value="casado">Casado/a</option>
                  <option value="divorciado">Divorciado/a</option>
                  <option value="viudo">Viudo/a</option>
                  <option value="union_libre">Unión Libre</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Nivel de Estudios
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="primario">Primario</option>
                  <option value="secundario">Secundario</option>
                  <option value="terciario">Terciario</option>
                  <option value="universitario">Universitario</option>
                  <option value="posgrado">Posgrado</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Ocupación / Trabajo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Contador, Docente..."
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                Religión
              </label>
              <input
                type="text"
                placeholder="Ej: Católica, Evangélica... (opcional)"
                value={religion}
                onChange={(e) => setReligion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900">
                ¡Perfil Completado! 🎉
              </h3>
              <p className="text-gray-600">
                Tu perfil está completo. Ya puedes explorar todos los servicios de SUMA y
                comenzar a buscar médicos especialistas.
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-blue-900 mb-2">¿Qué puedes hacer ahora?</h4>
              <ul className="text-sm text-blue-800 space-y-1 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Buscar médicos especialistas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Agendar citas médicas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Ver tu historial de citas
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Guardar médicos favoritos
                </li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            {steps[currentStep].title}
          </DialogTitle>
          <DialogDescription>
            {steps[currentStep].description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${index <= currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && currentStep < 4 && (
              <Button variant="outline" onClick={handleBack}>
                Atrás
              </Button>
            )}

            {currentStep < 3 && (
              <Button onClick={handleNext} className="flex items-center gap-2">
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 3 && (
              <Button onClick={handleCompleteProfile} className="flex items-center gap-2">
                Completar Perfil
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 4 && (
              <Button onClick={handleFinish} className="flex items-center gap-2">
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
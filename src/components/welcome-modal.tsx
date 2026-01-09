"use client";

import { useState } from 'react';
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
  Sparkles
} from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import * as supabaseService from '@/lib/supabaseService';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const { user, updateUser } = useAuth();
  const { cities } = useSettings();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const { toast } = useToast();

  // Estado para el formulario de perfil
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<'masculino' | 'femenino' | 'otro' | ''>('');
  const [cedula, setCedula] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');

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

    // Validación de campos obligatorios
    if (!age || !gender || !cedula || !phone || !city) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos antes de continuar.'
      });
      return;
    }

    // Validar formato de DNI argentino (7-8 dígitos)
    const dniRegex = /^\d{7,8}$/;
    if (!dniRegex.test(cedula)) {
      toast({
        variant: 'destructive',
        title: 'DNI inválido',
        description: 'Por favor ingresa un DNI válido (7-8 dígitos)'
      });
      return;
    }

    try {
      // Verificar que el DNI sea único
      const allPatients = await supabaseService.getPatients();
      const existingPatient = allPatients.find(p =>
        p.cedula && p.cedula.toLowerCase() === cedula.toLowerCase() && p.id !== user.id
      );

      if (existingPatient) {
        toast({
          variant: 'destructive',
          title: 'DNI ya registrado',
          description: 'Este DNI ya está registrado por otro paciente.'
        });
        return;
      }

      const updateData = {
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        cedula: cedula, // DNI sin transformación
        phone: phone || null,
        city: city || null,
        profileCompleted: true
      };

      console.log('Guardando perfil con datos:', updateData);
      await updateUser(updateData);

      toast({
        title: "¡Perfil Completado!",
        description: "Tu información ha sido guardada correctamente.",
      });

      setCurrentStep(3); // Ir al paso final
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
                  Edad
                </label>
                <input
                  type="number"
                  placeholder="Ej: 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Género
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'masculino' | 'femenino' | 'otro' | '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Selecciona tu sexo</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4" />
                DNI (Documento Nacional de Identidad) *
              </label>
              <input
                type="text"
                placeholder="12345678"
                value={cedula}
                onChange={(e) => {
                  // Solo permitir números
                  const numbersOnly = e.target.value.replace(/[^0-9]/g, '');
                  // Limitar a 8 dígitos
                  const limitedNumbers = numbersOnly.slice(0, 8);
                  setCedula(limitedNumbers);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500">
                Solo números (7-8 dígitos) - no se podrá modificar después
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Phone className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Información de Contacto
              </h3>
              <p className="text-gray-600 text-sm">
                Ayúdanos a mantenerte informado sobre tus citas y servicios.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="Ej: 1123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Ciudad
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="" disabled>Selecciona tu ciudad para búsquedas</option>
                  {cities.map((cityObj) => (
                    <option key={cityObj.name} value={cityObj.name}>{cityObj.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
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
            {currentStep > 0 && currentStep < 3 && (
              <Button variant="outline" onClick={handleBack}>
                Atrás
              </Button>
            )}

            {currentStep < 2 && (
              <Button onClick={handleNext} className="flex items-center gap-2">
                Continuar
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button onClick={handleCompleteProfile} className="flex items-center gap-2">
                Completar Perfil
                <CheckCircle className="w-4 h-4" />
              </Button>
            )}

            {currentStep === 3 && (
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
"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Store,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  Building2,
  FileText,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, LocationData } from "@/components/ui/location-selector";

function RegisterPharmacyContent() {
  const { getCountryPricing } = useSettings();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") === "b2b" ? "b2b" : "free";

  const [requestedPlan, setRequestedPlan] = useState<"free" | "b2b">(initialPlan);
  const [isChain, setIsChain] = useState(false);
  const [chainName, setChainName] = useState("");
  const [branchName, setBranchName] = useState("");
  const [commercialName, setCommercialName] = useState("");

  // Datos Oficiales de la Empresa
  const [legalName, setLegalName] = useState("");
  const [rif, setRif] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [regentName, setRegentName] = useState("");
  const [regentLicense, setRegentLicense] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("Representante Legal / Gerente");

  // Contacto y Credenciales
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Ubicación y Operación
  const [locationData, setLocationData] = useState<LocationData>({
    country: "VE",
    state: "Monagas",
    city: "Maturín",
    sector: "",
    address: "",
  });
  const [is24Hours, setIs24Hours] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const pricing = getCountryPricing(locationData.country);
  const b2bBasePrice = pricing.pharmacyB2BMonthlyFee;
  const b2bPriceInBs = (b2bBasePrice * pricing.exchangeRate).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const computedName = isChain
      ? `${chainName.trim()} - ${branchName.trim()}`
      : commercialName.trim();

    if (!computedName || (isChain && (!chainName.trim() || !branchName.trim()))) {
      toast({
        variant: "destructive",
        title: "Nombre incompleto",
        description: isChain
          ? "Indica el nombre de la cadena y de la sucursal."
          : "Indica el nombre comercial de la farmacia.",
      });
      return;
    }

    if (!legalName.trim() || !rif.trim() || !licenseNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Datos oficiales requeridos",
        description: "Por favor completa la Razón Social, el RIF y el Permiso Sanitario.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error de contraseña",
        description: "Las contraseñas ingresadas no coinciden.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: computedName,
          isChain,
          chainName: isChain ? chainName.trim() : null,
          branchName: isChain ? branchName.trim() : null,
          legalName: legalName.trim(),
          rif: rif.trim().toUpperCase(),
          licenseNumber: licenseNumber.trim(),
          regentName: regentName.trim(),
          regentLicense: regentLicense.trim(),
          contactName: contactName.trim(),
          contactRole: contactRole.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          password,
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
          sector: locationData.sector,
          address: locationData.address,
          is24Hours,
          deliveryAvailable,
          requestedPlan,
          status: "pending",
          isPublicApplication: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo enviar la solicitud.");
      }

      setIsSubmitted(true);
      toast({
        title: "¡Solicitud Oficial Enviada!",
        description:
          "El Super Administrador de SUMA revisará los datos oficiales de tu empresa para activar tu cuenta.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al enviar solicitud",
        description: error.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-2 border-teal-500 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Solicitud de Farmacia Recibida
            </CardTitle>
            <CardDescription className="text-base mt-1">
              Hemos registrado los datos oficiales de{" "}
              <span className="font-semibold text-slate-900">
                {isChain ? `${chainName} (${branchName})` : commercialName}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-sm text-slate-600">
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 space-y-2 text-teal-950">
              <p className="font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-teal-700 shrink-0" />
                ¿Qué sucede ahora?
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs leading-relaxed">
                <li>
                  El **Super Administrador de SUMA** validará el RIF ({rif.toUpperCase()}), la Razón Social y el Permiso Sanitario enviados.
                </li>
                <li>
                  Una vez aprobada tu cuenta, podrás iniciar sesión con tu correo{" "}
                  <span className="font-mono font-bold">{email}</span> en el Portal de Farmacias.
                </li>
                {requestedPlan === "b2b" && (
                  <li>
                    Solicitaste el **Plan Alianza Comercial B2B ($200/mes a tasa BCV)**. Nuestro equipo administrativo también podrá configurar en tu perfil cualquier convenio de descuento (%) o meses de cortesía acordados.
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" asChild>
                <Link href="/">Volver al Inicio</Link>
              </Button>
              <Button variant="outline" className="flex-1" asChild>
                <Link href="/login">Ir a Iniciar Sesión</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Sidebar informativa */}
      <div className="lg:w-1/3 bg-gradient-to-b from-teal-950 via-teal-900 to-slate-900 text-white p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <Link
            href="/landing-farmacia"
            className="inline-flex items-center gap-2 text-teal-300 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Farmacia
          </Link>

          <div className="mb-6">
            <Link href="/" className="bg-white px-4 py-2 rounded-2xl shadow-md inline-flex items-center">
              <Image
                src="/images/logo_suma.png"
                alt="SUMA Logo"
                width={150}
                height={52}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-2.5 rounded-xl bg-teal-500/20 border border-teal-400/30">
              <Store className="h-7 w-7 text-teal-300" />
            </div>
            <div>
              <span className="font-bold text-2xl block leading-none">SUMA Farmacias</span>
              <span className="text-xs text-teal-300">Solicitud de Cuenta Gratuita</span>
            </div>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold mb-4 leading-tight">
            Afilia tu Farmacia Gratis a la Red de Récipes Digitales SUMA
          </h2>
          <p className="text-teal-100/85 text-sm leading-relaxed mb-6">
            Por seguridad médica y regulatoria, todas las farmacias son verificadas y activadas por la Administración de SUMA validando los datos oficiales de la empresa.
          </p>

          {/* Resumen de cuenta gratuita en el sidebar */}
          <div className="space-y-3 bg-slate-900/70 p-5 rounded-2xl border border-teal-500/30">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Cuenta Gratuita de Farmacia</span>
              <Badge className="bg-teal-500 text-slate-950 font-bold">$0 Gratis</Badge>
            </div>
            <p className="text-xs text-teal-100/85 leading-relaxed">
              Incluye visor de récipes médicos por cédula del paciente, presencia en el directorio SUMA de tu ciudad y participación en Jornadas de Salud.
            </p>
            <div className="pt-2 border-t border-teal-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                Una vez inicies sesión en tu portal podrás ver y solicitar el <strong>Plan Pro Alianza B2B</strong>.
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-teal-800/50 text-xs text-teal-200/70 space-y-1">
          <p>✔ Verificación oficial por el Super Administrador SUMA.</p>
          <p>✔ Soporte para convenios corporativos (% de descuento y meses gratis).</p>
        </div>
      </div>

      {/* Formulario Oficial */}
      <div className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <Card className="max-w-3xl mx-auto shadow-lg border-slate-200">
          <CardHeader className="border-b bg-white rounded-t-xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <Link href="/">
                  <Image
                    src="/images/logo_suma.png"
                    alt="SUMA Logo"
                    width={130}
                    height={46}
                    className="h-10 w-auto object-contain"
                    priority
                  />
                </Link>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    Solicitud de Cuenta Gratuita — Farmacia
                  </CardTitle>
                  <CardDescription>
                    Completa los datos oficiales y legales de la empresa para la activación por el Administrador.
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className="border-teal-600 bg-teal-50 text-teal-800 font-bold"
              >
                Cuenta Gratuita ($0)
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* SECCIÓN 1: DATOS OFICIALES Y LEGALES DE LA EMPRESA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900">
                    1. Datos Oficiales y Legales de la Empresa
                  </h3>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <Label className="font-semibold text-slate-800">
                      ¿Pertenece a una Cadena o Franquicia Nacional?
                    </Label>
                    <p className="text-xs text-slate-500">
                      Actívalo si registras una sucursal de una red (ej. Farmatodo, Locatel, Red Vital).
                    </p>
                  </div>
                  <Switch checked={isChain} onCheckedChange={setIsChain} />
                </div>

                {isChain ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chainName">Nombre de la Cadena / Franquicia *</Label>
                      <Input
                        id="chainName"
                        placeholder="Ej: Farmatodo"
                        required
                        value={chainName}
                        onChange={(e) => setChainName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="branchName">Nombre de la Sede / Sucursal *</Label>
                      <Input
                        id="branchName"
                        placeholder="Ej: Sucursal Tipuro / Las Mercedes"
                        required
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="commercialName">Nombre Comercial de la Farmacia *</Label>
                    <Input
                      id="commercialName"
                      placeholder="Ej: Farmacia San José"
                      required
                      value={commercialName}
                      onChange={(e) => setCommercialName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalName">
                      Razón Social Oficial (Registro Mercantil) *
                    </Label>
                    <Input
                      id="legalName"
                      placeholder="Ej: Inversiones Farmacéuticas San José C.A."
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rif">RIF / Identificación Fiscal *</Label>
                    <Input
                      id="rif"
                      placeholder="Ej: J-40123456-7"
                      required
                      value={rif}
                      onChange={(e) => setRif(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">
                      Permiso Sanitario (MPPS / SACS) *
                    </Label>
                    <Input
                      id="licenseNumber"
                      placeholder="Ej: SACS-FAR-2024-889"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regentName">Farmacéutico Regente *</Label>
                    <Input
                      id="regentName"
                      placeholder="Nombre y Apellido del Regente"
                      required
                      value={regentName}
                      onChange={(e) => setRegentName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regentLicense">Matrícula / INPREFAR / MPPS *</Label>
                    <Input
                      id="regentLicense"
                      placeholder="Ej: COLFAR-14520"
                      required
                      value={regentLicense}
                      onChange={(e) => setRegentLicense(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: REPRESENTANTE Y CONTACTO OFICIAL */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <UserCheck className="h-5 w-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900">
                    2. Representante Legal y Contacto Administrativo
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Nombre de Persona de Contacto *</Label>
                    <Input
                      id="contactName"
                      placeholder="Ej: Lic. Carlos Pérez"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactRole">Cargo en la Empresa *</Label>
                    <Input
                      id="contactRole"
                      placeholder="Ej: Director / Gerente de Operaciones"
                      required
                      value={contactRole}
                      onChange={(e) => setContactRole(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Corporativo (Usuario de Acceso) *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="gerencia@farmacia.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono Fijo / Corporativo *</Label>
                    <Input
                      id="phone"
                      placeholder="Ej: +58 414-1234567"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp de Atención al Paciente *</Label>
                    <Input
                      id="whatsapp"
                      placeholder="Ej: +58 412-9876543"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: UBICACIÓN Y SERVICIOS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <FileText className="h-5 w-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900">
                    3. Ubicación Geográfica y Servicios de la Sede
                  </h3>
                </div>

                <LocationSelector
                  country={locationData.country}
                  state={locationData.state}
                  city={locationData.city}
                  sector={locationData.sector}
                  address={locationData.address}
                  disabled={isLoading}
                  onLocationChange={(loc) => setLocationData(loc)}
                />

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                    <div>
                      <Label className="font-medium text-sm">Farmacia de Turno / 24 Horas</Label>
                      <p className="text-xs text-slate-500">Atención continua día y noche</p>
                    </div>
                    <Switch checked={is24Hours} onCheckedChange={setIs24Hours} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border">
                    <div>
                      <Label className="font-medium text-sm">Servicio de Delivery Disponible</Label>
                      <p className="text-xs text-slate-500">Despacho de récipes a domicilio</p>
                    </div>
                    <Switch
                      checked={deliveryAvailable}
                      onCheckedChange={setDeliveryAvailable}
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: CONTRASEÑA DE ACCESO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <ShieldCheck className="h-5 w-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900">
                    4. Credenciales para cuando tu Cuenta sea Aprobada
                  </h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña de Acceso *</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-13 text-base shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Enviando Solicitud Oficial...
                  </>
                ) : (
                  "Enviar Solicitud de Cuenta al Administrador SUMA"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPharmacyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <RegisterPharmacyContent />
    </Suspense>
  );
}

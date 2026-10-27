"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Loader2,
  FlaskConical,
  Eye,
  EyeOff,
  Building2,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LocationSelector, LocationData } from "@/components/ui/location-selector";
import dynamic from "next/dynamic";

const LocationPicker = dynamic(
  () =>
    import("@/components/location-picker").then((mod) => ({
      default: mod.LocationPicker,
    })),
  {
    ssr: false,
    loading: () => <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />,
  }
);

function RegisterLaboratoryContent() {
  const { getCountryPricing } = useSettings();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMonths = parseInt(searchParams.get("months") || "1", 10) || 1;

  // Datos Oficiales del Laboratorio
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [rif, setRif] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [regentName, setRegentName] = useState("");
  const [regentLicense, setRegentLicense] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("Director / Administrador");

  // Contacto y Ubicación
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [locationData, setLocationData] = useState<LocationData>({
    country: "VE",
    state: "Monagas",
    city: "Maturín",
    sector: "",
    address: "",
    lat: 0,
    lng: 0,
  });

  // Credenciales y Plan ($50/mes a BCV)
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [billingMonths, setBillingMonths] = useState(
    [1, 3, 6, 12].includes(initialMonths) ? initialMonths : 1
  );
  const [isLoading, setIsLoading] = useState(false);

  const pricing = getCountryPricing(locationData.country);
  const basePrice = pricing.laboratoryMonthlyFee;
  const effectiveBcv = pricing.exchangeRate;

  const calculateTotal = () => {
    let total = basePrice * billingMonths;
    let discount = 0;

    if (billingMonths === 3) discount = 0.05;
    if (billingMonths === 6) discount = 0.08;
    if (billingMonths === 12) discount = 0.15;

    total = total * (1 - discount);
    return {
      total,
      discount,
      totalBs: total * effectiveBcv,
    };
  };

  const { total: totalToPay, discount, totalBs } = calculateTotal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!legalName.trim() || !rif.trim() || !licenseNumber.trim()) {
      toast({
        variant: "destructive",
        title: "Datos oficiales incompletos",
        description:
          "Por favor ingresa la Razón Social, el RIF y el Permiso Sanitario del laboratorio.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas ingresadas no coinciden.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/laboratories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          legalName: legalName.trim(),
          rif: rif.trim().toUpperCase(),
          licenseNumber: licenseNumber.trim(),
          regentName: regentName.trim(),
          regentLicense: regentLicense.trim(),
          contactName: contactName.trim(),
          contactRole: contactRole.trim(),
          adminEmail: email.trim().toLowerCase(),
          password,
          phone: phone.trim(),
          whatsapp: (whatsapp || phone).trim(),
          country: locationData.country,
          state: locationData.state,
          city: locationData.city,
          sector: locationData.sector,
          address: locationData.address,
          lat: locationData.lat || undefined,
          lng: locationData.lng || undefined,
          plan: "integral",
          billingCycle: billingMonths === 12 ? "annual" : "monthly",
          billingMonths,
          subscriptionFee: totalToPay / billingMonths,
          discountPercentage: Math.round(discount * 100),
          freeMonths: 1,
          isPublicRegistration: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el laboratorio.");
      }

      toast({
        title: "¡Laboratorio Clínico Registrado con 1er Mes Gratis!",
        description: `Registro exitoso. Disfruta de tu 1er Mes Gratis y luego continúa tu Plan Integral (${billingMonths} mes/es). Ya puedes iniciar sesión.`,
      });

      router.push("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error de Registro",
        description: error.message || "Ocurrió un error al registrar el laboratorio.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Sidebar / Resumen del Plan */}
      <div className="lg:w-1/3 bg-gradient-to-b from-indigo-950 via-slate-900 to-slate-950 text-white p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <Link
            href="/landing-laboratorio"
            className="inline-flex items-center gap-2 text-indigo-300 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Planes de Laboratorio
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

          <div className="flex items-center gap-2.5 mb-6">
            <FlaskConical className="h-8 w-8 text-indigo-400" />
            <span className="font-bold text-2xl">SUMA Laboratorio</span>
          </div>

          <h2 className="text-2xl lg:text-3xl font-bold mb-4">
            Afilia tu Laboratorio Clínico a la Red SUMA
          </h2>
          <p className="text-slate-300 text-sm mb-6">
            Conecta directamente con las órdenes de exámenes de los médicos de tu ciudad por número de cédula.
          </p>

          {/* Selector rápido de ciclo */}
          <div className="mb-4">
            <Label className="text-xs uppercase tracking-wider text-indigo-300 font-bold mb-2 block">
              Plan elegido luego de tu 1er Mes Gratis
            </Label>
            <div className="grid grid-cols-4 gap-1.5 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
              {[1, 3, 6, 12].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBillingMonths(m)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all ${
                    billingMonths === m
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {m === 1 ? "1 Mes" : `${m}M`}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/90 p-6 rounded-2xl border border-indigo-500/30">
            <div className="mb-4 bg-emerald-500/20 border border-emerald-400/40 rounded-lg p-2.5 text-center text-emerald-300 text-xs font-bold">
              🎁 ¡1er Mes 100% Gratis ($0 USD) Incluido!
            </div>
            <h3 className="text-lg font-bold mb-4 text-indigo-300">
              Resumen de tu Plan ({pricing.flag} {pricing.name})
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-emerald-300 font-bold">
                <span>Primer Mes de Prueba</span>
                <span>GRATIS ($0 USD)</span>
              </div>
              <div className="flex justify-between">
                <span>Plan Integral (luego del 1er mes)</span>
                <span className="font-mono">${basePrice} USD/mes</span>
              </div>
              <div className="flex justify-between">
                <span>Duración seleccionada</span>
                <span>
                  {billingMonths} {billingMonths === 1 ? "Mes" : "Meses"}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Descuento Aplicado</span>
                  <span>-{Math.round(discount * 100)}%</span>
                </div>
              )}
              <Separator className="bg-slate-700 my-2" />
              <div className="flex justify-between text-base font-bold">
                <span>Monto del Plan (post mes gratis)</span>
                <span>${totalToPay.toLocaleString("en-US")} USD</span>
              </div>
              <div className="flex justify-between text-xs text-indigo-200 bg-indigo-950/80 p-2.5 rounded-lg border border-indigo-500/30">
                <span>Monto en {pricing.currencySymbol} ({pricing.rateLabel}):</span>
                <span className="font-bold">
                  {pricing.currencySymbol}{" "}
                  {totalBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 mt-8">
          © SUMA Salud. Cobro expresado en USD pagadero en moneda local ({pricing.rateLabel}).
        </div>
      </div>

      {/* Formulario Oficial */}
      <div className="flex-1 p-4 sm:p-8 lg:p-12 overflow-y-auto">
        <Card className="max-w-2xl mx-auto shadow-lg border-slate-200">
          <CardHeader className="border-b bg-white rounded-t-xl">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
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
              <div className="flex items-center gap-2">
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
                  🎁 1er Mes Gratis
                </span>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded uppercase">
                  Plan {billingMonths === 1 ? "1 Mes" : `${billingMonths} Meses`}
                </span>
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">
              Configura la Cuenta de tu Laboratorio
            </CardTitle>
            <CardDescription>
              Completa los datos oficiales para activar tu 1er mes gratis y registrar tu laboratorio.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Datos Oficiales de la Empresa */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                  <Building2 className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    1. Datos Oficiales de la Empresa y Regencia
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre Comercial del Laboratorio *</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Laboratorio Clínico BioSalud"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legalName">
                      Razón Social Oficial (Registro Mercantil) *
                    </Label>
                    <Input
                      id="legalName"
                      placeholder="Ej: Unidad Diagnóstica BioSalud C.A."
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rif">RIF / Identificación Fiscal *</Label>
                    <Input
                      id="rif"
                      placeholder="Ej: J-31234567-8"
                      required
                      value={rif}
                      onChange={(e) => setRif(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">
                      Permiso Sanitario (MPPS / SACS) *
                    </Label>
                    <Input
                      id="licenseNumber"
                      placeholder="Ej: SACS-LAB-2024-512"
                      required
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="regentName">Bioanalista Regente / Director *</Label>
                    <Input
                      id="regentName"
                      placeholder="Nombre y Apellido del Bioanalista"
                      required
                      value={regentName}
                      onChange={(e) => setRegentName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regentLicense">
                      Matrícula Colegio de Bioanalistas / MPPS *
                    </Label>
                    <Input
                      id="regentLicense"
                      placeholder="Ej: FECOBIOVE-9821"
                      required
                      value={regentLicense}
                      onChange={(e) => setRegentLicense(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Representante y Contacto */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
                  <UserCheck className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">
                    2. Contacto Administrativo
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactName">Persona de Contacto *</Label>
                    <Input
                      id="contactName"
                      placeholder="Ej: Lic. María Rodríguez"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Administrativo (Acceso) *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@laboratorio.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono de Contacto *</Label>
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
                    <Label htmlFor="whatsapp">WhatsApp de Atención *</Label>
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

              {/* 3. Ubicación */}
              <div className="border-t pt-4 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">
                  3. Ubicación y Dirección del Laboratorio
                </h4>
                <LocationSelector
                  country={locationData.country}
                  state={locationData.state}
                  city={locationData.city}
                  sector={locationData.sector}
                  address={locationData.address}
                  disabled={isLoading}
                  onLocationChange={(newLoc) => setLocationData(newLoc)}
                />

                <div className="space-y-2">
                  <Label>
                    Ubicación en el Mapa{" "}
                    <span className="text-xs text-muted-foreground">(opcional)</span>
                  </Label>
                  <LocationPicker
                    lat={locationData.lat || 0}
                    lng={locationData.lng || 0}
                    city={locationData.city}
                    disabled={isLoading}
                    onLocationChange={(newLat, newLng) => {
                      setLocationData((prev) => ({
                        ...prev,
                        lat: newLat,
                        lng: newLng,
                      }));
                    }}
                  />
                </div>
              </div>

              {/* 4. Contraseña */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-sm font-bold text-slate-900">
                    4. Contraseña de Acceso
                  </h4>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
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
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-12 text-base shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registrando Laboratorio...
                  </>
                ) : (
                  `Activar 1er Mes Gratis y Registrar Laboratorio (Plan ${billingMonths === 1 ? "1 Mes" : `${billingMonths} Meses`})`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterLaboratoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      }
    >
      <RegisterLaboratoryContent />
    </Suspense>
  );
}

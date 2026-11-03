"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Building2,
  Store,
  KeyRound,
  Copy,
  Check,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Network,
  Crown,
  Compass,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PharmacyBranchesManagerProps {
  pharmacyId: string;
  onUpdated?: () => void;
}

export function PharmacyBranchesManager({
  pharmacyId,
  onUpdated,
}: PharmacyBranchesManagerProps) {
  const { toast } = useToast();
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  // Configuración de Plan Corporativo en Casa Matriz
  const [savingConfig, setSavingConfig] = useState(false);
  const [selectedPlanTier, setSelectedPlanTier] = useState<string>("corporate_15");
  const [coversBranchesPlan, setCoversBranchesPlan] = useState<boolean>(true);

  // Modal para crear nueva sucursal hija directamente desde la Casa Matriz
  const [isCreateBranchOpen, setIsCreateBranchOpen] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    branchName: "",
    city: "Maturín",
    state: "Monagas",
    address: "",
    phone: "",
    whatsapp: "",
    regentName: "",
    regentLicense: "",
    email: "",
    password: "",
    is24Hours: false,
    deliveryAvailable: true,
  });

  // Vincular una farmacia independiente a una Casa Matriz existente con código
  const [linkCodeInput, setLinkCodeInput] = useState("");
  const [linkingToHq, setLinkingToHq] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pharmacies");
      if (res.ok) {
        const data = await res.json();
        setAllPharmacies(Array.isArray(data) ? data : []);
        const me = (data || []).find((p: any) => p.id === pharmacyId);
        if (me) {
          setSelectedPlanTier(me.planTier || "corporate_15");
          setCoversBranchesPlan(me.coversBranchesPlan !== false);
        }
      }
    } catch (e) {
      console.error("Error cargando jerarquía de sucursales:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pharmacyId) {
      loadData();
    }
  }, [pharmacyId]);

  const currentPharmacy = useMemo(
    () => allPharmacies.find((p) => p.id === pharmacyId),
    [allPharmacies, pharmacyId]
  );

  const childBranches = useMemo(() => {
    if (!currentPharmacy) return [];
    const chainNorm = (currentPharmacy.chainName || currentPharmacy.name || "")
      .trim()
      .toLowerCase();
    return allPharmacies.filter((p) => {
      if (p.id === currentPharmacy.id) return false;
      if (p.parentPharmacyId === currentPharmacy.id) return true;
      // También detectar sucursales pendientes que pusieron el mismo nombre de cadena
      if (
        currentPharmacy.isHeadquarters &&
        chainNorm &&
        (p.chainName || "").trim().toLowerCase() === chainNorm
      ) {
        return true;
      }
      return false;
    });
  }, [allPharmacies, currentPharmacy]);

  const pendingBranches = useMemo(
    () =>
      childBranches.filter(
        (b) => b.branchApprovalStatus === "pending_hq" || b.status === "pending"
      ),
    [childBranches]
  );

  const approvedBranches = useMemo(
    () => childBranches.filter((b) => b.branchApprovalStatus === "approved"),
    [childBranches]
  );

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast({
      title: "Código Corporativo copiado",
      description: `Comparte el código ${code} únicamente con los gerentes de tus sucursales oficiales.`,
    });
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleConvertToHeadquarters = async () => {
    if (!currentPharmacy) return;
    try {
      setSavingConfig(true);
      const cleanPrefix = (currentPharmacy.chainName || currentPharmacy.name || "FARM")
        .replace(/[^A-Za-z0-9]/g, "")
        .substring(0, 6)
        .toUpperCase();
      const generatedCode =
        currentPharmacy.franchiseCode ||
        `SUMA-HQ-${cleanPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await fetch("/api/pharmacies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentPharmacy.id,
          isChain: true,
          isHeadquarters: true,
          chainName: currentPharmacy.chainName || currentPharmacy.name,
          branchName: currentPharmacy.branchName || "Sede Principal (Casa Matriz)",
          franchiseCode: generatedCode,
          planTier: "corporate_15",
          maxBranchesIncluded: 15,
          coversBranchesPlan: true,
        }),
      });

      if (!res.ok) throw new Error("No se pudo activar el modo Casa Matriz");

      toast({
        title: "🏛️ Casa Matriz Activada",
        description: `Tu sede ahora es la Administración Principal con código ${generatedCode}.`,
      });
      await loadData();
      onUpdated?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveCorporatePlanConfig = async () => {
    if (!currentPharmacy) return;
    try {
      setSavingConfig(true);
      const maxBranches =
        selectedPlanTier === "corporate_unlimited"
          ? 100
          : selectedPlanTier === "corporate_15"
          ? 15
          : selectedPlanTier === "corporate_5"
          ? 5
          : 1;
      const fee =
        selectedPlanTier === "corporate_unlimited"
          ? 1600
          : selectedPlanTier === "corporate_15"
          ? 900
          : selectedPlanTier === "corporate_5"
          ? 450
          : 200;

      const res = await fetch("/api/pharmacies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentPharmacy.id,
          planTier: selectedPlanTier,
          maxBranchesIncluded: maxBranches,
          coversBranchesPlan,
          monthlySubscriptionFee: fee,
        }),
      });

      if (!res.ok) throw new Error("Error guardando configuración corporativa");

      toast({
        title: "Configuración Corporativa Actualizada",
        description: coversBranchesPlan
          ? "La Administración Principal cubre ahora el plan y alianzas de todas sus sucursales aprobadas."
          : "Cada sucursal gestionará su propio plan de manera independiente.",
      });
      await loadData();
      onUpdated?.();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: e.message,
      });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleBranchApproval = async (
    branch: any,
    decision: "approved" | "rejected"
  ) => {
    if (!currentPharmacy) return;
    try {
      const res = await fetch("/api/pharmacies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: branch.id,
          parentPharmacyId: decision === "approved" ? currentPharmacy.id : null,
          branchApprovalStatus: decision,
          status: decision === "approved" ? "active" : "suspended",
          sponsorshipPlanStatus:
            decision === "approved" &&
            currentPharmacy.coversBranchesPlan !== false &&
            currentPharmacy.sponsorshipPlanStatus === "active"
              ? "active"
              : branch.sponsorshipPlanStatus,
        }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el estado de la sucursal");

      toast({
        title:
          decision === "approved"
            ? "✅ Sucursal Aprobada Oficialmente"
            : "❌ Solicitud de Sucursal Rechazada",
        description:
          decision === "approved"
            ? `${branch.name} ya forma parte oficial de tu red de sucursales.`
            : `Se bloqueó el uso de tu marca para ${branch.name}.`,
      });
      await loadData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message,
      });
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPharmacy) return;

    if (!newBranch.branchName.trim() || !newBranch.email.trim() || !newBranch.password.trim()) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Indica el nombre de la sucursal, su correo de acceso y contraseña.",
      });
      return;
    }

    try {
      setCreatingBranch(true);
      const chainLabel = currentPharmacy.chainName || currentPharmacy.name;
      const res = await fetch("/api/pharmacies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${chainLabel} - ${newBranch.branchName.trim()}`,
          isChain: true,
          isHeadquarters: false,
          createdByHeadquartersId: currentPharmacy.id,
          chainName: chainLabel,
          branchName: newBranch.branchName.trim(),
          legalName: currentPharmacy.legalName,
          rif: currentPharmacy.rif,
          licenseNumber: currentPharmacy.licenseNumber,
          regentName: newBranch.regentName.trim() || currentPharmacy.regentName,
          regentLicense: newBranch.regentLicense.trim() || currentPharmacy.regentLicense,
          contactName: newBranch.regentName.trim() || currentPharmacy.contactName,
          contactRole: "Gerente de Sucursal",
          email: newBranch.email.trim().toLowerCase(),
          password: newBranch.password,
          phone: newBranch.phone.trim() || currentPharmacy.phone,
          whatsapp: (newBranch.whatsapp || newBranch.phone || currentPharmacy.whatsapp).trim(),
          city: newBranch.city.trim(),
          state: newBranch.state.trim(),
          address: newBranch.address.trim(),
          is24Hours: newBranch.is24Hours,
          deliveryAvailable: newBranch.deliveryAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo registrar la sucursal");

      toast({
        title: "✅ Nueva Sucursal Creada y Activada",
        description: `La sucursal ${newBranch.branchName} ya puede iniciar sesión con ${newBranch.email}.`,
      });
      setIsCreateBranchOpen(false);
      setNewBranch({
        branchName: "",
        city: "Maturín",
        state: "Monagas",
        address: "",
        phone: "",
        whatsapp: "",
        regentName: "",
        regentLicense: "",
        email: "",
        password: "",
        is24Hours: false,
        deliveryAvailable: true,
      });
      await loadData();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error al crear sucursal",
        description: e.message,
      });
    } finally {
      setCreatingBranch(false);
    }
  };

  const handleLinkWithCode = async () => {
    if (!currentPharmacy || !linkCodeInput.trim()) return;
    const targetHq = allPharmacies.find(
      (p) =>
        p.isHeadquarters &&
        (p.franchiseCode || "").toUpperCase() === linkCodeInput.trim().toUpperCase()
    );

    if (!targetHq) {
      toast({
        variant: "destructive",
        title: "Código Corporativo inválido",
        description: "No se encontró ninguna Casa Matriz con ese código de franquicia.",
      });
      return;
    }

    try {
      setLinkingToHq(true);
      const res = await fetch("/api/pharmacies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentPharmacy.id,
          isChain: true,
          isHeadquarters: false,
          parentPharmacyId: targetHq.id,
          chainName: targetHq.chainName || targetHq.name,
          branchName: currentPharmacy.branchName || currentPharmacy.city || "Sucursal",
          branchApprovalStatus: "approved",
          planTier:
            targetHq.coversBranchesPlan !== false ? "inherited_from_hq" : "independent",
        }),
      });

      if (!res.ok) throw new Error("Error vinculando a la Casa Matriz");

      toast({
        title: "🔗 Vinculada a Casa Matriz",
        description: `Tu sede ahora depende oficialmente de ${targetHq.chainName || targetHq.name}.`,
      });
      setLinkCodeInput("");
      await loadData();
      onUpdated?.();
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message,
      });
    } finally {
      setLinkingToHq(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
        Cargando estructura de Casa Matriz y Sucursales...
      </div>
    );
  }

  if (!currentPharmacy) return null;

  return (
    <div className="space-y-6">
      {/* CABECERA EXPLICATIVA DEL MODELO DE JERARQUÍA Y ENRUTAMIENTO */}
      <Card className="border-teal-200 bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white rounded-2xl overflow-hidden shadow-md">
        <CardContent className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-400 text-slate-950 font-extrabold text-[11px] border-0">
                <Network className="h-3.5 w-3.5 mr-1" />
                Arquitectura Corporativa de Sucursales SUMA
              </Badge>
              {currentPharmacy.isHeadquarters && (
                <Badge className="bg-emerald-500 text-white font-bold text-[11px] border-0">
                  🏛️ Casa Matriz Oficial (Sede Madre)
                </Badge>
              )}
              {currentPharmacy.parentPharmacyId && (
                <Badge className="bg-indigo-500 text-white font-bold text-[11px] border-0">
                  🏪 Sucursal Dependiente Verificada
                </Badge>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {currentPharmacy.isHeadquarters
                ? `Administración Principal — ${currentPharmacy.chainName || currentPharmacy.name}`
                : currentPharmacy.parentPharmacyId
                ? `Sucursal de ${currentPharmacy.chainName || currentPharmacy.parentHeadquartersName}`
                : "Gestión de Casa Matriz, Franquicias y Sucursales"}
            </h2>
            <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
              Cada sucursal posee su <strong>propio usuario y administración operativa independiente</strong> (WhatsApp local, despacho de récipes y stock), mientras la <strong>Casa Matriz (Sede Madre)</strong> valida qué sucursales pertenecen realmente a la marca, gestiona el Plan Corporativo y conecta con los médicos.
            </p>
          </div>

          {currentPharmacy.isHeadquarters && (
            <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 shrink-0 space-y-2 min-w-[260px]">
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1">
                <KeyRound className="h-3.5 w-3.5" />
                Código Corporativo de tu Franquicia
              </span>
              <div className="flex items-center justify-between gap-2 bg-slate-950/70 px-3 py-2 rounded-xl border border-teal-500/40">
                <code className="font-mono font-black text-sm text-white tracking-wider">
                  {currentPharmacy.franchiseCode || "SUMA-HQ-ACTIVO"}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    handleCopyCode(currentPharmacy.franchiseCode || "SUMA-HQ-ACTIVO")
                  }
                  className="h-7 px-2 text-teal-300 hover:text-white hover:bg-white/10"
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-teal-200/80">
                Nadie puede registrarse como sucursal de tu marca sin este código o tu aprobación directa.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CASO 1: ES CASA MATRIZ (ADMINISTRACIÓN PRINCIPAL) */}
      {currentPharmacy.isHeadquarters && (
        <>
          {/* ALERTAS DE SUCURSALES PENDIENTES DE VALIDACIÓN ANTIFRAUDE */}
          {pendingBranches.length > 0 && (
            <Card className="border-2 border-amber-400 bg-amber-50/60 rounded-2xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-extrabold text-amber-950 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Solicitudes de Sucursales Pendientes de tu Autorización ({pendingBranches.length})
                </CardTitle>
                <CardDescription className="text-xs text-amber-900">
                  Estas farmacias solicitaron registrarse bajo tu marca sin ingresar tu Código Corporativo. Confirma si son sucursales reales de tu franquicia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingBranches.map((branch) => (
                  <div
                    key={branch.id}
                    className="bg-white rounded-xl p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {branch.name}
                        </span>
                        <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                          ⏳ Esperando validación de Casa Matriz
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        📍 {branch.city} — {branch.address} • RIF: {branch.rif || "N/A"} • Correo: {branch.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleBranchApproval(branch, "approved")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Aprobar Sucursal
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleBranchApproval(branch, "rejected")}
                        className="border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* PLAN CORPORATIVO DE SUCURSALES VS PLAN INDEPENDIENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-200 rounded-2xl shadow-xs">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-amber-500" />
                      Plan Corporativo y Cobertura de Sucursales
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Define si la Administración Principal cubre el Plan B2B de todas las sucursales o si cada sede opera con un plan individual.
                    </CardDescription>
                  </div>
                  <Badge className="bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold">
                    {approvedBranches.length + 1} / {currentPharmacy.maxBranchesIncluded || 15} sedes activas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: "corporate_5",
                      title: "Red Regional",
                      sub: "Hasta 5 Sucursales",
                      price: "$450 / mes",
                      perBranch: "$90 por sede",
                    },
                    {
                      id: "corporate_15",
                      title: "Red Expansión",
                      sub: "Hasta 15 Sucursales",
                      price: "$900 / mes",
                      perBranch: "$60 por sede",
                    },
                    {
                      id: "corporate_unlimited",
                      title: "Corporativo Nacional",
                      sub: "16 a 50+ Sucursales",
                      price: "$1,600 / mes",
                      perBranch: "Tarifa Plana Nacional",
                    },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedPlanTier(tier.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedPlanTier === tier.id
                          ? "border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="font-extrabold text-xs text-slate-900">{tier.title}</div>
                      <div className="text-[11px] text-slate-500">{tier.sub}</div>
                      <div className="text-sm font-black text-teal-700 mt-1.5">{tier.price}</div>
                      <div className="text-[10px] font-semibold text-amber-700">{tier.perBranch}</div>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="pr-4">
                    <Label className="font-bold text-xs text-slate-900">
                      La Casa Matriz cubre el Plan B2B y Alianzas Médicas de todas sus sucursales
                    </Label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Al estar activo, cuando la Casa Matriz conecta con un médico, todas tus sucursales aprobadas quedan cubiertas y el algoritmo recomienda automáticamente la sede más cercana al paciente.
                    </p>
                  </div>
                  <Switch
                    checked={coversBranchesPlan}
                    onCheckedChange={setCoversBranchesPlan}
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={handleSaveCorporatePlanConfig}
                    disabled={savingConfig}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
                  >
                    {savingConfig && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                    Guardar Modalidad de Plan Corporativo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* EXPLICACIÓN DEL ALGORITMO DE RECOMENDACIÓN DE SUCURSALES */}
            <Card className="border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-amber-50/30 rounded-2xl shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-teal-600" />
                  ¿Qué Sucursal se recomienda al Paciente y por qué?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <p>
                  Cuando tu Casa Matriz pacta una alianza con un médico, <strong>no saturamos el récipe</strong> con tarjetas repetidas. El algoritmo SUMA evalúa en milisegundos todas tus sucursales y selecciona la sede óptima:
                </p>
                <ol className="space-y-1.5 list-decimal list-inside font-medium text-slate-700">
                  <li>
                    <strong>Cercanía Geográfica (GPS / Ciudad):</strong> Prioriza la sucursal a menor distancia en km del paciente o en la misma ciudad del consultorio.
                  </li>
                  <li>
                    <strong>Disponibilidad en Catálogo:</strong> Prioriza la sucursal que tenga en stock los medicamentos prescritos en el récipe.
                  </li>
                  <li>
                    <strong>Servicios Operativos:</strong> Prioriza sedes Abiertas 24 Horas y con Delivery activo.
                  </li>
                </ol>
                <p className="text-[11px] text-teal-800 bg-teal-100/60 p-2 rounded-lg font-semibold">
                  💡 Además, la tarjeta incluye un selector para que el paciente pueda cambiar a cualquier otra de tus sucursales en 1 clic.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* LISTADO DE SUCURSALES HIJAS Y BOTÓN DE CREAR NUEVA SUCURSAL */}
          <Card className="border-slate-200 rounded-2xl shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-teal-600" />
                  Sucursales Dependientes de esta Casa Matriz ({childBranches.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Cada sucursal listada tiene su propio usuario de acceso independiente para atender pedidos de WhatsApp y despachar récipes en su localidad.
                </CardDescription>
              </div>
              <Button
                type="button"
                onClick={() => setIsCreateBranchOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shrink-0"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Registrar Nueva Sucursal Oficial
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {childBranches.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <Store className="h-9 w-9 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-sm text-slate-800">
                    Aún no has registrado sucursales adicionales
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Haz clic en <strong>«Registrar Nueva Sucursal Oficial»</strong> para crear el usuario independiente de cada una de tus sedes o compárteles tu código <strong>{currentPharmacy.franchiseCode}</strong>.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {childBranches.map((branch) => (
                    <div
                      key={branch.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-300 transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {branch.branchName
                              ? `Sucursal ${branch.branchName}`
                              : branch.name}
                          </h4>
                          {branch.branchApprovalStatus === "approved" ? (
                            <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px] font-bold">
                              ✅ Oficial Activa
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 border-0 text-[10px] font-bold">
                              ⏳ Pendiente
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                          {branch.city} {branch.address ? `• ${branch.address}` : ""}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Mail className="h-3 w-3 text-slate-400" />
                            {branch.email}
                          </span>
                          {branch.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {branch.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="text-slate-600 font-medium">
                          Plan:{" "}
                          <strong className="text-teal-700">
                            {coversBranchesPlan
                              ? "Cubierto por Casa Matriz"
                              : "Plan Independiente"}
                          </strong>
                        </span>
                        <span className="font-bold text-slate-700">
                          {branch.prescriptionsDispensedCount || 0} récipes despachados
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* CASO 2: ES UNA SUCURSAL DEPENDIENTE DE UNA CASA MATRIZ */}
      {currentPharmacy.parentPharmacyId && (
        <Card className="border-indigo-200 bg-indigo-50/40 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-indigo-950 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Sucursal Vinculada a Administración Principal (Casa Matriz)
            </CardTitle>
            <CardDescription className="text-xs text-indigo-900">
              Tu sucursal opera con su propio usuario independiente para despacho y atención local, respaldada por la Casa Matriz de tu cadena.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-indigo-100">
              <span className="text-slate-500 block">Casa Matriz (Sede Madre):</span>
              <strong className="text-sm text-slate-900 mt-0.5 block">
                {currentPharmacy.parentHeadquartersName || currentPharmacy.chainName}
              </strong>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-100">
              <span className="text-slate-500 block">Estado de Validación de Franquicia:</span>
              <strong className="text-sm text-emerald-700 mt-0.5 block">
                {currentPharmacy.branchApprovalStatus === "approved"
                  ? "✅ Sucursal Verificada y Autorizada"
                  : "⏳ Pendiente de Aprobación por Casa Matriz"}
              </strong>
            </div>
            <div className="bg-white p-4 rounded-xl border border-indigo-100">
              <span className="text-slate-500 block">Cobertura del Plan Comercial B2B:</span>
              <strong className="text-sm text-teal-700 mt-0.5 block">
                {currentPharmacy.planCoveredByHq
                  ? "🏛️ Cubierto por el Plan Corporativo de tu Casa Matriz"
                  : "Plan Gestionado por esta Sucursal"}
              </strong>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CASO 3: ES FARMACIA INDEPENDIENTE (PUEDE CONVERTIRSE EN CASA MATRIZ O VINCULARSE A UNA) */}
      {!currentPharmacy.isHeadquarters && !currentPharmacy.parentPharmacyId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-teal-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-teal-600" />
                ¿Tu Farmacia tiene o abrirá varias Sucursales?
              </CardTitle>
              <CardDescription className="text-xs">
                Convierte esta cuenta en la <strong>Casa Matriz (Administración Principal)</strong> para registrar tus sucursales hijas, obtener tu Código Corporativo Antifraude y unificar tu plan comercial.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                onClick={handleConvertToHeadquarters}
                disabled={savingConfig}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl h-10"
              >
                {savingConfig && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                🏛️ Activar como Casa Matriz (Administración Principal)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-600" />
                ¿Eres Sucursal de una Casa Matriz ya registrada?
              </CardTitle>
              <CardDescription className="text-xs">
                Ingresa el Código Corporativo de tu Casa Matriz para vincular esta sede y heredar sus convenios médicos y catálogo corporativo.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Input
                placeholder="Ej: SUMA-HQ-MEGAFARMA"
                value={linkCodeInput}
                onChange={(e) => setLinkCodeInput(e.target.value.toUpperCase())}
                className="font-mono uppercase text-xs h-10"
              />
              <Button
                type="button"
                onClick={handleLinkWithCode}
                disabled={linkingToHq || !linkCodeInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl h-10 shrink-0"
              >
                {linkingToHq ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular Sede"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL PARA REGISTRAR NUEVA SUCURSAL HIJA DESDE LA CASA MATRIZ */}
      <Dialog open={isCreateBranchOpen} onOpenChange={setIsCreateBranchOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Registrar Nueva Sucursal Oficial ({currentPharmacy.chainName || currentPharmacy.name})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Al ser creada desde tu Casa Matriz, esta sucursal queda automáticamente <strong>verificada y aprobada</strong> con su propio usuario independiente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBranch} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Nombre de la Sucursal / Sede *</Label>
              <Input
                required
                placeholder="Ej: Sucursal Centro / Sede Las Mercedes"
                value={newBranch.branchName}
                onChange={(e) =>
                  setNewBranch((prev) => ({ ...prev, branchName: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Estado / Provincia *</Label>
                <Input
                  required
                  value={newBranch.state}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, state: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Ciudad (Para enrutamiento) *</Label>
                <Input
                  required
                  placeholder="Ej: Maturín / Caracas / La Paz"
                  value={newBranch.city}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Dirección Exacta de la Sucursal *</Label>
              <Input
                required
                placeholder="Av. Principal, Edif. / Local..."
                value={newBranch.address}
                onChange={(e) =>
                  setNewBranch((prev) => ({ ...prev, address: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Teléfono de la Sucursal *</Label>
                <Input
                  required
                  placeholder="+58 414..."
                  value={newBranch.phone}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">WhatsApp de Pedidos de la Sede *</Label>
                <Input
                  required
                  placeholder="+58 412..."
                  value={newBranch.whatsapp}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, whatsapp: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Farmacéutico Regente de la Sede</Label>
                <Input
                  placeholder="Nombre del Regente"
                  value={newBranch.regentName}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, regentName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Matrícula Sanitaria</Label>
                <Input
                  placeholder="COLFAR / MPPS"
                  value={newBranch.regentLicense}
                  onChange={(e) =>
                    setNewBranch((prev) => ({ ...prev, regentLicense: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border">
                <Label className="text-xs font-semibold">Abierta 24 Horas</Label>
                <Switch
                  checked={newBranch.is24Hours}
                  onCheckedChange={(v) =>
                    setNewBranch((prev) => ({ ...prev, is24Hours: v }))
                  }
                />
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border">
                <Label className="text-xs font-semibold">Con Delivery</Label>
                <Switch
                  checked={newBranch.deliveryAvailable}
                  onCheckedChange={(v) =>
                    setNewBranch((prev) => ({ ...prev, deliveryAvailable: v }))
                  }
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200 space-y-3">
              <p className="text-xs font-extrabold text-teal-950">
                Credenciales de Acceso Independiente para esta Sucursal
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Correo de Acceso *</Label>
                  <Input
                    type="email"
                    required
                    placeholder="sucursal1@cadena.com"
                    value={newBranch.email}
                    onChange={(e) =>
                      setNewBranch((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold">Contraseña *</Label>
                  <Input
                    type="text"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={newBranch.password}
                    onChange={(e) =>
                      setNewBranch((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateBranchOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creatingBranch}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
              >
                {creatingBranch && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Crear y Activar Sucursal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

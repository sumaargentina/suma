"use client";

import React, { useState } from "react";
import { useSettings } from "@/lib/settings";
import * as supabaseService from "@/lib/supabaseService";
import type { CommercialAlly } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Handshake,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Loader2,
  Globe,
  ExternalLink,
  Sparkles,
  ImageIcon,
  Building2
} from "lucide-react";

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  farmacia: { label: "Farmacia / Cadena", color: "bg-teal-100 text-teal-900 border-teal-300" },
  clinica: { label: "Clínica / Centro Médico", color: "bg-blue-100 text-blue-900 border-blue-300" },
  laboratorio: { label: "Laboratorio Clínico", color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  marca: { label: "Laboratorio / Marca", color: "bg-purple-100 text-purple-900 border-purple-300" },
  aliado: { label: "Aliado Comercial", color: "bg-amber-100 text-amber-900 border-amber-300" },
};

export function CommercialAlliesCard() {
  const { commercialAllies, countries, updateSetting } = useSettings();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAlly, setEditingAlly] = useState<CommercialAlly | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [category, setCategory] = useState<CommercialAlly["category"]>("aliado");
  const [country, setCountry] = useState("ALL");
  const [city, setCity] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingAlly(null);
    setName("");
    setLogoUrl("");
    setCategory("aliado");
    setCountry("ALL");
    setCity("");
    setWebsiteUrl("");
    setIsActive(true);
    setIsDialogOpen(true);
  };

  const openEditModal = (ally: CommercialAlly) => {
    setEditingAlly(ally);
    setName(ally.name);
    setLogoUrl(ally.logoUrl);
    setCategory(ally.category || "aliado");
    setCountry(ally.country || "ALL");
    setCity(ally.city || "");
    setWebsiteUrl(ally.websiteUrl || "");
    setIsActive(ally.isActive !== false);
    setIsDialogOpen(true);
  };

  const handleUploadLogoFile = async (file: File) => {
    setIsUploadingLogo(true);
    try {
      const publicUrl = await supabaseService.uploadPublicImage(file, "profile-images", "allies/logos");
      setLogoUrl(publicUrl);
      toast({
        title: "Logo subido en WebP",
        description: "El logotipo de la empresa fue optimizado y cargado exitosamente.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al subir logo",
        description: err.message || "No se pudo subir la imagen.",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadLogoFile(file);
  };

  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleUploadLogoFile(file);
          break;
        }
      }
    }
  };

  const handleSaveAlly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !logoUrl.trim()) {
      toast({
        variant: "destructive",
        title: "Campos requeridos",
        description: "Ingresa el nombre de la empresa y carga su logotipo.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const currentList = [...(commercialAllies || [])];
      if (editingAlly) {
        const updated = currentList.map((item) =>
          item.id === editingAlly.id
            ? {
                ...item,
                name: name.trim(),
                logoUrl: logoUrl.trim(),
                category,
                country,
                city: city.trim() || undefined,
                websiteUrl: websiteUrl.trim() || undefined,
                isActive,
              }
            : item
        );
        await updateSetting("commercialAllies", updated);
        toast({
          title: "Aliado Comercial Actualizado",
          description: `${name.trim()} se actualizó en la portada inicial de SUMA.`,
        });
      } else {
        const newAlly: CommercialAlly = {
          id: `ally-${Date.now()}`,
          name: name.trim(),
          logoUrl: logoUrl.trim(),
          category,
          country,
          city: city.trim() || undefined,
          websiteUrl: websiteUrl.trim() || undefined,
          isActive,
        };
        await updateSetting("commercialAllies", [...currentList, newAlly]);
        toast({
          title: "Aliado Comercial Añadido",
          description: `${name.trim()} ya aparece en la sección de Aliados Comerciales del portal inicial.`,
        });
      }
      setIsDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err.message || "No se pudo guardar el aliado comercial.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (ally: CommercialAlly) => {
    const updated = (commercialAllies || []).map((item) =>
      item.id === ally.id ? { ...item, isActive: item.isActive === false ? true : false } : item
    );
    await updateSetting("commercialAllies", updated);
  };

  const handleDeleteAlly = async (id: string) => {
    const updated = (commercialAllies || []).filter((item) => item.id !== id);
    await updateSetting("commercialAllies", updated);
    toast({
      title: "Aliado eliminado",
      description: "El logotipo fue removido de la portada inicial.",
    });
  };

  const handleImportFromPharmacies = async () => {
    setIsImporting(true);
    try {
      const pharmacies = await supabaseService.getPharmacies();
      const withLogos = pharmacies.filter((p) => p.status === "active" && (p.logoUrl || p.logo_url));
      const existingNames = new Set((commercialAllies || []).map((a) => a.name.toLowerCase()));

      const imported: CommercialAlly[] = [];
      for (const p of withLogos) {
        const displayName = p.chainName || p.name;
        if (!existingNames.has(displayName.toLowerCase())) {
          existingNames.add(displayName.toLowerCase());
          imported.push({
            id: `ally-pharm-${p.id}`,
            name: displayName,
            logoUrl: (p.logoUrl || p.logo_url) as string,
            category: "farmacia",
            country: p.country || "VE",
            city: p.city,
            isActive: true,
          });
        }
      }

      if (imported.length === 0) {
        toast({
          title: "Sin nuevos logos por importar",
          description: "Todas las farmacias activas con logo ya están en la lista o aún no tienen logo cargado.",
        });
      } else {
        await updateSetting("commercialAllies", [...(commercialAllies || []), ...imported]);
        toast({
          title: `${imported.length} logo(s) importados`,
          description: "Se agregaron los logotipos de las farmacias activas al carrusel de Aliados Comerciales.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al importar",
        description: err.message || "No se pudieron importar los logos.",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-teal-50/80 via-slate-50 to-amber-50/40 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              Aliados Comerciales y Empresas en Portada Inicial
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Sube y administra los logotipos de las empresas, cadenas de farmacias, clínicas, laboratorios y marcas aliadas que se muestran en la pantalla principal (`/`).
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isImporting}
              onClick={handleImportFromPharmacies}
              className="text-xs border-teal-300 text-teal-800 hover:bg-teal-50"
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
              Importar Logos de Farmacias Activas
            </Button>
            <Button type="button" size="sm" onClick={openCreateModal} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Cargar Logo de Aliado
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {!commercialAllies || commercialAllies.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed rounded-2xl bg-slate-50/60 space-y-3">
            <Building2 className="h-10 w-10 text-slate-400 mx-auto" />
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Aún no has cargado logotipos personalizados</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Haz clic en <strong>&quot;Cargar Logo de Aliado&quot;</strong> para subir los logos de tus empresas aliadas (en formato WebP automático), o importa con un clic los logos de las farmacias registradas.
              </p>
            </div>
            <Button type="button" size="sm" onClick={openCreateModal} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              Subir Primer Logo de Empresa Aliada
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {commercialAllies.map((ally) => {
              const catInfo = CATEGORY_LABELS[ally.category || "aliado"] || CATEGORY_LABELS.aliado;
              return (
                <div
                  key={ally.id}
                  className={`p-4 rounded-2xl border transition-all flex items-center gap-4 bg-white ${
                    ally.isActive === false ? "opacity-50 border-slate-200" : "border-slate-200 shadow-xs hover:shadow-md"
                  }`}
                >
                  <div className="h-16 w-20 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-center p-2 shrink-0 overflow-hidden">
                    <img src={ally.logoUrl} alt={ally.name} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">{ally.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] font-semibold ${catInfo.color}`}>
                        {catInfo.label}
                      </Badge>
                      {ally.country && ally.country !== "ALL" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {ally.country}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Switch checked={ally.isActive !== false} onCheckedChange={() => handleToggleActive(ally)} />
                        <span className="text-[11px] text-slate-500">
                          {ally.isActive !== false ? "Visible" : "Oculto"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditModal(ally)}
                        >
                          <Pencil className="h-3.5 w-3.5 text-slate-600" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-rose-600 hover:text-rose-700"
                          onClick={() => handleDeleteAlly(ally.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Modal Subir / Editar Aliado Comercial */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md" onPaste={handlePasteImage}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Handshake className="h-5 w-5 text-teal-600" />
              {editingAlly ? "Editar Aliado Comercial" : "Nuevo Aliado Comercial"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sube el logotipo de la empresa o cadena aliada (puedes seleccionar archivo o pegar directamente con <strong>Ctrl+V</strong>; se optimiza a formato <strong>WebP</strong>).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAlly} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nombre de la Empresa / Cadena / Marca *</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Farmatodo / Policlínica Metropolitana / Laboratorios Leti"
                className="h-9 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Categoría</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CommercialAlly["category"])}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="farmacia">💊 Farmacia / Cadena</SelectItem>
                    <SelectItem value="clinica">🏥 Clínica / Centro Médico</SelectItem>
                    <SelectItem value="laboratorio">🔬 Laboratorio Clínico</SelectItem>
                    <SelectItem value="marca">🏭 Marca / Casa Médica</SelectItem>
                    <SelectItem value="aliado">🤝 Aliado Comercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">País</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">🌎 Todos los Países</SelectItem>
                    {(countries && countries.length > 0
                      ? countries
                      : [
                          { code: "VE", name: "Venezuela", flag: "🇻🇪" },
                          { code: "AR", name: "Argentina", flag: "🇦🇷" },
                          { code: "CO", name: "Colombia", flag: "🇨🇴" },
                        ]
                    ).map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag || "🏳️"} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Subida de Logo WebP */}
            <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-teal-600" />
                  Logotipo de la Empresa (WebP) *
                </Label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="text-[11px] text-rose-600 hover:underline"
                  >
                    Quitar imagen
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="h-20 w-28 rounded-xl border bg-white flex items-center justify-center p-2 shrink-0 overflow-hidden relative">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center">Sin logo</span>
                  )}
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <label className="cursor-pointer inline-flex items-center justify-center w-full h-9 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {isUploadingLogo ? "Subiendo WebP..." : "Subir Archivo de Logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                  </label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="O pega la URL directa del logo..."
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Ciudad / Sede (Opcional)</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ej: Nacional / Caracas"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sitio Web o Enlace (Opcional)</Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving || isUploadingLogo} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">
                {isSaving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Guardar Aliado
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

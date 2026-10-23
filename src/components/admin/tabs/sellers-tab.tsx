"use client";
import { z } from 'zod';
import { useState, useCallback, useEffect, useMemo } from "react";
import type { Seller, Doctor, SellerPayment, IncludedDoctorCommission, DoctorPayment } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import * as supabaseService from '@/lib/supabaseService';
import { Loader2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Copy, Trash2, Pencil, RefreshCw, UserPlus, Landmark, Share2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { hashPassword } from '@/lib/password-utils';
import { LocationSelector, LocationData } from '@/components/ui/location-selector';

const SellerFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  phone: z.string().optional().or(z.literal('')),
  commissionRate: z.number().min(0, "La comisión no puede ser negativa.").max(1, "Usa formato decimal (ej. 0.2 para 20%)."),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (password && password.trim().length > 0) {
    if (password.trim().length < 6) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La contraseña debe tener al menos 6 caracteres.",
        path: ["password"],
      });
    }
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Las contraseñas no coinciden.",
        path: ["confirmPassword"],
      });
    }
  }
});

export function SellersTab() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pendientes");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [, setDoctorPayments] = useState<DoctorPayment[]>([]);
  const [sellerPayments, setSellerPayments] = useState<SellerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncingCommissions, setIsSyncingCommissions] = useState(false);
  const [isSavingSeller, setIsSavingSeller] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [sellerLocationData, setSellerLocationData] = useState<LocationData>({
    country: 'VE',
    state: 'Monagas',
    city: 'Maturín',
    sector: '',
    address: '',
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Seller | null>(null);
  const [isPendingPaymentDialogOpen, setIsPendingPaymentDialogOpen] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    seller: Seller;
    pendingAmount: number;
    includedDoctors: IncludedDoctorCommission[];
    period: string;
    transactionId?: string;
  } | null>(null);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const [selectedSellerForHistory, setSelectedSellerForHistory] = useState<Seller | null>(null);
  const [sellerPaymentHistory, setSellerPaymentHistory] = useState<SellerPayment[]>([]);
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Agrupar pagos pendientes por vendedora
  const pendingPaymentsBySeller = useMemo(() => {
    const grouped: Record<string, SellerPayment[]> = {};
    sellerPayments.filter(p => p.status !== "paid").forEach(p => {
      if (!grouped[p.sellerId]) grouped[p.sellerId] = [];
      grouped[p.sellerId].push(p);
    });
    return grouped;
  }, [sellerPayments]);

  // Agrupar historial de pagos por vendedora
  const paidPaymentsBySeller = useMemo(() => {
    const grouped: Record<string, SellerPayment[]> = {};
    sellerPayments.filter(p => p.status === "paid").forEach(p => {
      if (!grouped[p.sellerId]) grouped[p.sellerId] = [];
      grouped[p.sellerId].push(p);
    });
    return grouped;
  }, [sellerPayments]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Sincronizar silenciosamente comisiones de pagos de médicos ya aprobados
      await fetch('/api/seller-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_commissions' }),
      }).catch(() => {});

      const [sells, docs, docPayments, sellerPaymentsData] = await Promise.all([
        supabaseService.getSellers(),
        supabaseService.getDoctors(),
        supabaseService.getDoctorPayments(),
        supabaseService.getSellerPayments(),
      ]);
      setSellers(sells);
      setDoctors(docs);
      setDoctorPayments(docPayments);
      setSellerPayments(sellerPaymentsData);
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos de las vendedoras.' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleManualSyncCommissions = async () => {
    setIsSyncingCommissions(true);
    try {
      const res = await fetch('/api/seller-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_commissions' }),
      });
      const data = await res.json();
      await fetchData();
      toast({
        title: 'Comisiones Sincronizadas',
        description: data.createdOrUpdated > 0
          ? `Se actualizaron ${data.createdOrUpdated} registro(s) de comisión pendiente.`
          : 'Todas las comisiones por pagos de médicos están al día.',
      });
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron sincronizar las comisiones.' });
    } finally {
      setIsSyncingCommissions(false);
    }
  };

  // Filtrar vendedoras basado en el término de búsqueda
  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    return (
      seller.name.toLowerCase().includes(searchLower) ||
      seller.email.toLowerCase().includes(searchLower) ||
      (seller.referralCode && seller.referralCode.toLowerCase().includes(searchLower))
    );
  });

  // Cálculos de paginación
  const totalPages = Math.ceil(filteredSellers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedSellers = filteredSellers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Resetear a página 1 cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await supabaseService.deleteSeller(itemToDelete.id);
      toast({ title: "Vendedora Eliminada", description: `${itemToDelete.name} ha sido eliminada del sistema.` });
      fetchData();
    } catch {
      toast({ variant: 'destructive', title: 'Error al eliminar', description: 'No se pudo completar la operación.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsProcessingPayment(true);
    try {
      if (!pendingPaymentData) return;
      const pendientes = sellerPayments.filter(
        p => p.sellerId === pendingPaymentData.seller.id && p.status === "pending"
      );
      if (pendientes.length === 0) throw new Error("No hay pagos pendientes para esta vendedora.");

      let proofUrl = pendientes[0].paymentProofUrl;
      if (paymentProofFile) {
        proofUrl = await supabaseService.uploadPaymentProof(paymentProofFile, `seller-payments/${pendingPaymentData.seller.id}/${Date.now()}-${paymentProofFile.name}`);
      }

      await Promise.all(
        pendientes.map(p =>
          supabaseService.updateSellerPayment(p.id, {
            status: "paid",
            paymentProofUrl: proofUrl,
            transactionId: pendingPaymentData.transactionId || p.transactionId,
            paymentDate: new Date().toISOString().split('T')[0],
          })
        )
      );
      toast({
        title: "Pago registrado",
        description: "Las comisiones han sido marcadas como pagadas.",
      });
      setIsPendingPaymentDialogOpen(false);
      setPaymentProofFile(null);
      await fetchData();
    } catch (error: unknown) {
      let message = "No se pudo registrar el pago. Intenta de nuevo.";
      if (error && typeof error === "object" && "message" in error && typeof (error as { message: string }).message === "string") {
        message = (error as { message: string }).message;
      }
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleSaveSeller = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const dataToValidate = {
      name: (formData.get('name') as string || '').trim(),
      email: (formData.get('email') as string || '').trim(),
      phone: (formData.get('phone') as string || '').trim(),
      commissionRate: parseFloat(formData.get('commissionRate') as string),
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    const result = SellerFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
      return;
    }

    setIsSavingSeller(true);
    try {
      if (editingSeller) {
        const normalizedEmail = result.data.email.toLowerCase();

        if (normalizedEmail !== editingSeller.email.toLowerCase()) {
          const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
          if (existingUser && existingUser.id !== editingSeller.id) {
            toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
            setIsSavingSeller(false);
            return;
          }
        }

        const updatePayload: Partial<Seller> = {
          name: result.data.name,
          email: normalizedEmail,
          phone: result.data.phone || null,
          commissionRate: result.data.commissionRate,
          country: sellerLocationData.country,
          state: sellerLocationData.state,
          city: sellerLocationData.city,
          sector: sellerLocationData.sector,
          address: sellerLocationData.address,
        };

        if (result.data.password && result.data.password.trim()) {
          updatePayload.password = await hashPassword(result.data.password.trim());
        }

        await supabaseService.updateSeller(editingSeller.id, updatePayload);
        toast({ title: "Vendedora Actualizada", description: "Los datos de la vendedora han sido guardados." });
      } else {
        if (!result.data.password) {
          toast({ variant: 'destructive', title: 'Contraseña Requerida', description: 'Debe establecer una contraseña para las nuevas vendedoras.' });
          setIsSavingSeller(false);
          return;
        }
        const normalizedEmail = result.data.email.toLowerCase();
        const existingUser = await supabaseService.findUserByEmail(normalizedEmail);
        if (existingUser) {
          toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
          setIsSavingSeller(false);
          return;
        }

        const cleanPrefix = result.data.name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'SUMA';
        const referralCode = `${cleanPrefix}${Math.floor(100 + Math.random() * 900)}`;

        const hashedPassword = await hashPassword(result.data.password);

        const newSellerData: Omit<Seller, 'id'> = {
          name: result.data.name,
          email: normalizedEmail,
          password: hashedPassword,
          commissionRate: result.data.commissionRate,
          referralCode: referralCode,
          phone: result.data.phone || null,
          country: sellerLocationData.country,
          state: sellerLocationData.state,
          city: sellerLocationData.city,
          sector: sellerLocationData.sector,
          address: sellerLocationData.address,
          profileImage: 'https://placehold.co/400x400.png',
          bankDetails: [],
          expenses: [],
        };
        await supabaseService.addSeller(newSellerData);

        // Enviar correo de bienvenida al vendedor (no bloqueante)
        fetch('/api/send-welcome-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: normalizedEmail,
            name: result.data.name,
            role: 'seller',
            extraData: { tempPassword: result.data.password },
          }),
        }).catch(() => {});

        toast({
          title: "Vendedora Registrada",
          description: `${result.data.name} ha sido añadida (Código: ${referralCode}) y notificada por correo.`,
        });
      }

      await fetchData();
      setIsSellerDialogOpen(false);
      setEditingSeller(null);
    } catch (err: any) {
      console.error('Error guardando vendedora:', err);
      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: err?.message || 'No se pudo guardar la información de la vendedora.',
      });
    } finally {
      setIsSavingSeller(false);
    }
  };

  const handleCopyReferralLink = (referralCode: string, sellerName: string) => {
    const link = `${window.location.origin}/auth/register-doctor?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Enlace de referido copiado',
      description: `Se copió el enlace para referir médicos de ${sellerName} (${referralCode}).`,
    });
  };

  const handleShareReferralWhatsApp = (referralCode: string, sellerName: string) => {
    const link = `${window.location.origin}/auth/register-doctor?ref=${referralCode}`;
    const text = `¡Hola Dr(a).! 👋 Te invito a registrarte en *SUMA*, nuestra plataforma integral de gestión médica y agenda de pacientes. Regístrate con el código de asesoría de *${sellerName}* (${referralCode}) aquí: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="pendientes">Vendedoras y Comisiones ({sellers.length})</TabsTrigger>
        <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
      </TabsList>
      {/* TAB PENDIENTES */}
      <TabsContent value="pendientes">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Gestión de Vendedoras y Comisiones por Médicos Referidos</CardTitle>
              <CardDescription>
                Registra vendedoras, copia sus enlaces de referido para médicos y gestiona el pago de sus comisiones.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleManualSyncCommissions}
                disabled={isSyncingCommissions}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isSyncingCommissions ? 'animate-spin' : ''}`} />
                Sincronizar Comisiones
              </Button>
              <Button onClick={() => {
                setEditingSeller(null);
                setSellerLocationData({
                  country: 'VE',
                  state: 'Monagas',
                  city: 'Maturín',
                  sector: '',
                  address: '',
                });
                setIsSellerDialogOpen(true);
              }}>
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar vendedora
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Buscador */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar vendedoras por nombre, email o código de referido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Mostrando {filteredSellers.length} de {sellers.length} vendedoras
                </p>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedora</TableHead>
                  <TableHead>Código / Comisión</TableHead>
                  <TableHead>Médicos Referidos</TableHead>
                  <TableHead>Comisión Pendiente</TableHead>
                  <TableHead>Estatus de Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSellers.length > 0 ? paginatedSellers.map(seller => {
                  const pendientes = pendingPaymentsBySeller[seller.id] || [];
                  const total = pendientes.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const tienePendientes = pendientes.length > 0;
                  const referredDocs = doctors.filter(d => d.sellerId === seller.id);
                  const verifiedReferredCount = referredDocs.filter(d => d.verificationStatus === 'verified').length;

                  return (
                    <TableRow key={seller.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{seller.name}</span>
                          <span className="text-xs text-muted-foreground">{seller.email}</span>
                          {seller.phone && <span className="text-xs text-muted-foreground">{seller.phone}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-xs">
                              {seller.referralCode || 'SIN-COD'}
                            </Badge>
                            {seller.referralCode && (
                              <>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Copiar enlace de referido para médicos"
                                  onClick={() => handleCopyReferralLink(seller.referralCode, seller.name)}
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-emerald-600 hover:text-emerald-700"
                                  title="Compartir enlace por WhatsApp"
                                  onClick={() => handleShareReferralWhatsApp(seller.referralCode, seller.name)}
                                >
                                  <Share2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Comisión recurrente: <strong>{Math.round((seller.commissionRate ?? 0.2) * 100)}%</strong>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold">{referredDocs.length} médico(s)</span>
                          <span className="text-xs text-muted-foreground">
                            {verifiedReferredCount} verificado(s)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-semibold">
                        ${total.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {tienePendientes ? (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white">
                            Pago Pendiente
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">
                            Al día
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant={tienePendientes ? "default" : "outline"}
                            onClick={() => {
                              setPendingPaymentData({
                                seller,
                                pendingAmount: total,
                                includedDoctors: pendientes.flatMap(p => p.includedDoctors),
                                period: pendientes.map(p => p.period).join(", "),
                                transactionId: ""
                              });
                              setIsPendingPaymentDialogOpen(true);
                            }}
                            disabled={!tienePendientes}
                          >
                            {tienePendientes ? "Pagar / Detalle" : "Sin Pendientes"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSellerForHistory(seller);
                              const history = sellerPayments.filter(p => p.sellerId === seller.id && p.status === 'paid');
                              setSellerPaymentHistory(history);
                              setIsPaymentHistoryDialogOpen(true);
                            }}
                          >
                            Historial
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            title="Editar vendedora"
                            onClick={() => {
                              setEditingSeller(seller);
                              setSellerLocationData({
                                country: seller.country || 'VE',
                                state: seller.state || '',
                                city: seller.city || '',
                                sector: seller.sector || '',
                                address: seller.address || '',
                              });
                              setIsSellerDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            title="Eliminar vendedora"
                            onClick={() => {
                              setItemToDelete(seller);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No hay vendedoras registradas. Haz clic en "Registrar vendedora" para añadir la primera.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-4 mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredSellers.length)} de {filteredSellers.length} vendedoras
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-3">
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      {/* TAB HISTORIAL */}
      <TabsContent value="historial">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos a Vendedoras</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedora</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Total Pagado</TableHead>
                  <TableHead>Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.flatMap(seller => {
                  const pagados = paidPaymentsBySeller[seller.id] || [];
                  return pagados.map((pago, idx) => (
                    <TableRow key={pago.id + "-" + idx}>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell>{pago.paymentDate}</TableCell>
                      <TableCell>{pago.period}</TableCell>
                      <TableCell>${(pago.amount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => {
                          setPendingPaymentData({
                            seller,
                            pendingAmount: pago.amount,
                            includedDoctors: pago.includedDoctors,
                            period: pago.period,
                            transactionId: pago.transactionId || ""
                          });
                          setIsPendingPaymentDialogOpen(true);
                        }}>
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      {/* Diálogo de Detalle y Pago */}
      <Dialog open={isPendingPaymentDialogOpen} onOpenChange={setIsPendingPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Comisión Recurrente - {pendingPaymentData?.seller.name}</DialogTitle>
            <DialogDescription>
              Período(s): {pendingPaymentData?.period}
            </DialogDescription>
          </DialogHeader>
          {pendingPaymentData && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Comisión:</span>
                  <span className="text-2xl font-bold text-amber-600">${(pendingPaymentData.pendingAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Cuentas Bancarias de la Vendedora */}
              <div className="rounded-lg border bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
                    <Landmark className="h-4 w-4 text-primary" />
                    Datos Bancarios de {pendingPaymentData.seller.name}
                  </h4>
                  {pendingPaymentData.seller.phone && (
                    <span className="text-xs text-muted-foreground">Tel: {pendingPaymentData.seller.phone}</span>
                  )}
                </div>
                {Array.isArray(pendingPaymentData.seller.bankDetails) && pendingPaymentData.seller.bankDetails.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {pendingPaymentData.seller.bankDetails.map((acc) => (
                      <div key={acc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border bg-white p-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900">
                            {acc.bank} <Badge variant="secondary" className="ml-1 text-[10px]">{acc.accountType}</Badge>
                          </div>
                          <div className="text-slate-600">
                            Titular: <strong>{acc.accountHolder}</strong> • Doc/Cédula/CUIT: <strong>{acc.idNumber}</strong>
                          </div>
                          <div className="font-mono text-slate-800">
                            Cuenta / CBU / Alias: <strong>{acc.accountNumber}</strong>
                          </div>
                          {acc.description && (
                            <div className="text-muted-foreground italic">{acc.description}</div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-8 text-xs"
                          onClick={() => {
                            const copyStr = `Banco: ${acc.bank}\nTipo: ${acc.accountType}\nTitular: ${acc.accountHolder}\nDocumento: ${acc.idNumber}\nCuenta/CBU/Alias: ${acc.accountNumber}`;
                            navigator.clipboard.writeText(copyStr);
                            toast({
                              title: 'Datos bancarios copiados',
                              description: `Se copiaron los datos de ${acc.bank} al portapapeles.`,
                            });
                          }}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copiar Cuenta
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2.5">
                    Esta vendedora aún no ha registrado cuentas bancarias en la pestaña "Cuentas" de su portal.
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Desglose por Pago de Médico Referido:</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médico</TableHead>
                      <TableHead className="text-right">Comisión</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPaymentData.includedDoctors.map((doc, idx) => (
                      <TableRow key={doc.id + "-" + idx}>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell className="text-right font-mono">${(doc.commissionAmount || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {activeTab === "pendientes" && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-semibold">Registrar Pago a la Vendedora:</h4>
                  <div>
                    <Label htmlFor="paymentProof">Comprobante de Pago (Imagen o PDF)</Label>
                    <Input
                      id="paymentProof"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transactionId">ID o Referencia de Transacción</Label>
                    <Input
                      id="transactionId"
                      type="text"
                      placeholder="Ej: REF-987654"
                      onChange={(e) => setPendingPaymentData(prev => prev ? { ...prev, transactionId: e.target.value } : prev)}
                    />
                  </div>
                  <Button
                    onClick={handleMarkAsPaid}
                    disabled={!paymentProofFile || isProcessingPayment}
                    className="w-full"
                  >
                    {isProcessingPayment ? "Procesando..." : "Confirmar y Marcar como Pagado"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Historial de Pagos */}
      <Dialog open={isPaymentHistoryDialogOpen} onOpenChange={setIsPaymentHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de Pagos - {selectedSellerForHistory?.name}</DialogTitle>
            <DialogDescription>
              Registro de todas las comisiones pagadas a esta vendedora
            </DialogDescription>
          </DialogHeader>

          {sellerPaymentHistory.length > 0 ? (
            <div className="space-y-4">
              {sellerPaymentHistory.map((payment, idx) => (
                <Card key={payment.id + '-' + idx}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">${(payment.amount || 0).toFixed(2)}</CardTitle>
                        <CardDescription>
                          Período: {payment.period} | Fecha: {payment.paymentDate}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {payment.transactionId}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold mb-2">Médicos incluidos:</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Médico</TableHead>
                              <TableHead className="text-right">Comisión</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {payment.includedDoctors.map((doc, dIdx) => (
                              <TableRow key={doc.id + '-' + dIdx}>
                                <TableCell>{doc.name}</TableCell>
                                <TableCell className="text-right font-mono">${(doc.commissionAmount || 0).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {payment.paymentProofUrl && (
                        <div>
                          <a href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-sm">Ver comprobante</a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">No hay pagos registrados para esta vendedora.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edición/Creación de Vendedora */}
      <Dialog open={isSellerDialogOpen} onOpenChange={setIsSellerDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeller ? 'Editar Vendedora' : 'Registrar Nueva Vendedora'}</DialogTitle>
            <DialogDescription>
              {editingSeller
                ? 'Modifica los datos de la vendedora y su tasa de comisión por médicos referidos.'
                : 'Crea una cuenta de vendedora. Se generará automáticamente su código de referido y recibirá un correo con sus credenciales.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveSeller}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" defaultValue={editingSeller?.name} placeholder="Ej: María Gómez" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingSeller?.email} placeholder="vendedora@ejemplo.com" required />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <Input id="phone" name="phone" type="tel" defaultValue={editingSeller?.phone || ''} placeholder="+58 412 1234567" />
                </div>
              </div>
              <div>
                <Label htmlFor="commissionRate">Tasa de Comisión por Médico Referido (ej. 0.20 para 20%)</Label>
                <Input id="commissionRate" name="commissionRate" type="number" step="0.01" min="0" max="1" defaultValue={editingSeller?.commissionRate ?? 0.2} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">{editingSeller ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}</Label>
                  <Input id="password" name="password" type="password" placeholder={editingSeller ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'} required={!editingSeller} />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repetir contraseña" required={!editingSeller} />
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-sm font-semibold mb-2 text-slate-800">Ubicación Geográfica y Territorio</h4>
                <LocationSelector
                  country={sellerLocationData.country}
                  state={sellerLocationData.state}
                  city={sellerLocationData.city}
                  sector={sellerLocationData.sector}
                  address={sellerLocationData.address}
                  onLocationChange={(newLoc) => setSellerLocationData(newLoc)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSavingSeller}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSavingSeller}>
                {isSavingSeller && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro que deseas eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente y no se puede deshacer. Se eliminará a {itemToDelete?.name} del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sí, Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}

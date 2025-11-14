
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

import * as firestoreService from '@/lib/firestoreService';
import { Loader2, Search } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { hashPassword } from '@/lib/password-utils';

const SellerFormSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  email: z.string().email("Correo electrónico inválido."),
  commissionRate: z.number().min(0).max(1),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
});

export function SellersTab() {
  // HOOKS: todos juntos al inicio, en orden
  const { toast } = useToast();
  // const { settings } = useSettings(); // Comentado porque no se usa actualmente
  const [activeTab, setActiveTab] = useState("pendientes");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [ , setDoctors] = useState<Doctor[]>([]);
  const [ , setDoctorPayments] = useState<DoctorPayment[]>([]);
  const [sellerPayments, setSellerPayments] = useState<SellerPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSellerDialogOpen, setIsSellerDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
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
      const [sells, docs, docPayments, sellerPaymentsData] = await Promise.all([
        firestoreService.getSellers(),
        firestoreService.getDoctors(),
        firestoreService.getDoctorPayments(),
        firestoreService.getSellerPayments(),
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

  // Filtrar vendedoras basado en el término de búsqueda
  const filteredSellers = sellers.filter(seller => {
    const searchLower = searchTerm.toLowerCase();
    return (
      seller.name.toLowerCase().includes(searchLower) ||
      seller.email.toLowerCase().includes(searchLower) ||
      (seller.referralCode && seller.referralCode.toLowerCase().includes(searchLower))
    );
  });

  // Calcular comisión pendiente para cada vendedora
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    try {
      await firestoreService.deleteSeller(itemToDelete.id);
      toast({ title: "Vendedora Eliminada" });
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
      // Buscar todos los pagos pendientes de la vendedora
      const pendientes = sellerPayments.filter(
        p => p.sellerId === pendingPaymentData.seller.id && p.status === "pending"
      );
      if (pendientes.length === 0) throw new Error("No hay pagos pendientes para esta vendedora.");
      // Subir comprobante una sola vez (si existe)
      let proofUrl = pendientes[0].paymentProofUrl;
      if (paymentProofFile) {
        proofUrl = await firestoreService.uploadPaymentProof(paymentProofFile, `seller-payments/${pendingPaymentData.seller.id}/${Date.now()}-${paymentProofFile.name}`);
      }
      // Actualizar todos a 'paid'
      await Promise.all(
        pendientes.map(p =>
          firestoreService.updateSellerPayment(p.id, {
            status: "paid",
            paymentProofUrl: proofUrl,
            transactionId: pendingPaymentData.transactionId || p.transactionId
          })
        )
      );
      toast({
        title: "Pago registrado",
        description: "Los pagos han sido marcados como pagados.",
      });
      setIsPendingPaymentDialogOpen(false);
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
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      commissionRate: parseFloat(formData.get('commissionRate') as string),
      password: formData.get('password') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    };

    const result = SellerFormSchema.safeParse(dataToValidate);
    if (!result.success) {
      toast({ variant: 'destructive', title: 'Error de Validación', description: result.error.errors.map(err => err.message).join(' ') });
      return;
    }

    if (editingSeller) {
      const normalizedEmail = result.data.email.toLowerCase();
      
      // Validar si el email cambió y si ya está en uso por otro usuario
      if (normalizedEmail !== editingSeller.email.toLowerCase()) {
        const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
        if (existingUser && existingUser.id !== editingSeller.id) {
          toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
          return;
        }
      }
      
      await firestoreService.updateSeller(editingSeller.id, {
        name: result.data.name,
        email: normalizedEmail,
        commissionRate: result.data.commissionRate,
      });
      toast({ title: "Vendedora Actualizada", description: "Los datos han sido guardados." });
    } else {
      if (!result.data.password) {
        toast({ variant: 'destructive', title: 'Contraseña Requerida', description: 'Debe establecer una contraseña para las nuevas vendedoras.' });
        return;
      }
      const normalizedEmail = result.data.email.toLowerCase();
      const existingUser = await firestoreService.findUserByEmail(normalizedEmail);
      if (existingUser) {
        toast({ variant: 'destructive', title: 'Correo ya registrado', description: 'Este correo electrónico ya está en uso por otro usuario.' });
        return;
      }
      
      const referralCode = `${result.data.name.substring(0, 4).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

      // Encriptar contraseña
      const hashedPassword = await hashPassword(result.data.password);

      const newSellerData: Omit<Seller, 'id'> = {
        name: result.data.name,
        email: normalizedEmail,
        password: hashedPassword,
        commissionRate: result.data.commissionRate,
        referralCode: referralCode,
        phone: null,
        profileImage: 'https://placehold.co/400x400.png',
        bankDetails: [],
        expenses: [],
      };
      await firestoreService.addSeller(newSellerData);
      toast({ title: "Vendedora Registrada", description: `${result.data.name} ha sido añadida.` });
    }

    fetchData();
    setIsSellerDialogOpen(false);
    setEditingSeller(null);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>
      {/* TAB PENDIENTES */}
      <TabsContent value="pendientes">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
              <CardTitle>Pagos Pendientes a Vendedoras</CardTitle>
          </div>
          <Button onClick={() => { setEditingSeller(null); setIsSellerDialogOpen(true); }}>
              Registrar vendedora
          </Button>
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
                  <TableHead>Total Pendiente</TableHead>
                  <TableHead># Médicos</TableHead>
                  <TableHead>Estatus</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Editar</TableHead>
                  <TableHead>Historial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSellers.map(seller => {
                  const pendientes = pendingPaymentsBySeller[seller.id] || [];
                  const total = pendientes.reduce((sum, p) => sum + (p.amount || 0), 0);
                  const doctors = Array.from(new Set(pendientes.flatMap(p => p.includedDoctors.map(d => d.name))));
                  const tienePendientes = pendientes.length > 0;
                  return (
                  <TableRow key={seller.id}>
                      <TableCell>{seller.name}</TableCell>
                      <TableCell>${total.toFixed(2)}</TableCell>
                      <TableCell>{doctors.length}</TableCell>
                      <TableCell>
                        {tienePendientes ? (
                          <span style={{color: 'orange', fontWeight: 'bold'}}>Pendiente</span>
                        ) : (
                          <span style={{color: 'green'}}>Sin pagos pendientes</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => {
                          setPendingPaymentData({
                            seller,
                            pendingAmount: total,
                            includedDoctors: pendientes.flatMap(p => p.includedDoctors),
                            period: pendientes.map(p => p.period).join(", "),
                            transactionId: ""
                          });
                          setIsPendingPaymentDialogOpen(true);
                        }} disabled={!tienePendientes}>
                          Ver Detalle
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => {
                          if (!tienePendientes) return;
                          setPendingPaymentData({
                            seller,
                            pendingAmount: total,
                            includedDoctors: pendientes.flatMap(p => p.includedDoctors),
                            period: pendientes.map(p => p.period).join(", "),
                            transactionId: ""
                          });
                          setIsPendingPaymentDialogOpen(true);
                        }} disabled={!tienePendientes}>
                          {isProcessingPayment && seller.id === pendingPaymentData?.seller.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            "Marcar como Pagado"
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditingSeller(seller);
                          setIsSellerDialogOpen(true);
                        }}>
                          Editar
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => {
                          setSelectedSellerForHistory(seller);
                          const history = sellerPayments.filter(p => p.sellerId === seller.id);
                          setSellerPaymentHistory(history);
                          setIsPaymentHistoryDialogOpen(true);
                        }}>
                          Historial
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      {/* TAB HISTORIAL */}
      <TabsContent value="historial">
        <Card>
          <CardHeader>
            <CardTitle>Historial de Pagos</CardTitle>
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
                {sellers.map(seller => {
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Pago - {pendingPaymentData?.seller.name}</DialogTitle>
            <DialogDescription>
              Período(s): {pendingPaymentData?.period}
            </DialogDescription>
          </DialogHeader>
          {pendingPaymentData && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-amber-600">${(pendingPaymentData.pendingAmount || 0).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Desglose por Médico:</h4>
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
              {/* Si está en pendientes, mostrar formulario para marcar como pagado */}
              {activeTab === "pendientes" && (
                <div className="space-y-4">
                  <h4 className="font-semibold">Procesar Pago:</h4>
                  <div>
                    <Label htmlFor="paymentProof">Comprobante de Pago</Label>
                    <Input 
                      id="paymentProof" 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentProofFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="transactionId">ID de Transacción</Label>
                    <Input 
                      id="transactionId" 
                      type="text" 
                      onChange={(e) => setPendingPaymentData(prev => prev ? { ...prev, transactionId: e.target.value } : prev)}
                    />
                  </div>
                  <Button 
                    onClick={handleMarkAsPaid}
                    disabled={!paymentProofFile || isProcessingPayment}
                  >
                    {isProcessingPayment ? "Procesando..." : "Marcar como Pagado"}
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
                          <a href={payment.paymentProofUrl} target="_blank" rel="noopener noreferrer" style={{color: '#0070f3'}}>Ver comprobante</a>
                        </div>
                      )}
          </div>
        </CardContent>
      </Card>
              ))}
            </div>
          ) : (
            <p>No hay pagos registrados para esta vendedora.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de Edición/Creación de Vendedora */}
      <Dialog open={isSellerDialogOpen} onOpenChange={setIsSellerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSeller ? 'Editar Vendedora' : 'Registrar Nueva Vendedora'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSeller}>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" name="name" defaultValue={editingSeller?.name} required/>
              </div>
              <div>
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" name="email" type="email" defaultValue={editingSeller?.email} required/>
              </div>
              <div>
                <Label htmlFor="commissionRate">Tasa de Comisión (ej. 0.2 para 20%)</Label>
                <Input id="commissionRate" name="commissionRate" type="number" step="0.01" defaultValue={editingSeller?.commissionRate || 0.2} required/>
              </div>
              <div>
                <Label htmlFor="password">Nueva Contraseña</Label>
                <Input id="password" name="password" type="password" placeholder={editingSeller ? 'Dejar en blanco para no cambiar' : 'Requerido'} />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password"/>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit">Guardar</Button>
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

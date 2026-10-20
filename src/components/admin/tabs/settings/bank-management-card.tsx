"use client";

import { useState, useMemo } from 'react';
import type { BankDetail } from "@/lib/types";
import { useSettings } from "@/lib/settings";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Loader2, Pencil, Trash2, Globe, Coins } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { z } from 'zod';

const BankDetailFormSchema = z.object({
    country: z.string().min(2, "Selecciona el país de la cuenta."),
    currency: z.string().min(2, "Selecciona la moneda de la cuenta."),
    accountType: z.string().optional(),
    bank: z.string().min(2, "El nombre del banco o plataforma es requerido."),
    accountHolder: z.string().min(3, "El nombre del titular es requerido."),
    idNumber: z.string().min(4, "El documento fiscal (RIF / CUIT / DNI / NIT) es requerido."),
    accountNumber: z.string().min(4, "Ingresa el Número de Cuenta, CBU/CVU, Teléfono o Correo."),
    alias: z.string().optional(),
    phone: z.string().optional(),
    description: z.string().optional(),
});

interface BankManagementCardProps {
    bankDetails: BankDetail[];
    onAddBankDetail: (detail: Omit<BankDetail, 'id'>) => Promise<void>;
    onUpdateBankDetail: (id: string, detail: BankDetail) => Promise<void>;
    onDeleteBankDetail: (id: string) => Promise<void>;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    transferencia: 'Transferencia Bancaria',
    pago_movil: 'Pago Móvil (VE)',
    cuenta_nacional: 'CBU / CVU / Alias (AR)',
    zelle: 'Zelle / Binance / USD Digital',
    efectivo_dolares: 'Efectivo / Taquilla',
    otro: 'Otro Medio de Pago',
};

export function BankManagementCard({ bankDetails, onAddBankDetail, onUpdateBankDetail, onDeleteBankDetail }: BankManagementCardProps) {
    const { toast } = useToast();
    const { countries } = useSettings();

    const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('ALL');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBankDetail, setEditingBankDetail] = useState<BankDetail | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<BankDetail | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Controlled fields inside modal for country/currency/accountType
    const [formCountry, setFormCountry] = useState<string>('VE');
    const [formCurrency, setFormCurrency] = useState<string>('VES');
    const [formAccountType, setFormAccountType] = useState<string>('transferencia');

    const countryOptions = useMemo(() => {
        const base = countries && countries.length > 0
            ? countries.map(c => ({ code: c.code, name: c.name, flag: c.flag || '🏳️', currency: c.currency || 'USD' }))
            : [
                { code: 'VE', name: 'Venezuela', flag: '🇻🇪', currency: 'VES' },
                { code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS' },
                { code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP' },
            ];
        return [
            ...base,
            { code: 'GLOBAL', name: 'Internacional / Global (Zelle, Binance, PayPal)', flag: '🌎', currency: 'USD' }
        ];
    }, [countries]);

    const currencyOptions = useMemo(() => {
        const dynamicCurrencies = new Map<string, string>();
        dynamicCurrencies.set('VES', '🇻🇪 VES — Bolívares (Bs.)');
        dynamicCurrencies.set('ARS', '🇦🇷 ARS — Pesos Argentinos ($)');
        dynamicCurrencies.set('COP', '🇨🇴 COP — Pesos Colombianos ($)');
        dynamicCurrencies.set('USD', '🇺🇸 USD — Dólares Americanos ($)');
        dynamicCurrencies.set('EUR', '🇪🇺 EUR — Euros (€)');
        (countries || []).forEach(c => {
            if (c.currency && !dynamicCurrencies.has(c.currency)) {
                dynamicCurrencies.set(c.currency, `${c.flag || '🏳️'} ${c.currency} — Moneda Local (${c.name})`);
            }
        });
        return Array.from(dynamicCurrencies.entries()).map(([code, label]) => ({ code, label }));
    }, [countries]);

    const getCountryBadge = (countryCode?: string) => {
        const code = (countryCode || 'VE').toUpperCase();
        if (code === 'GLOBAL') return { flag: '🌎', name: 'Internacional' };
        const found = countryOptions.find(c => c.code === code);
        if (found) return { flag: found.flag, name: found.name };
        if (code === 'AR') return { flag: '🇦🇷', name: 'Argentina' };
        if (code === 'CO') return { flag: '🇨🇴', name: 'Colombia' };
        return { flag: '🇻🇪', name: 'Venezuela' };
    };

    const filteredBankDetails = useMemo(() => {
        if (selectedCountryFilter === 'ALL') return bankDetails;
        return bankDetails.filter(b => (b.country || 'VE').toUpperCase() === selectedCountryFilter);
    }, [bankDetails, selectedCountryFilter]);

    const openDialog = (item: BankDetail | null) => {
        setEditingBankDetail(item);
        if (item) {
            setFormCountry((item.country || 'VE').toUpperCase());
            setFormCurrency((item.currency || (item.country === 'AR' ? 'ARS' : item.country === 'CO' ? 'COP' : 'VES')).toUpperCase());
            setFormAccountType(item.accountType || 'transferencia');
        } else {
            const initialCountry = selectedCountryFilter !== 'ALL' ? selectedCountryFilter : 'VE';
            setFormCountry(initialCountry);
            const matchedCountry = countryOptions.find(c => c.code === initialCountry);
            setFormCurrency(matchedCountry?.currency || (initialCountry === 'AR' ? 'ARS' : initialCountry === 'CO' ? 'COP' : initialCountry === 'GLOBAL' ? 'USD' : 'VES'));
            setFormAccountType(initialCountry === 'AR' ? 'cuenta_nacional' : initialCountry === 'GLOBAL' ? 'zelle' : 'transferencia');
        }
        setIsDialogOpen(true);
    };

    const handleCountryChangeInForm = (nextCountry: string) => {
        setFormCountry(nextCountry);
        const matched = countryOptions.find(c => c.code === nextCountry);
        if (matched?.currency) {
            setFormCurrency(matched.currency);
        } else if (nextCountry === 'AR') {
            setFormCurrency('ARS');
        } else if (nextCountry === 'CO') {
            setFormCurrency('COP');
        } else if (nextCountry === 'GLOBAL') {
            setFormCurrency('USD');
        } else {
            setFormCurrency('VES');
        }

        if (nextCountry === 'AR') setFormAccountType('cuenta_nacional');
        else if (nextCountry === 'GLOBAL') setFormAccountType('zelle');
        else setFormAccountType('transferencia');
    };

    const openDeleteDialog = (item: BankDetail) => {
        setItemToDelete(item);
        setIsDeleteDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            country: formCountry,
            currency: formCurrency,
            accountType: formAccountType as BankDetail['accountType'],
            bank: (formData.get('bankName') as string || '').trim(),
            accountHolder: (formData.get('holderName') as string || '').trim(),
            idNumber: (formData.get('idNumber') as string || '').trim(),
            accountNumber: (formData.get('accountNumber') as string || '').trim(),
            alias: (formData.get('alias') as string || '').trim() || undefined,
            phone: (formData.get('phone') as string || '').trim() || undefined,
            description: (formData.get('description') as string || '').trim() || undefined,
        };

        const result = BankDetailFormSchema.safeParse(data);
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Datos incompletos', description: result.error.errors.map(err => err.message).join(' ') });
            setIsSaving(false);
            return;
        }

        try {
            const payload: Omit<BankDetail, 'id'> = {
                ...result.data,
                accountType: (result.data.accountType || 'transferencia') as BankDetail['accountType'],
            };

            if (editingBankDetail) {
                await onUpdateBankDetail(editingBankDetail.id, { ...payload, id: editingBankDetail.id });
                toast({ title: 'Cuenta Bancaria Actualizada', description: `Cuenta de ${getCountryBadge(formCountry).name} (${formCurrency}) guardada.` });
            } else {
                await onAddBankDetail(payload);
                toast({ title: 'Cuenta Bancaria Añadida', description: `Nueva cuenta para ${getCountryBadge(formCountry).name} en ${formCurrency} registrada.` });
            }
            setIsDialogOpen(false);
            setEditingBankDetail(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la cuenta bancaria.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            await onDeleteBankDetail(itemToDelete.id);
            toast({ title: 'Cuenta eliminada', description: 'La cuenta bancaria ha sido eliminada exitosamente.' });
            setIsDeleteDialogOpen(false);
            setItemToDelete(null);
        } catch {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar la cuenta.' });
        } finally {
            setIsDeleting(false);
        }
    };

    const formatAccountNumber = (number: string) => {
        if (!number) return '';
        if (/^\d{16,24}$/.test(number)) {
            return number.replace(/(\d{4})(?=\d)/g, '$1 ');
        }
        return number;
    };

    return (
        <>
            <Card className="border-primary/10">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <Landmark className="h-5 w-5 text-primary" />
                                Cuentas Bancarias y Medios de Cobro Multipaís de SUMA
                            </CardTitle>
                            <CardDescription className="text-sm">
                                Configura cuentas recaudadoras separadas por país (Venezuela en Bs., Argentina en Pesos ARS / CBU / Alias, Colombia en COP o Cuentas Internacionales en USD).
                            </CardDescription>
                        </div>
                        <Button onClick={() => openDialog(null)} className="shrink-0 w-full sm:w-auto">
                            <Landmark className="mr-2 h-4 w-4" />
                            + Añadir Cuenta por País
                        </Button>
                    </div>

                    {/* Filtro rápido por país */}
                    <div className="flex flex-wrap items-center gap-2 pt-3">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                            <Globe className="h-3.5 w-3.5" /> Filtrar por País:
                        </span>
                        <button
                            type="button"
                            onClick={() => setSelectedCountryFilter('ALL')}
                            className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                                selectedCountryFilter === 'ALL'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-muted-foreground hover:bg-muted'
                            }`}
                        >
                            Todos ({bankDetails.length})
                        </button>
                        {countryOptions.map(c => {
                            const count = bankDetails.filter(b => (b.country || 'VE').toUpperCase() === c.code).length;
                            return (
                                <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => setSelectedCountryFilter(c.code)}
                                    className={`text-xs font-bold px-3 py-1 rounded-full border transition-colors ${
                                        selectedCountryFilter === c.code
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-background text-muted-foreground hover:bg-muted'
                                    }`}
                                >
                                    {c.flag} {c.code === 'GLOBAL' ? 'Internacional (USD)' : c.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Vista móvil */}
                    <div className="md:hidden space-y-3">
                        {filteredBankDetails.map(bank => {
                            const badge = getCountryBadge(bank.country);
                            const curr = bank.currency || (bank.country === 'AR' ? 'ARS' : bank.country === 'CO' ? 'COP' : 'VES');
                            return (
                                <div key={bank.id} className="p-4 border rounded-lg space-y-3 bg-white">
                                    <div className="flex items-center justify-between gap-2 pb-2 border-b">
                                        <Badge variant="outline" className="font-bold text-xs">
                                            {badge.flag} {badge.name}
                                        </Badge>
                                        <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold text-xs">
                                            {curr}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1.5 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Banco / Medio:</span>
                                            <span className="font-bold">{bank.bank}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Titular:</span>
                                            <span className="font-medium">{bank.accountHolder}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">ID Fiscal (RIF/CUIT/DNI):</span>
                                            <span className="font-mono">{bank.idNumber}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Cuenta / CBU / Correo:</span>
                                            <span className="font-mono text-xs">{formatAccountNumber(bank.accountNumber)}</span>
                                        </div>
                                        {(bank.alias || bank.phone) && (
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Alias / Teléfono:</span>
                                                <span className="font-mono text-xs font-semibold text-primary">{bank.alias || bank.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                                        <Button variant="outline" size="sm" onClick={() => openDialog(bank)} className="h-8 px-3">
                                            <Pencil className="h-3 w-3 mr-1" /> Editar
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openDeleteDialog(bank)}
                                            className="h-8 px-3 text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredBankDetails.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Landmark className="h-8 w-8 mx-auto mb-2 opacity-60" />
                                <p>No hay cuentas bancarias registradas para este filtro</p>
                            </div>
                        )}
                    </div>

                    {/* Tabla Desktop */}
                    <div className="hidden md:block rounded-md border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>País</TableHead>
                                        <TableHead>Moneda</TableHead>
                                        <TableHead>Banco / Plataforma</TableHead>
                                        <TableHead>Titular & ID Fiscal</TableHead>
                                        <TableHead>Cuenta / CBU / Alias / Pago Móvil</TableHead>
                                        <TableHead>Notas</TableHead>
                                        <TableHead className="w-24 text-center">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBankDetails.map(bank => {
                                        const badge = getCountryBadge(bank.country);
                                        const curr = bank.currency || (bank.country === 'AR' ? 'ARS' : bank.country === 'CO' ? 'COP' : 'VES');
                                        return (
                                            <TableRow key={bank.id} className="hover:bg-muted/50">
                                                <TableCell>
                                                    <Badge variant="outline" className="font-semibold whitespace-nowrap">
                                                        {badge.flag} {badge.name}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 font-bold">
                                                        {curr}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-bold">{bank.bank}</div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {ACCOUNT_TYPE_LABELS[bank.accountType || 'transferencia'] || bank.accountType || 'Transferencia'}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{bank.accountHolder}</div>
                                                    <div className="text-xs font-mono text-muted-foreground">{bank.idNumber}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-xs font-semibold">{formatAccountNumber(bank.accountNumber)}</div>
                                                    {(bank.alias || bank.phone) && (
                                                        <div className="text-xs text-primary font-mono mt-0.5">
                                                            {bank.alias ? `Alias: ${bank.alias}` : ''} {bank.phone ? `• Tel: ${bank.phone}` : ''}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="max-w-40">
                                                    <span className="truncate block text-xs text-muted-foreground" title={bank.description || undefined}>
                                                        {bank.description || '-'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => openDialog(bank)}
                                                            className="h-8 w-8"
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => openDeleteDialog(bank)}
                                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {filteredBankDetails.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                <Landmark className="h-8 w-8 mx-auto mb-2 opacity-60" />
                                <p>No hay cuentas bancarias registradas para este país</p>
                                <p className="text-sm">Haz clic en &quot;+ Añadir Cuenta por País&quot; para configurar una.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Diálogo de edición/creación Multipaís y Multimoneda */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-lg max-w-[95vw] max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-primary" />
                            {editingBankDetail ? 'Editar Cuenta Bancaria de SUMA' : 'Nueva Cuenta Bancaria por País'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5 text-primary" /> País de la Cuenta *
                                </Label>
                                <Select value={formCountry} onValueChange={handleCountryChangeInForm}>
                                    <SelectTrigger className="bg-white h-9 text-xs font-semibold">
                                        <SelectValue placeholder="Selecciona país" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {countryOptions.map(c => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.flag} {c.name} ({c.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold flex items-center gap-1">
                                    <Coins className="h-3.5 w-3.5 text-emerald-600" /> Moneda de Cobro *
                                </Label>
                                <Select value={formCurrency} onValueChange={setFormCurrency}>
                                    <SelectTrigger className="bg-white h-9 text-xs font-semibold">
                                        <SelectValue placeholder="Selecciona moneda" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {currencyOptions.map(curr => (
                                            <SelectItem key={curr.code} value={curr.code}>
                                                {curr.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Tipo de Medio de Pago</Label>
                                <Select value={formAccountType} onValueChange={setFormAccountType}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                                        <SelectItem value="pago_movil">Pago Móvil (Venezuela)</SelectItem>
                                        <SelectItem value="cuenta_nacional">CBU / CVU / Alias (Argentina)</SelectItem>
                                        <SelectItem value="zelle">Zelle / Binance / USD Digital</SelectItem>
                                        <SelectItem value="efectivo_dolares">Efectivo / Taquilla</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="bankName" className="text-xs font-medium">
                                    Banco o Plataforma <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="bankName"
                                    name="bankName"
                                    defaultValue={editingBankDetail?.bank}
                                    required
                                    placeholder={
                                        formCountry === 'AR'
                                            ? 'Ej: Banco Galicia / Mercado Pago'
                                            : formCountry === 'CO'
                                            ? 'Ej: Bancolombia / Nequi'
                                            : formCountry === 'GLOBAL'
                                            ? 'Ej: Zelle / Binance Pay'
                                            : 'Ej: Banesco / Banco de Venezuela'
                                    }
                                    className="h-9 text-sm"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="holderName" className="text-xs font-medium">
                                    Nombre del Titular <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="holderName"
                                    name="holderName"
                                    defaultValue={editingBankDetail?.accountHolder}
                                    required
                                    placeholder="Nombre o Razón Social"
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="idNumber" className="text-xs font-medium">
                                    {formCountry === 'AR'
                                        ? 'CUIT / CUIL / DNI *'
                                        : formCountry === 'CO'
                                        ? 'NIT / Cédula *'
                                        : 'RIF / Cédula *'}
                                </Label>
                                <Input
                                    id="idNumber"
                                    name="idNumber"
                                    defaultValue={editingBankDetail?.idNumber}
                                    required
                                    placeholder={
                                        formCountry === 'AR'
                                            ? 'Ej: 30-71234567-9'
                                            : formCountry === 'CO'
                                            ? 'Ej: 901.234.567-8'
                                            : 'Ej: J-50123456-7'
                                    }
                                    className="h-9 text-sm font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="accountNumber" className="text-xs font-medium">
                                {formCountry === 'AR'
                                    ? 'Número de CBU / CVU o Cuenta (22 dígitos o N° Cuenta) *'
                                    : formCountry === 'GLOBAL'
                                    ? 'Correo Zelle / ID Binance / Número de Cuenta *'
                                    : 'Número de Cuenta / Identificador *'}
                            </Label>
                            <Input
                                id="accountNumber"
                                name="accountNumber"
                                defaultValue={editingBankDetail?.accountNumber}
                                required
                                placeholder={
                                    formCountry === 'AR'
                                        ? 'Ej: 0070000020000001234567 (CBU/CVU)'
                                        : formCountry === 'GLOBAL'
                                        ? 'Ej: pagos@sumasalud.com'
                                        : 'Ej: 01340000000000123456'
                                }
                                className="h-9 font-mono text-sm"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="alias" className="text-xs font-medium">
                                    {formCountry === 'AR' ? 'Alias CBU/CVU (Argentina)' : 'Alias / Correo Secundario (Opcional)'}
                                </Label>
                                <Input
                                    id="alias"
                                    name="alias"
                                    defaultValue={editingBankDetail?.alias || ''}
                                    placeholder={formCountry === 'AR' ? 'Ej: suma.salud.ar' : 'Opcional'}
                                    className="h-9 font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="phone" className="text-xs font-medium">
                                    Teléfono Pago Móvil / WhatsApp Cobros (Opcional)
                                </Label>
                                <Input
                                    id="phone"
                                    name="phone"
                                    defaultValue={editingBankDetail?.phone || ''}
                                    placeholder={formCountry === 'VE' ? 'Ej: 0414-1234567' : 'Opcional'}
                                    className="h-9 font-mono text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="description" className="text-xs font-medium">
                                Instrucciones adicionales para el médico / farmacia / clínica (Opcional)
                            </Label>
                            <Textarea
                                id="description"
                                name="description"
                                defaultValue={editingBankDetail?.description || ''}
                                placeholder="Ej: Enviar comprobante indicando RIF/CUIT..."
                                className="min-h-16 text-xs"
                            />
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="w-full sm:w-auto">
                                    Cancelar
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cuenta'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Diálogo de confirmación de eliminación */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent className="max-w-[95vw] sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Estás seguro de que quieres eliminar esta cuenta bancaria?
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Eliminando...
                                </>
                            ) : (
                                'Eliminar'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

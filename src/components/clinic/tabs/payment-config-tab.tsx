"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PaymentSettings } from '@/lib/types';
import { updateClinic, getClinic, updateLaboratory, getLaboratory } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Save, Smartphone, Building2, DollarSign } from 'lucide-react';

const COMMON_BANKS = [
    "Banco de Venezuela",
    "Banesco",
    "Mercantil",
    "BBVA Provincial",
    "Banco Nacional de Crédito (BNC)",
    "Bancaribe",
    "Bancamiga",
    "Banco Exterior",
    "Banplus",
    "100% Banco",
];

export function PaymentConfigTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    const isLab = user?.role === 'laboratory' || (user?.role === 'secretary' && !!(user as any).laboratoryId);
    const entityId = user?.role === 'secretary' ? ((user as any).laboratoryId || user.clinicId) : user?.id;

    // Payment Settings State
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
        cash: { enabled: true, description: 'Pago en recepción al momento de la cita (Efectivo USD o Bolívares).' },
        pagoMovil: { enabled: false, bank: '', phone: '', idDocument: '', holder: '' },
        transfer: { enabled: false, accountNumber: '', bank: '', holder: '', idDocument: '' },
        zelle: { enabled: false, email: '', holder: '' },
    });

    useEffect(() => {
        const loadClinicData = async () => {
            if (entityId) {
                try {
                    const clinicData = isLab ? await getLaboratory(entityId) : await getClinic(entityId);
                    if (clinicData && clinicData.paymentSettings) {
                        const ps = clinicData.paymentSettings;
                        setPaymentSettings(prev => ({
                            ...prev,
                            ...ps,
                            cash: {
                                enabled: ps.cash?.enabled ?? true,
                                description: ps.cash?.description || 'Pago en recepción al momento de la cita (Efectivo USD o Bolívares).'
                            },
                            pagoMovil: {
                                enabled: ps.pagoMovil?.enabled ?? false,
                                bank: ps.pagoMovil?.bank || '',
                                phone: ps.pagoMovil?.phone || '',
                                idDocument: ps.pagoMovil?.idDocument || '',
                                holder: ps.pagoMovil?.holder || '',
                            },
                            transfer: {
                                enabled: ps.transfer?.enabled ?? false,
                                bank: ps.transfer?.bank || '',
                                holder: ps.transfer?.holder || '',
                                accountNumber: ps.transfer?.accountNumber || ps.transfer?.cbu || '',
                                idDocument: ps.transfer?.idDocument || ps.transfer?.cuit || '',
                                phone: ps.transfer?.phone || ps.transfer?.alias || '',
                                cbu: ps.transfer?.cbu || '',
                                alias: ps.transfer?.alias || '',
                                cuit: ps.transfer?.cuit || '',
                            },
                            zelle: {
                                enabled: ps.zelle?.enabled ?? false,
                                email: ps.zelle?.email || '',
                                holder: ps.zelle?.holder || '',
                            }
                        }));
                    }
                } catch (error) {
                    console.error("Error loading clinic payment settings", error);
                }
            }
        };

        loadClinicData();
    }, [entityId, isLab]);

    const handleSave = async () => {
        if (!entityId) return;

        setSaving(true);
        try {
            // Keep legacy fields populated for backwards compatibility
            const payload: PaymentSettings = {
                ...paymentSettings,
                transfer: {
                    ...paymentSettings.transfer,
                    cbu: paymentSettings.transfer.accountNumber || paymentSettings.transfer.cbu || '',
                    alias: paymentSettings.transfer.phone || paymentSettings.transfer.alias || '',
                    cuit: paymentSettings.transfer.idDocument || paymentSettings.transfer.cuit || '',
                }
            };

            if (isLab) {
                await updateLaboratory(entityId, { paymentSettings: payload });
            } else {
                await updateClinic(entityId, { paymentSettings: payload });
            }

            toast({ title: 'Guardado', description: 'La configuración de pagos se guardó correctamente.' });
        } catch (error) {
            console.error('Error saving payment settings:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron guardar los cambios.' });
        } finally {
            setSaving(false);
        }
    };

    const updatePaymentSetting = (type: keyof PaymentSettings, field: string, value: any) => {
        setPaymentSettings(prev => ({
            ...prev,
            [type]: {
                ...(prev[type] as any),
                [field]: value
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Métodos de Pago</h2>
                <p className="text-muted-foreground">Configura los métodos de pago aceptados para tus pacientes (Venezuela y pagos internacionales).</p>
            </div>

            {/* Datalist for banks */}
            <datalist id="venezuela-banks">
                {COMMON_BANKS.map((b) => (
                    <option key={b} value={b} />
                ))}
            </datalist>

            {/* Payment Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Configuración de Pagos
                    </CardTitle>
                    <CardDescription>Define los canales de recepción de dinero para consultas y servicios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Efectivo */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-cash"
                                checked={paymentSettings.cash.enabled}
                                onCheckedChange={(checked) => updatePaymentSetting('cash', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-cash" className="font-semibold text-base">Efectivo en Consultorio (USD / Bolívares)</Label>
                        </div>
                        {paymentSettings.cash.enabled && (
                            <div className="pl-6">
                                <Label className="text-xs">Instrucciones para el paciente</Label>
                                <Input
                                    className="mt-1"
                                    value={paymentSettings.cash.description || ''}
                                    onChange={(e) => updatePaymentSetting('cash', 'description', e.target.value)}
                                    placeholder="Ej: Abonar en recepción al momento de la cita en efectivo."
                                />
                            </div>
                        )}
                    </div>

                    {/* Pago Móvil */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-pagomovil"
                                checked={paymentSettings.pagoMovil?.enabled ?? false}
                                onCheckedChange={(checked) => updatePaymentSetting('pagoMovil', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-pagomovil" className="font-semibold text-base flex items-center gap-2">
                                <Smartphone className="h-4 w-4 text-emerald-600" />
                                Pago Móvil
                            </Label>
                        </div>
                        {paymentSettings.pagoMovil?.enabled && (
                            <div className="grid gap-3 pl-6 mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Banco Receptor</Label>
                                        <Input
                                            list="venezuela-banks"
                                            value={paymentSettings.pagoMovil?.bank || ''}
                                            onChange={(e) => updatePaymentSetting('pagoMovil', 'bank', e.target.value)}
                                            placeholder="Ej: Banesco, Mercantil, BDV..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Teléfono Pago Móvil</Label>
                                        <Input
                                            value={paymentSettings.pagoMovil?.phone || ''}
                                            onChange={(e) => updatePaymentSetting('pagoMovil', 'phone', e.target.value)}
                                            placeholder="Ej: 0414-1234567"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Cédula / RIF del Titular</Label>
                                        <Input
                                            value={paymentSettings.pagoMovil?.idDocument || ''}
                                            onChange={(e) => updatePaymentSetting('pagoMovil', 'idDocument', e.target.value)}
                                            placeholder="Ej: V-12345678 o J-12345678-0"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Nombre del Titular (Opcional)</Label>
                                        <Input
                                            value={paymentSettings.pagoMovil?.holder || ''}
                                            onChange={(e) => updatePaymentSetting('pagoMovil', 'holder', e.target.value)}
                                            placeholder="Nombre completo o razón social"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transferencia Bancaria Nacional */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-transfer"
                                checked={paymentSettings.transfer.enabled}
                                onCheckedChange={(checked) => updatePaymentSetting('transfer', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-transfer" className="font-semibold text-base flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                Transferencia Bancaria Nacional
                            </Label>
                        </div>
                        {paymentSettings.transfer.enabled && (
                            <div className="grid gap-3 pl-6 mt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Banco Receptor</Label>
                                        <Input
                                            list="venezuela-banks"
                                            value={paymentSettings.transfer.bank || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'bank', e.target.value)}
                                            placeholder="Ej: Banesco, Mercantil, BDV..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Nombre del Titular</Label>
                                        <Input
                                            value={paymentSettings.transfer.holder || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'holder', e.target.value)}
                                            placeholder="Nombre o Razón Social"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Número de Cuenta (20 dígitos)</Label>
                                        <Input
                                            value={paymentSettings.transfer.accountNumber || paymentSettings.transfer.cbu || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'accountNumber', e.target.value)}
                                            placeholder="0102 0000 00 0000000000"
                                            maxLength={24}
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Cédula / RIF</Label>
                                        <Input
                                            value={paymentSettings.transfer.idDocument || paymentSettings.transfer.cuit || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'idDocument', e.target.value)}
                                            placeholder="Ej: J-12345678-0 o V-12345678"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Zelle */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-zelle"
                                checked={paymentSettings.zelle?.enabled ?? false}
                                onCheckedChange={(checked) => updatePaymentSetting('zelle', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-zelle" className="font-semibold text-base flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-purple-600" />
                                Zelle (Dólares USD)
                            </Label>
                        </div>
                        {paymentSettings.zelle?.enabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-6 mt-2">
                                <div>
                                    <Label className="text-xs">Correo Electrónico de Zelle</Label>
                                    <Input
                                        type="email"
                                        value={paymentSettings.zelle?.email || ''}
                                        onChange={(e) => updatePaymentSetting('zelle', 'email', e.target.value)}
                                        placeholder="correo@zelle.com"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Nombre del Titular Zelle</Label>
                                    <Input
                                        value={paymentSettings.zelle?.holder || ''}
                                        onChange={(e) => updatePaymentSetting('zelle', 'holder', e.target.value)}
                                        placeholder="Nombre registrado en Zelle"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex justify-end gap-4 md:static md:bg-transparent md:border-0 md:p-0">
                <Button onClick={handleSave} disabled={saving} size="lg" className="w-full md:w-auto">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Guardar Cambios
                </Button>
            </div>
        </div>
    );
}

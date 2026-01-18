"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { PaymentSettings } from '@/lib/types';
import { updateClinic, getClinic } from '@/lib/supabaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, Save } from 'lucide-react';

export function PaymentConfigTab() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [saving, setSaving] = useState(false);

    // Payment Settings State
    const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
        cash: { enabled: true, description: 'Pago en recepción al momento de la cita.' },
        transfer: { enabled: false, cbu: '', alias: '', bank: '', holder: '', cuit: '' },
        mercadopago: { enabled: false, link: '', publicKey: '' }
    });

    useEffect(() => {
        const loadClinicData = async () => {
            if (user?.id) {
                try {
                    const clinicData = await getClinic(user.id);
                    if (clinicData && clinicData.paymentSettings) {
                        setPaymentSettings(prev => ({ ...prev, ...clinicData.paymentSettings }));
                    }
                } catch (error) {
                    console.error("Error loading clinic payment settings", error);
                }
            }
        };

        loadClinicData();
    }, [user]);

    const handleSave = async () => {
        if (!user?.id) return;

        setSaving(true);
        try {
            await updateClinic(user.id, {
                paymentSettings
            });

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
                ...prev[type],
                [field]: value
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Métodos de Pago</h2>
                <p className="text-muted-foreground">Configura los métodos de pago que aceptarás de tus pacientes.</p>
            </div>

            {/* Payment Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Configuración de Pagos
                    </CardTitle>
                    <CardDescription>Define los métodos de pago aceptados y sus detalles.</CardDescription>
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
                            <Label htmlFor="pay-cash" className="font-semibold text-base">Efectivo en Consultorio</Label>
                        </div>
                        {paymentSettings.cash.enabled && (
                            <div className="pl-6">
                                <Label className="text-xs">Instrucciones (Opcional)</Label>
                                <Input
                                    className="mt-1"
                                    value={paymentSettings.cash.description || ''}
                                    onChange={(e) => updatePaymentSetting('cash', 'description', e.target.value)}
                                    placeholder="Ej: Abonar en recepción antes de la consulta."
                                />
                            </div>
                        )}
                    </div>

                    {/* Transferencia Bancaria */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-transfer"
                                checked={paymentSettings.transfer.enabled}
                                onCheckedChange={(checked) => updatePaymentSetting('transfer', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-transfer" className="font-semibold text-base">Transferencia Bancaria</Label>
                        </div>
                        {paymentSettings.transfer.enabled && (
                            <div className="grid gap-3 pl-6 mt-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">Banco</Label>
                                        <Input
                                            value={paymentSettings.transfer.bank || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'bank', e.target.value)}
                                            placeholder="Ej: Galicia"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Titular</Label>
                                        <Input
                                            value={paymentSettings.transfer.holder || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'holder', e.target.value)}
                                            placeholder="Nombre del titular"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs">CBU / CVU</Label>
                                        <Input
                                            value={paymentSettings.transfer.cbu || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'cbu', e.target.value)}
                                            placeholder="000000..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-xs">Alias</Label>
                                        <Input
                                            value={paymentSettings.transfer.alias || ''}
                                            onChange={(e) => updatePaymentSetting('transfer', 'alias', e.target.value)}
                                            placeholder="mi.alias.banco"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs">CUIT / CUIL</Label>
                                    <Input
                                        value={paymentSettings.transfer.cuit || ''}
                                        onChange={(e) => updatePaymentSetting('transfer', 'cuit', e.target.value)}
                                        placeholder="20-..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Mercado Pago */}
                    <div className="flex flex-col gap-3 border p-4 rounded-md">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="pay-mp"
                                checked={paymentSettings.mercadopago.enabled}
                                onCheckedChange={(checked) => updatePaymentSetting('mercadopago', 'enabled', checked)}
                            />
                            <Label htmlFor="pay-mp" className="font-semibold text-base">Mercado Pago</Label>
                        </div>
                        {paymentSettings.mercadopago.enabled && (
                            <div className="pl-6 mt-2 space-y-3">
                                <div>
                                    <Label className="text-xs">Link de Pago / Alias MP</Label>
                                    <Input
                                        value={paymentSettings.mercadopago.link || ''}
                                        onChange={(e) => updatePaymentSetting('mercadopago', 'link', e.target.value)}
                                        placeholder="https://mpago.la/..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Public Key (Integración opcional)</Label>
                                    <Input
                                        value={paymentSettings.mercadopago.publicKey || ''}
                                        onChange={(e) => updatePaymentSetting('mercadopago', 'publicKey', e.target.value)}
                                        placeholder="TEST-..."
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

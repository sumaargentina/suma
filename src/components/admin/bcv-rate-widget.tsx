"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import {
    RefreshCw,
    Zap,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownRight,
    History,
    Calendar,
    Coins,
    UserCheck,
    Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export interface BcvRateHistoryItem {
    id: string;
    rate: number;
    previous_rate: number | null;
    source: string;
    updated_by: string;
    created_at: string;
}

interface BcvRateData {
    success: boolean;
    currentSystemRate: number;
    lastSystemUpdate: string | null;
    officialRate: number;
    officialDate: string;
    source: string;
    hasUpdate: boolean;
    diff: number;
    history?: BcvRateHistoryItem[];
}

export function BcvRateWidget({ compact = false }: { compact?: boolean }) {
    const { settings, updateSetting } = useSettings();
    const { toast } = useToast();
    const [data, setData] = useState<BcvRateData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [manualRate, setManualRate] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Consultar el estado de la tasa oficial y su historial
    const checkBcvRate = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/bcv-rate', { cache: 'no-store' });
            if (!res.ok) throw new Error('Error al consultar tasa');
            const json: BcvRateData = await res.json();
            if (json.success) {
                setData(json);
                setManualRate(json.officialRate.toString());
            }
        } catch (error) {
            console.error('Error consultando BCV:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkBcvRate();
        const interval = setInterval(checkBcvRate, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkBcvRate]);

    // Aplicar la tasa (ya sea la oficial o manual)
    const handleApplyRate = async (rateToApply?: number) => {
        const targetRate = rateToApply ?? (manualRate ? parseFloat(manualRate) : data?.officialRate);
        if (!targetRate || isNaN(targetRate) || targetRate <= 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Ingresa una tasa válida mayor a 0.' });
            return;
        }

        const source = rateToApply ? '1-Clic Oficial BCV' : 'Ajuste Manual';

        try {
            setIsApplying(true);
            const res = await fetch('/api/admin/bcv-rate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rate: targetRate, source })
            });

            const result = await res.json();
            if (!res.ok || !result.success) throw new Error(result.error || 'Error al actualizar');

            // Actualizar contexto global de settings para reactividad instantánea
            await updateSetting('bcvRate', targetRate);
            await updateSetting('bcvLastUpdated', new Date().toISOString());
            await updateSetting('exchangeRates', { VES: targetRate, USD: 1.0 });

            toast({
                title: '⚡ Tasa BCV Actualizada',
                description: `Nueva tasa oficial activa: Bs. ${targetRate.toFixed(2)} por $1 USD.`,
                className: 'bg-emerald-600 text-white font-semibold'
            });

            // Re-consultar estado e historial
            await checkBcvRate();

            setIsOpen(false);
        } catch (error: any) {
            console.error('Error aplicando tasa:', error);
            toast({
                variant: 'destructive',
                title: 'Error al aplicar tasa',
                description: error.message || 'No se pudo guardar la nueva tasa.'
            });
        } finally {
            setIsApplying(false);
        }
    };

    const systemRate = settings?.bcvRate || data?.currentSystemRate || 65.50;
    const officialRate = data?.officialRate;
    const hasUpdate = data?.hasUpdate || (officialRate ? Math.abs(officialRate - systemRate) >= 0.01 : false);
    const historyList = data?.history || [];

    const formatHistoryDate = (dateStr: string) => {
        try {
            const parsed = parseISO(dateStr);
            return format(parsed, "dd/MM/yyyy, hh:mm a", { locale: es });
        } catch {
            return dateStr;
        }
    };

    return (
        <>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <div
                        role="button"
                        tabIndex={0}
                        className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 select-none shadow-xs border",
                            hasUpdate
                                ? "bg-amber-500/15 text-amber-900 border-amber-400/50 hover:bg-amber-500/25 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700"
                                : "bg-teal-500/10 text-teal-900 border-teal-300/40 hover:bg-teal-500/20 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
                            compact && "px-2 py-1 text-[11px]"
                        )}
                    >
                        <span className="text-base leading-none">🇻🇪</span>
                        <span className="font-semibold">BCV:</span>
                        <span className="font-mono font-bold">Bs. {systemRate.toFixed(2)}</span>

                        {hasUpdate && officialRate ? (
                            <span className="inline-flex items-center gap-1 bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded-full text-[10px] animate-pulse">
                                <Zap className="h-3 w-3 fill-current" />
                                Nuevo: {officialRate.toFixed(2)}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-0.5 text-teal-700 dark:text-teal-400 text-[10px]">
                                <CheckCircle2 className="h-3 w-3" />
                                Al día
                            </span>
                        )}
                    </div>
                </PopoverTrigger>

                <PopoverContent align="end" className="w-80 md:w-96 p-4 shadow-xl border-slate-200">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">🇻🇪</span>
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900">Tasa Oficial del Dólar (BCV)</h4>
                                    <p className="text-[11px] text-muted-foreground">Monitoreo directo del Banco Central</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={checkBcvRate}
                                disabled={isLoading}
                                title="Re-verificar tasa en vivo"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-teal-600")} />
                            </Button>
                        </div>

                        {/* Comparativa */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[11px] text-slate-500 font-medium block">Tasa en Sistema</span>
                                <span className="text-lg font-bold font-mono text-slate-900 block mt-0.5">
                                    Bs. {systemRate.toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-1">
                                    {settings?.bcvLastUpdated
                                        ? `Act: ${new Date(settings.bcvLastUpdated).toLocaleDateString()}`
                                        : 'Sin fecha registrada'}
                                </span>
                            </div>

                            <div className={cn(
                                "p-3 rounded-xl border",
                                hasUpdate
                                    ? "bg-amber-50/80 border-amber-300 text-amber-950"
                                    : "bg-teal-50/80 border-teal-300 text-teal-950"
                            )}>
                                <span className="text-[11px] font-medium block flex items-center justify-between">
                                    BCV Oficial Hoy
                                    {hasUpdate && (
                                        <span className="text-[9px] bg-amber-500 text-white font-bold px-1 rounded">NUEVA</span>
                                    )}
                                </span>
                                <span className="text-lg font-bold font-mono block mt-0.5">
                                    {officialRate ? `Bs. ${officialRate.toFixed(2)}` : 'Consultando...'}
                                </span>
                                <span className="text-[10px] opacity-75 block mt-1">
                                    {data?.officialDate ? new Date(data.officialDate).toLocaleDateString() : 'En vivo'}
                                </span>
                            </div>
                        </div>

                        {/* Alerta si hay diferencia */}
                        {hasUpdate && officialRate && (
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2.5">
                                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-amber-900">
                                    <p className="font-semibold">¡El BCV publicó una nueva tasa oficial!</p>
                                    <p className="text-[11px] mt-0.5 text-amber-800">
                                        Diferencia de <strong>Bs. {Math.abs(officialRate - systemRate).toFixed(2)}</strong> respecto al sistema.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Botón de 1 Clic para aplicar la tasa oficial */}
                        {hasUpdate && officialRate && (
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 shadow-sm gap-2 text-sm"
                                onClick={() => handleApplyRate(officialRate)}
                                disabled={isApplying}
                            >
                                {isApplying ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Zap className="h-4 w-4 fill-current" />
                                )}
                                Actualizar a Bs. {officialRate.toFixed(2)} con 1 clic
                            </Button>
                        )}

                        {/* Ajuste manual si se desea personalizar */}
                        <div className="pt-2 border-t space-y-2">
                            <label className="text-[11px] font-medium text-slate-600 flex justify-between">
                                <span>Ajuste manual (opcional):</span>
                                <span className="text-[10px] text-slate-400">Bs. por $1 USD</span>
                            </label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={manualRate}
                                    onChange={(e) => setManualRate(e.target.value)}
                                    placeholder="Ej: 814.69"
                                    className="h-9 text-sm font-mono"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 px-3 text-xs"
                                    onClick={() => handleApplyRate()}
                                    disabled={isApplying || !manualRate}
                                >
                                    {isApplying ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Guardar'}
                                </Button>
                            </div>
                        </div>

                        {/* Botón para ver el Historial de Tasas */}
                        <div className="pt-2 border-t">
                            <Button
                                variant="outline"
                                className="w-full justify-between h-9 text-xs font-semibold text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
                                onClick={() => {
                                    setIsHistoryOpen(true);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="flex items-center gap-1.5">
                                    <History className="h-3.5 w-3.5 text-teal-600" />
                                    Ver Historial de Actualizaciones
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                                    {historyList.length} {historyList.length === 1 ? 'registro' : 'registros'}
                                </Badge>
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            {/* Modal de Historial de Actualizaciones de Tasa */}
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold text-slate-900">
                                        Historial de Actualizaciones de Tasa BCV
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Registro histórico y auditable de cada cambio de tasa aplicado en la plataforma SUMA.
                                    </DialogDescription>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={checkBcvRate}
                                disabled={isLoading}
                                className="h-8 gap-1.5 text-xs shrink-0"
                            >
                                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin text-teal-600")} />
                                Actualizar
                            </Button>
                        </div>
                    </DialogHeader>

                    {/* Resumen rápido de métricas */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
                        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">
                                Tasa Activa Vigente
                            </span>
                            <span className="text-xl font-mono font-extrabold text-emerald-900 block mt-1">
                                Bs. {systemRate.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-emerald-700 block mt-0.5">
                                Por cada $1 USD
                            </span>
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                                Total Actualizaciones
                            </span>
                            <span className="text-xl font-mono font-extrabold text-slate-900 block mt-1">
                                {historyList.length}
                            </span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                                Cambios registrados
                            </span>
                        </div>

                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl">
                            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">
                                Última Modificación
                            </span>
                            <span className="text-xs font-semibold text-blue-900 block mt-1 truncate">
                                {historyList[0]?.created_at
                                    ? formatHistoryDate(historyList[0].created_at)
                                    : 'Sin registros'}
                            </span>
                            <span className="text-[10px] text-blue-700 block mt-0.5">
                                {historyList[0]?.source || 'Sistema'}
                            </span>
                        </div>
                    </div>

                    {/* Tabla de registros */}
                    <div className="flex-1 overflow-y-auto border rounded-xl my-2">
                        <Table>
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                                    <TableHead className="font-semibold">Tasa Nueva</TableHead>
                                    <TableHead className="text-muted-foreground">Tasa Anterior</TableHead>
                                    <TableHead>Variación</TableHead>
                                    <TableHead>Método / Fuente</TableHead>
                                    <TableHead className="text-right">Usuario</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {historyList.length > 0 ? (
                                    historyList.map((item, idx) => {
                                        const rateNum = Number(item.rate);
                                        const prevNum = item.previous_rate !== null && item.previous_rate !== undefined ? Number(item.previous_rate) : null;
                                        const diff = prevNum !== null ? rateNum - prevNum : 0;
                                        const isIncrease = diff > 0;
                                        const isDecrease = diff < 0;

                                        return (
                                            <TableRow key={item.id || idx} className="hover:bg-slate-50/60">
                                                <TableCell className="font-medium text-xs">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span>{formatHistoryDate(item.created_at)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                                        Bs. {rateNum.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {prevNum !== null ? (
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            Bs. {prevNum.toFixed(2)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {prevNum !== null && diff !== 0 ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "text-[10px] font-mono font-semibold px-1.5 py-0 gap-0.5",
                                                                isIncrease
                                                                    ? "bg-amber-50 text-amber-800 border-amber-300"
                                                                    : "bg-emerald-50 text-emerald-800 border-emerald-300"
                                                            )}
                                                        >
                                                            {isIncrease ? (
                                                                <ArrowUpRight className="h-3 w-3" />
                                                            ) : (
                                                                <ArrowDownRight className="h-3 w-3" />
                                                            )}
                                                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-[11px] text-muted-foreground">-</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-[11px] font-normal">
                                                        {item.source || 'Panel Admin'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {item.updated_by || 'admin'}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Coins className="h-8 w-8 text-muted-foreground/50" />
                                                <p className="text-sm">No hay registros de actualizaciones previas.</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Cada vez que actualices la tasa oficial o manual, se registrará aquí automáticamente.
                                                </p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter className="mt-2 flex sm:justify-between items-center w-full">
                        <span className="text-xs text-muted-foreground">
                            Mostrando {historyList.length} registro{historyList.length === 1 ? '' : 's'} en orden cronológico inverso
                        </span>
                        <Button variant="default" onClick={() => setIsHistoryOpen(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

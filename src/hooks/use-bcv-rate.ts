"use client";

import { useMemo } from 'react';
import { useSettings } from '@/lib/settings';
import { getExchangeRate, formatCurrency } from '@/lib/currency-utils';

export interface BcvRateInfo {
  rate: number;
  lastUpdated?: string;
  isLoading: boolean;
  toVES: (amountUSD: number, customRate?: number) => number;
  toUSD: (amountVES: number, customRate?: number) => number;
  formatDual: (
    amountUSD: number,
    options?: { customRate?: number; isHistorical?: boolean }
  ) => {
    usd: string;
    ves: string;
    full: string;
    rateUsed: number;
    isHistorical: boolean;
  };
}

export function useBcvRate(): BcvRateInfo {
  const { settings, isLoading } = useSettings();

  const rate = useMemo(() => {
    return getExchangeRate(settings, 'VES');
  }, [settings]);

  const lastUpdated = settings?.bcvLastUpdated;

  const toVES = (amountUSD: number, customRate?: number): number => {
    const effectiveRate = customRate !== undefined && customRate > 0 ? customRate : rate;
    return Math.round(amountUSD * effectiveRate * 100) / 100;
  };

  const toUSD = (amountVES: number, customRate?: number): number => {
    const effectiveRate = customRate !== undefined && customRate > 0 ? customRate : rate;
    if (effectiveRate <= 0) return 0;
    return Math.round((amountVES / effectiveRate) * 100) / 100;
  };

  const formatDual = (
    amountUSD: number,
    options?: { customRate?: number; isHistorical?: boolean }
  ) => {
    const effectiveRate = options?.customRate !== undefined && options.customRate > 0 ? options.customRate : rate;
    const vesAmount = toVES(amountUSD, effectiveRate);
    const usdFormatted = formatCurrency(amountUSD, 'USD');
    const vesFormatted = formatCurrency(vesAmount, 'VES');
    const isHistorical = !!options?.isHistorical;

    return {
      usd: usdFormatted,
      ves: vesFormatted,
      full: `${usdFormatted} / ${vesFormatted} (@${effectiveRate.toFixed(2)})`,
      rateUsed: effectiveRate,
      isHistorical,
    };
  };

  return {
    rate,
    lastUpdated,
    isLoading,
    toVES,
    toUSD,
    formatDual,
  };
}

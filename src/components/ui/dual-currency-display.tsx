"use client";

import React from 'react';
import { formatCurrency } from '@/lib/currency-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles } from 'lucide-react';

interface DualCurrencyDisplayProps {
  amountUSD: number;
  amountVES?: number;
  rate?: number;
  isHistorical?: boolean;
  layout?: 'vertical' | 'horizontal' | 'inline' | 'card-kpi';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showRate?: boolean;
  className?: string;
  usdClassName?: string;
  vesClassName?: string;
  prefix?: string;
}

export function DualCurrencyDisplay({
  amountUSD,
  amountVES,
  rate = 65.50,
  isHistorical = false,
  layout = 'vertical',
  size = 'md',
  showRate = true,
  className,
  usdClassName,
  vesClassName,
  prefix,
}: DualCurrencyDisplayProps) {
  // If VES amount is explicitly provided (e.g. historical snapshot), use it. Otherwise calculate dynamically.
  const calculatedVES = amountVES !== undefined && amountVES !== null
    ? amountVES
    : Math.round(amountUSD * rate * 100) / 100;

  const formattedUSD = `${prefix || ''}${formatCurrency(amountUSD, 'USD')}`;
  const formattedVES = `${prefix || ''}${formatCurrency(calculatedVES, 'VES')}`;

  const sizeClasses = {
    xs: {
      usd: 'text-xs font-semibold',
      ves: 'text-[10px] font-mono',
      rate: 'text-[9px]',
    },
    sm: {
      usd: 'text-sm font-semibold',
      ves: 'text-xs font-mono',
      rate: 'text-[10px]',
    },
    md: {
      usd: 'text-base font-bold',
      ves: 'text-xs font-mono font-medium',
      rate: 'text-[11px]',
    },
    lg: {
      usd: 'text-xl font-bold',
      ves: 'text-sm font-mono font-medium',
      rate: 'text-xs',
    },
    xl: {
      usd: 'text-2xl lg:text-3xl font-extrabold tracking-tight',
      ves: 'text-sm lg:text-base font-mono font-semibold',
      rate: 'text-xs',
    },
  }[size];

  if (layout === 'card-kpi') {
    return (
      <div className={cn("space-y-1", className)}>
        <div className={cn(sizeClasses.usd, usdClassName)}>
          {formattedUSD}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-emerald-700 dark:text-emerald-400 font-semibold", sizeClasses.ves, vesClassName)}>
            {formattedVES}
          </span>
          {showRate && (
            <Badge
              variant="outline"
              className={cn(
                "h-4 px-1.5 py-0 text-[10px] font-normal tracking-tight gap-0.5",
                isHistorical
                  ? "bg-slate-50 text-slate-600 border-slate-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              )}
            >
              {isHistorical ? (
                <>
                  <Lock className="h-2.5 w-2.5" />
                  @{rate.toFixed(2)}
                </>
              ) : (
                <>
                  <Sparkles className="h-2.5 w-2.5" />
                  BCV @{rate.toFixed(2)}
                </>
              )}
            </Badge>
          )}
        </div>
      </div>
    );
  }

  if (layout === 'horizontal' || layout === 'inline') {
    return (
      <div className={cn("inline-flex items-baseline gap-2 flex-wrap", className)}>
        <span className={cn(sizeClasses.usd, usdClassName)}>{formattedUSD}</span>
        <span className="text-muted-foreground text-xs">/</span>
        <span className={cn("text-emerald-700 dark:text-emerald-400 font-mono", sizeClasses.ves, vesClassName)}>
          {formattedVES}
        </span>
        {showRate && (
          <span className={cn("text-muted-foreground text-[10px]", sizeClasses.rate)}>
            ({isHistorical ? 'histórico' : 'tasa'} @{rate.toFixed(2)})
          </span>
        )}
      </div>
    );
  }

  // Default: vertical
  return (
    <div className={cn("flex flex-col items-end leading-tight", className)}>
      <span className={cn(sizeClasses.usd, usdClassName)}>{formattedUSD}</span>
      <span className={cn("text-emerald-700 dark:text-emerald-400 font-mono", sizeClasses.ves, vesClassName)}>
        {formattedVES}
      </span>
      {showRate && (
        <span className={cn("text-muted-foreground text-[10px]", sizeClasses.rate)}>
          {isHistorical ? '🔒 ' : ''}@{rate.toFixed(2)}
        </span>
      )}
    </div>
  );
}

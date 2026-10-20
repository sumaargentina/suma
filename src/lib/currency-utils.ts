import { AppSettings, Appointment, BankDetail, DoctorPayment, Expense, ClinicExpense } from './types';

export const DEFAULT_EXCHANGE_RATES: Record<string, number> = {
  VES: 65.50,
  USD: 1.0,
  ARS: 1250.0,
};

/**
 * Obtiene la tasa de cambio vigente para una moneda / país desde la configuración global
 */
export function getExchangeRate(settings?: AppSettings | null, currency: string = 'VES'): number {
  if (!settings) return DEFAULT_EXCHANGE_RATES[currency] || 1;

  if (currency === 'VES' && settings.bcvRate && settings.bcvRate > 0) {
    return Number(settings.bcvRate);
  }

  if (settings.exchangeRates && settings.exchangeRates[currency]) {
    return Number(settings.exchangeRates[currency]);
  }

  // Buscar en configuración de países si existe
  if (settings.countries && settings.countries.length > 0) {
    const country = settings.countries.find(c => c.currency === currency || (currency === 'VES' && c.code === 'VE'));
    if (country?.exchangeRate && country.exchangeRate > 0) {
      return Number(country.exchangeRate);
    }
  }

  return DEFAULT_EXCHANGE_RATES[currency] || 1;
}

/**
 * Formatea un monto según la moneda especificada
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const cleanAmount = isNaN(amount) ? 0 : amount;
  
  if (currency === 'VES' || currency === 'Bs') {
    return `Bs. ${cleanAmount.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
  if (currency === 'ARS') {
    return `$${cleanAmount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS`;
  }
  
  return `$${cleanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

/**
 * Determina la moneda de una cuenta bancaria (USD o VES)
 */
export function getBankAccountCurrency(bankDetail: BankDetail): 'USD' | 'VES' {
  if (bankDetail.currency === 'USD') return 'USD';
  if (bankDetail.currency === 'VES') return 'VES';

  const desc = `${bankDetail.bank} ${bankDetail.description || ''} ${bankDetail.alias || ''}`.toLowerCase();
  if (desc.includes('zelle') || desc.includes('dolar') || desc.includes('dólar') || desc.includes('usd')) {
    return 'USD';
  }

  return 'VES';
}

export interface ResolvedFinancials {
  amountUSD: number;
  amountLocal: number;
  exchangeRate: number;
  isHistorical: boolean;
  paymentCurrency: 'USD' | 'VES';
  formattedUSD: string;
  formattedLocal: string;
}

/**
 * Resuelve los montos de una cita respetando la regla de negocio:
 * 1. Si la cita ya está 'Pagado', devuelve los valores CONGELADOS históricos e inmutables.
 * 2. Si la cita está 'Pendiente' (ej. efectivo en consultorio), calcula dinámicamente con la tasa del día actual.
 */
export function resolveAppointmentFinancials(
  appointment: Partial<Appointment>,
  currentRate: number = 65.50
): ResolvedFinancials {
  const isPaid = appointment.paymentStatus === 'Pagado';
  const paymentCurrency: 'USD' | 'VES' = (appointment.paymentCurrency === 'USD' || appointment.paymentCurrency === 'VES')
    ? appointment.paymentCurrency
    : (appointment.paymentMethod === 'efectivo' ? 'VES' : 'VES');

  const baseUSD = Number(appointment.totalPrice || appointment.amountInUSD || 0);

  // Si ya está pagado y tiene snapshot histórico congelado:
  if (isPaid && appointment.amountInLocalCurrency !== undefined && appointment.amountInLocalCurrency !== null && appointment.exchangeRate) {
    const historicalRate = Number(appointment.exchangeRate);
    const historicalLocal = Number(appointment.amountInLocalCurrency);
    const historicalUSD = Number(appointment.amountInUSD || baseUSD);

    return {
      amountUSD: historicalUSD,
      amountLocal: historicalLocal,
      exchangeRate: historicalRate,
      isHistorical: true,
      paymentCurrency,
      formattedUSD: formatCurrency(historicalUSD, 'USD'),
      formattedLocal: formatCurrency(historicalLocal, 'VES'),
    };
  }

  // Si está pendiente (o no se ha pagado todavía):
  // Mientras no pague, el equivalente en Bs. se calcula dinámicamente con la tasa del día
  const rate = currentRate > 0 ? currentRate : 65.50;
  const localAmount = Math.round(baseUSD * rate * 100) / 100;

  return {
    amountUSD: baseUSD,
    amountLocal: localAmount,
    exchangeRate: rate,
    isHistorical: false,
    paymentCurrency,
    formattedUSD: formatCurrency(baseUSD, 'USD'),
    formattedLocal: formatCurrency(localAmount, 'VES'),
  };
}

/**
 * Resuelve los montos de un pago de suscripción o pago de médico a SUMA:
 * Si el pago está confirmado ('Paid') y tiene tasa congelada, preserva el valor inmutable.
 * Si está pendiente, calcula con la tasa actual del día.
 */
export function resolveDoctorPaymentFinancials(
  payment: Partial<DoctorPayment>,
  currentRate: number = 65.50
): ResolvedFinancials {
  const isPaid = payment.status === 'Paid';
  const baseUSD = Number(payment.amount || 0);
  const paymentCurrency: 'USD' | 'VES' = payment.paymentCurrency || 'VES';

  if (isPaid && payment.amountInLocalCurrency !== undefined && payment.amountInLocalCurrency !== null && payment.exchangeRate) {
    const historicalRate = Number(payment.exchangeRate);
    const historicalLocal = Number(payment.amountInLocalCurrency);

    return {
      amountUSD: baseUSD,
      amountLocal: historicalLocal,
      exchangeRate: historicalRate,
      isHistorical: true,
      paymentCurrency,
      formattedUSD: formatCurrency(baseUSD, 'USD'),
      formattedLocal: formatCurrency(historicalLocal, 'VES'),
    };
  }

  const rate = currentRate > 0 ? currentRate : 65.50;
  const localAmount = Math.round(baseUSD * rate * 100) / 100;

  return {
    amountUSD: baseUSD,
    amountLocal: localAmount,
    exchangeRate: rate,
    isHistorical: false,
    paymentCurrency,
    formattedUSD: formatCurrency(baseUSD, 'USD'),
    formattedLocal: formatCurrency(localAmount, 'VES'),
  };
}

/**
 * Resuelve montos de un gasto (médico o clínica):
 * Si tiene tasa/monto congelado, preserva el valor histórico inmutable.
 */
export function resolveExpenseFinancials(
  expense: Partial<Expense> | Partial<ClinicExpense>,
  currentRate: number = 65.50
): ResolvedFinancials {
  const baseUSD = Number(expense.amount || 0);
  const paymentCurrency: 'USD' | 'VES' = (expense.currency === 'VES' || expense.currency === 'USD') ? expense.currency : 'USD';

  if (expense.amountInLocalCurrency !== undefined && expense.amountInLocalCurrency !== null && expense.exchangeRate) {
    const historicalRate = Number(expense.exchangeRate);
    const historicalLocal = Number(expense.amountInLocalCurrency);

    return {
      amountUSD: baseUSD,
      amountLocal: historicalLocal,
      exchangeRate: historicalRate,
      isHistorical: true,
      paymentCurrency,
      formattedUSD: formatCurrency(baseUSD, 'USD'),
      formattedLocal: formatCurrency(historicalLocal, 'VES'),
    };
  }

  const rate = currentRate > 0 ? currentRate : 65.50;
  const localAmount = Math.round(baseUSD * rate * 100) / 100;

  return {
    amountUSD: baseUSD,
    amountLocal: localAmount,
    exchangeRate: rate,
    isHistorical: false,
    paymentCurrency,
    formattedUSD: formatCurrency(baseUSD, 'USD'),
    formattedLocal: formatCurrency(localAmount, 'VES'),
  };
}


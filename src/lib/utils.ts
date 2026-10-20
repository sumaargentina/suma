import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Zona horaria por defecto del sistema (Venezuela: America/Caracas GMT-4)
export const DEFAULT_TIMEZONE = "America/Caracas";

// Función para obtener la fecha actual en la zona horaria del sistema
export function getCurrentDate(timeZone: string = DEFAULT_TIMEZONE): string {
  const now = new Date();
  const localizedTime = new Date(now.toLocaleString("en-US", { timeZone }));
  return localizedTime.toISOString().split('T')[0];
}

// Función para convertir una fecha UTC a fecha local
export function convertUTCToLocalDate(utcDate: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const localizedTime = new Date(utcDate.toLocaleString("en-US", { timeZone }));
  return localizedTime.toISOString().split('T')[0];
}

// Función para obtener la fecha de pago basada en la fecha de registro
export function getPaymentDate(joinDate: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const localizedDate = new Date(joinDate.toLocaleString("en-US", { timeZone }));
  const dayOfMonth = localizedDate.getDate();

  // Si se registra entre el 1 y el 25, paga el 1 del mes siguiente
  // Si se registra después del 25, paga el 1 del mes subsiguiente
  const paymentDate = new Date(localizedDate.getFullYear(), localizedDate.getMonth(), 1);

  if (dayOfMonth <= 25) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  } else {
    paymentDate.setMonth(paymentDate.getMonth() + 2);
  }

  return paymentDate.toISOString().split('T')[0];
}

// Función para obtener la fecha y hora actual en la zona horaria local
export function getCurrentDateTime(timeZone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone }));
}

// Función para formatear una fecha en la zona horaria local
export function formatDate(date: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  const localizedDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return localizedDate.toISOString().split('T')[0];
}

// Compatibilidad hacia atrás con llamadas existentes en el proyecto
export const getCurrentDateInArgentina = () => getCurrentDate();
export const convertUTCToArgentinaDate = (utcDate: Date) => convertUTCToLocalDate(utcDate);
export const getPaymentDateInArgentina = (joinDate: Date) => getPaymentDate(joinDate);
export const getCurrentDateTimeInArgentina = () => getCurrentDateTime();
export const formatDateInArgentina = (date: Date) => formatDate(date);

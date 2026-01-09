import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para obtener la fecha actual en la zona horaria de Argentina
export function getCurrentDateInArgentina(): string {
  const now = new Date();
  // Argentina está en GMT-3
  // Convertir a zona horaria de Argentina
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  return argentinaTime.toISOString().split('T')[0];
}

// Función para convertir una fecha UTC a fecha de Argentina
export function convertUTCToArgentinaDate(utcDate: Date): string {
  // Convertir a zona horaria de Argentina
  const argentinaTime = new Date(utcDate.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  return argentinaTime.toISOString().split('T')[0];
}

// Función para obtener la fecha de pago basada en la fecha de registro en Argentina
export function getPaymentDateInArgentina(joinDate: Date): string {
  // Convertir la fecha de registro a zona horaria de Argentina
  const argentinaDate = new Date(joinDate.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  const dayOfMonth = argentinaDate.getDate();

  // Si se registra entre el 1 y el 25, paga el 1 del mes siguiente
  // Si se registra después del 25, paga el 1 del mes subsiguiente
  const paymentDate = new Date(argentinaDate.getFullYear(), argentinaDate.getMonth(), 1);

  if (dayOfMonth <= 25) {
    paymentDate.setMonth(paymentDate.getMonth() + 1);
  } else {
    paymentDate.setMonth(paymentDate.getMonth() + 2);
  }

  return paymentDate.toISOString().split('T')[0];
}

// Función para obtener la fecha y hora actual en Argentina
export function getCurrentDateTimeInArgentina(): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
}

// Función para formatear una fecha en zona horaria de Argentina
export function formatDateInArgentina(date: Date): string {
  const argentinaDate = new Date(date.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
  return argentinaDate.toISOString().split('T')[0];
}

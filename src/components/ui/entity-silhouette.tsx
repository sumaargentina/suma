import React from 'react';
import { cn } from '@/lib/utils';

export type EntitySilhouetteType = 'clinic' | 'doctor' | 'pharmacy' | 'laboratory';

interface EntitySilhouetteProps {
  type: EntitySilhouetteType;
  variant?: 'banner' | 'avatar';
  className?: string;
}

/**
 * Verifica si una URL de imagen es real y no un placeholder genérico con dimensiones (ej. placehold.co/400x400)
 */
export function isRealImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('placehold.co') ||
    lower.includes('via.placeholder.com') ||
    lower.includes('placeholder.com') ||
    lower.includes('dummyimage.com')
  ) {
    return false;
  }
  return true;
}

/**
 * Siluetas vectoriales institucionales para Médicos, Clínicas, Farmacias y Laboratorios
 * cuando la entidad aún no ha subido una foto o portada personalizada.
 */
export function EntitySilhouette({
  type,
  variant = 'banner',
  className,
}: EntitySilhouetteProps) {
  if (type === 'clinic') {
    if (variant === 'avatar') {
      return (
        <div
          className={cn(
            'w-full h-full bg-gradient-to-br from-slate-100 to-teal-50 flex items-center justify-center text-teal-700',
            className
          )}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="w-7 h-7"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Edificio Central de Clínica */}
            <rect x="16" y="14" width="32" height="42" rx="3" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2.5" />
            {/* Alas laterales */}
            <path d="M6 28C6 26.8954 6.89543 26 8 26H16V56H6V28Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.2" />
            <path d="M48 26H56C57.1046 26 58 26.8954 58 28V56H48V26Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="2.2" />
            {/* Cruz Médica Superior */}
            <circle cx="32" cy="24" r="6.5" fill="white" stroke="currentColor" strokeWidth="2" />
            <path d="M32 20.5V27.5M28.5 24H35.5" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
            {/* Ventanas y Puerta */}
            <rect x="22" y="34" width="5" height="5" rx="1" fill="currentColor" fillOpacity="0.45" />
            <rect x="37" y="34" width="5" height="5" rx="1" fill="currentColor" fillOpacity="0.45" />
            <rect x="27" y="44" width="10" height="12" rx="1.5" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="2" />
            <line x1="2" y1="56" x2="62" y2="56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );
    }

    // Banner de Clínica (Silueta Arquitectónica de Centro Médico)
    return (
      <div
        className={cn(
          'w-full h-full relative overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-teal-950 flex items-end justify-center',
          className
        )}
      >
        <svg
          viewBox="0 0 400 140"
          fill="none"
          className="w-full h-full object-cover opacity-85"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Silueta de ciudad médica de fondo */}
          <rect x="20" y="65" width="55" height="75" rx="2" fill="#1e293b" />
          <rect x="325" y="55" width="60" height="85" rx="2" fill="#1e293b" />
          {/* Ala Izquierda de la Clínica */}
          <rect x="75" y="52" width="65" height="88" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <rect x="88" y="64" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="112" y="64" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="88" y="84" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="112" y="84" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          {/* Ala Derecha de la Clínica */}
          <rect x="260" y="52" width="65" height="88" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <rect x="274" y="64" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="298" y="64" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="274" y="84" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          <rect x="298" y="84" width="14" height="12" rx="1.5" fill="#14b8a6" fillOpacity="0.22" />
          {/* Torre Principal de la Clínica */}
          <rect x="135" y="22" width="130" height="118" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="2" />
          {/* Frontón Superior y Cruz Médica */}
          <rect x="175" y="12" width="50" height="18" rx="3" fill="#0f172a" stroke="#14b8a6" strokeWidth="1.5" />
          <path d="M200 15V27M194 21H206" stroke="#2dd4bf" strokeWidth="3.2" strokeLinecap="round" />
          {/* Ventanales de la Torre Central */}
          <rect x="152" y="40" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.25" />
          <rect x="189" y="40" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.35" />
          <rect x="226" y="40" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.25" />
          <rect x="152" y="64" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.25" />
          <rect x="189" y="64" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.35" />
          <rect x="226" y="64" width="22" height="14" rx="2" fill="#38bdf8" fillOpacity="0.25" />
          {/* Entrada Principal con Marquesina */}
          <rect x="168" y="96" width="64" height="6" rx="2" fill="#14b8a6" />
          <rect x="176" y="102" width="48" height="38" fill="#0f172a" stroke="#334155" strokeWidth="1.5" />
          <line x1="200" y1="102" x2="200" y2="140" stroke="#334155" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  if (type === 'doctor') {
    if (variant === 'banner') {
      return (
        <div
          className={cn(
            'w-full h-full relative overflow-hidden bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center',
            className
          )}
        >
          <svg
            viewBox="0 0 800 220"
            fill="none"
            className="w-full h-full object-cover opacity-90"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Patrón de cuadrícula médica sutil */}
            <circle cx="680" cy="40" r="110" fill="#14b8a6" fillOpacity="0.06" />
            <circle cx="140" cy="180" r="90" fill="#0ea5e9" fillOpacity="0.06" />
            {/* Línea de Pulso / ECG Institucional */}
            <path
              d="M0 130H240L265 95L290 165L320 55L350 175L378 105L398 130H800"
              stroke="#2dd4bf"
              strokeWidth="2.5"
              strokeOpacity="0.35"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Emblema de Consultorio Médico a la derecha */}
            <g transform="translate(560, 42)">
              <rect x="0" y="0" width="136" height="136" rx="28" fill="#0f172a" fillOpacity="0.55" stroke="#14b8a6" strokeOpacity="0.3" strokeWidth="2" />
              {/* Cruz médica estilizada y estetoscopio */}
              <path d="M68 38V98M38 68H98" stroke="#2dd4bf" strokeWidth="6" strokeLinecap="round" strokeOpacity="0.45" />
              <circle cx="68" cy="68" r="44" stroke="#38bdf8" strokeOpacity="0.2" strokeWidth="2" />
            </g>
          </svg>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'w-full h-full bg-gradient-to-b from-slate-100 via-slate-100 to-teal-50/60 flex items-end justify-center overflow-hidden',
          className
        )}
      >
        <svg
          viewBox="0 0 120 140"
          fill="none"
          className="w-full h-full max-w-[115px] object-contain pt-3"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Cabeza del Médico */}
          <circle cx="60" cy="44" r="22" fill="#94a3b8" fillOpacity="0.45" stroke="#64748b" strokeWidth="2.5" />
          {/* Hombros y Bata Médica */}
          <path
            d="M16 138C16 102 34 82 60 82C86 82 104 102 104 138"
            fill="white"
            stroke="#64748b"
            strokeWidth="2.5"
          />
          {/* Solapas de la Bata */}
          <path d="M46 84L60 116L74 84" fill="#e2e8f0" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
          {/* Estetoscopio alrededor del cuello */}
          <path
            d="M42 86C42 104 48 114 60 114C72 114 78 104 78 86"
            stroke="#0d9488"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="76" cy="112" r="5.5" fill="#0d9488" stroke="white" strokeWidth="1.5" />
          {/* Cruz en el bolsillo de la bata */}
          <path d="M82 118V126M78 122H86" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (type === 'pharmacy') {
    if (variant === 'avatar') {
      return (
        <div
          className={cn(
            'w-full h-full bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center text-emerald-700',
            className
          )}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            className="w-7 h-7"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Fachada de Farmacia con Toldo */}
            <rect x="10" y="24" width="44" height="32" rx="2.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.4" />
            <path d="M8 24L13 14H51L56 24H8Z" fill="currentColor" fillOpacity="0.22" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            {/* Cruz de Farmacia */}
            <path d="M32 31V43M26 37H38" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="6" y1="56" x2="58" y2="56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      );
    }

    // Banner de Farmacia
    return (
      <div
        className={cn(
          'w-full h-full relative overflow-hidden bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 flex items-end justify-center',
          className
        )}
      >
        <svg
          viewBox="0 0 400 130"
          fill="none"
          className="w-full h-full object-cover opacity-85"
          preserveAspectRatio="xMidYMax slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Edificio de Farmacia */}
          <rect x="110" y="34" width="180" height="96" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.8" />
          {/* Toldo comercial */}
          <path d="M102 52L114 34H286L298 52H102Z" fill="#047857" stroke="#34d399" strokeWidth="1.5" />
          {/* Letrero superior con Cruz de Farmacia */}
          <rect x="165" y="14" width="70" height="20" rx="4" fill="#022c22" stroke="#34d399" strokeWidth="1.8" />
          <path d="M200 18V30M194 24H206" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round" />
          {/* Vitrinas y Puerta */}
          <rect x="126" y="66" width="44" height="38" rx="2" fill="#a7f3d0" fillOpacity="0.2" stroke="#34d399" strokeWidth="1.2" />
          <rect x="230" y="66" width="44" height="38" rx="2" fill="#a7f3d0" fillOpacity="0.2" stroke="#34d399" strokeWidth="1.2" />
          <rect x="182" y="72" width="36" height="58" rx="2" fill="#022c22" stroke="#34d399" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }

  // Laboratory (Laboratorio Clínico)
  if (variant === 'avatar') {
    return (
      <div
        className={cn(
          'w-full h-full bg-gradient-to-br from-indigo-50 to-sky-100 flex items-center justify-center text-indigo-700',
          className
        )}
      >
        <svg
          viewBox="0 0 64 64"
          fill="none"
          className="w-7 h-7"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Matraz / Laboratorio */}
          <path
            d="M25 12H39M28 12V24L15 46C13.8 48 15.2 51 17.6 51H46.4C48.8 51 50.2 48 49 46L36 24V12"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M20 38H44L48 46C49 48 47.5 51 45 51H19C16.5 51 15 48 16 46L20 38Z" fill="currentColor" fillOpacity="0.2" />
          <circle cx="29" cy="44" r="2" fill="currentColor" />
          <circle cx="36" cy="41" r="1.5" fill="currentColor" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full h-full relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-cyan-950 flex items-end justify-center',
        className
      )}
    >
      <svg
        viewBox="0 0 400 130"
        fill="none"
        className="w-full h-full object-cover opacity-85"
        preserveAspectRatio="xMidYMax slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="115" y="28" width="170" height="102" rx="4" fill="#1e1b4b" stroke="#38bdf8" strokeWidth="1.6" />
        <circle cx="200" cy="58" r="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
        <path d="M196 50H204M198 50V56L193 64H207L202 56V50" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="140" y="88" width="32" height="42" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <rect x="184" y="88" width="32" height="42" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <rect x="228" y="88" width="32" height="42" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

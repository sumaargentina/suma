import React from 'react';

export const AiChatBackground = () => {
    return (
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none overflow-hidden">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="health-pattern" x="0" y="0" width="150" height="150" patternUnits="userSpaceOnUse">
                        {/* --- Fila 1 --- */}

                        {/* Syringe (Inyectadora) */}
                        <g transform="translate(10, 10) scale(0.8)">
                            <path d="M10 30 L30 10 L35 15 L15 35 Z M5 35 L15 45 M30 10 L35 5 L40 10 L35 15 M5 40 L0 45" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                        </g>

                        {/* Heart (Corazón Salud) */}
                        <path d="M70 20 C70 15 65 10 60 15 C55 10 50 15 50 20 C50 30 60 40 60 40 C60 40 70 30 70 20 Z" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" transform="translate(10, 0)" />

                        {/* Doctor Note/Clipboard (Notas) */}
                        <g transform="translate(110, 10) scale(0.7)">
                            <rect x="5" y="5" width="20" height="25" rx="2" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                            <line x1="8" y1="12" x2="22" y2="12" stroke="#077a7a" strokeWidth="2" opacity="0.25" />
                            <line x1="8" y1="18" x2="22" y2="18" stroke="#077a7a" strokeWidth="2" opacity="0.25" />
                            <line x1="8" y1="24" x2="18" y2="24" stroke="#077a7a" strokeWidth="2" opacity="0.25" />
                        </g>

                        {/* --- Fila 2 --- */}

                        {/* Nurse Cap (Cofia Enfermera) */}
                        <g transform="translate(20, 60) scale(0.8)">
                            <path d="M5 15 Q15 5 25 15 L25 15 L28 15 L5 15 Z M8 15 L8 10 M22 15 L22 10 M15 15 L15 8" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                            <path d="M5 15 C5 25 25 25 25 15" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                            <path d="M13 18 L17 18 M15 16 L15 20" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.3" /> {/* Cruz en la cofia */}
                        </g>

                        {/* Pill (Pastilla) */}
                        <path d="M65 75 L75 85 M65 75 C60 70 60 60 65 55 C70 50 80 50 85 55 L95 65 C100 70 100 80 95 85 C90 90 80 90 75 85 Z" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" transform="translate(0, 0) scale(0.8)" />

                        {/* Stethoscope Head (Estetoscopio simple) */}
                        <g transform="translate(110, 60) scale(0.8)">
                            <circle cx="15" cy="15" r="8" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                            <path d="M15 15 L15 25 Q15 35 5 35" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                        </g>


                        {/* --- Fila 3 --- */}

                        {/* Pen (Bolígrafo) */}
                        <g transform="translate(10, 110) scale(0.8) rotate(-45)">
                            <path d="M10 5 L15 5 L15 25 L12.5 30 L10 25 Z" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                            <line x1="10" y1="7" x2="15" y2="7" stroke="#077a7a" strokeWidth="2" opacity="0.25" />
                        </g>

                        {/* EKG / Activity */}
                        <path d="M50 120 L60 120 L65 105 L75 135 L80 120 L90 120" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.25" />
                        <path d="M50 120 L60 120 L65 105 L75 135 L80 120 L90 120" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.12" />

                        {/* DNA Segment */}
                        <path d="M110 110 Q120 120 110 130 M120 110 Q110 120 120 130" stroke="#077a7a" strokeWidth="2" fill="none" opacity="0.12" />

                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#health-pattern)" />
            </svg>
        </div>
    );
};

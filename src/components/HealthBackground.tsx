"use client";

import React, { useEffect, useRef } from "react";
import p5Types from "p5";

export function HealthBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let myP5: p5Types;

        const sketch = (p: p5Types) => {

            let speedLines: SpeedLine[] = [];
            let ekgLines: EKGLine[] = [];
            let icons: AppointmentIcon[] = [];
            let orbs: BlurredOrb[] = [];

            let isDark = false;

            p.setup = () => {
                const { offsetWidth, offsetHeight } = containerRef.current!;
                p.createCanvas(offsetWidth, offsetHeight).parent(containerRef.current!);



                // --- 2. Speed Lines (Velocidad de la luz) ---
                for (let i = 0; i < 4; i++) {
                    speedLines.push(new SpeedLine(p));
                }

                const orbCount = 7;
                for (let i = 0; i < orbCount; i++) {
                    const isTeal = i % 2 === 0;

                    // Separación de esferas AUMENTADA
                    let attempts = 0;
                    let x, y, safe;
                    const minDist = p.width < 768 ? 200 : 500; // Más separación (antes 150/400)

                    do {
                        x = p.random(p.width);
                        y = p.random(p.height);
                        safe = true;

                        for (let other of orbs) {
                            let d = p.dist(x, y, other.x, other.y);
                            if (d < minDist) {
                                safe = false;
                                break;
                            }
                        }
                        attempts++;
                    } while (!safe && attempts < 100);

                    orbs.push(new BlurredOrb(p, isTeal, x, y));
                }

                // --- 3. EKG Lines ---
                // Solo la de arriba
                ekgLines.push(new EKGLine(p, p.height * 0.15)); // Arriba
                // ekgLines.push(new EKGLine(p, p.height * 0.85)); // Abajo REMOVIDO

                // --- 4. Background Icons ---
                const iconCount = Math.floor((p.width * p.height) / 50000);
                for (let i = 0; i < iconCount; i++) {
                    icons.push(new AppointmentIcon(p));
                }

                isDark = document.documentElement.classList.contains("dark");
            };



            p.draw = () => {
                p.clear();
                isDark = document.documentElement.classList.contains("dark");

                // Configuración de colores según tema
                // Configuración de colores según tema
                const primaryColor = isDark ? p.color(255, 255, 255) : p.color(30, 41, 59);
                const accentColor = isDark ? p.color(7, 122, 122) : p.color(7, 122, 122); // Teal Marca (#077a7a)

                // Color EKG en Teal también (o variante más cian)
                const ekgColor = isDark ? p.color(7, 122, 122, 60) : p.color(7, 122, 122, 50);

                // Colores para Orbs
                // Colores para Orbs - Gris más oscuro en modo claro para que se vea
                const tealOrb = p.color(7, 122, 122);
                const greyOrb = isDark ? p.color(148, 163, 184) : p.color(100, 110, 120); // Slate grey visible

                // --- Layer 0: Blurred Orbs (Fondo profundo) ---
                orbs.forEach(orb => {
                    orb.update();
                    orb.display(orb.isTeal ? tealOrb : greyOrb);
                });

                // --- Layer 1: Fondo Sutil (Iconos) ---
                icons.forEach(icon => {
                    icon.update();
                    // Muy, muy sutil
                    icon.display(isDark ? p.color(255, 255, 255, 8) : p.color(0, 0, 0, 4));
                });

                // --- Layer 2: EKG Lines (Ahora con picos reales) ---
                ekgLines.forEach(line => {
                    line.update();
                    line.display(ekgColor);
                });



                // --- Layer 4: Speed Lines ---
                speedLines.forEach(line => {
                    line.update();
                    line.display(accentColor);
                });
            };

            p.windowResized = () => {
                if (containerRef.current) {
                    const { offsetWidth, offsetHeight } = containerRef.current;
                    p.resizeCanvas(offsetWidth, offsetHeight);
                    // Reinicializar para adaptar a cambio de tamaño (mobile <-> desktop)

                }
            };

            // ==========================================
            // CLASES
            // ==========================================



            class BlurredOrb {
                p: p5Types;
                x: number;
                y: number;
                vx: number;
                vy: number;
                origVx: number;
                origVy: number;
                size: number;
                isTeal: boolean;

                constructor(p: p5Types, isTeal: boolean, startX: number, startY: number) {
                    this.p = p;
                    this.isTeal = isTeal;
                    this.x = startX;
                    this.y = startY;

                    // Movimiento base
                    this.origVx = p.random(-0.15, 0.15);
                    this.origVy = p.random(-0.15, 0.15);
                    this.vx = this.origVx;
                    this.vy = this.origVy;

                    // Responsive size: Más pequeñas
                    const isMobile = p.width < 768;
                    this.size = isMobile ? p.random(100, 200) : p.random(250, 450); // Reducidas (antes 150-300 / 400-700)
                }

                update() {
                    // Interacción con el Mouse: "Suave y delicado"
                    // Repulsión suave como si fuera niebla
                    let dx = this.p.mouseX - this.x;
                    let dy = this.p.mouseY - this.y;
                    let dist = Math.sqrt(dx * dx + dy * dy);
                    let interactionRadius = 400; // Radio amplio

                    if (dist < interactionRadius) {
                        let force = this.p.map(dist, 0, interactionRadius, 2, 0); // Fuerza sutil
                        // Vector unitario hacia afuera * fuerza * factor de suavidad
                        let angle = Math.atan2(dy, dx);
                        let targetVx = -Math.cos(angle) * force; // Moverse en contra
                        let targetVy = -Math.sin(angle) * force;

                        // Mezclar velocidad actual con la de repulsión (lerp bajo para suavidad extrema)
                        this.vx = this.p.lerp(this.vx, targetVx, 0.02);
                        this.vy = this.p.lerp(this.vy, targetVy, 0.02);
                    } else {
                        // Si el mouse está lejos, volver suavemente a la deriva original
                        this.vx = this.p.lerp(this.vx, this.origVx, 0.01);
                        this.vy = this.p.lerp(this.vy, this.origVy, 0.01);
                    }

                    this.x += this.vx;
                    this.y += this.vy;

                    // Rebotar/Wrapping suave
                    if (this.x < -this.size) this.x = this.p.width + this.size;
                    if (this.x > this.p.width + this.size) this.x = -this.size;
                    if (this.y < -this.size) this.y = this.p.height + this.size;
                    if (this.y > this.p.height + this.size) this.y = -this.size;
                }

                display(c: p5Types.Color) {
                    this.p.noStroke();

                    // Usar gradiente nativo del Canvas
                    const ctx = this.p.drawingContext as CanvasRenderingContext2D;
                    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size / 2);

                    const r = this.p.red(c);
                    const g = this.p.green(c);
                    const b = this.p.blue(c);

                    // Transparencia AUMENTADA
                    const alphaVal = this.isTeal ? 0.35 : 0.45;

                    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaVal})`);
                    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            class SpeedLine {
                p: p5Types;
                x: number;
                y: number;
                speed: number;
                length: number;

                constructor(p: p5Types) {
                    this.p = p;
                    this.x = p.random(p.width); // Random start first time

                    // Inicializar propiedades obligatorias para TS
                    this.y = this.p.random(this.p.height);
                    this.speed = this.p.random(20, 40);
                    this.length = this.p.random(150, 400);

                    this.reset();
                }
                reset() {
                    this.x = -this.p.random(500, 2000);
                    this.y = this.p.random(this.p.height);
                    this.speed = this.p.random(20, 40);
                    this.length = this.p.random(150, 400);
                }

                update() {
                    this.x += this.speed;
                    if (this.x > this.p.width + this.length) {
                        this.reset();
                    }
                }

                display(c: p5Types.Color) {
                    for (let i = 0; i < 5; i++) {
                        let alpha = this.p.map(i, 0, 5, 0, 60); // Menos opacidad máxima
                        this.p.stroke(this.p.red(c), this.p.green(c), this.p.blue(c), alpha);
                        this.p.strokeWeight(0.5 + i * 0.2); // Líneas más finas
                        let startX = this.x - (this.length * (i / 5));
                        let endX = this.x - (this.length * ((i + 1) / 5));
                        this.p.line(startX, this.y, endX, this.y);
                    }
                }
            }

            class EKGLine {
                p: p5Types;
                points: { x: number, y: number }[];
                cursorX: number;
                yBase: number;
                speed: number;
                lastBeatX: number; // Para controlar cuándo ocurre el latido

                constructor(p: p5Types, yBase: number) {
                    this.p = p;
                    this.yBase = yBase;
                    this.cursorX = 0;
                    this.speed = 4; // Un poco más rápido
                    this.points = [];
                    this.lastBeatX = -200;
                }

                update() {
                    this.cursorX += this.speed;

                    // Patrón de latido: cada ~300-400px
                    let yOffset = 0;
                    // Distancia desde el último latido
                    let distSinceBeat = this.cursorX - this.lastBeatX;

                    // Si ya pasó suficiente tiempo, disparamos un nuevo latido aleatoriamente
                    if (distSinceBeat > this.p.random(300, 500)) {
                        this.lastBeatX = this.cursorX;
                        distSinceBeat = 0;
                    }

                    // Dibujar el complejo P-QRS-T basado en la distancia del inicio del latido actual
                    if (distSinceBeat >= 0 && distSinceBeat < 120) {
                        // Mapeamos la distancia a la forma del latido para obtener puntas agudas no suavizadas
                        // Usamos una función discreta para garantizar picos
                        const t = distSinceBeat;

                        if (t < 20) { // Espera
                            yOffset = 0;
                        } else if (t < 30) { // Onda P subida
                            yOffset = -5 * (t - 20) / 10;
                        } else if (t < 40) { // Onda P bajada
                            yOffset = -5 * (1 - (t - 30) / 10);
                        } else if (t < 45) { // Espera PR
                            yOffset = 0;
                        } else if (t < 50) { // Q (pequeña bajada)
                            yOffset = 5 * (t - 45) / 5;
                        } else if (t < 55) { // R subida (PICO ALTO)
                            // De 5 a -50
                            yOffset = 5 - 55 * (t - 50) / 5;
                        } else if (t < 60) { // R bajada hacia S
                            // De -50 a 15
                            yOffset = -50 + 65 * (t - 55) / 5;
                        } else if (t < 65) { // S vuelta a base
                            // De 15 a 0
                            yOffset = 15 - 15 * (t - 60) / 5;
                        } else if (t < 80) { // Segmento ST
                            yOffset = 0;
                        } else if (t < 95) { // Onda T subida
                            yOffset = -8 * (t - 80) / 15;
                        } else if (t < 110) { // Onda T bajada
                            yOffset = -8 * (1 - (t - 95) / 15);
                        } else {
                            yOffset = 0;
                        }
                    } else {
                        // Ruido base muy leve
                        yOffset = this.p.random(-0.5, 0.5);
                    }

                    this.points.push({ x: this.cursorX, y: this.yBase + yOffset });

                    // Limpieza
                    if (this.points.length > this.p.width / this.speed + 100) {
                        this.points.shift();
                    }

                    if (this.cursorX > this.p.width + 50) {
                        this.cursorX = 0;
                        this.points = [];
                        this.lastBeatX = -200; // Reset beat timer
                    }
                }

                display(c: p5Types.Color) {
                    this.p.noFill();
                    this.p.stroke(c);
                    this.p.strokeWeight(1.5); // Un poco más fino

                    // Usamos beginShape con vertex estándar (no curveVertex) para esquinas agudas
                    this.p.beginShape();
                    this.points.forEach(pt => {
                        this.p.vertex(pt.x, pt.y);
                    });
                    this.p.endShape();

                    // Efecto de desvanecimiento (trail) al final de la línea si se desea, 
                    // o simplemente el punto líder
                    if (this.points.length > 0) {
                        const last = this.points[this.points.length - 1];

                        // Glow en la punta más suave
                        this.p.noStroke();
                        this.p.fill(this.p.red(c), this.p.green(c), this.p.blue(c), 150); // Menos intenso
                        this.p.ellipse(last.x, last.y, 3, 3);

                        // Halo muy suave
                        this.p.fill(this.p.red(c), this.p.green(c), this.p.blue(c), 20);
                        this.p.ellipse(last.x, last.y, 15, 15); // Más difuso
                    }
                }
            }

            class AppointmentIcon {
                p: p5Types;
                x: number;
                y: number;
                vx: number;
                vy: number;
                type: number;
                angle: number;

                constructor(p: p5Types) {
                    this.p = p;
                    this.x = p.random(p.width);
                    this.y = p.random(p.height);
                    this.vx = p.random(-0.05, 0.05);
                    this.vy = p.random(-0.05, 0.05);
                    this.type = Math.floor(p.random(3));
                    this.angle = p.random(p.TWO_PI);
                }

                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.angle += 0.002;

                    if (this.x < -50) this.x = this.p.width + 50;
                    if (this.x > this.p.width + 50) this.x = -50;
                    if (this.y < -50) this.y = this.p.height + 50;
                    if (this.y > this.p.height + 50) this.y = -50;
                }

                display(c: p5Types.Color) {
                    this.p.push();
                    this.p.translate(this.x, this.y);
                    this.p.rotate(this.angle);
                    this.p.stroke(c);
                    this.p.strokeWeight(1);
                    this.p.noFill();
                    const size = 25;

                    if (this.type === 0) { // Calendar
                        this.p.rectMode(this.p.CENTER);
                        this.p.rect(0, 0, size, size, 3);
                        this.p.line(-size / 2, -size / 4, size / 2, -size / 4);
                    } else if (this.type === 1) { // Clock
                        this.p.ellipse(0, 0, size);
                        this.p.line(0, 0, 0, -size / 3);
                        this.p.line(0, 0, size / 3, 0);
                    } else { // Cross
                        this.p.line(-size / 2, 0, size / 2, 0);
                        this.p.line(0, -size / 2, 0, size / 2);
                    }
                    this.p.pop();
                }
            }
        };

        const initP5 = async () => {
            try {
                const p5 = (await import('p5')).default;
                if (containerRef.current) {
                    myP5 = new p5(sketch);
                }
            } catch (error) {
                console.error("Failed to load p5", error);
            }
        };
        initP5();

        return () => {
            if (myP5) myP5.remove();
        };
    }, []);

    return <div ref={containerRef} className="absolute inset-0 -z-0 h-full w-full pointer-events-none" style={{ position: 'absolute', opacity: 1 }} />;
}

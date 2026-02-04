"use client";

import React, { useEffect, useRef } from "react";
import p5Types from "p5";

export function MobileMenuBackground() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let myP5: p5Types | null = null;
        let resizeObserver: ResizeObserver | null = null;

        const sketch = (p: p5Types) => {
            let strands: DNAStrand[] = [];
            let isDark = false;

            p.setup = () => {
                if (!containerRef.current) return;
                const { offsetWidth, offsetHeight } = containerRef.current;
                p.createCanvas(offsetWidth, offsetHeight).parent(containerRef.current);

                const count = 3;
                for (let i = 0; i < count; i++) {
                    strands.push(new DNAStrand(p));
                }
                isDark = document.documentElement.classList.contains("dark");
            };

            p.draw = () => {
                p.clear();
                isDark = document.documentElement.classList.contains("dark");
                const primaryColor = isDark ? p.color(255, 255, 255) : p.color(30, 41, 59);
                const accentColor = p.color(7, 122, 122);

                strands.forEach(strand => {
                    strand.update();
                    strand.display(primaryColor, accentColor);
                });
            };

            // Eliminamos p.windowResized estándar porque usaremos ResizeObserver

            // --- DNA Class ---
            class DNAStrand {
                p: p5Types;
                x: number;
                y: number;
                vx: number;
                vy: number;
                angle: number;
                rotation: number;
                length: number;
                spinSpeed: number;
                amplitude: number;

                constructor(p: p5Types) {
                    this.p = p;
                    this.x = p.random(p.width);
                    this.y = p.random(p.height);
                    this.vx = p.random(-0.3, 0.3);
                    this.vy = p.random(-0.3, 0.3);
                    this.length = p.random(100, 200);
                    this.amplitude = 25;
                    this.angle = p.random(p.TWO_PI);
                    this.rotation = p.random(p.TWO_PI);
                    this.spinSpeed = p.random(0.01, 0.03);
                }

                update() {
                    this.x += this.vx;
                    this.y += this.vy;
                    this.angle += this.spinSpeed;
                    if (this.x < -100) this.x = this.p.width + 100;
                    if (this.x > this.p.width + 100) this.x = -100;
                    if (this.y < -100) this.y = this.p.height + 100;
                    if (this.y > this.p.height + 100) this.y = -100;
                }

                display(c1: p5Types.Color, c2: p5Types.Color) {
                    this.p.push();
                    this.p.translate(this.x, this.y);
                    this.p.rotate(this.rotation + this.angle * 0.1);
                    const points = 12;
                    const spacing = this.length / points;
                    for (let i = -points / 2; i < points / 2; i++) {
                        let lx = i * spacing;
                        let phase = i * 0.5 + this.angle;
                        let ly1 = this.p.sin(phase) * this.amplitude;
                        let ly2 = this.p.sin(phase + this.p.PI) * this.amplitude;
                        let size = this.p.map(this.p.cos(phase), -1, 1, 2, 6);
                        let alpha = this.p.map(this.p.cos(phase), -1, 1, 40, 150);
                        this.p.stroke(150, 30);
                        this.p.strokeWeight(0.5);
                        this.p.line(lx, ly1, lx, ly2);
                        this.p.noStroke();
                        this.p.fill(this.p.red(c1), this.p.green(c1), this.p.blue(c1), alpha);
                        this.p.ellipse(lx, ly1, size, size);
                        this.p.fill(this.p.red(c2), this.p.green(c2), this.p.blue(c2), alpha);
                        this.p.ellipse(lx, ly2, size, size);
                    }
                    this.p.pop();
                }
            }
        };

        const initP5 = async () => {
            try {
                if (!containerRef.current) return;

                // Cargar p5 solo si aún no está cargado
                if (!myP5) {
                    const p5 = (await import('p5')).default;
                    // Verificación doble por si se desmontó durante el await
                    if (containerRef.current) {
                        myP5 = new p5(sketch);
                    }
                }
            } catch (error) {
                console.error("Failed to load p5", error);
            }
        };

        // ResizeObserver para manejar cambios de tamaño y la inicialización
        resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width > 0 && height > 0) {
                    if (!myP5) {
                        initP5(); // Inicializar si no existe
                    } else {
                        myP5.resizeCanvas(width, height); // Redimensionar si ya existe
                    }
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (myP5) {
                myP5.remove();
                myP5 = null;
            }
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-0 h-full w-full pointer-events-none"
            style={{ position: 'absolute' }}
        />
    );
}

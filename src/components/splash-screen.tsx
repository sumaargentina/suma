"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [hidden, setHidden] = useState(false);
  const [removed, setRemoved] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const topHalfRef = useRef<HTMLDivElement>(null);
  const bottomHalfRef = useRef<HTMLDivElement>(null);
  const ecgPathRef = useRef<SVGPathElement>(null);
  const ecgGlowRef = useRef<SVGPathElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const pulseRing1 = useRef<HTMLDivElement>(null);
  const pulseRing2 = useRef<HTMLDivElement>(null);
  const pulseRing3 = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);

  const runAnimation = useCallback(async () => {
    const { createTimeline, stagger } = await import("animejs");

    // Setup: get ECG path length for drawing effect
    const ecgPath = ecgPathRef.current;
    const ecgGlow = ecgGlowRef.current;
    if (ecgPath) {
      const length = ecgPath.getTotalLength();
      ecgPath.style.strokeDasharray = `${length}`;
      ecgPath.style.strokeDashoffset = `${length}`;
      if (ecgGlow) {
        ecgGlow.style.strokeDasharray = `${length}`;
        ecgGlow.style.strokeDashoffset = `${length}`;
      }
    }

    const tl = createTimeline({
      defaults: { ease: "out(3)" },
    });

    // ── ACT 1: ECG Heartbeat draws across screen ──
    if (ecgPath) {
      const length = ecgPath.getTotalLength();
      tl.add(ecgPath, {
        strokeDashoffset: [length, 0],
        duration: 1200,
        ease: "in(2)",
      });
      if (ecgGlow) {
        tl.add(ecgGlow, {
          strokeDashoffset: [length, 0],
          duration: 1200,
          ease: "in(2)",
        }, 0);
      }
    }

    // ── ACT 2: Continuous pulse rings throughout animation (heartbeat progress) ──
    // Each beat gets progressively bigger, representing animation progress
    const beats = [
      { time: 800, maxScale: 1.5, ring1Opacity: 0.6 },
      { time: 1400, maxScale: 2.2, ring1Opacity: 0.5 },
      { time: 2000, maxScale: 3.0, ring1Opacity: 0.45 },
      { time: 2600, maxScale: 4.0, ring1Opacity: 0.35 },
      { time: 3200, maxScale: 6.0, ring1Opacity: 0.25 },
    ];

    for (const beat of beats) {
      // Main ring — biggest, most visible
      tl.add(pulseRing1.current!, {
        scale: [0, beat.maxScale],
        opacity: [beat.ring1Opacity, 0],
        duration: 600,
        ease: "out(2)",
      }, beat.time);

      // Secondary ring — smaller, slightly delayed
      tl.add(pulseRing2.current!, {
        scale: [0, beat.maxScale * 0.7],
        opacity: [beat.ring1Opacity * 0.7, 0],
        duration: 500,
        ease: "out(2)",
      }, beat.time + 80);

      // Tertiary ring — smallest, more delayed  
      tl.add(pulseRing3.current!, {
        scale: [0, beat.maxScale * 0.5],
        opacity: [beat.ring1Opacity * 0.5, 0],
        duration: 450,
        ease: "out(2)",
      }, beat.time + 150);
    }

    // ── ACT 3: Logo materializes from the pulse ──
    tl.add(logoRef.current!, {
      scale: [0, 1.15, 1],
      opacity: [0, 1],
      rotate: [180, 0],
      duration: 900,
      ease: "out(4)",
    }, 1000);

    // ── ACT 4: Orbital particles swirl around logo ──
    const orbitEls = orbitRef.current?.children;
    if (orbitEls && orbitEls.length > 0) {
      tl.add(orbitEls, {
        opacity: [0, 1],
        scale: [0, 1],
        duration: 400,
        delay: stagger(40),
      }, 1200);
    }

    // Spin the orbit container
    tl.add(orbitRef.current!, {
      rotate: [0, 360],
      duration: 2000,
      ease: "in(1)",
    }, 1200);

    // ── ACT 5: ECG fades away (at exit time, not earlier) ──
    if (ecgPath) {
      tl.add(ecgPath, {
        opacity: [1, 0],
        duration: 500,
      }, 3200);
      if (ecgGlow) {
        tl.add(ecgGlow, {
          opacity: [1, 0],
          duration: 500,
        }, 3200);
      }
    }

    // ── ACT 6: Text appears letter by letter ──
    const letterEls = textRef.current?.children;
    if (letterEls && letterEls.length > 0) {
      tl.add(letterEls, {
        translateY: [30, 0],
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: 500,
        ease: "out(4)",
        delay: stagger(70),
      }, 1600);
    }

    // ── ACT 6b: Tagline fades in ──
    tl.add(taglineRef.current!, {
      opacity: [0, 1],
      translateY: [10, 0],
      duration: 500,
    }, 2200);

    // ── ACT 7: Hold ──
    tl.add({ duration: 500 });

    // ── ACT 8: Everything contracts to center ──
    tl.add(logoRef.current!, {
      scale: [1, 0.8],
      duration: 300,
      ease: "in(2)",
    });

    if (letterEls && letterEls.length > 0) {
      tl.add(letterEls, {
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 200,
        delay: stagger(20),
      }, "-=300");
    }

    tl.add(taglineRef.current!, {
      opacity: [1, 0],
      duration: 200,
    }, "-=200");

    if (orbitEls && orbitEls.length > 0) {
      tl.add(orbitEls, {
        scale: [1, 0],
        opacity: [1, 0],
        duration: 300,
        delay: stagger(20),
      }, "-=300");
    }

    // ── ACT 9: Logo launches upward ──
    tl.add(logoRef.current!, {
      scale: [0.8, 2],
      opacity: [1, 0],
      translateY: [0, -60],
      duration: 400,
      ease: "in(4)",
    });

    // ── ACT 10: Curtain split — top goes up, bottom goes down ──
    tl.add(topHalfRef.current!, {
      translateY: [0, "-100%"],
      duration: 600,
      ease: "in(4)",
    }, "-=200");

    tl.add(bottomHalfRef.current!, {
      translateY: [0, "100%"],
      duration: 600,
      ease: "in(4)",
    }, "-=600");

    await tl;
    setRemoved(true);
  }, []);

  useEffect(() => {
    if (sessionStorage.getItem("suma-splash-shown")) {
      setHidden(true);
      setRemoved(true);
      return;
    }
    sessionStorage.setItem("suma-splash-shown", "1");
    runAnimation();
  }, [runAnimation]);

  if (removed || hidden) return null;

  // Orbital dots — pre-computed positions to avoid hydration mismatch
  const ORBIT_DATA: { x: number; y: number; size: number; color: string }[] = [
    { x: 90, y: 0, size: 6, color: "#0d9488" },
    { x: 78, y: 45, size: 4, color: "#14b8a6" },
    { x: 45, y: 78, size: 3, color: "#5eead4" },
    { x: 0, y: 90, size: 6, color: "#99f6e4" },
    { x: -45, y: 78, size: 4, color: "#0d9488" },
    { x: -78, y: 45, size: 3, color: "#14b8a6" },
    { x: -90, y: 0, size: 6, color: "#5eead4" },
    { x: -78, y: -45, size: 4, color: "#99f6e4" },
    { x: -45, y: -78, size: 3, color: "#0d9488" },
    { x: 0, y: -90, size: 6, color: "#14b8a6" },
    { x: 45, y: -78, size: 4, color: "#5eead4" },
    { x: 78, y: -45, size: 3, color: "#99f6e4" },
  ];

  const orbitDots = ORBIT_DATA.map((dot, i) => (
    <div
      key={i}
      className="absolute rounded-full"
      style={{
        width: `${dot.size}px`,
        height: `${dot.size}px`,
        background: dot.color,
        left: `calc(50% + ${dot.x}px)`,
        top: `calc(50% + ${dot.y}px)`,
        transform: "translate(-50%, -50%)",
        opacity: "0",
        boxShadow: `0 0 ${dot.size * 2}px ${dot.color}`,
      }}
    />
  ));

  const letters = "SUMA".split("").map((char, i) => (
    <span key={i} className="inline-block" style={{ opacity: 0 }}>
      {char}
    </span>
  ));

  // ECG heartbeat SVG path
  const ecgD =
    "M -400,0 L -200,0 L -170,-8 L -155,12 L -140,-45 L -120,55 L -105,-15 L -90,0 L 90,0 L 105,-8 L 120,12 L 140,-45 L 155,55 L 170,-15 L 200,0 L 400,0";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] overflow-hidden"
      aria-hidden="true"
    >
      {/* Top half (white) */}
      <div
        ref={topHalfRef}
        className="absolute inset-x-0 top-0 h-1/2 bg-white"
      />
      {/* Bottom half (white) */}
      <div
        ref={bottomHalfRef}
        className="absolute inset-x-0 bottom-0 h-1/2 bg-white"
      />

      {/* Content layer */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {/* ECG Line */}
        <svg
          className="absolute"
          width="100%"
          height="120"
          viewBox="-400 -60 800 120"
          preserveAspectRatio="xMidYMid meet"
          style={{ top: "calc(50% - 60px)" }}
        >
          {/* Glow layer */}
          <path
            ref={ecgGlowRef}
            d={ecgD}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            opacity="0.6"
          />
          {/* Main line */}
          <path
            ref={ecgPathRef}
            d={ecgD}
            fill="none"
            stroke="#0d9488"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>

        {/* Pulse rings */}
        <div
          ref={pulseRing1}
          className="absolute rounded-full border-2 border-teal-500/40"
          style={{ width: 60, height: 60, opacity: 0 }}
        />
        <div
          ref={pulseRing2}
          className="absolute rounded-full border border-teal-400/30"
          style={{ width: 60, height: 60, opacity: 0 }}
        />
        <div
          ref={pulseRing3}
          className="absolute rounded-full border border-teal-300/20"
          style={{ width: 60, height: 60, opacity: 0 }}
        />

        {/* Orbital particles */}
        <div
          ref={orbitRef}
          className="absolute"
          style={{ width: 200, height: 200 }}
        >
          {orbitDots}
        </div>

        {/* Logo */}
        <div ref={logoRef} style={{ opacity: 0 }} className="relative z-10">
          <Image
            src="/images/logo_suma.png"
            alt="SUMA"
            width={150}
            height={150}
            className="h-28 w-28 md:h-36 md:w-36 object-contain drop-shadow-[0_0_25px_rgba(13,148,136,0.3)]"
            priority
          />
        </div>

        {/* Text */}
        <div
          ref={textRef}
          className="mt-5 text-2xl font-bold tracking-[8px] uppercase text-teal-700 z-10"
        >
          {letters}
        </div>

        {/* Tagline */}
        <div
          ref={taglineRef}
          className="mt-2 text-xs tracking-[3px] uppercase text-teal-500/70 z-10"
          style={{ opacity: 0 }}
        >
          Sistema Unificado de Medicina Avanzada
        </div>
      </div>
    </div>
  );
}

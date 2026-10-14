"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

interface Ember {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  phase: number;
  hue: number;
  life: number;
}

/** Fixed page backdrop: drifting chakra glows, a faint grid and rising embers. */
export function AmbientBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = canvas.current;
    if (!el || reduce) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const embers: Ember[] = [];
    const spawn = (initial: boolean): Ember => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      vy: 0.18 + Math.random() * 0.45,
      vx: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.8 ? 24 + Math.random() * 18 : 265,
      life: 0,
    });
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      el.width = w * dpr;
      el.height = h * dpr;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const target = Math.round(Math.min(48, (w * h) / 32000));
    for (let i = 0; i < target; i++) embers.push(spawn(true));

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < embers.length; i++) {
        const e = embers[i]!;
        e.life += 0.016;
        e.y -= e.vy;
        e.x += e.vx + Math.sin(e.phase + e.life * 1.3) * 0.25;
        const flicker = 0.55 + Math.sin(e.phase + e.life * 4) * 0.3;
        const fade = Math.min(1, e.y / (h * 0.35));
        const alpha = Math.max(0, flicker * fade * 0.8);
        const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
        g.addColorStop(0, `hsla(${e.hue}, 100%, 70%, ${alpha})`);
        g.addColorStop(1, `hsla(${e.hue}, 100%, 55%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
        ctx.fill();
        if (e.y < -20 || e.x < -20 || e.x > w + 20) embers[i] = spawn(false);
      }
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduce]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-shadow-950">
      <div className="absolute -left-[20%] -top-[25%] h-[70vh] w-[70vw] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(242,92,0,0.20),transparent)]" />
      <div
        className="absolute -right-[15%] top-[5%] h-[60vh] w-[55vw] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.14),transparent)]"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-[30%] left-[20%] h-[60vh] w-[70vw] animate-drift rounded-full bg-[radial-gradient(closest-side,rgba(14,165,233,0.10),transparent)]"
        style={{ animationDelay: "-12s" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <canvas ref={canvas} className="absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-shadow-950 to-transparent" />
    </div>
  );
}

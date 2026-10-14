"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ACCENT_STYLES } from "@/lib/accents";
import { cn } from "@/lib/cn";
import { LessonMedallion } from "./lesson-medallion";
import { StageStars } from "./stage-stars";
import { svgId, type LessonStatus, type LessonSummary } from "./types";
import { lessonHref, usePathProgress, type LessonStars } from "./use-lesson-progress";

interface Point {
  x: number;
  y: number;
  color: string;
}

interface Geometry {
  w: number;
  h: number;
  points: Point[];
}

const STATUS: Record<LessonStatus, { label: string; className: string }> = {
  mastered: { label: "Mastered", className: "border-gold-400/40 bg-gold-400/10 text-gold-200" },
  complete: { label: "Complete", className: "border-leaf-400/40 bg-leaf-500/10 text-leaf-300" },
  next: { label: "Next up", className: "border-chakra-400/50 bg-chakra-500/15 text-chakra-200" },
  todo: { label: "Not started", className: "border-white/10 bg-white/[0.04] text-ash-400" },
};

/** Layout offset of `el` inside `root`, ignoring CSS transforms (entrance animations). */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === root ? { x, y } : null;
}

/** Smooth route through the medallion centres: S-curves with vertical tangents, snaking when stacked. */
function buildRoute(points: Point[], wiggle: number) {
  if (points.length < 2) return "";
  const first = points[0]!;
  let d = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const dy = (b.y - a.y) * 0.55;
    const bend = Math.abs(b.x - a.x) < 8 ? (i % 2 ? wiggle : -wiggle) : 0;
    d += ` C ${(a.x + bend).toFixed(1)} ${(a.y + dy).toFixed(1)}, ${(b.x + bend).toFixed(1)} ${(b.y - dy).toFixed(1)}, ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

function useRouteGeometry() {
  const ref = useRef<HTMLDivElement>(null);
  const [geo, setGeo] = useState<Geometry | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchors = Array.from(root.querySelectorAll<HTMLElement>("[data-path-anchor]"));
        const points: Point[] = [];
        for (const a of anchors) {
          const o = offsetWithin(a, root);
          if (o) points.push({ x: o.x + a.offsetWidth / 2, y: o.y + a.offsetHeight / 2, color: a.dataset.pathAnchor || "#ff7a1a" });
        }
        setGeo({ w: root.offsetWidth, h: root.offsetHeight, points });
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return { ref, geo };
}

/** The glowing SVG route that links every medallion. */
function Route({ geo }: { geo: Geometry }) {
  const reduce = useReducedMotion();
  const id = svgId(useId());
  const pts = geo.points;
  if (pts.length < 2) return null;
  const stacked = Math.abs(pts[0]!.x - pts[1]!.x) < 8;
  const d = buildRoute(pts, stacked ? 22 : 0);
  const y0 = pts[0]!.y;
  const y1 = pts[pts.length - 1]!.y;
  const span = Math.max(1, y1 - y0);
  const draw = { duration: reduce ? 0 : 2.4, ease: [0.65, 0, 0.35, 1] as const };

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      width={geo.w}
      height={geo.h}
      viewBox={`0 0 ${geo.w} ${geo.h}`}
    >
      <defs>
        <linearGradient id={`${id}-route`} gradientUnits="userSpaceOnUse" x1="0" y1={y0} x2="0" y2={y1}>
          {pts.map((p, i) => (
            <stop key={i} offset={`${(((p.y - y0) / span) * 100).toFixed(2)}%`} stopColor={p.color} />
          ))}
        </linearGradient>
        <filter id={`${id}-glow`} filterUnits="userSpaceOnUse" x={-40} y={-40} width={geo.w + 80} height={geo.h + 80}>
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id={`${id}-pulse`} filterUnits="userSpaceOnUse" x={-40} y={-40} width={geo.w + 80} height={geo.h + 80}>
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rail: a soft bed and a dotted trail. */}
      <path d={d} fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth={16} strokeLinecap="round" />
      <path d={d} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={2} strokeLinecap="round" strokeDasharray="0.5 10" />

      {/* Chakra route drawing itself in, with a blurred bloom underneath. */}
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${id}-route)`}
        strokeWidth={9}
        strokeLinecap="round"
        filter={`url(#${id}-glow)`}
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.55 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={draw}
      />
      <motion.path
        d={d}
        fill="none"
        stroke={`url(#${id}-route)`}
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.1 }}
        transition={draw}
      />

      {/* Travelling pulse of chakra (skipped for reduced motion). */}
      {!reduce && (
        <motion.path
          d={d}
          fill="none"
          stroke="#fff7ed"
          strokeWidth={4}
          strokeLinecap="round"
          filter={`url(#${id}-pulse)`}
          initial={{ pathLength: 0.05, pathOffset: 0, opacity: 0 }}
          animate={{ pathOffset: [0, 0.06, 0.9, 0.95], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 6,
            times: [0, 0.06, 0.9, 1],
            ease: "linear",
            repeat: Infinity,
            repeatDelay: 0.8,
            delay: 2.4,
          }}
        />
      )}
    </svg>
  );
}

function PathNode({
  lesson,
  index,
  status,
  stars,
}: {
  lesson: LessonSummary;
  index: number;
  status: LessonStatus;
  stars: LessonStars;
}) {
  const a = ACCENT_STYLES[lesson.accent];
  const even = index % 2 === 0;
  const st = STATUS[status];
  const hydrated = stars.hydrated;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ type: "spring", stiffness: 140, damping: 20, delay: 0.05 }}
    >
      <Link
        href={lessonHref(lesson.id)}
        className={cn(
          "group flex items-center gap-4 rounded-2xl focus:outline-none sm:gap-5 lg:gap-6",
          even && "lg:flex-row-reverse",
        )}
      >
        <span data-path-anchor={a.hex[1]} className="relative shrink-0">
          <motion.span
            className="flex"
            whileHover={{ scale: 1.08, rotate: even ? -4 : 4 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
          >
            <LessonMedallion
              emblem={lesson.emblem}
              accent={lesson.accent}
              order={lesson.order}
              size="path"
              glow={status === "next"}
              mastered={status === "mastered"}
            />
          </motion.span>
        </span>

        <div
          className={cn(
            "panel relative min-w-0 flex-1 overflow-hidden p-4 transition duration-300 group-hover:-translate-y-1 group-hover:border-white/15 group-focus-visible:ring-2 sm:p-5",
            a.ring,
            status === "next" && a.border,
            even && "lg:text-right",
          )}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-70"
            style={{ background: `linear-gradient(90deg, transparent, ${a.hex[1]}, transparent)` }}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -left-8 -top-16 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60",
              even && "lg:-right-8 lg:left-auto",
            )}
            style={{ background: a.hex[1] }}
          />

          <div className={cn("relative flex flex-wrap items-center gap-2", even && "lg:flex-row-reverse")}>
            <span className={cn("eyebrow", a.text)}>Lesson {String(lesson.order).padStart(2, "0")}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider transition-opacity",
                st.className,
                !hydrated && "opacity-0",
              )}
              aria-hidden={hydrated ? undefined : true}
            >
              {status === "next" && (
                <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chakra-300 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-chakra-400" />
                </span>
              )}
              {status === "mastered" && <Icon name="trophy" size={11} />}
              {status === "complete" && <Icon name="check" size={11} strokeWidth={2.6} />}
              {st.label}
            </span>
          </div>

          <h3 className="relative mt-2 text-lg font-black leading-snug text-white sm:text-xl">{lesson.title}</h3>
          <p className="relative mt-1 text-sm leading-relaxed text-ash-400">{lesson.subtitle}</p>

          <div
            className={cn(
              "relative mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/5 pt-3",
              even && "lg:flex-row-reverse",
            )}
          >
            <span className="flex items-center gap-3 text-xs font-semibold text-ash-400">
              <span className="flex items-center gap-1">
                <Icon name="clock" size={13} />
                {lesson.estMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <Icon name="layers" size={13} />
                {lesson.stepCount} steps
              </span>
            </span>
            <StageStars earned={stars.earned} hydrated={hydrated} size={16} />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/**
 * "Path of the Ninja": a winding, self-drawing route that connects the five
 * lesson medallions (zig-zag on desktop, a snaking column on mobile) and ends
 * at the Lethal Puzzles trial. Every lesson is open.
 */
export function NinjaPath({ lessons }: { lessons: readonly LessonSummary[] }) {
  const p = usePathProgress(lessons);
  const { ref, geo } = useRouteGeometry();

  return (
    <section aria-labelledby="ninja-path-title" className="relative pt-10 sm:pt-14">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ type: "spring", stiffness: 150, damping: 22 }}
        className="max-w-2xl lg:mx-auto lg:text-center"
      >
        <p className="eyebrow text-chakra-300">Path of the Ninja</p>
        <h2 id="ninja-path-title" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
          From Academy student to Kage
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ash-400 sm:text-base">
          Every lesson is open, so take them in order or jump straight to the rule you need. Each awards up to three
          stars: <span className="font-semibold text-ash-200">Learn</span> the steps,{" "}
          <span className="font-semibold text-ash-200">Train</span> in a mini-widget and{" "}
          <span className="font-semibold text-ash-200">Test</span> yourself at the checkpoint.
        </p>
      </motion.header>

      <div ref={ref} className="relative mt-10 sm:mt-14">
        {geo && <Route geo={geo} />}

        <ol className="relative flex flex-col gap-7 lg:gap-0">
          {lessons.map((lesson, i) => (
            <li
              key={lesson.id}
              className={cn(
                "relative",
                i > 0 && "lg:-mt-6",
                i % 2 === 0 ? "lg:w-[calc(40%_+_48px)]" : "lg:ml-[calc(60%_-_48px)] lg:w-[calc(40%_+_48px)]",
              )}
            >
              <PathNode lesson={lesson} index={i} status={p.statuses[i]!} stars={p.stars[i]!} />
            </li>
          ))}

          <li className="relative mt-2 lg:mx-auto lg:mt-10 lg:w-[min(30rem,60%)]">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ type: "spring", stiffness: 140, damping: 20 }}
            >
              <Link
                href="/puzzles"
                className="group flex items-center gap-4 rounded-2xl focus:outline-none sm:gap-5 lg:flex-col lg:gap-4 lg:text-center"
              >
                <span data-path-anchor="#f5c542" className="relative flex shrink-0">
                  <span
                    aria-hidden="true"
                    className="absolute -inset-3 animate-pulse-glow rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(245,197,66,0.55), transparent 70%)" }}
                  />
                  <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-200 via-gold-400 to-chakra-500 text-shadow-950 shadow-[0_0_28px_-4px_rgba(245,197,66,0.8)] ring-4 ring-shadow-950 transition-transform duration-300 group-hover:scale-110 lg:h-20 lg:w-20">
                    <Icon name="trophy" size={28} strokeWidth={2.1} />
                  </span>
                </span>
                <span className="panel relative block min-w-0 flex-1 overflow-hidden border-gold-400/25 p-4 transition duration-300 group-hover:-translate-y-1 group-hover:border-gold-400/50 group-focus-visible:ring-2 group-focus-visible:ring-gold-400/70 sm:p-5 lg:w-full">
                  <span className="eyebrow text-gold-300">Final trial</span>
                  <span className="mt-1.5 flex items-center gap-2 text-lg font-black text-white sm:text-xl lg:justify-center">
                    Lethal Puzzles
                    <Icon name="arrow-right" size={18} className="text-gold-300 transition-transform group-hover:translate-x-1" />
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-ash-400">
                    Three board states, one exact winning line each. Put every rule to work.
                  </span>
                </span>
              </Link>
            </motion.div>
          </li>
        </ol>
      </div>
    </section>
  );
}

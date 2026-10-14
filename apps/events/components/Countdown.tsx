"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ms = new Date(target).getTime() - (now ?? 0);
  const p = parts(now === null ? 0 : ms);
  const done = now !== null && ms <= 0;

  if (done) return <p className="text-lg font-semibold text-chakra-400">It&apos;s happening now!</p>;

  return (
    <div className="grid grid-cols-4 gap-2 text-center" role="timer" aria-label="Countdown">
      {(Object.keys(p) as Array<keyof typeof p>).map((k) => (
        <div key={k} className="rounded-md border border-shadow-700 bg-shadow-800 py-3">
          <div className="text-3xl font-bold tabular-nums text-chakra-400">
            {now === null ? "--" : String(p[k]).padStart(2, "0")}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-ash-400">{k}</div>
        </div>
      ))}
    </div>
  );
}

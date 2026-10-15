"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { useProgress } from "@/lib/progress";

const LINKS: Array<{ href: string; label: string; short: string; icon: IconName }> = [
  { href: "/", label: "Dojo", short: "Dojo", icon: "map" },
  { href: "/how-to-play", label: "How to Play", short: "Rules", icon: "book" },
  { href: "/puzzles", label: "Lethal Puzzles", short: "Puzzles", icon: "puzzle" },
  { href: "/keywords", label: "Keywords", short: "Keywords", icon: "search" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Learn-app section tabs plus the player's rank and XP. */
export function LearnSubnav() {
  const pathname = usePathname() ?? "/";
  const { rank, xp, hydrated } = useProgress();
  return (
    <div className="mx-auto flex h-12 max-w-6xl items-center gap-2 px-2 sm:px-6">
      <nav aria-label="Learn sections" className="scrollbar-none -mx-1 flex min-w-0 flex-1 overflow-x-auto">
        <ul className="flex items-center gap-0.5 px-1">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative z-10 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition sm:px-3",
                    active ? "text-white" : "text-ash-400 hover:text-ash-100",
                  )}
                >
                  <Icon name={link.icon} size={15} className={active ? "text-chakra-400" : undefined} />
                  <span className="sm:hidden">{link.short}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
                {active && (
                  <motion.span
                    layoutId="learn-subnav-pill"
                    className="absolute inset-0 rounded-lg border border-chakra-400/30 bg-chakra-500/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      <Link
        href="/"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-gold-200 to-gold-500 text-[11px] font-black text-shadow-950 sm:hidden"
        aria-label={hydrated ? `Rank ${rank.rank.title}, ${xp} XP` : "Your rank"}
        title={hydrated ? `${rank.rank.title} · ${xp} XP` : undefined}
      >
        {rank.index + 1}
      </Link>
      <Link
        href="/"
        className="group hidden shrink-0 items-center gap-2.5 rounded-lg border border-gold-400/20 bg-gold-400/5 py-1 pl-1.5 pr-3 transition hover:border-gold-400/50 sm:flex"
        aria-label={hydrated ? `Rank ${rank.rank.title}, ${xp} XP` : "Your rank"}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-gold-200 to-gold-500 text-[11px] font-black text-shadow-950">
          {rank.index + 1}
        </span>
        <span className="flex flex-col leading-none">
          <span className="text-[11.5px] font-bold text-gold-200">{hydrated ? rank.rank.title : "—"}</span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
              <motion.span
                className="block h-full rounded-full bg-gradient-to-r from-gold-300 to-chakra-400"
                initial={false}
                animate={{ width: `${(hydrated ? rank.progress : 0) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </span>
            <span className="text-[10px] font-semibold tabular-nums text-ash-400">{hydrated ? xp : 0} XP</span>
          </span>
        </span>
      </Link>
    </div>
  );
}

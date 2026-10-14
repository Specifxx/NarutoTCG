"use client";

import { motion } from "framer-motion";
import { BookOpen, GitCompare, Layers, Menu, Swords, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/decks", label: "Decks", icon: Layers },
  { href: "/simulator", label: "Simulator", icon: Swords },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/learn", label: "Learn", icon: BookOpen },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-shadow-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1680px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-chakra-400 to-blood-500 shadow-[0_0_24px_-4px_rgba(255,122,26,0.7)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-shadow-950 transition-transform duration-500 group-hover:rotate-180" aria-hidden>
              <path
                fill="currentColor"
                d="M12 2l2.2 6.8L21 12l-6.8 2.2L12 22l-2.2-7.8L3 12l6.8-3.2z"
              />
            </svg>
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-ash-50">
            Shinobi<span className="text-chakra-400">//</span>Sim
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-lg px-3.5 py-2 font-display text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                  active ? "text-ash-50" : "text-ash-400 hover:text-ash-100"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg border border-chakra-500/40 bg-chakra-500/10"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon className="relative h-4 w-4" aria-hidden />
                <span className="relative">{label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          className="ml-auto grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-ash-200 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <motion.nav
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/5 px-4 pb-3 md:hidden"
          aria-label="Main mobile"
        >
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm uppercase tracking-[0.12em] ${
                isActive(pathname, href) ? "bg-chakra-500/10 text-chakra-300" : "text-ash-300"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </Link>
          ))}
        </motion.nav>
      )}
    </header>
  );
}

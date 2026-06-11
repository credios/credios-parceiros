"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  FileSignature,
  UserCircle,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/clientes", label: "Meus clientes", icon: Users },
  { href: "/app/comissoes", label: "Comissões", icon: HandCoins },
  { href: "/app/contrato", label: "Contrato", icon: FileSignature },
  { href: "/app/perfil", label: "Perfil", icon: UserCircle },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Lista de navegação da sidebar (desktop). */
export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-sm px-3 py-2.5 min-h-11 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-white/10 text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-credios-gold"
              />
            )}
            <Icon size={18} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom-nav fixa + CTA flutuante "Indicar cliente" (mobile). */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <>
      <Link
        href="/app/clientes/novo"
        className="fixed bottom-20 right-4 z-40 lg:hidden inline-flex items-center gap-2 rounded-full bg-credios-gold px-5 min-h-12 text-sm font-semibold text-credios-charcoal shadow-glow-gold transition-[filter] duration-150 hover:brightness-110"
      >
        <Plus size={18} aria-hidden />
        Indicar cliente
      </Link>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-credios-charcoal border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 flex-col items-center justify-center gap-1 py-2 transition-colors duration-150",
                    active ? "text-credios-blue-300" : "text-white/50 hover:text-white/80"
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute top-0 h-0.5 w-8 rounded-full bg-credios-gold"
                    />
                  )}
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} aria-hidden />
                  <span className="text-xs leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

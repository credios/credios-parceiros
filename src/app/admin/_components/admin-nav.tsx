"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Handshake,
  Users,
  Users2,
  HandCoins,
  FileSignature,
  Plug,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  masterOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/parceiros", label: "Parceiros", icon: Handshake },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/comissoes", label: "Comissões", icon: HandCoins },
  { href: "/admin/contratos", label: "Contratos", icon: FileSignature },
  // Itens do configurador — escondidos do gerente
  { href: "/admin/equipe", label: "Equipe", icon: Users2, masterOnly: true },
  { href: "/admin/integracoes", label: "Integrações", icon: Plug, masterOnly: true },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  isMaster,
  onNavigate,
}: {
  isMaster: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => isMaster || !item.masterOnly);
  return (
    <nav className="flex flex-col gap-1" aria-label="Navegação do admin">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out",
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            {active && (
              <span
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-credios-gold"
                aria-hidden
              />
            )}
            <Icon size={18} className="shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ roleLabel }: { roleLabel: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/credios-logo.webp"
        alt="Credios"
        width={104}
        height={28}
        className="h-7 w-auto rounded-xs bg-white px-1.5 py-0.5"
      />
      <span className="t-eyebrow text-credios-gold">{roleLabel}</span>
    </div>
  );
}

function SignOutButton({ signOutAction }: { signOutAction: () => Promise<void> }) {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm text-white/70 transition-colors duration-150 ease-out hover:bg-white/5 hover:text-white cursor-pointer"
      >
        <LogOut size={16} className="shrink-0" aria-hidden />
        Sair
      </button>
    </form>
  );
}

export function AdminNav({
  adminName,
  isMaster,
  signOutAction,
}: {
  adminName: string;
  isMaster: boolean;
  signOutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const roleLabel = isMaster ? "Admin" : "Gerente";

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col bg-credios-charcoal text-white">
        <div className="px-5 py-6 border-b border-white/10">
          <Brand roleLabel={roleLabel} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks isMaster={isMaster} />
        </div>
        <div className="border-t border-white/10 px-3 py-4">
          <p className="px-3 pb-1 t-caption text-white/50 truncate">{adminName}</p>
          <SignOutButton signOutAction={signOutAction} />
        </div>
      </aside>

      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-credios-charcoal text-white">
        <div className="flex min-h-14 items-center justify-between px-4">
          <Brand roleLabel={roleLabel} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            className="flex size-11 items-center justify-center rounded-md text-white/80 transition-colors duration-150 ease-out hover:bg-white/10 cursor-pointer"
          >
            {open ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>
        {open && (
          <div className="border-t border-white/10 px-3 py-3">
            <NavLinks isMaster={isMaster} onNavigate={() => setOpen(false)} />
            <div className="mt-2 border-t border-white/10 pt-2">
              <p className="px-3 pb-1 t-caption text-white/50 truncate">{adminName}</p>
              <SignOutButton signOutAction={signOutAction} />
            </div>
          </div>
        )}
      </header>
    </>
  );
}

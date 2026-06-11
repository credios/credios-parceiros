import Image from "next/image";
import Link from "next/link";
import { FileSignature, LogOut, PauseCircle, Plus } from "lucide-react";
import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CREDIOS } from "@/lib/credios";
import { signContractAction, signOutAction } from "@/lib/actions/partner";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { SidebarNav, MobileNav } from "./nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { partnerId } = await requirePartnerSession();
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
    select: { legalName: true, status: true },
  });

  // Gating: contrato pendente — nada do app é renderizado antes da assinatura.
  if (partner.status === "PENDING_CONTRACT" || partner.status === "INVITED") {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4 py-12">
        <Card tone="white" className="max-w-md w-full text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-credios-blue-50">
            <FileSignature size={22} className="text-credios-blue" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal mt-4">
            Falta assinar seu contrato
          </h1>
          <p className="t-body text-neutral-500 mt-2">
            Para começar a indicar clientes e acompanhar suas comissões, falta só um
            passo: ler e assinar eletronicamente o contrato de parceria. Leva poucos
            minutos e a confirmação é feita por um código enviado ao seu email.
          </p>
          <form action={signContractAction} className="mt-6">
            <SubmitButton size="lg" pendingLabel="Preparando o contrato...">
              Ler e assinar contrato
            </SubmitButton>
          </form>
        </Card>
      </main>
    );
  }

  // Gating: conta suspensa ou inativa.
  if (partner.status === "SUSPENDED" || partner.status === "INACTIVE") {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4 py-12">
        <Card tone="white" className="max-w-md w-full text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-status-warning-bg">
            <PauseCircle size={22} className="text-status-warning" aria-hidden />
          </span>
          <h1 className="t-heading text-credios-charcoal mt-4">
            Sua conta está suspensa
          </h1>
          <p className="t-body text-neutral-500 mt-2">
            Seus dados e comissões estão preservados, mas o acesso ao portal está
            temporariamente suspenso. Para entender o motivo e reativar sua conta, fale
            com a Credios: {CREDIOS.emailParcerias} ou WhatsApp {CREDIOS.whatsapp}.
          </p>
          <form action={signOutAction} className="mt-6">
            <SubmitButton variant="outline">Sair</SubmitButton>
          </form>
        </Card>
      </main>
    );
  }

  // ACTIVE: shell completo.
  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col bg-credios-charcoal">
        <div className="px-6 pt-6 pb-5">
          <Link href="/app" className="inline-flex items-center gap-2">
            <Image
              src="/credios-logo.png"
              alt="Credios"
              width={110}
              height={30}
              className="h-7 w-auto brightness-0 invert"
              priority
            />
            <span className="t-eyebrow text-white/40 mt-1">Parceiros</span>
          </Link>
        </div>
        <SidebarNav />
        <div className="px-3 mt-4">
          <Link
            href="/app/clientes/novo"
            className="flex items-center justify-center gap-2 rounded-full bg-credios-gold px-5 min-h-11 text-sm font-semibold text-credios-charcoal shadow-glow-gold transition-[filter] duration-150 hover:brightness-110"
          >
            <Plus size={18} aria-hidden />
            Indicar cliente
          </Link>
        </div>
        <div className="mt-auto border-t border-white/10 px-4 py-4 flex items-center justify-between gap-2">
          <p className="text-sm text-white/70 truncate" title={partner.legalName}>
            {partner.legalName}
          </p>
          <form action={signOutAction}>
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className="flex size-11 items-center justify-center rounded-sm text-white/50 transition-colors duration-150 hover:text-white hover:bg-white/5 cursor-pointer"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </form>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="lg:hidden sticky top-0 z-30 bg-credios-charcoal border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/app" className="inline-flex items-center gap-2">
            <Image
              src="/credios-logo.png"
              alt="Credios"
              width={96}
              height={26}
              className="h-6 w-auto brightness-0 invert"
              priority
            />
            <span className="t-eyebrow text-white/40 mt-0.5">Parceiros</span>
          </Link>
          <div className="flex items-center gap-1">
            <p className="text-sm text-white/70 truncate max-w-36">{partner.legalName}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                title="Sair"
                aria-label="Sair"
                className="flex size-11 items-center justify-center rounded-sm text-white/50 transition-colors duration-150 hover:text-white cursor-pointer"
              >
                <LogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10 py-6 lg:py-10 pb-36 lg:pb-10">
        {children}
      </main>

      <MobileNav />
    </div>
  );
}

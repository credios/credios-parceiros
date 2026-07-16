import Image from "next/image";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";

const TRUST_POINTS = [
  "Acompanhe cada operação em tempo real",
  "Comissão de 2,00% sobre o valor líquido liberado",
  "Contrato digital com trilha de auditoria",
];

/**
 * Split-screen das telas de autenticação: painel fotográfico com overlay
 * charcoal à esquerda (desktop), formulário à direita. No mobile, só o form.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Painel visual (desktop) */}
      <div className="relative hidden lg:block overflow-hidden">
        <Image
          src="/login-hero.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 0px"
          className="object-cover"
        />
        {/* Overlay de direção de arte (gradiente inline permitido para foto) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(20,30,48,0.92) 0%, rgba(20,30,48,0.55) 45%, rgba(20,30,48,0.25) 100%)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
          <Link href="/" className="inline-flex w-fit">
            <Image
              src="/credios-logo.png"
              alt="Credios"
              width={150}
              height={40}
              className="h-9 w-auto brightness-0 invert"
            />
          </Link>
          <div className="max-w-md">
            <div className="h-px w-16 bg-accent-line-gold mb-6" aria-hidden />
            <h2 className="t-display-md text-white">
              Sua rede de contatos, virando receita recorrente.
            </h2>
            <ul className="mt-7 flex flex-col gap-3.5">
              {TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2
                    size={18}
                    className="text-credios-gold shrink-0"
                    aria-hidden
                  />
                  <span className="t-body">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex min-h-dvh flex-col bg-credios-ivory lg:min-h-0">
        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <Link href="/" className="mb-8 flex justify-center lg:hidden">
              <Image
                src="/credios-logo.png"
                alt="Credios"
                width={140}
                height={37}
                className="h-9 w-auto"
                priority
              />
            </Link>
            <div className="animate-fade-up">{children}</div>
          </div>
        </div>
        <p className="px-4 pb-6 text-center t-caption text-neutral-400">
          Credios Serviços Ltda · CNPJ 55.986.282/0001-30 ·{" "}
          <Link href="/" className="text-credios-blue hover:underline">
            parceiros.credios.com.br
          </Link>
        </p>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import {
  Banknote,
  Building2,
  Calculator,
  ChartLine,
  Home,
  Landmark,
  Scale,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { ARCHETYPES, CREDIOS, PROGRAMA } from "@/lib/credios";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Programa de parcerias — indique e receba 2,00% do valor líquido liberado",
  description:
    "Indique clientes para crédito com garantia de imóvel, acompanhe cada etapa pelo portal e receba 2,00% de comissão sobre o valor líquido liberado ao cliente. Credios, desde 2019.",
  robots: { index: true, follow: true },
};

const whatsappPartnerUrl = `${CREDIOS.whatsappUrl}?text=${encodeURIComponent(
  "Olá! Tenho interesse no programa de parcerias da Credios e gostaria de saber como começar a indicar clientes."
)}`;

const steps = [
  {
    icon: UserPlus,
    title: "Indique em 2 minutos",
    description:
      "Cadastre o cliente no portal com os dados básicos da operação. Sem papelada, sem burocracia.",
  },
  {
    icon: ChartLine,
    title: "Acompanhe cada etapa",
    description:
      "A Credios cuida de toda a operação — análise, avaliação do imóvel, bancos — e você vê o andamento em tempo real.",
  },
  {
    icon: Banknote,
    title: "Crédito liberado, comissão sua",
    description:
      "Quando o crédito sai, sua comissão de 2,00% sobre o valor líquido liberado é gerada automaticamente.",
  },
] as const;

const archetypeIcons: Record<string, LucideIcon> = {
  corretor: Home,
  contador: Calculator,
  advogado: Scale,
  imobiliaria: Building2,
  administradora: Landmark,
  assessor: TrendingUp,
  outro: Users,
};

const faq = [
  {
    q: "Quanto eu recebo por indicação?",
    a: "2,00% sobre o valor líquido da operação — o que efetivamente cai na conta do cliente, já descontados tributos, tarifas e demais custos retidos na liberação. Em uma liberação líquida de R$ 500.000, são R$ 10.000. A comissão aparece no portal assim que o crédito sai e o pagamento é feito em poucos dias úteis.",
  },
  {
    q: "Preciso entender de crédito imobiliário?",
    a: "Não. Você indica o cliente e a Credios assume tudo: análise de perfil, documentação, avaliação do imóvel e negociação com mais de 15 bancos parceiros. Você só acompanha pelo portal.",
  },
  {
    q: "Quanto tempo leva uma operação?",
    a: `O ciclo típico de um crédito com garantia de imóvel é de ${PROGRAMA.cicloTipicoDias} dias, entre a indicação e a liberação. O portal avisa você a cada marco importante.`,
  },
  {
    q: "Como me torno parceiro?",
    a: "Fale com a gente pelo WhatsApp. Depois de uma conversa rápida, você recebe o convite por email, cria sua senha e assina o contrato de parceria eletronicamente — tudo em poucos minutos.",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="max-w-3xl">
            <Reveal>
              <p className="t-eyebrow text-credios-gold-700">
                Programa de parcerias Credios
              </p>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="t-display-lg text-credios-charcoal mt-4">
                Indique clientes. Acompanhe tudo.{" "}
                <span className="text-credios-blue">
                  Receba 2,00% do valor líquido liberado.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="t-body-lg text-neutral-500 mt-5 max-w-2xl">
                O portal de parceiros da Credios transforma sua rede de contatos em
                receita recorrente. Você indica quem precisa de crédito com garantia
                de imóvel; nós cuidamos da operação do início ao fim — e você
                acompanha cada etapa em tempo real.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <ButtonLink href="/entrar" size="lg">
                  Entrar no portal
                </ButtonLink>
                <ButtonLink
                  href={whatsappPartnerUrl}
                  variant="secondary"
                  size="lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Quero ser parceiro
                </ButtonLink>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 t-caption text-neutral-500">
                  <ShieldCheck size={16} className="text-credios-blue" aria-hidden />
                  Correspondente bancário — Resolução BCB nº 4.935/2021
                </span>
                <span className="t-caption text-neutral-500">Desde 2019</span>
                <span className="t-caption text-neutral-500">+15 bancos parceiros</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="bg-credios-ivory">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <Reveal>
            <p className="t-eyebrow text-credios-blue">Como funciona</p>
            <h2 className="t-display-md text-credios-charcoal mt-3 max-w-xl">
              Três passos entre a indicação e a comissão
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 100}>
                <Card tone="white" className="h-full">
                  <span className="flex size-11 items-center justify-center rounded-md bg-credios-blue-50">
                    <step.icon size={20} className="text-credios-blue" aria-hidden />
                  </span>
                  <p className="t-eyebrow text-neutral-400 mt-4">Passo {i + 1}</p>
                  <h3 className="t-heading text-credios-charcoal mt-1">
                    {step.title}
                  </h3>
                  <p className="t-body text-neutral-500 mt-2">{step.description}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Destaque numérico */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <Reveal>
            <Card tone="dark" unpadded className="px-6 py-10 sm:px-12 sm:py-14 text-center">
              <p className="t-eyebrow text-credios-gold-300">Na prática</p>
              <p className="t-body-lg text-white/80 mt-4 max-w-xl mx-auto">
                Seu cliente toma{" "}
                <strong className="text-white">R$ 500.000</strong> com garantia de
                imóvel. Você recebe
              </p>
              <p className="t-money text-credios-gold mt-4 text-5xl sm:text-6xl">
                R$ 7.500
              </p>
              <div className="mx-auto mt-6 h-px w-40 bg-accent-line-gold" aria-hidden />
              <p className="t-caption text-white/60 mt-4">
                Comissão de 2,00% sobre o valor líquido liberado — sem teto, sem limite
                de indicações.
              </p>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* Para quem é */}
      <section className="bg-credios-ivory">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24">
          <Reveal>
            <p className="t-eyebrow text-credios-blue">Para quem é</p>
            <h2 className="t-display-md text-credios-charcoal mt-3 max-w-xl">
              Feito para quem já tem a confiança do cliente
            </h2>
            <p className="t-body text-neutral-500 mt-3 max-w-2xl">
              Se a sua profissão coloca você perto de quem tem imóvel e precisa de
              capital, o programa foi desenhado para você.
            </p>
          </Reveal>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {ARCHETYPES.map((a, i) => {
              const Icon = archetypeIcons[a.value] ?? Users;
              return (
                <Reveal key={a.value} delay={i * 60} className="h-full">
                  <Card
                    tone="white"
                    interactive
                    unpadded
                    className="h-full flex flex-col gap-3 p-4 sm:p-5"
                  >
                    <span className="flex size-11 items-center justify-center rounded-md bg-credios-gold/15">
                      <Icon size={18} className="text-credios-gold-700" aria-hidden />
                    </span>
                    <p className="text-sm font-semibold text-credios-charcoal">
                      {a.value === "outro" ? "Outros profissionais" : a.label}
                    </p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 sm:py-24">
          <Reveal>
            <p className="t-eyebrow text-credios-blue">Perguntas frequentes</p>
            <h2 className="t-display-md text-credios-charcoal mt-3">
              O que os parceiros perguntam antes de começar
            </h2>
          </Reveal>
          <div className="mt-8 flex flex-col gap-3">
            {faq.map((item, i) => (
              <Reveal key={item.q} delay={i * 80}>
                <details className="group rounded-lg border border-black/5 bg-white open:shadow-sm transition-[box-shadow] duration-300 ease-out">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="font-semibold text-credios-charcoal">
                      {item.q}
                    </span>
                    <span
                      className="text-credios-blue transition-transform duration-300 ease-out group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <p className="t-body text-neutral-500 px-5 pb-5">{item.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Prova institucional + CTA final */}
      <section className="bg-credios-charcoal">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <Reveal>
            <h2 className="t-display-md text-white max-w-2xl mx-auto">
              Uma parceria com quem opera crédito imobiliário desde 2019
            </h2>
            <p className="t-body-lg text-white/70 mt-4 max-w-2xl mx-auto">
              A Credios é correspondente bancário autorizado pelo Banco Central
              (Resolução BCB nº 4.935/2021) e trabalha com mais de 15 instituições
              financeiras para encontrar a melhor condição para cada cliente.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
              <ButtonLink
                href={whatsappPartnerUrl}
                variant="secondary"
                size="lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Quero ser parceiro
              </ButtonLink>
            </div>
            <p className="t-caption text-white/50 mt-5">
              Já é parceiro? O acesso ao portal está no topo da página.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

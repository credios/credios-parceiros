"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { ArrowDown, CheckCircle2, Download, Loader2, MailCheck } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  sendSignOtpAction,
  signContractAction,
  verifySignOtpAction,
} from "@/lib/actions/contract-sign";

type Step = "read" | "identify" | "sign" | "done";

const STEPS: { key: Step; label: string }[] = [
  { key: "read", label: "Ler" },
  { key: "identify", label: "Confirmar identidade" },
  { key: "sign", label: "Assinar" },
];

const SCROLL_TOLERANCE = 24;
const RESEND_COOLDOWN_S = 60;

/** Tipografia editorial do contrato renderizado como HTML. */
const ARTICLE_CLASSES = [
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:tracking-tight [&_h1]:text-credios-charcoal [&_h1]:mb-6",
  "[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-credios-charcoal [&_h2]:mt-8 [&_h2]:mb-3",
  "[&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-neutral-600 [&_p]:mb-4",
  "[&_strong]:font-semibold [&_strong]:text-credios-charcoal",
  "[&_.draft-notice]:rounded-md [&_.draft-notice]:bg-status-warning-bg [&_.draft-notice]:px-4 [&_.draft-notice]:py-3 [&_.draft-notice]:text-center [&_.draft-notice]:text-xs [&_.draft-notice]:font-semibold [&_.draft-notice]:tracking-widest [&_.draft-notice]:text-status-warning",
  "[&_.signature-date]:mt-8 [&_.signature-date]:font-medium [&_.signature-date]:text-credios-charcoal",
].join(" ");

function Stepper({ current }: { current: Step }) {
  const activeIndex = current === "done" ? 2 : STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-2 mb-6" aria-label="Etapas da assinatura">
      {STEPS.map((step, i) => {
        const isDone = current === "done" || i < activeIndex;
        const isCurrent = i === activeIndex && current !== "done";
        return (
          <li key={step.key} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-[background-color,color,box-shadow] duration-300",
                isDone && "bg-credios-blue text-white",
                isCurrent &&
                  "bg-white text-credios-blue-700 ring-2 ring-credios-blue",
                !isDone && !isCurrent && "bg-neutral-100 text-neutral-400"
              )}
              aria-hidden
            >
              {isDone && !isCurrent ? "✓" : i + 1}
            </span>
            <span
              className={cn(
                "t-caption transition-colors duration-300",
                isDone
                  ? "text-neutral-500"
                  : isCurrent
                    ? "font-semibold text-credios-charcoal"
                    : "text-neutral-400"
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px w-4 sm:w-8 transition-colors duration-300",
                  isDone ? "bg-credios-blue" : "bg-neutral-200"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function SignFlow({
  token,
  contractHtml,
  maskedEmail,
  verifyCode,
  pdfPath,
}: {
  token: string;
  contractHtml: string;
  maskedEmail: string;
  verifyCode: string;
  pdfPath: string;
}) {
  const [step, setStep] = useState<Step>("read");
  const [readDone, setReadDone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Gate de leitura: habilita ao chegar ao fim (ou direto, se couber sem scroll)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_TOLERANCE) {
      setReadDone(true);
    }
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtp = () => {
    setError(null);
    startTransition(async () => {
      const result = await sendSignOtpAction(token);
      if (result.ok) {
        setOtpSent(true);
        setOtp("");
        setCooldown(RESEND_COOLDOWN_S);
      } else {
        setError(result.error);
      }
    });
  };

  const verifyOtp = () => {
    setError(null);
    startTransition(async () => {
      const result = await verifySignOtpAction(token, otp);
      if (result.ok) {
        setStep("sign");
      } else {
        setError(result.error);
        setOtp("");
      }
    });
  };

  const sign = () => {
    setError(null);
    startTransition(async () => {
      const result = await signContractAction(token);
      if (result.ok) {
        setStep("done");
      } else {
        setError(result.error);
      }
    });
  };

  if (step === "done") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-lg bg-white p-8 sm:p-12 shadow-sm text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-credios-gold-50">
          <CheckCircle2 size={36} className="text-credios-gold-700" aria-hidden />
        </span>
        <div>
          <h2 className="t-display-md text-credios-charcoal">Contrato assinado</h2>
          <p className="t-body text-neutral-500 mt-2 max-w-md">
            Enviamos uma cópia em PDF para seu email, com a trilha de auditoria
            completa. Bem-vindo(a) ao programa de parceiros da Credios.
          </p>
        </div>
        <div className="rounded-md bg-credios-ivory px-5 py-3">
          <p className="t-eyebrow text-neutral-400">Código de verificação</p>
          <p className="font-mono text-lg font-bold text-credios-charcoal tracking-wider mt-0.5">
            {verifyCode}
          </p>
        </div>
        <ButtonLink href="/entrar" size="lg">
          Acessar o portal
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Stepper current={step} />

      {/* Documento — sempre visível para consulta durante todo o fluxo */}
      <div className="rounded-lg border border-black/5 bg-white shadow-md overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/5 px-4 sm:px-6 py-3">
          <p className="t-caption text-neutral-500">Documento para assinatura</p>
          <a
            href={pdfPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-credios-blue hover:text-credios-blue-700 transition-colors duration-150"
          >
            <Download size={16} aria-hidden />
            Baixar PDF
          </a>
        </div>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="max-h-120 overflow-y-auto px-5 sm:px-10 py-6 sm:py-10"
          tabIndex={0}
          aria-label="Conteúdo do contrato"
        >
          <article
            className={ARTICLE_CLASSES}
            dangerouslySetInnerHTML={{ __html: contractHtml }}
          />
        </div>
      </div>

      {error && (
        <p
          className="rounded-md bg-status-danger-bg px-4 py-3 text-sm text-status-danger"
          role="alert"
        >
          {error}
        </p>
      )}

      {step === "read" && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between rounded-lg bg-white p-5 sm:p-6 shadow-sm">
          {!readDone ? (
            <p className="t-caption text-neutral-500 inline-flex items-center gap-1.5">
              <ArrowDown size={14} className="text-credios-blue" aria-hidden />
              Leia até o fim para habilitar a assinatura
            </p>
          ) : (
            <p className="t-caption text-status-success inline-flex items-center gap-1.5">
              <CheckCircle2 size={14} aria-hidden />
              Leitura concluída
            </p>
          )}
          <Button
            disabled={!readDone}
            onClick={() => setStep("identify")}
            className="w-full sm:w-auto"
          >
            Continuar para assinatura
          </Button>
        </div>
      )}

      {step === "identify" && (
        <div className="flex flex-col gap-4 rounded-lg bg-white p-5 sm:p-6 shadow-sm">
          <div>
            <h2 className="t-heading text-credios-charcoal">Confirme sua identidade</h2>
            <p className="t-caption text-neutral-500 mt-1">
              Para garantir a autoria da assinatura, enviamos um código de 6
              dígitos para o email cadastrado.
            </p>
          </div>

          {!otpSent ? (
            <Button onClick={sendOtp} disabled={pending} className="w-full sm:w-fit">
              {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
              Enviar código para {maskedEmail}
            </Button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="t-caption text-status-success inline-flex items-center gap-1.5">
                <MailCheck size={14} aria-hidden />
                Código enviado para {maskedEmail}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg font-semibold tracking-widest tabular-nums sm:max-w-48"
                  aria-label="Código de 6 dígitos"
                />
                <Button
                  onClick={verifyOtp}
                  disabled={pending || otp.length !== 6}
                  className="w-full sm:w-auto"
                >
                  {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  Confirmar código
                </Button>
              </div>
              <button
                type="button"
                onClick={sendOtp}
                disabled={pending || cooldown > 0}
                className="self-start min-h-11 px-1 text-sm font-semibold text-credios-blue hover:text-credios-blue-700 transition-colors duration-150 disabled:text-neutral-400 disabled:cursor-default cursor-pointer"
              >
                {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
              </button>
            </div>
          )}
        </div>
      )}

      {step === "sign" && (
        <div className="flex flex-col gap-4 rounded-lg bg-white p-5 sm:p-6 shadow-sm">
          <div>
            <h2 className="t-heading text-credios-charcoal">Tudo pronto para assinar</h2>
            <p className="t-caption text-neutral-500 mt-1">
              Identidade confirmada. Falta só o seu aceite.
            </p>
          </div>
          <label className="flex items-start gap-3 cursor-pointer min-h-11">
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm text-neutral-600">
              Li e concordo com os termos do contrato de parceria
            </span>
          </label>
          <Button
            onClick={sign}
            disabled={pending || !agreed}
            variant="secondary"
            size="lg"
            className="w-full sm:w-fit"
          >
            {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
            {pending ? "Assinando…" : "Assinar contrato"}
          </Button>
        </div>
      )}
    </div>
  );
}

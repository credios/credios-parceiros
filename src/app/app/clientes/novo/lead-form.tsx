"use client";

import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import { createLeadAction, type ActionState } from "@/lib/actions/partner";
import { PRODUCTS, UFS } from "@/lib/credios";
import {
  MIN_CREDIT,
  MIN_PROPERTY,
  MIN_RENDA_TITULAR,
  PROPERTY_TYPE_LABELS,
  brl,
  isDisqualifiedType,
  ltvOf,
} from "@/lib/qualificacao";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

/** Máscara progressiva de CPF → CNPJ conforme a quantidade de dígitos. */
function maskDoc(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3})(\d)/, "$1/$2")
    .replace(/^(\d{2}\.\d{3}\.\d{3}\/\d{4})(\d)/, "$1-$2");
}

/** Máscara de telefone (00) 0000-0000 / (00) 00000-0000. */
function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/^(\(\d{2}\) \d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/^(\(\d{2}\) \d{5})(\d)/, "$1-$2");
}

/** Máscara de milhar pt-BR: "500000" → "500.000". */
function maskMoney(value: string): string {
  const d = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);
  if (!d) return "";
  return Number(d).toLocaleString("pt-BR");
}

function MoneyInput({
  id,
  name,
  error,
  value,
  onValueChange,
}: {
  id: string;
  name: string;
  error?: string;
  /** Controlado pelo pai quando o valor participa do cálculo de LTV. */
  value?: string;
  onValueChange?: (v: string) => void;
}) {
  const [internal, setInternal] = useState("");
  const controlled = value !== undefined;
  const shown = controlled ? value : internal;
  return (
    <div className="relative">
      <span
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400 pointer-events-none"
        aria-hidden
      >
        R$
      </span>
      <Input
        id={id}
        name={name}
        value={shown}
        onChange={(e) => {
          const masked = maskMoney(e.target.value);
          if (controlled) onValueChange?.(masked);
          else setInternal(masked);
        }}
        inputMode="numeric"
        autoComplete="off"
        placeholder="0"
        aria-invalid={error ? true : undefined}
        className="pl-10"
      />
    </div>
  );
}

/** "500.000" → 500000 */
function parseMoney(v: string): number {
  return parseInt(v.replace(/\D/g, ""), 10) || 0;
}

export function LeadForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createLeadAction,
    null
  );
  const [doc, setDoc] = useState("");
  const [phone, setPhone] = useState("");
  const [product, setProduct] = useState("CGI");
  const [propertyValue, setPropertyValue] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const errors = state?.fieldErrors ?? {};

  // Regras de CGI (src/lib/qualificacao.ts). Nos demais produtos a garantia
  // segue outra lógica e o formulário não pré-qualifica.
  const isCGI = product === "CGI";
  const pv = parseMoney(propertyValue);
  const ra = parseMoney(requestedAmount);
  const ltv = propertyType ? ltvOf(propertyType) : null;
  const ruralBlocked = propertyType ? isDisqualifiedType(propertyType) : false;
  const teto = ltv !== null && pv > 0 ? Math.floor(pv * ltv) : null;
  const acimaDoTeto = teto !== null && ra > teto;

  return (
    <form action={formAction} className="flex flex-col gap-8 max-w-2xl">
      {state?.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md bg-status-danger-bg px-4 py-3"
        >
          <AlertCircle size={18} className="text-status-danger shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-status-danger">{state.error}</p>
        </div>
      )}

      <Card tone="white">
        <h2 className="t-eyebrow text-credios-blue-700 pb-3 border-b border-black/5 mb-5">
          Dados do cliente
        </h2>
        <div className="flex flex-col gap-5">
          <Field label="Nome completo" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              name="name"
              autoFocus
              autoComplete="off"
              placeholder="Nome do cliente"
              aria-invalid={errors.name ? true : undefined}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="CPF ou CNPJ" htmlFor="document" required error={errors.document}>
              <Input
                id="document"
                name="document"
                value={doc}
                onChange={(e) => setDoc(maskDoc(e.target.value))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                aria-invalid={errors.document ? true : undefined}
              />
            </Field>
            <Field label="Telefone (WhatsApp)" htmlFor="phone" required error={errors.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                inputMode="tel"
                autoComplete="off"
                placeholder="(00) 00000-0000"
                aria-invalid={errors.phone ? true : undefined}
              />
            </Field>
          </div>
          <Field label="Email" htmlFor="email" error={errors.email} hint="Opcional">
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="off"
              placeholder="cliente@email.com"
              aria-invalid={errors.email ? true : undefined}
            />
          </Field>
          <div className="grid gap-5 grid-cols-3">
            <Field label="Cidade" htmlFor="city" className="col-span-2" error={errors.city}>
              <Input id="city" name="city" autoComplete="off" placeholder="Cidade" />
            </Field>
            <Field label="UF" htmlFor="state" error={errors.state}>
              <Select id="state" name="state" defaultValue="">
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Card>

      <Card tone="white">
        <h2 className="t-eyebrow text-credios-blue-700 pb-3 border-b border-black/5 mb-5">
          Operação
        </h2>
        <div className="flex flex-col gap-5">
          <Field label="Produto" htmlFor="product" error={errors.product}>
            <Select
              id="product"
              name="product"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              {PRODUCTS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>

          {isCGI && (
            <Field
              label="Tipo do imóvel em garantia"
              htmlFor="propertyType"
              required
              error={errors.propertyType}
              hint="Define o percentual do imóvel que pode virar crédito."
            >
              <Select
                id="propertyType"
                name="propertyType"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                aria-invalid={errors.propertyType ? true : undefined}
              >
                <option value="">Selecione…</option>
                {PROPERTY_TYPE_LABELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {ruralBlocked && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md bg-status-danger-bg px-4 py-3"
            >
              <AlertCircle size={18} className="text-status-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-status-danger">
                Imóvel rural está fora da política de crédito da Credios. Essa indicação
                não pode ser enviada.
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Valor aproximado do imóvel"
              htmlFor="propertyValue"
              required={isCGI}
              error={errors.propertyValue}
              hint={isCGI ? `Mínimo de ${brl(MIN_PROPERTY)}.` : undefined}
            >
              <MoneyInput
                id="propertyValue"
                name="propertyValue"
                error={errors.propertyValue}
                value={propertyValue}
                onValueChange={setPropertyValue}
              />
            </Field>
            <Field
              label="Valor desejado"
              htmlFor="requestedAmount"
              required={isCGI}
              error={errors.requestedAmount}
              hint={isCGI ? `Mínimo de ${brl(MIN_CREDIT)}.` : undefined}
            >
              <MoneyInput
                id="requestedAmount"
                name="requestedAmount"
                error={errors.requestedAmount}
                value={requestedAmount}
                onValueChange={setRequestedAmount}
              />
            </Field>
          </div>

          {isCGI && teto !== null && !ruralBlocked && (
            <p
              className={
                acimaDoTeto
                  ? "t-caption text-status-danger"
                  : "t-caption text-neutral-500"
              }
              role={acimaDoTeto ? "alert" : undefined}
            >
              {acimaDoTeto ? (
                <>
                  Acima do limite: para {propertyType.toLowerCase()} o crédito vai até{" "}
                  {Math.round((ltv ?? 0) * 100)}% do imóvel — no máximo{" "}
                  <strong>{brl(teto)}</strong>.
                </>
              ) : (
                <>
                  Para {propertyType.toLowerCase()}, este imóvel comporta até{" "}
                  <strong>{brl(teto)}</strong> de crédito ({Math.round((ltv ?? 0) * 100)}%).
                </>
              )}
            </p>
          )}

          {isCGI && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Renda mensal do titular"
                  htmlFor="rendaTitular"
                  required
                  error={errors.rendaTitular}
                  hint={`A partir de ${brl(MIN_RENDA_TITULAR)}.`}
                >
                  <MoneyInput
                    id="rendaTitular"
                    name="rendaTitular"
                    error={errors.rendaTitular}
                  />
                </Field>
                <Field
                  label="Renda do cônjuge"
                  htmlFor="rendaConjuge"
                  error={errors.rendaConjuge}
                  hint="Opcional — só se compuser renda."
                >
                  <MoneyInput
                    id="rendaConjuge"
                    name="rendaConjuge"
                    error={errors.rendaConjuge}
                  />
                </Field>
              </div>
              <Field
                label="Saldo devedor do imóvel"
                htmlFor="saldoDevedor"
                required
                error={errors.saldoDevedor}
                hint="Quanto ainda falta pagar do financiamento. Use 0 se o imóvel está quitado."
              >
                <MoneyInput
                  id="saldoDevedor"
                  name="saldoDevedor"
                  error={errors.saldoDevedor}
                />
              </Field>
            </>
          )}

          <Field label="Cidade do imóvel" htmlFor="propertyCity" error={errors.propertyCity}>
            <Input
              id="propertyCity"
              name="propertyCity"
              autoComplete="off"
              placeholder="Onde fica o imóvel em garantia"
            />
          </Field>
          <Field label="Observações" htmlFor="notes" error={errors.notes}>
            <Textarea
              id="notes"
              name="notes"
              maxLength={2000}
              placeholder="Conte o contexto: para que o cliente precisa do crédito?"
            />
          </Field>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox name="consent" className="mt-0.5" />
          <span className="text-sm text-neutral-600">
            Declaro que obtive autorização do cliente para compartilhar seus dados com a
            Credios para fins de análise de crédito.
          </span>
        </label>
        {errors.consent && (
          <p className="t-caption text-status-danger" role="alert">
            {errors.consent}
          </p>
        )}
        <SubmitButton
          size="lg"
          pendingLabel="Enviando..."
          className="w-full sm:w-auto"
          disabled={ruralBlocked}
        >
          Enviar indicação
        </SubmitButton>
      </div>
    </form>
  );
}

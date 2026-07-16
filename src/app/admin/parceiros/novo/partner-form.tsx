"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createPartnerAction } from "@/lib/actions/admin-partners";
import { ARCHETYPES, PROGRAMA, UFS } from "@/lib/credios";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { maskCPF, maskCNPJ, maskPhone, maskRate } from "../../_components/masks";

export function PartnerForm({
  selfId,
  managers,
}: {
  selfId: string;
  /** Lista de gerentes — presente só para o configurador (master). */
  managers?: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(createPartnerAction, null);
  const [personType, setPersonType] = useState<"PF" | "PJ">("PF");
  const [document, setDocument] = useState("");
  const [repDocument, setRepDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [rate, setRate] = useState(
    PROGRAMA.comissaoPadrao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
  );

  useEffect(() => {
    if (state && !state.ok && state.error) toast.error(state.error);
  }, [state]);

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <h2 className="t-eyebrow border-b border-black/5 pb-3 text-credios-blue-700">
          Identificação
        </h2>
        <div className="mt-5 flex flex-col gap-5">
          <fieldset>
            <legend className="text-sm font-medium text-credios-charcoal">
              Tipo de pessoa
            </legend>
            <div className="mt-2 flex gap-3">
              {(
                [
                  { value: "PF", label: "Pessoa física" },
                  { value: "PJ", label: "Pessoa jurídica" },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors duration-150 ${
                    personType === opt.value
                      ? "border-credios-blue bg-credios-blue-50 text-credios-blue-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="personType"
                    value={opt.value}
                    checked={personType === opt.value}
                    onChange={() => setPersonType(opt.value)}
                    className="accent-credios-blue"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label={personType === "PJ" ? "Razão social" : "Nome completo"}
              htmlFor="legalName"
              required
              error={errors.legalName}
            >
              <Input id="legalName" name="legalName" autoComplete="name" />
            </Field>
            <Field
              label={personType === "PJ" ? "CNPJ" : "CPF"}
              htmlFor="document"
              required
              error={errors.document}
            >
              <Input
                id="document"
                name="document"
                inputMode="numeric"
                value={document}
                onChange={(e) =>
                  setDocument(
                    personType === "PJ" ? maskCNPJ(e.target.value) : maskCPF(e.target.value)
                  )
                }
                placeholder={personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
              />
            </Field>
          </div>

          {personType === "PJ" && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Representante legal"
                htmlFor="repName"
                required
                error={errors.repName}
              >
                <Input id="repName" name="repName" />
              </Field>
              <Field
                label="CPF do representante"
                htmlFor="repDocument"
                required
                error={errors.repDocument}
              >
                <Input
                  id="repDocument"
                  name="repDocument"
                  inputMode="numeric"
                  value={repDocument}
                  onChange={(e) => setRepDocument(maskCPF(e.target.value))}
                  placeholder="000.000.000-00"
                />
              </Field>
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="t-eyebrow border-b border-black/5 pb-3 text-credios-blue-700">
          Contato e perfil
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Email" htmlFor="email" required error={errors.email}>
            <Input id="email" name="email" type="email" autoComplete="email" />
          </Field>
          <Field label="Telefone" htmlFor="phone" required error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(47) 99999-9999"
            />
          </Field>
          <Field
            label="Tipo de parceiro"
            htmlFor="archetype"
            required
            error={errors.archetype}
          >
            <Select id="archetype" name="archetype" defaultValue="corretor">
              {ARCHETYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          {managers ? (
            <Field
              label="Gerente responsável"
              htmlFor="managerId"
              required
              error={errors.managerId}
              hint="O parceiro entra na carteira deste gerente."
            >
              <Select id="managerId" name="managerId" defaultValue={selfId} required>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <input type="hidden" name="managerId" value={selfId} />
          )}
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label="Cidade" htmlFor="city" error={errors.city}>
              <Input id="city" name="city" />
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

      <Card>
        <h2 className="t-eyebrow border-b border-black/5 pb-3 text-credios-blue-700">
          Comissão e notas
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Taxa de comissão (%)"
            htmlFor="commissionRate"
            error={errors.commissionRate}
            hint="Padrão do programa — edite apenas em acordos especiais."
          >
            <Input
              id="commissionRate"
              name="commissionRate"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(maskRate(e.target.value))}
            />
          </Field>
          <Field
            label="Notas internas"
            htmlFor="notes"
            error={errors.notes}
            hint="Visível apenas para o time Credios."
            className="sm:col-span-2"
          >
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        </div>
      </Card>

      <div className="flex justify-end">
        <SubmitButton size="lg" pendingLabel="Criando e enviando convite…">
          Criar parceiro e enviar convite
        </SubmitButton>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createTemplateAction } from "@/lib/actions/admin-contracts";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function TemplateForm({ initialBodyHtml }: { initialBodyHtml: string }) {
  const [state, formAction] = useActionState(createTemplateAction, null);

  useEffect(() => {
    if (state && !state.ok && state.error) toast.error(state.error);
  }, [state]);

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Card>
        <Field
          label="Nome da versão"
          htmlFor="name"
          required
          error={errors.name}
          hint="Ex.: Revisão jurídica jun/2026."
        >
          <Input id="name" name="name" />
        </Field>
        <Field
          label="Corpo do contrato (HTML com merge fields)"
          htmlFor="bodyHtml"
          required
          error={errors.bodyHtml}
          hint="Merge fields: {{partner.legalName}}, {{partner.document}}, {{credios.razaoSocial}}, {{commission.rate}}, {{contract.date}}…"
          className="mt-5"
        >
          <Textarea
            id="bodyHtml"
            name="bodyHtml"
            defaultValue={initialBodyHtml}
            className="min-h-96 font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
        </Field>
      </Card>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Publicando…">
          Publicar nova versão ativa
        </SubmitButton>
      </div>
    </form>
  );
}

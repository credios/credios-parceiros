"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { uploadInvoiceAction, type ActionState } from "@/lib/actions/partner";
import { SubmitButton } from "@/components/ui/submit-button";

/** Upload inline da nota fiscal (PDF) de uma comissão — parceiro PJ. */
export function InvoiceUpload({ commissionId }: { commissionId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    uploadInvoiceAction.bind(null, commissionId),
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Nota fiscal anexada");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="invoice"
          accept=".pdf"
          required
          aria-label="PDF da nota fiscal"
          className="text-sm text-neutral-500 min-h-11 max-w-48 file:mr-2 file:cursor-pointer file:rounded-full file:border-0 file:bg-credios-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-credios-blue"
        />
        <SubmitButton size="sm" variant="outline" pendingLabel="Enviando...">
          Anexar NF
        </SubmitButton>
      </div>
      {state?.error && (
        <p className="t-caption text-status-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}

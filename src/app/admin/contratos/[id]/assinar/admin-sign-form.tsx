"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { adminSignContractAction } from "@/lib/actions/admin-contracts";
import type { ActionState } from "@/lib/actions/admin-helpers";
import { Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function AdminSignForm({
  contractId,
  signerLabel,
}: {
  contractId: string;
  signerLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    adminSignContractAction,
    null
  );

  if (state?.ok) {
    return (
      <div className="flex items-start gap-3 rounded-md bg-status-success-bg px-4 py-4" role="status">
        <CheckCircle2 size={20} className="text-status-success shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-semibold text-status-success">Contrato concluído</p>
          <p className="text-sm text-status-success mt-0.5">
            {state.message ?? "As cópias finais foram enviadas por email às partes."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-md bg-status-danger-bg px-4 py-3" role="alert">
          <AlertCircle size={18} className="text-status-danger shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-status-danger">{state.error}</p>
        </div>
      )}

      <input type="hidden" name="contractId" value={contractId} />

      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox name="accept" required className="mt-0.5" />
        <span className="t-body text-neutral-600">
          Li o contrato e assino eletronicamente em nome da {signerLabel}, como
          representante autorizado. Minha identidade fica registrada na trilha de
          auditoria do documento.
        </span>
      </label>

      <SubmitButton
        variant="secondary"
        size="lg"
        pendingLabel="Assinando…"
        className="w-full sm:w-auto"
      >
        Assinar pela Credios
      </SubmitButton>
    </form>
  );
}

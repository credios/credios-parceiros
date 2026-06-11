"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { resendContractAction } from "@/lib/actions/admin-contracts";
import { SubmitButton } from "@/components/ui/submit-button";

/** Reenvia o link de assinatura de um contrato ainda não assinado. */
export function ResendContractButton({ contractId }: { contractId: string }) {
  const [state, formAction] = useActionState(resendContractAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="contractId" value={contractId} />
      <SubmitButton variant="outline" size="sm" className="min-h-11" pendingLabel="Reenviando…">
        <Send size={14} aria-hidden />
        Reenviar link
      </SubmitButton>
    </form>
  );
}

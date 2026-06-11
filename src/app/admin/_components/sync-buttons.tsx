"use client";

import { useActionState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  reprocessLeadSyncAction,
  reprocessAllSyncAction,
} from "@/lib/actions/admin-leads";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/actions/admin-helpers";

function useActionToast(state: ActionState) {
  useEffect(() => {
    if (!state) return;
    if (state.ok && state.message) toast.success(state.message);
    else if (state.error) toast.error(state.error);
  }, [state]);
}

/** Reprocessa o sync CRM de um lead específico. */
export function ReprocessSyncButton({ leadId }: { leadId: string }) {
  const [state, formAction] = useActionState(reprocessLeadSyncAction, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <input type="hidden" name="leadId" value={leadId} />
      <SubmitButton variant="outline" size="md" pendingLabel="Reprocessando…">
        <RefreshCw size={15} aria-hidden />
        Reprocessar
      </SubmitButton>
    </form>
  );
}

/** Reprocessa em lote (máx. 20) os leads FAILED/PENDING. */
export function ReprocessAllButton() {
  const [state, formAction] = useActionState(reprocessAllSyncAction, null);
  useActionToast(state);
  return (
    <form action={formAction}>
      <SubmitButton variant="primary" size="md" pendingLabel="Reprocessando fila…">
        <RefreshCw size={15} aria-hidden />
        Reprocessar todos
      </SubmitButton>
    </form>
  );
}

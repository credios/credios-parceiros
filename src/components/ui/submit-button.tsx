"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pendingLabel?: string;
}

/** Botão de submit com estado de loading automático (useFormStatus). */
export function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}

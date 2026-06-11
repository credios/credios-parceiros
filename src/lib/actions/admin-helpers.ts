import type { z } from "zod";

/**
 * Estado padrão das server actions do admin — compatível com useActionState.
 * `message` é opcional e usado para feedback de sucesso (toasts/banners).
 */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
} | null;

/** Converte issues do Zod em { campo: primeira mensagem }. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** FormData.get → string | undefined (campos opcionais de formulário). */
export function optionalField(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

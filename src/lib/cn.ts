/** Junta classes condicionalmente (substitui clsx para nosso uso simples). */
export function cn(...inputs: (string | false | null | undefined)[]): string {
  return inputs.filter(Boolean).join(" ");
}

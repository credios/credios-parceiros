/** Máscaras de input client-side — só formatação; a validação real é no servidor. */

export function maskCPF(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export function maskCNPJ(v: string): string {
  return v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
}

/** CPF ou CNPJ conforme a quantidade de dígitos. */
export function maskCpfCnpj(v: string): string {
  const d = v.replace(/\D/g, "");
  return d.length <= 11 ? maskCPF(v) : maskCNPJ(v);
}

export function maskPhone(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Milhar com ponto e centavos opcionais com vírgula: "1500000,50" → "1.500.000,50". */
export function maskMoney(v: string): string {
  const cleaned = v.replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const grouped = intPart.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (rest.length === 0) return grouped;
  return `${grouped},${rest.join("").slice(0, 2)}`;
}

/** Taxa percentual: dígitos + vírgula, máx 2 casas. */
export function maskRate(v: string): string {
  const cleaned = v.replace(/[^\d,]/g, "");
  const [intPart, ...rest] = cleaned.split(",");
  const safeInt = intPart.slice(0, 2);
  if (rest.length === 0) return safeInt;
  return `${safeInt},${rest.join("").slice(0, 2)}`;
}

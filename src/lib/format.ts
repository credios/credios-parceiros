import { Prisma } from "@prisma/client";

type MoneyInput = Prisma.Decimal | number | string | null | undefined;

/** Formata em R$ 1.234,56. Aceita Decimal do Prisma, number ou string. */
export function formatBRL(value: MoneyInput): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formata percentual: 1.5 → "1,50%". */
export function formatPercent(value: MoneyInput): string {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "object" ? Number(value.toString()) : Number(value);
  if (Number.isNaN(n)) return "—";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Remove tudo que não for dígito. */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

/** Valida dígitos verificadores de CPF. */
export function isValidCPF(raw: string): boolean {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (const [len, factor] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cpf[i]) * (factor - i);
    const digit = ((sum * 10) % 11) % 10;
    if (digit !== parseInt(cpf[len])) return false;
  }
  return true;
}

/** Valida dígitos verificadores de CNPJ. */
export function isValidCNPJ(raw: string): boolean {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += parseInt(cnpj[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === parseInt(cnpj[12]) && calc(13) === parseInt(cnpj[13]);
}

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos). */
export function isValidDocument(raw: string): boolean {
  const d = onlyDigits(raw);
  if (d.length === 11) return isValidCPF(d);
  if (d.length === 14) return isValidCNPJ(d);
  return false;
}

/** Formata CPF/CNPJ normalizado para exibição. */
export function formatDocument(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = onlyDigits(raw);
  if (d.length === 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return raw;
}

/** Mascara CPF para exibição com minimização de dados: ***.456.789-** */
export function maskDocument(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = onlyDigits(raw);
  if (d.length === 11) return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
  if (d.length === 14) return `**.***.${d.slice(5, 8)}/${d.slice(8, 12)}-**`;
  return "—";
}

/** Formata telefone BR: (47) 99999-9999. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const d = onlyDigits(raw).replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

/** "há 3 dias" / "há 2 horas" — para listas e timeline. */
export function timeAgo(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.floor(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

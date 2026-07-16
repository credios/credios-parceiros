import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDocument } from "@/lib/format";
import type { CommissionStatus } from "@prisma/client";

const STATUS_LABELS: Record<CommissionStatus, string> = {
  PREVISTA: "Prevista",
  A_RECEBER: "A receber",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

/** Número no padrão pt-BR para CSV com separador ";" (Excel pt-BR). */
function csvNumber(value: { toString(): string }): string {
  return Number(value.toString()).toFixed(2).replace(".", ",");
}

/** Campo seguro: ";" viraria coluna nova. */
function csvField(value: string): string {
  return value.replace(/[;\r\n]/g, " ").trim();
}

export async function GET() {
  const session = await auth();
  const partnerId = session?.user?.partnerId;
  if (!session?.user || session.user.role !== "PARTNER" || !partnerId) {
    return new Response("Não autorizado", { status: 401 });
  }

  const commissions = await prisma.commission.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    select: {
      baseAmount: true,
      rate: true,
      amount: true,
      status: true,
      paidAt: true,
      lead: { select: { name: true, document: true } },
    },
  });

  const header =
    "Cliente;Documento;Valor líquido liberado;Taxa (%);Comissão;Status;Data pagamento";
  const rows = commissions.map((c) =>
    [
      csvField(c.lead.name),
      formatDocument(c.lead.document),
      csvNumber(c.baseAmount),
      csvNumber(c.rate),
      csvNumber(c.amount),
      STATUS_LABELS[c.status],
      c.paidAt
        ? new Date(c.paidAt).toLocaleDateString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          })
        : "",
    ].join(";")
  );

  // BOM UTF-8 para o Excel pt-BR reconhecer acentos.
  const csv = `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comissoes-credios.csv"',
      "Cache-Control": "no-store",
    },
  });
}

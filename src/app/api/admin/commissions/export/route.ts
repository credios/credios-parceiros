import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDocument } from "@/lib/format";
import type { CommissionStatus, Prisma } from "@prisma/client";

const STATUS_LABEL: Record<CommissionStatus, string> = {
  PREVISTA: "Prevista",
  A_RECEBER: "A receber",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
};

/** Decimal → "1234,56" (Excel pt-BR). */
function dec(value: Prisma.Decimal): string {
  return Number(value).toFixed(2).replace(".", ",");
}

function escapeCsv(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ADMIN_MASTER")) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Gerente exporta só a própria carteira; o configurador exporta tudo.
  const partnerScope =
    session.user.role === "ADMIN_MASTER" ? {} : { managerId: session.user.id };

  const commissions = await prisma.commission.findMany({
    where: { partner: partnerScope },
    orderBy: { createdAt: "desc" },
    select: {
      baseAmount: true,
      rate: true,
      amount: true,
      status: true,
      createdAt: true,
      paidAt: true,
      partner: { select: { legalName: true, document: true } },
      lead: { select: { name: true } },
    },
  });

  const header = [
    "Parceiro",
    "Documento parceiro",
    "Cliente",
    "Valor líquido liberado",
    "Taxa (%)",
    "Comissão",
    "Status",
    "Gerada em",
    "Paga em",
  ];
  const rows = commissions.map((c) => [
    c.partner.legalName,
    formatDocument(c.partner.document),
    c.lead.name,
    dec(c.baseAmount),
    dec(c.rate),
    dec(c.amount),
    STATUS_LABEL[c.status],
    formatDate(c.createdAt),
    c.paidAt ? formatDate(c.paidAt) : "",
  ]);

  // BOM UTF-8 para o Excel reconhecer acentuação.
  const csv =
    "\uFEFF" +
    [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="comissoes-credios.csv"',
    },
  });
}

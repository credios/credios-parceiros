import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Colunas binárias (PDFs, comprovantes, NFs) são pesadas (centenas de KB) e
 * NUNCA devem trafegar em listagens/páginas — ficam omitidas globalmente.
 * Quem precisa dos bytes (rotas de download, geração do PDF assinado)
 * opta de volta com `omit: { campo: false }` na própria query.
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    omit: {
      contract: { pdfUnsigned: true, pdfSigned: true },
      commission: { paymentProof: true, invoice: true },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

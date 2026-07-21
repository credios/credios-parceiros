/**
 * Reconciliação de parceiros portal → CRM.
 *
 * Reenvia TODOS os parceiros para o CRM via `syncPartnerToCrm` (mesmo caminho
 * dos eventos ao vivo — idempotente por portal_partner_id no CRM). Serve para:
 *   • backfill inicial (parceiros que assinaram antes do evento existir);
 *   • enriquecer registros que foram criados no CRM com dados mínimos;
 *   • reconciliar sempre que houver suspeita de divergência.
 *
 * Rodar: npx tsx --env-file=.env prisma/reconcile-partners-to-crm.ts
 * Exige CRM_BASE_URL + CRM_WEBHOOK_SECRET no ambiente (senão vira no-op).
 */
import { PrismaClient } from "@prisma/client";
import { syncPartnerToCrm } from "../src/lib/crm/notify-activated";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.CRM_BASE_URL || !process.env.CRM_WEBHOOK_SECRET) {
    throw new Error(
      "CRM_BASE_URL e CRM_WEBHOOK_SECRET precisam estar definidos (rode com --env-file=.env)."
    );
  }

  const partners = await prisma.partner.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, legalName: true, status: true },
  });
  console.log(`Reconciliando ${partners.length} parceiros com o CRM...\n`);

  let ok = 0;
  let fail = 0;
  for (const p of partners) {
    const success = await syncPartnerToCrm(p.id);
    if (success) ok++;
    else fail++;
    console.log(`  ${success ? "✓" : "✗"} [${p.status}] ${p.legalName}`);
  }

  console.log(`\nConcluído: ${ok} enviados, ${fail} falhas.`);
  if (fail > 0) {
    console.log(
      "Falhas ficam registradas em IntegrationLog (OUTBOUND, success=false). Rode de novo para reprocessar."
    );
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

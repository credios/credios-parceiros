/**
 * Publica a v2 do contrato (comissão 2,00% sobre o líquido) e desativa as
 * versões anteriores — mesma transação da createTemplateAction do admin, mas
 * executável fora da UI, para aplicar a mudança no banco junto do deploy.
 *
 * Idempotente: rodar de novo não duplica a v2 nem cria auditoria repetida.
 * Rodar com: npx tsx --env-file=.env prisma/publish-template-v2.ts
 */
import { PrismaClient } from "@prisma/client";
import { CONTRACT_TEMPLATE_V2 } from "../src/lib/contracts/template-v2";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.contractTemplate.findUnique({
    where: { version: 2 },
  });
  if (existing) {
    console.log(`• v2 já existe (${existing.id}, active=${existing.active}) — nada a fazer.`);
    return;
  }

  const actor = await prisma.user.findFirst({
    where: { role: "ADMIN_MASTER" },
    orderBy: { createdAt: "asc" },
  });
  if (!actor) throw new Error("Nenhum ADMIN_MASTER para atribuir a auditoria.");

  const template = await prisma.$transaction(async (tx) => {
    await tx.contractTemplate.updateMany({
      where: { active: true },
      data: { active: false },
    });
    const created = await tx.contractTemplate.create({
      data: {
        version: 2,
        name: "Contrato de parceria — comissão 2,00% sobre o líquido",
        bodyHtml: CONTRACT_TEMPLATE_V2,
        active: true,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "TEMPLATE_UPDATED",
        entity: "ContractTemplate",
        entityId: created.id,
        metadata: {
          version: 2,
          name: created.name,
          source: "script:publish-template-v2",
        },
      },
    });
    return created;
  });

  console.log(`✓ Template v${template.version} publicado e ativo (${template.id})`);
  console.log("  Versões anteriores desativadas. Contratos assinados seguem apontando para a v1.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

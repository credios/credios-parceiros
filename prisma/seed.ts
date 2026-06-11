/**
 * Seed inicial: primeiro usuário admin + template de contrato ativo (minuta).
 * Rodar com: npm run db:seed (exige SEED_ADMIN_* no .env)
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CONTRACT_TEMPLATE_V1 } from "../src/lib/contracts/template-v1";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const name = process.env.SEED_ADMIN_NAME ?? "Admin Credios";
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Defina SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD no .env antes de rodar o seed."
    );
  }
  if (password.length < 10) {
    throw new Error("SEED_ADMIN_PASSWORD precisa ter pelo menos 10 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {},
    create: {
      email: email.toLowerCase(),
      name,
      role: "ADMIN",
      passwordHash,
    },
  });
  console.log(`✓ Admin: ${admin.email}`);

  const template = await prisma.contractTemplate.upsert({
    where: { version: 1 },
    update: {},
    create: {
      version: 1,
      name: "Contrato de parceria — minuta inicial",
      bodyHtml: CONTRACT_TEMPLATE_V1,
      active: true,
    },
  });
  console.log(`✓ Template de contrato v${template.version} (${template.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

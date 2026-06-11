import type { Metadata } from "next";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = { title: "Novo parceiro" };

export default async function NewPartnerPage() {
  const { userId, isMaster } = await requireAdminSession();

  // Só o configurador escolhe a carteira — gerente cria sempre na própria.
  const managers = isMaster
    ? await prisma.user.findMany({
        where: {
          role: { in: ["ADMIN", "ADMIN_MASTER"] },
          passwordHash: { not: null },
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo parceiro"
        description="Ao criar, o parceiro recebe um convite por email para definir a senha (válido por 7 dias)."
      />
      <PartnerForm selfId={userId} managers={managers ?? undefined} />
    </div>
  );
}

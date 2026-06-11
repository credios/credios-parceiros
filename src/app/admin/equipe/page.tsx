import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MailCheck, Users2 } from "lucide-react";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  NewManagerForm,
  ResendManagerInviteForm,
  DeleteManagerForm,
} from "./team-actions";

export const metadata: Metadata = { title: "Equipe" };

export default async function AdminTeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { isMaster } = await requireAdminSession();
  if (!isMaster) redirect("/admin");

  const sp = await searchParams;
  const justInvited = sp.convidado === "1";

  const [admins, commissions] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["ADMIN_MASTER", "ADMIN"] } },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        _count: { select: { managedPartners: true } },
      },
    }),
    // Produção da carteira: comissões PAGA + A_RECEBER somadas por gerente.
    prisma.commission.findMany({
      where: { status: { in: ["PAGA", "A_RECEBER"] } },
      select: { amount: true, partner: { select: { managerId: true } } },
    }),
  ]);

  const productionByManager = new Map<string, number>();
  for (const c of commissions) {
    const managerId = c.partner.managerId;
    if (!managerId) continue;
    productionByManager.set(
      managerId,
      (productionByManager.get(managerId) ?? 0) + Number(c.amount)
    );
  }

  // O hash nunca sai daqui — só a presença vira "conta ativa".
  const team = admins.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    role: a.role,
    managedCount: a._count.managedPartners,
    hasPassword: Boolean(a.passwordHash),
  }));

  return (
    <div>
      <div className="animate-fade-up">
        <PageHeader
          title="Equipe"
          description="Gerentes do programa de parcerias e suas carteiras."
        />
      </div>

      {justInvited && (
        <div
          className="animate-fade-up mb-6 flex items-center gap-3 rounded-md bg-status-success-bg px-4 py-3 text-sm text-status-success"
          role="status"
        >
          <MailCheck size={18} aria-hidden />
          Gerente criado e convite enviado por email. O link vale por 7 dias.
        </div>
      )}

      <Card className="animate-fade-up-1">
        <h2 className="t-heading text-credios-charcoal">Novo gerente</h2>
        <p className="t-caption mt-1 text-neutral-500">
          O gerente recebe um convite por email para criar a senha e passa a operar
          apenas a própria carteira de parceiros.
        </p>
        <div className="mt-5">
          <NewManagerForm />
        </div>
      </Card>

      <h2 className="t-heading animate-fade-up-2 mt-8 mb-4 text-credios-charcoal">
        Gerentes
      </h2>
      <Card unpadded className="animate-fade-up-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-black/5 text-left">
                <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Nome</th>
                <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Email</th>
                <th className="t-eyebrow px-3 py-3.5 text-neutral-400">Conta</th>
                <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                  Parceiros
                </th>
                <th className="t-eyebrow px-3 py-3.5 text-right text-neutral-400">
                  Produção da carteira
                </th>
                <th className="t-eyebrow px-5 py-3.5 text-neutral-400">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {team.map((member) => (
                <tr key={member.id} className="align-top">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-credios-charcoal">
                        {member.name}
                      </span>
                      {member.role === "ADMIN_MASTER" && (
                        <Badge tone="gold">Master</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-neutral-600 break-all">
                    {member.email}
                  </td>
                  <td className="px-3 py-3.5">
                    {member.hasPassword ? (
                      <Badge tone="success">Ativo</Badge>
                    ) : (
                      <Badge tone="warning">Convite pendente</Badge>
                    )}
                  </td>
                  <td className="t-money px-3 py-3.5 text-right text-credios-charcoal">
                    {member.managedCount}
                  </td>
                  <td className="t-money px-3 py-3.5 text-right whitespace-nowrap text-credios-charcoal">
                    {formatBRL(productionByManager.get(member.id) ?? 0)}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-start gap-2">
                      {!member.hasPassword && (
                        <ResendManagerInviteForm userId={member.id} />
                      )}
                      {member.role !== "ADMIN_MASTER" && member.managedCount === 0 && (
                        <DeleteManagerForm userId={member.id} />
                      )}
                      {member.role !== "ADMIN_MASTER" && member.managedCount > 0 && (
                          <span className="t-caption text-neutral-400">
                            Carteira com parceiros — reatribua antes de remover.
                          </span>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {team.length === 0 && (
          <div className="flex items-center gap-3 px-5 py-6 text-sm text-neutral-500 sm:px-6">
            <Users2 size={18} aria-hidden />
            Nenhum gerente cadastrado ainda.
          </div>
        )}
      </Card>
    </div>
  );
}

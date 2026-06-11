import { requirePartnerSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDocument } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { ProfileForm, PasswordForm } from "./profile-forms";

export const metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const { userId, partnerId } = await requirePartnerSession();

  const [partner, user] = await Promise.all([
    prisma.partner.findUniqueOrThrow({
      where: { id: partnerId },
      select: {
        legalName: true,
        document: true,
        personType: true,
        phone: true,
        pixKey: true,
        bankInfo: true,
      },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    }),
  ]);

  const bank = (partner.bankInfo ?? {}) as {
    bankName?: string;
    bankAgency?: string;
    bankAccount?: string;
  };

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Perfil"
        description="Seus dados cadastrais e de recebimento de comissões."
      />

      <div className="flex flex-col gap-6">
        <Card tone="white">
          <h2 className="t-eyebrow text-neutral-500 mb-5">Dados cadastrais</h2>
          <dl className="flex flex-col gap-4 mb-5">
            <div>
              <dt className="t-caption text-neutral-400">
                {partner.personType === "PJ" ? "Razão social" : "Nome completo"}
              </dt>
              <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
                {partner.legalName}
              </dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="t-caption text-neutral-400">
                  {partner.personType === "PJ" ? "CNPJ" : "CPF"}
                </dt>
                <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
                  {formatDocument(partner.document)}
                </dd>
              </div>
              <div>
                <dt className="t-caption text-neutral-400">Email de acesso</dt>
                <dd className="text-sm font-medium text-credios-charcoal mt-0.5">
                  {user.email}
                </dd>
              </div>
            </div>
          </dl>
          <p className="t-caption text-neutral-400 mb-5">
            Para alterar nome, documento ou email, fale com a Credios.
          </p>
          <ProfileForm
            defaults={{
              phone: partner.phone,
              pixKey: partner.pixKey ?? "",
              bankName: bank.bankName ?? "",
              bankAgency: bank.bankAgency ?? "",
              bankAccount: bank.bankAccount ?? "",
            }}
          />
        </Card>

        <PasswordForm />
      </div>
    </div>
  );
}

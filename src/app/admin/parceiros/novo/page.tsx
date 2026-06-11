import type { Metadata } from "next";
import { requireAdminSession } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = { title: "Novo parceiro" };

export default async function NewPartnerPage() {
  await requireAdminSession();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Novo parceiro"
        description="Ao criar, o parceiro recebe um convite por email para definir a senha (válido por 7 dias)."
      />
      <PartnerForm />
    </div>
  );
}

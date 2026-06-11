import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/auth";
import { prisma } from "@/lib/prisma";
import { mergeTemplate, sampleMergeData } from "@/lib/contracts/merge";
import { CONTRACT_TEMPLATE_V1 } from "@/lib/contracts/template-v1";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { TemplateForm } from "./template-form";

export const metadata: Metadata = { title: "Nova versão do contrato" };

export default async function NewTemplatePage() {
  // Templates do contrato são assunto do configurador.
  const { isMaster } = await requireAdminSession();
  if (!isMaster) redirect("/admin/contratos");

  const activeTemplate = await prisma.contractTemplate.findFirst({
    where: { active: true },
    orderBy: { version: "desc" },
  });
  const initialBodyHtml = activeTemplate?.bodyHtml ?? CONTRACT_TEMPLATE_V1;

  // Preview renderizado no servidor com dados de exemplo.
  const previewHtml = mergeTemplate(initialBodyHtml, sampleMergeData());

  return (
    <div>
      <PageHeader
        title="Nova versão do template"
        description={
          activeTemplate
            ? `Pré-preenchido com a versão ativa (v${activeTemplate.version} — ${activeTemplate.name}). Publicar cria a v${activeTemplate.version + 1} e desativa as anteriores.`
            : "Nenhum template ativo — pré-preenchido com a minuta padrão."
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TemplateForm initialBodyHtml={initialBodyHtml} />

        <Card>
          <h2 className="t-heading text-credios-charcoal">Preview com dados de exemplo</h2>
          <p className="t-caption mt-1 text-neutral-500">
            Renderização da versão carregada no editor — edições no textarea aparecem após
            publicar.
          </p>
          <div
            className="mt-5 max-h-240 overflow-y-auto rounded-md border border-neutral-100 bg-white p-6 text-sm leading-relaxed text-neutral-700 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-credios-charcoal [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-credios-charcoal [&_p]:mt-3 [&_strong]:text-credios-charcoal"
            // Conteúdo interno do admin, mesclado no servidor.
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </Card>
      </div>
    </div>
  );
}

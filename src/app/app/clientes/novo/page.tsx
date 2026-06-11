import { PageHeader } from "@/components/ui/page-header";
import { LeadForm } from "./lead-form";

export const metadata = { title: "Indicar cliente" };

export default function NovoClientePage() {
  return (
    <>
      <PageHeader
        title="Indicar cliente"
        description="Leva menos de 2 minutos. Nossa equipe entra em contato com o cliente em até 1 dia útil."
      />
      <LeadForm />
    </>
  );
}

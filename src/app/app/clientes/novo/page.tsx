import { PageHeader } from "@/components/ui/page-header";
import { LeadForm } from "./lead-form";

export const metadata = { title: "Indicar cliente" };

export default function NovoClientePage() {
  return (
    <>
      <div className="animate-fade-up">
        <PageHeader
          title="Indicar cliente"
          description="Leva menos de 2 minutos. Nossa equipe entra em contato com o cliente em até 1 dia útil."
        />
      </div>
      <div className="animate-fade-up-1">
        <LeadForm />
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { CREDIOS, PROGRAMA } from "@/lib/credios";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso do Portal de Parceiros Credios.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="t-display-md text-credios-charcoal">Termos de uso</h1>
      <p className="t-caption text-neutral-400 mt-2">
        Última atualização: junho de 2026 · {CREDIOS.razaoSocial} · CNPJ{" "}
        {CREDIOS.cnpj}
      </p>

      <div className="mt-10 flex flex-col gap-10">
        <section>
          <h2 className="t-heading text-credios-charcoal">1. Objeto do portal</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              O Portal de Parceiros Credios é a plataforma pela qual parceiros
              credenciados indicam clientes interessados em operações de crédito
              intermediadas pela Credios — em especial crédito com garantia de
              imóvel —, acompanham o andamento dessas operações e visualizam suas
              comissões.
            </p>
            <p>
              A Credios atua como correspondente bancário, nos termos da Resolução
              BCB nº 4.935/2021. A aprovação, formalização e liberação do crédito
              são decisões exclusivas das instituições financeiras parceiras.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">2. Conta e segurança</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              O acesso ao portal é pessoal e intransferível, mediante convite da
              Credios. O parceiro é responsável pela guarda das credenciais e por
              toda atividade realizada com a sua conta.
            </p>
            <p>
              O parceiro compromete-se a manter seus dados cadastrais atualizados e
              a comunicar imediatamente qualquer suspeita de uso não autorizado da
              conta. A Credios pode suspender o acesso em caso de indício de fraude,
              uso indevido ou violação destes termos.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">
            3. Programa de comissões
          </h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              O parceiro faz jus a comissão calculada sobre o valor do crédito
              efetivamente liberado ao cliente indicado, conforme percentual
              previsto no contrato de parceria (padrão de{" "}
              {PROGRAMA.comissaoPadrao.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
              %).
            </p>
            <p>
              Não há comissão sobre operações não concluídas, recusadas pelas
              instituições financeiras ou canceladas pelo cliente. Indicações em
              duplicidade são atribuídas ao parceiro que registrou o cliente
              primeiro no portal.
            </p>
            <p>
              O pagamento é realizado conforme prazos e condições do contrato de
              parceria, mediante dados bancários informados pelo parceiro no portal.
              Parceiros pessoa jurídica devem emitir nota fiscal correspondente.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">
            4. Propriedade intelectual
          </h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              A marca Credios, o portal, seus conteúdos, layouts e materiais de
              apoio são de titularidade da {CREDIOS.razaoSocial}. O parceiro pode
              utilizá-los exclusivamente para divulgar o programa de parcerias,
              sendo vedada qualquer alteração, registro ou uso que sugira vínculo
              societário ou representação não autorizada.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">5. Rescisão</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Qualquer das partes pode encerrar a parceria mediante comunicação
              prévia, conforme o contrato de parceria. O encerramento não prejudica
              o pagamento de comissões já geradas por créditos liberados até a data
              da rescisão.
            </p>
            <p>
              A Credios pode rescindir a parceria de imediato em caso de violação
              destes termos, do contrato de parceria ou da legislação aplicável —
              em especial normas do Banco Central do Brasil e a Lei Geral de
              Proteção de Dados.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">6. Contato</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Dúvidas sobre estes termos podem ser enviadas para{" "}
              <a
                href={`mailto:${CREDIOS.email}`}
                className="text-credios-blue hover:underline"
              >
                {CREDIOS.email}
              </a>
              . {CREDIOS.razaoSocial}, {CREDIOS.endereco}.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

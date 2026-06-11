import type { Metadata } from "next";
import { CREDIOS } from "@/lib/credios";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Política de privacidade do Portal de Parceiros Credios.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="t-display-md text-credios-charcoal">
        Política de privacidade
      </h1>
      <p className="t-caption text-neutral-400 mt-2">
        Última atualização: junho de 2026 · {CREDIOS.razaoSocial} · CNPJ{" "}
        {CREDIOS.cnpj}
      </p>

      <div className="mt-10 flex flex-col gap-10">
        <section>
          <h2 className="t-heading text-credios-charcoal">1. Dados que coletamos</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              <strong>Dados do parceiro:</strong> nome ou razão social, CPF/CNPJ,
              dados do representante legal (quando pessoa jurídica), email,
              telefone, cidade/UF, dados bancários para pagamento de comissões e
              registros de acesso ao portal (data, IP e dispositivo).
            </p>
            <p>
              <strong>Dados dos clientes indicados:</strong> nome, CPF/CNPJ,
              telefone, email, cidade/UF e informações da operação pretendida
              (valor solicitado, valor e localização do imóvel). Esses dados são
              fornecidos pelo parceiro, que declara ter obtido autorização do
              cliente antes do envio.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">2. Bases legais</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Tratamos dados dos parceiros com base na{" "}
              <strong>execução do contrato</strong> de parceria e no cumprimento de
              obrigações legais e regulatórias aplicáveis a correspondentes
              bancários.
            </p>
            <p>
              Tratamos dados dos clientes indicados com base no{" "}
              <strong>consentimento obtido pelo parceiro</strong> junto ao cliente e
              nos <strong>procedimentos preliminares de contrato</strong> de
              crédito solicitados pelo próprio titular (art. 7º, V e IX, da Lei nº
              13.709/2018 — LGPD).
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">
            3. Compartilhamento com instituições financeiras
          </h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Os dados dos clientes indicados são compartilhados com as instituições
              financeiras parceiras exclusivamente para análise e formalização da
              operação de crédito. Também podemos compartilhar dados com
              prestadores de serviço essenciais à operação do portal (hospedagem,
              envio de emails, avaliação de imóveis), sempre sob obrigações de
              confidencialidade.
            </p>
            <p>Não vendemos dados pessoais a terceiros.</p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">4. Direitos do titular</h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Nos termos da LGPD, o titular pode solicitar: confirmação da
              existência de tratamento; acesso aos dados; correção de dados
              incompletos ou desatualizados; anonimização, bloqueio ou eliminação
              de dados desnecessários; portabilidade; informação sobre
              compartilhamentos; e revogação do consentimento.
            </p>
            <p>
              Os pedidos são respondidos nos prazos legais. Alguns dados podem ser
              mantidos pelo período exigido por obrigações legais e regulatórias,
              mesmo após pedido de eliminação.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">
            5. Segurança e retenção
          </h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Adotamos medidas técnicas e organizacionais proporcionais ao risco do
              tratamento: criptografia em trânsito, controle de acesso por perfil,
              registro de ações sensíveis e tokens de uso único para convites e
              redefinição de senha. Os dados são retidos pelo prazo necessário às
              finalidades desta política e às obrigações legais.
            </p>
          </div>
        </section>

        <section>
          <h2 className="t-heading text-credios-charcoal">
            6. Encarregado de dados (DPO)
          </h2>
          <div className="t-body text-neutral-600 mt-3 flex flex-col gap-3">
            <p>
              Para exercer seus direitos ou tirar dúvidas sobre esta política, fale
              com o nosso encarregado pelo tratamento de dados pessoais:{" "}
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

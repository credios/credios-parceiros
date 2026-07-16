/**
 * v2 — altera a condição comercial da cláusula 2.1: comissão passa de 1,50%
 * sobre o crédito liberado para 2,00% sobre o valor LÍQUIDO da operação, com
 * definição expressa do que compõe esse líquido. Demais cláusulas idênticas à
 * v1. Mudança solicitada por Gabriel Meirelles em 15/07/2026.
 *
 * A v1 (src/lib/contracts/template-v1.ts) permanece no código e no banco como
 * versão inativa: os contratos já assinados apontam para ela e a trilha de
 * auditoria depende de o texto original não ser alterado.
 *
 * Merge fields disponíveis:
 * {{partner.legalName}} {{partner.document}} {{partner.personType}}
 * {{partner.repName}} {{partner.repDocument}} {{partner.email}} {{partner.phone}}
 * {{partner.address}} {{credios.razaoSocial}} {{credios.cnpj}} {{credios.endereco}}
 * {{credios.representante}} {{commission.rate}} {{commission.prazoPagamento}}
 * {{contract.date}} {{contract.verifyCode}}
 */
export const CONTRACT_TEMPLATE_V2 = `
<h1>Contrato de Parceria Comercial — Programa de Parceiros Credios</h1>

<p><strong>CONTRATADA:</strong> {{credios.razaoSocial}}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº {{credios.cnpj}}, com sede na {{credios.endereco}}, neste ato representada na forma de seu contrato social ("CREDIOS").</p>

<p><strong>PARCEIRO(A):</strong> {{partner.legalName}}, inscrito(a) no CPF/CNPJ sob nº {{partner.document}}{{partner.repClause}}, email {{partner.email}}, telefone {{partner.phone}} ("PARCEIRO").</p>

<h2>1. Objeto</h2>
<p>1.1. O presente contrato tem por objeto a indicação, pelo PARCEIRO, de potenciais clientes interessados em operações de crédito intermediadas pela CREDIOS, em especial crédito com garantia de imóvel (home equity), crédito para condomínios e financiamento imobiliário.</p>
<p>1.2. A CREDIOS atua como correspondente bancário nos termos da Resolução BCB nº 4.935/2021, intermediando operações entre clientes e instituições financeiras parceiras.</p>
<p>1.3. A indicação de clientes será realizada exclusivamente por meio do Portal de Parceiros (parceiros.credios.com.br).</p>

<h2>2. Comissão</h2>
<p>2.1. Pela indicação que resultar em operação de crédito efetivamente liberada, o PARCEIRO fará jus a comissão de <strong>{{commission.rate}}% ({{commission.rateExtenso}})</strong> calculada sobre o valor líquido da operação.</p>
<p>2.2. Entende-se por valor líquido da operação o montante efetivamente creditado ao cliente indicado pela instituição financeira, já deduzidos tributos, tarifas, seguros, custos de registro e demais encargos retidos por ocasião da liberação.</p>
<p>2.3. A comissão será devida apenas após a liberação efetiva do crédito e será paga em até {{commission.prazoPagamento}} dias úteis contados da liberação, mediante transferência à conta ou chave PIX cadastrada pelo PARCEIRO no Portal.</p>
<p>2.4. O percentual aplicável é aquele vigente na data da liberação do crédito, registrado no Portal de Parceiros no momento da geração da comissão, não se aplicando a operações já liberadas eventual alteração posterior.</p>
<p>2.5. Não será devida comissão sobre operações não concluídas, recusadas pelas instituições financeiras ou canceladas pelo cliente, independentemente do estágio em que se encontrem.</p>
<p>2.6. Sendo o PARCEIRO pessoa jurídica, o pagamento fica condicionado à emissão da respectiva nota fiscal.</p>

<h2>3. Não exclusividade e independência</h2>
<p>3.1. Esta parceria não estabelece exclusividade, vínculo empregatício, societário ou de representação entre as partes.</p>
<p>3.2. O PARCEIRO não está autorizado a negociar condições, taxas ou prazos em nome da CREDIOS, nem a receber valores de clientes a qualquer título.</p>

<h2>4. Proteção de dados (LGPD) e confidencialidade</h2>
<p>4.1. O PARCEIRO declara que obteve autorização prévia e expressa de cada cliente indicado para o compartilhamento de seus dados pessoais com a CREDIOS, para fins de análise e intermediação de crédito, nos termos da Lei nº 13.709/2018 (LGPD).</p>
<p>4.2. As partes obrigam-se a manter confidencialidade sobre informações não públicas a que tenham acesso em razão desta parceria, inclusive após sua extinção.</p>
<p>4.3. A CREDIOS tratará os dados dos clientes indicados conforme sua Política de Privacidade, limitando-se ao necessário para a análise e intermediação da operação.</p>

<h2>5. Vigência e rescisão</h2>
<p>5.1. Este contrato vigora por prazo indeterminado a partir da assinatura eletrônica.</p>
<p>5.2. Qualquer das partes pode rescindi-lo mediante notificação escrita (inclusive por email), sem ônus, ressalvado o pagamento das comissões relativas a operações liberadas até a data da rescisão.</p>

<h2>6. Disposições gerais</h2>
<p>6.1. As partes reconhecem a validade da assinatura eletrônica deste instrumento nos termos do art. 10, §2º, da MP 2.200-2/2001 e da Lei nº 14.063/2020.</p>
<p>6.2. Fica eleito o foro da Comarca de Blumenau/SC para dirimir quaisquer controvérsias oriundas deste contrato.</p>

<p class="signature-date">Blumenau/SC, {{contract.date}}.</p>
`;

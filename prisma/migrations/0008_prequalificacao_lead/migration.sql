-- Pré-qualificação de leads no portal, alinhada ao simulador do site
-- (src/lib/qualificacao.ts, espelho de credios-website-v2).
--
-- Contexto: o portal aceitava qualquer valor. Entrou indicação com imóvel de
-- R$ 200 mil e crédito de R$ 250 mil — LTV de 125%, operação inexistente.
-- Agora o cadastro de CGI exige tipo de imóvel, renda e saldo devedor para
-- aplicar as mesmas regras do site (LTV por tipo, piso de imóvel, de crédito
-- e de renda, teto de saldo devedor).
--
-- Colunas NULLABLE de propósito: os leads criados antes desta política não
-- têm esses dados e não podem ser invalidados retroativamente. A
-- obrigatoriedade é aplicada no leadSchema, só para product = 'CGI'.

ALTER TABLE "Lead" ADD COLUMN "propertyType" TEXT;
ALTER TABLE "Lead" ADD COLUMN "rendaTitular" DECIMAL(14, 2);
ALTER TABLE "Lead" ADD COLUMN "rendaConjuge" DECIMAL(14, 2);
ALTER TABLE "Lead" ADD COLUMN "saldoDevedor" DECIMAL(14, 2);

-- Nova condição comercial do programa de parcerias (15/07/2026):
-- comissão de 2,00% sobre o VALOR LÍQUIDO liberado ao cliente (antes: 1,50%).
--
-- A base de cálculo não muda de campo: Lead.disbursedAmount já recebe o
-- `valorLiberadoCentavos` do CRM, que é o líquido creditado ao cliente. O que
-- muda é a alíquota e a redação que a descreve (contrato v2, ver
-- src/lib/contracts/template-v2.ts).
--
-- Comissões já geradas NÃO são recalculadas: Commission.rate é snapshot do
-- momento da criação, por desenho. Na data desta migration havia 0 comissões
-- geradas, então a mudança é integralmente prospectiva.

-- 1. Novos parceiros nascem em 2,00%.
ALTER TABLE "Partner" ALTER COLUMN "commissionRate" SET DEFAULT 2.00;

-- 2. Trilha de auditoria do backfill, uma linha por parceiro afetado, ANTES do
--    UPDATE (o filtro depende do valor antigo). Atribuída ao primeiro
--    ADMIN_MASTER: o AuditLog exige um actor, e a metadata registra que a
--    origem foi esta migration, não um clique no admin.
INSERT INTO "AuditLog" ("id", "actorId", "action", "entity", "entityId", "metadata", "createdAt")
SELECT
  gen_random_uuid()::text,
  (SELECT "id" FROM "User" WHERE "role" = 'ADMIN_MASTER' ORDER BY "createdAt" ASC LIMIT 1),
  'PARTNER_RATE_CHANGED',
  'Partner',
  p."id",
  jsonb_build_object(
    'from', p."commissionRate",
    'to', 2.00,
    'source', 'migration:0007_comissao_2pct_liquido',
    'reason', 'Nova condição comercial: 2,00% sobre o valor líquido liberado ao cliente'
  ),
  NOW()
FROM "Partner" p
WHERE p."commissionRate" = 1.50
  AND EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN_MASTER');

-- 3. Backfill: quem está no antigo padrão sobe para 2,00%. O filtro por 1.50
--    preserva eventuais taxas negociadas caso alguma tenha sido cadastrada
--    entre a escrita e a aplicação desta migration.
UPDATE "Partner" SET "commissionRate" = 2.00 WHERE "commissionRate" = 1.50;

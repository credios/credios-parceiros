-- Nova condição comercial do programa de parcerias (17/07/2026):
-- comissão de 3,00% sobre o valor líquido liberado ao cliente (antes: 2,00%).
--
-- Racional de negócio (decisão do owner): com a taxa de sucesso de 5,00%
-- cobrada dos clientes somada à comissão dos bancos, há margem para um
-- programa mais agressivo — 1 p.p. a mais custa pouco para a Credios e
-- representa +50% de receita para o parceiro, igualando o que alguns bancos
-- pagam aos seus próprios parceiros.
--
-- O TEXTO do contrato não muda: a cláusula 2.1 usa merge fields
-- ({{commission.rate}}/{{commission.rateExtenso}}) e a 2.4 já prevê que vale
-- o percentual vigente na data da liberação, registrado no Portal. Contratos
-- assinados a 2,00% permanecem válidos; pagar acima do contratado é lícito e
-- o Portal passa a registrar 3,00% para todas as comissões futuras.
--
-- Comissões já geradas NÃO são recalculadas (Commission.rate é snapshot).
-- Na data desta migration: 0 comissões geradas — mudança 100% prospectiva.

-- 1. Novos parceiros nascem em 3,00%.
ALTER TABLE "Partner" ALTER COLUMN "commissionRate" SET DEFAULT 3.00;

-- 2. Trilha de auditoria do backfill, uma linha por parceiro afetado, ANTES
--    do UPDATE (o filtro depende do valor antigo).
INSERT INTO "AuditLog" ("id", "actorId", "action", "entity", "entityId", "metadata", "createdAt")
SELECT
  gen_random_uuid()::text,
  (SELECT "id" FROM "User" WHERE "role" = 'ADMIN_MASTER' ORDER BY "createdAt" ASC LIMIT 1),
  'PARTNER_RATE_CHANGED',
  'Partner',
  p."id",
  jsonb_build_object(
    'from', p."commissionRate",
    'to', 3.00,
    'source', 'migration:0008_comissao_3pct',
    'reason', 'Nova condição comercial: 3,00% sobre o valor líquido liberado ao cliente'
  ),
  NOW()
FROM "Partner" p
WHERE p."commissionRate" = 2.00
  AND EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN_MASTER');

-- 3. Backfill: quem está no padrão antigo sobe para 3,00%. O filtro por 2.00
--    preserva eventuais taxas negociadas individualmente.
UPDATE "Partner" SET "commissionRate" = 3.00 WHERE "commissionRate" = 2.00;

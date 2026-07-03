-- Security Advisor do Supabase (28 Jun 2026): "Table publicly accessible —
-- rls_disabled_in_public" em TODAS as tabelas do schema public.
--
-- Contexto: este app usa o Supabase apenas como host Postgres. Todo acesso a
-- dados é server-side via Prisma (DATABASE_URL, role postgres/owner). Não há
-- supabase-js, Supabase Auth, Realtime nem Storage — portanto a Data API
-- (PostgREST) exposta com a anon key era superfície de ataque pura: qualquer
-- pessoa com a URL do projeto podia ler/editar/apagar Lead, Partner, User,
-- Commission, Contract etc.
--
-- Correção em duas camadas (nenhuma afeta o Prisma, que bypassa RLS por ser owner):
--   1. RLS habilitada em todas as tabelas, sem policies → deny-by-default para
--      os roles anon/authenticated do PostgREST.
--   2. REVOKE dos grants default do Supabase para anon/authenticated + default
--      privileges, para que tabelas futuras criadas por migrations já nasçam
--      inacessíveis pela Data API mesmo se alguém esquecer o RLS.

-- 1. RLS em todas as tabelas
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Contract" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ContractAuditEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ContractTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."IntegrationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."LeadStatusEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."RateLimitHit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Revoga acesso da Data API (roles do PostgREST) — nada legítimo usa
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Tabelas futuras (criadas pelo role postgres via migrations) já nascem sem grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

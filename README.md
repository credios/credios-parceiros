# Portal de Parceiros Credios

`parceiros.credios.com.br` — parceiros comerciais (corretores, contadores, advogados, imobiliárias, administradoras, assessores) indicam clientes, acompanham as operações em tempo real, assinam o contrato de parceria eletronicamente e acompanham suas comissões (2,00% sobre o valor líquido liberado ao cliente).

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript estrito
- **Tailwind CSS 4** com os tokens de marca da Credios (`src/app/globals.css`)
- **PostgreSQL (Supabase)** + **Prisma 6** (migrations versionadas em `prisma/migrations`)
- **Auth.js v5** (credenciais + convite por token, sessão JWT com roles ADMIN/PARTNER)
- **Resend** para email transacional (mesma conta do CRM — domínio já verificado)
- **pdf-lib** para o Assinador Credios (geração de contrato + carimbo + manifesto de auditoria)
- **Zod** em todas as entradas; deploy na **Vercel**

## Arquitetura em 1 minuto

```
parceiro ──▶ portal (este repo) ──POST /api/webhooks/lead──▶ CRM (crm.credios.com.br)
                   ▲                                              │
                   └──────── POST /api/webhooks/crm ◀─── mudança de status
```

- Banco **próprio** (projeto Supabase novo, separado do CRM — o CRM usa Drizzle/Supabase Auth; o portal usa Prisma/Auth.js).
- O portal **funciona de ponta a ponta sem o CRM conectado**: o admin atualiza status manualmente em `/admin/leads`. A integração (Fase 4) é camada de automação — ver `docs/INTEGRACAO-CRM.md`.
- Comissão é criada automaticamente quando um lead entra em `LIBERADO` com valor liberado (taxa congelada por snapshot).
- PDFs de contrato, comprovantes e NFs ficam no Postgres (colunas `Bytes`, volume baixo) e são servidos por rotas autenticadas. Migração futura para Supabase Storage documentada como evolução.

## Subindo do zero (runbook de produção)

### 1. Banco — novo projeto Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com) (região `sa-east-1`), **separado do projeto do CRM**.
2. Em *Project Settings → Database*, copie as duas connection strings:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL` (adicione `?pgbouncer=true`)
   - **Session/direct** (porta 5432) → `DIRECT_URL`
3. Point-in-time recovery: o plano Pro do Supabase tem PITR — habilite (backups são responsabilidade do Postgres gerenciado).

### 2. Configuração local

```bash
cp .env.example .env        # preencha tudo (comentários explicam cada chave)
npm install
npm run db:migrate          # aplica prisma/migrations no banco
npm run db:seed             # cria o admin (SEED_ADMIN_*) + template de contrato v1
npm run dev
```

### 3. Resend

Mesma conta do CRM — o domínio `credios.com.br` já está verificado. Basta usar a mesma `RESEND_API_KEY` e `EMAIL_FROM="Credios Parceiros <parceiros@credios.com.br>"`.

### 4. Vercel

1. Importe o repositório na Vercel (framework Next.js, sem config especial — `vercel.json` já define o cron de integrações).
2. Configure todas as variáveis do `.env.example` (exceto `SEED_*`, que são só locais).
   - `AUTH_URL=https://parceiros.credios.com.br`, `NEXT_PUBLIC_APP_URL=https://parceiros.credios.com.br`, `AUTH_TRUST_HOST=true`.
3. Em *Domains*, adicione `parceiros.credios.com.br` e crie o CNAME no DNS da Credios apontando para `cname.vercel-dns.com`.
4. O build roda `prisma generate` automaticamente (script `build`). Migrations em produção: rode `npm run db:migrate` localmente apontando para o banco de produção (mesmo fluxo do CRM), antes do primeiro deploy e a cada nova migration.

### 5. Integração com o CRM (Fase 4 — opcional para go-live)

Ver `docs/INTEGRACAO-CRM.md`: env vars dos dois lados + um único módulo a adicionar no CRM (`notifyPartnerPortal`). Enquanto não conectar, opere no modo manual.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | prisma generate + next build (rodar antes de considerar pronto) |
| `npm run db:migrate` | aplica migrations (produção: `prisma migrate deploy`) |
| `npm run db:migrate:dev` | cria/aplica migrations em dev |
| `npm run db:seed` | admin inicial + template de contrato v1 |

## Mapa do produto

| Rota | Quem | O quê |
|---|---|---|
| `/` | público | landing do programa |
| `/entrar`, `/recuperar-senha` | público | login / reset |
| `/convite/[token]` | parceiro convidado | criar senha + aceitar termos |
| `/contrato/[token]` | parceiro | leitura + OTP + assinatura eletrônica |
| `/verificar/[codigo]` | público | autenticidade de contrato assinado |
| `/app` | PARTNER | dashboard, clientes (+timeline), comissões, contrato, perfil |
| `/admin` | ADMIN | visão geral, parceiros, leads (status manual), comissões, contratos/templates, integrações |
| `/api/webhooks/crm` | CRM | status inbound |
| `/api/cron/integrations` | Vercel cron | reprocessa syncs falhos (15 em 15 min) |

## Regras de negócio críticas

- **Dedup de leads**: CPF/CNPJ com indicação ativa bloqueia novo cadastro (mensagem neutra; admin é alertado). Primeiro a cadastrar tem prioridade. `RECUSADO`/`CANCELADO` há 90+ dias pode ser re-indicado.
- **Comissão**: criada só em `LIBERADO` com o valor líquido liberado ao cliente; `líquido × taxa/100` com taxa **congelada** no momento (mudanças futuras de taxa não recalculam).
- **Isolamento**: toda query/action de `/app` verifica ownership no servidor (`requirePartnerSession` + filtro por `partnerId`).
- **Privacidade**: motivos internos de recusa nunca aparecem para o parceiro; CPF mascarado onde o dado completo não é necessário.

## Segurança

Senhas bcrypt (cost 12); tokens de convite/assinatura/reset armazenados como SHA-256 (o valor em claro só viaja no email); OTP de assinatura com 5 tentativas e expiração de 10 min; rate limiting persistente em login/convite/reset/OTP; trilha de auditoria de contrato (`ContractAuditEvent`) e de ações administrativas (`AuditLog`); webhooks autenticados por secret com comparação timing-safe.

> **Pendências jurídicas** (ver seção 14 do briefing): texto final do contrato (a v1 é minuta marcada), Termos de Uso e Política de Privacidade são placeholders estruturados para revisão.

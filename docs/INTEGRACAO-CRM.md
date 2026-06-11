# Integração Portal de Parceiros ↔ CRM Credios

Documentação operacional da integração bidirecional entre o Portal de
Parceiros (`credios-parceiros`, Prisma/Postgres) e o CRM próprio da Credios
(`credios-crm`, Drizzle/Supabase).

## 1. Arquitetura

```
┌──────────────────────────┐                          ┌──────────────────────────┐
│   PORTAL DE PARCEIROS    │                          │        CRM CREDIOS       │
│ parceiros.credios.com.br │                          │   (Next.js + Supabase)   │
│                          │                          │                          │
│ Parceiro cadastra lead   │  OUTBOUND (criação)      │                          │
│   └─ syncLeadToCrm() ────┼──── POST ───────────────►│ /api/webhooks/lead       │
│      (retry 3x+backoff)  │  x-webhook-secret        │  (webhook JÁ EXISTENTE   │
│      guarda crmLeadId ◄──┼──── { leadId } ──────────│   do site — reaproveitado│
│      crmSyncStatus       │                          │   sem mudança alguma)    │
│                          │                          │                          │
│ /api/webhooks/crm ◄──────┼──── POST ────────────────┼── notifyPartnerPortal()  │
│  applyStatusChange()     │  INBOUND (status)        │   chamado no PATCH       │
│  (timeline do parceiro,  │  x-portal-secret         │   /api/leads/[id]/status │
│   comissão no LIBERADO)  │                          │   (única mudança no CRM) │
│                          │                          │                          │
│ /api/cron/integrations   │                          │                          │
│  (15/15min: reprocessa   │                          │                          │
│   FAILED/PENDING)        │                          │                          │
└──────────────────────────┘                          └──────────────────────────┘
```

**Vínculo entre os sistemas:** o id do lead **no CRM** (uuid). O portal o
guarda em `Lead.crmLeadId` quando o outbound sucede; o CRM envia esse mesmo
id (`crmLeadId: lead.id`) no webhook inbound. O id do lead no portal também
viaja no payload outbound (`portal_lead_id`) e fica preservado no
`raw_payload` do CRM para auditoria.

**Modo manual (fallback sempre disponível):** sem `CRM_BASE_URL` +
`CRM_WEBHOOK_SECRET` configurados no portal, os leads ficam com
`crmSyncStatus = PENDING` (sem erro, sem log) e o admin do portal atualiza
status manualmente pelo painel. Quando as envs forem configuradas, o cron
reprocessa os PENDING antigos automaticamente. O webhook inbound também
aceita `portalLeadId` para leads que nunca foram sincronizados.

## 2. Variáveis de ambiente

### No portal (`credios-parceiros`)

| Variável | Valor | Observação |
| --- | --- | --- |
| `CRM_BASE_URL` | `https://crm.credios.com.br` (URL do deploy do CRM, sem barra final) | Sem ela: modo manual. |
| `CRM_WEBHOOK_SECRET` | **O mesmo valor** da env `WEBHOOK_SECRET` do CRM | É o secret que o webhook de entrada do CRM já valida (header `x-webhook-secret`). |
| `PORTAL_WEBHOOK_SECRET` | Secret novo, forte (ex.: `openssl rand -hex 32`) | Valida o header `x-portal-secret` do inbound. |
| `CRON_SECRET` | Secret novo | A Vercel injeta `Authorization: Bearer …` nas chamadas do cron automaticamente quando essa env existe. |

### No CRM (`credios-crm`)

| Variável | Valor | Observação |
| --- | --- | --- |
| `PORTAL_WEBHOOK_URL` | `https://parceiros.credios.com.br/api/webhooks/crm` | Sem ela, `notifyPartnerPortal` vira no-op (seguro). |
| `PORTAL_WEBHOOK_SECRET` | **Idêntico** ao `PORTAL_WEBHOOK_SECRET` do portal | |

## 3. Payload outbound (portal → CRM)

Formato derivado de `credios-crm/src/lib/validators/webhook.ts`
(`webhookLeadPayloadSchema`). **Todos os valores monetários em REAIS** — o
CRM converte para centavos no insert (`reaisParaCentavos`).

| Campo | Origem no portal | Nota |
| --- | --- | --- |
| `nome` | `Lead.name` | obrigatório (min 2) |
| `cpf` | `Lead.document` (só dígitos) | enviado apenas se 11 dígitos — o CRM descarta CPFs inválidos e não tem campo de CNPJ; o documento completo vai em `portal_client_document` (passthrough) |
| `whatsapp` | `Lead.phone` | obrigatório (min 8); CRM normaliza pra E.164 |
| `email`, `cidade` | `Lead.email`, `Lead.city` | `""` quando ausentes |
| `estado` | `Lead.state` | só se UF válida de 2 letras (schema exige `length(2)`) |
| `tipo_pessoa` | derivado do documento | `"Pessoa Física"` (11 díg.) / `"Pessoa Jurídica"` (14 díg.) |
| `produto` | `Lead.product` | `CGI` \| `CONDOMINIO` \| `FINANCIAMENTO` |
| `valor_credito` | `Lead.requestedAmount` | **em reais** |
| `valor_imovel` | `Lead.propertyValue` | **em reais** |
| `parceiro_nome` / `parceiro_portal_id` / `observacoes_parceiro` | `Partner.legalName` / `Partner.id` / `Lead.notes` | campos de primeira classe no CRM (migration 0029) — alimentam o card "Parceria" no detalhe do lead |
| `channel` / `source` / `paid` / `origem` | fixos | `"Referral"` / `"Portal de Parceiros"` / `false` / `"Portal de Parceiros"` |
| `portal_lead_id`, `portal_partner_id`, `portal_partner_nome`, `portal_partner_crm_ref`, `observacoes_parceiro`, `portal_property_city`, `portal_client_document` | passthrough | o schema do CRM tem `.passthrough()` — esses campos extras são preservados em `leads.raw_payload` |

> **Parceria como campo de primeira classe (migration 0029 do CRM):** a
> tabela `leads` do CRM tem `parceiro_nome`, `parceiro_portal_id` e
> `observacoes_parceiro`, exibidos no card "Parceria" do detalhe do lead
> (com link para o cadastro do parceiro no portal). `objetivo_credito`
> fica livre para o uso normal do funil. Os campos `portal_*` continuam
> indo como passthrough (preservados em `raw_payload`, auditáveis).

> **Atenção — `lead_id` é proibido no outbound:** no webhook do CRM esse
> campo é a chave do fluxo de **enriquecimento** do simulador do site
> (atualiza lead existente). O id do portal vai como `portal_lead_id`.

## 4. Mapeamento de status (CRM → portal)

Fonte: `src/lib/crm/mapping.ts` no portal. O funil do CRM (operacional, 9
status) é mais grosso que o do portal (10 status, voltado à expectativa do
parceiro) — daí o mapeamento N:1.

| Status CRM | Status portal | Justificativa |
| --- | --- | --- |
| `novo` | `RECEBIDO` | lead acabou de entrar, ninguém tocou |
| `conversa_inicial` | `EM_ANALISE` | consultor conversando = Credios analisando o perfil |
| `aguardando_resposta` | `EM_ANALISE` | micro-etapa interna; pro parceiro continua "em análise" |
| `aguardando_documentacao` | `DOCUMENTACAO` | coleta de documentos em curso |
| `documentacao_enviada` | `EM_BANCO` | docs enviados ao(s) banco(s) = proposta no banco |
| `em_negociacao` | `EM_BANCO` | negociação com bancos ainda é "proposta no banco" pro parceiro |
| `fechado` | `LIBERADO` | crédito liberado — dispara a comissão no portal |
| `desqualificado` | `RECUSADO` | operação não aprovada/inviável |
| `perdido` | `CANCELADO` | cliente desistiu / esfriou |

- **`AVALIACAO_IMOVEL`, `APROVADO` e `CONTRATACAO` não têm equivalente no
  CRM.** São refinamentos que o admin do portal pode setar manualmente sem
  conflito: o webhook só mexe no status quando o CRM transita para um status
  mapeado **diferente** do atual do lead.
- **Status custom** criados pelo admin do CRM (lá o campo é text livre)
  retornam `null` no mapeamento e são **ignorados sem erro** (`200 {ok:
  true, ignored: true}`).
- No `fechado`, o webhook carrega `valorLiberadoCentavos` (convertido para
  reais), `bancoAprovador` (vira nota no histórico) e `dataFechamento`. O
  `applyStatusChange` do portal cria a comissão com a taxa do parceiro
  congelada (idempotente — reenvio não duplica comissão).

## 5. Pré-requisito no CRM: source "Portal de Parceiros"

O CRM valida `source` em **duas camadas** — as duas precisam conhecer
"Portal de Parceiros", senão o lead é criado mas cai na quarantine de
tracking como `Unknown`:

1. **Taxonomia in-memory** (`src/lib/tracking/taxonomy.ts`):
   `validateClientClassification` só confia no source do client se ele está
   em `CANONICAL_SOURCES`. Adicionar na lista (o channel `Referral` já
   existe na taxonomia):

   ```ts
   // src/lib/tracking/taxonomy.ts — dentro de CANONICAL_SOURCES,
   // junto do bloco Direct/Indicação (ordem 90+):
   { source: "Portal de Parceiros", channel: "Referral", paid: false, color: "0A4D8C", icon: "Handshake", ordem: 92 },
   ```

2. **Tabela `tracking_sources`** (validação runtime, admin pode
   ativar/desativar): após editar a taxonomia, rodar o seed idempotente
   `pnpm tsx db/seed-tracking.ts` (lê `CANONICAL_SOURCES` e faz
   `ON CONFLICT DO NOTHING`). Alternativa: cadastrar pela UI admin em
   `/configuracoes/tracking` — mas **só a UI não basta**, porque a camada 1
   (in-memory) continuaria reclassificando o source do client.

Sem o pré-requisito a integração **não quebra**: o lead entra no CRM
normalmente (com `leadId` devolvido ao portal), apenas com origem `Unknown`
até o admin revisar a quarantine.

## 6. O código a adicionar no CRM (única mudança necessária)

Duas peças, ambas seguras (fire-and-forget, jamais bloqueiam ou quebram o
fluxo de status do CRM):

### 6.1. Novo módulo `src/lib/notifications/portal-webhook.ts`

```ts
// credios-crm/src/lib/notifications/portal-webhook.ts
//
// Notifica o Portal de Parceiros quando um lead INDICADO POR PARCEIRO muda
// de status. Fire-and-forget: falha vira console.error, nunca exceção.
//
// Vínculo: o portal guarda o id do lead DO CRM (crmLeadId). Basta enviar
// lead.id — o portal resolve o resto. Só notificamos leads cujo source é
// "Portal de Parceiros" (qualquer outro lead seria 404 no portal, ruído).
//
// Envs necessárias (sem elas, no-op silencioso):
//   PORTAL_WEBHOOK_URL    = https://parceiros.credios.com.br/api/webhooks/crm
//   PORTAL_WEBHOOK_SECRET = mesmo valor configurado no portal

import crypto from "node:crypto";

import type { leads } from "../../../db/schema";

type LeadRow = typeof leads.$inferSelect;

const PORTAL_SOURCE = "Portal de Parceiros";
const TIMEOUT_MS = 10_000;

export async function notifyPartnerPortal(
  lead: LeadRow,
  novoStatus: string,
): Promise<void> {
  try {
    const url = process.env.PORTAL_WEBHOOK_URL;
    const secret = process.env.PORTAL_WEBHOOK_SECRET;
    if (!url || !secret) return; // integração não configurada — no-op

    // Só leads vindos do portal (source canônico ou mirror legado `origem`).
    if (lead.source !== PORTAL_SOURCE && lead.origem !== PORTAL_SOURCE) return;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-portal-secret": secret,
      },
      body: JSON.stringify({
        event: "lead.status_changed",
        crmLeadId: lead.id,
        status: novoStatus,
        valorLiberadoCentavos: lead.valorLiberadoCentavos ?? undefined,
        bancoAprovador: lead.bancoAprovador ?? undefined,
        dataFechamento: lead.dataFechamento ?? undefined, // "YYYY-MM-DD"
        eventId: crypto.randomUUID(), // dedupe no portal
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(
        `[portal-webhook] portal respondeu ${res.status} para lead ${lead.id}`,
      );
    }
  } catch (err) {
    // Nunca propagar — a mudança de status do CRM não depende do portal.
    console.error("[portal-webhook] falha ao notificar portal:", err);
  }
}
```

### 6.2. Ponto de chamada: `src/app/api/leads/[id]/status/route.ts`

No handler `PATCH` (onde TODA mudança de status do CRM acontece), **depois
do update bem-sucedido** — logo após o bloco
`const [updated] = await db.update(leadsTable)...returning();` (e do insert
em `interacoes`), junto do `after()` de auditoria que já existe no fim do
handler (antes do `return NextResponse.json({ data: updated })`):

```ts
// imports (topo do arquivo — `after` já é importado de "next/server"):
import { notifyPartnerPortal } from "@/lib/notifications/portal-webhook";

// ... no fim do PATCH, antes do return:
// Notifica o Portal de Parceiros (no-op para leads que não vieram dele).
// after() garante execução pós-resposta — não adiciona latência ao CRM.
if (updated) {
  after(() => notifyPartnerPortal(updated, data.status));
}
```

Por que é seguro: roda via `after()` (pós-resposta, padrão já usado no
próprio handler para auditoria), o módulo engole qualquer erro e tem timeout
de 10s, e leads que não vieram do portal retornam antes do `fetch`. Essa é a
**única** mudança necessária no CRM.

> Nota: `updated.valorLiberadoCentavos`/`dataFechamento` já estão
> preenchidos quando `data.status === "fechado"` (o próprio PATCH grava
> esses campos antes), então o payload do fechamento sai completo.

## 7. Runbook

### Testar o outbound (portal → CRM) na mão

```bash
curl -X POST "$CRM_BASE_URL/api/webhooks/lead" \
  -H "content-type: application/json" \
  -H "x-webhook-secret: $CRM_WEBHOOK_SECRET" \
  -d '{
    "nome": "Teste Integração Portal",
    "whatsapp": "47999990000",
    "produto": "CGI",
    "valor_credito": 200000,
    "valor_imovel": 800000,
    "objetivo_credito": "Indicação via Portal de Parceiros — Parceiro: Teste (portal cktest)",
    "channel": "Referral",
    "source": "Portal de Parceiros",
    "paid": false,
    "origem": "Portal de Parceiros",
    "portal_lead_id": "cktest_lead",
    "portal_partner_id": "cktest_partner"
  }'
# Esperado: 201 { "leadId": "<uuid>", "duplicate": false, ... }
```

### Testar o inbound (CRM → portal) na mão

```bash
curl -X POST "https://parceiros.credios.com.br/api/webhooks/crm" \
  -H "content-type: application/json" \
  -H "x-portal-secret: $PORTAL_WEBHOOK_SECRET" \
  -d '{
    "event": "lead.status_changed",
    "crmLeadId": "<uuid do lead no CRM>",
    "status": "fechado",
    "valorLiberadoCentavos": 20000000,
    "bancoAprovador": "Banco XPTO",
    "dataFechamento": "2026-06-11",
    "eventId": "teste-manual-001"
  }'
# Esperado: 200 { "ok": true } — lead vai a LIBERADO e a comissão é criada.
# Reenvio do MESMO eventId: 200 { "ok": true, "duplicate": true }.
# Status custom (ex.: "follow_up_q3"): 200 { "ok": true, "ignored": true }.
```

### Testar o cron localmente

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://parceiros.credios.com.br/api/cron/integrations"
# Esperado: 200 { "ok": true, "crmSync": { "processed": n, "succeeded": n, ... } }
```

### Reprocessar falhas

- **Automático:** Vercel Cron chama `/api/cron/integrations` a cada 15 min
  (`vercel.json`) → `reprocessFailedSyncs(20)` pega leads `FAILED` e
  `PENDING` com mais de 2 min, em ordem de criação, sequencialmente.
- **Manual:** painel `/admin/integracoes` (botão de reprocesso usa a mesma
  `reprocessFailedSyncs`). Útil após corrigir env errada ou indisponibilidade
  longa do CRM.

### Observabilidade

- **`IntegrationLog`** (Prisma): toda chamada outbound (sucesso com nº de
  retries, ou falha com erro) e todo evento inbound (aplicado, ignorado,
  duplicado, lead não encontrado, erro). `direction` = `OUTBOUND` |
  `INBOUND`. Indexado por `(success, createdAt)` — filtrar `success = false`
  é a visão de pendências.
- **`Lead.crmSyncStatus`**: `PENDING` (aguardando sync / modo manual),
  `SYNCED` (vínculo `crmLeadId` preenchido), `FAILED` (esgotou retries — o
  cron continua tentando). Indexado.
- **Timeline do lead** (`LeadStatusEvent`): mudanças vindas do CRM ficam com
  `source = "CRM_WEBHOOK"`; o fechamento carrega a nota "Banco aprovador: …".

### Falhas comuns

| Sintoma | Causa provável | Ação |
| --- | --- | --- |
| Leads presos em `PENDING` | `CRM_BASE_URL`/`CRM_WEBHOOK_SECRET` ausentes | configurar envs; o cron drena a fila sozinho |
| `FAILED` com erro 401 | `CRM_WEBHOOK_SECRET` ≠ `WEBHOOK_SECRET` do CRM | igualar secrets e reprocessar |
| Lead no CRM com origem `Unknown` | source não cadastrado (seção 5) | adicionar à taxonomia + seed; resolver quarantine em `/configuracoes/tracking` |
| Inbound 401 | `PORTAL_WEBHOOK_SECRET` divergente entre os lados | igualar secrets |
| Inbound 404 `lead não encontrado` | lead criado antes da integração (sem `crmLeadId`) | reenviar com `portalLeadId`, ou vincular `crmLeadId` manualmente no banco |

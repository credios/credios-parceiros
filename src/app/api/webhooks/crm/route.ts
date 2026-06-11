import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStatusChange } from "@/lib/leads";
import { crmAdapter } from "@/lib/crm/adapter";
import { mapCrmStatus } from "@/lib/crm/mapping";

/**
 * Webhook inbound CRM → portal: mudanças de status do lead.
 *
 * Autenticação: header x-portal-secret (timing-safe, via adapter).
 * Contrato e ponto de acoplamento no CRM documentados em
 * docs/INTEGRACAO-CRM.md (módulo notifyPartnerPortal + PATCH
 * /api/leads/[id]/status do CRM).
 */

const ENDPOINT = "/api/webhooks/crm";
/** Janela de deduplicação por eventId. */
const DEDUPE_WINDOW_MS = 7 * 24 * 60 * 60_000;

const bodySchema = z
  .object({
    event: z.literal("lead.status_changed"),
    crmLeadId: z.string().min(1).optional(),
    portalLeadId: z.string().min(1).optional(),
    status: z.string().min(1),
    valorLiberadoCentavos: z.number().int().nonnegative().optional(),
    bancoAprovador: z.string().optional(),
    dataFechamento: z.string().optional(),
    eventId: z.string().optional(),
  })
  .refine((d) => d.crmLeadId || d.portalLeadId, {
    message: "Informe crmLeadId ou portalLeadId.",
  });

function asJson(value: unknown): Prisma.InputJsonValue {
  return (typeof value === "object" && value !== null
    ? value
    : { raw: String(value) }) as Prisma.InputJsonValue;
}

function logInbound(data: {
  payload: unknown;
  response?: Prisma.InputJsonValue;
  success: boolean;
  error?: string;
}) {
  return prisma.integrationLog.create({
    data: {
      direction: "INBOUND",
      endpoint: ENDPOINT,
      payload: asJson(data.payload),
      response: data.response,
      success: data.success,
      error: data.error?.slice(0, 2000),
    },
  });
}

export async function POST(req: Request) {
  const authorized = await crmAdapter.verifyWebhook(req);
  if (!authorized) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    // Idempotência por eventId: evento já processado com sucesso → 200
    // sem reprocessar (o CRM dispara fire-and-forget e pode reenviar).
    if (body.eventId) {
      const duplicate = await prisma.integrationLog.findFirst({
        where: {
          direction: "INBOUND",
          success: true,
          createdAt: { gte: new Date(Date.now() - DEDUPE_WINDOW_MS) },
          payload: { path: ["eventId"], equals: body.eventId },
        },
        select: { id: true },
      });
      if (duplicate) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    // Aceita ambos identificadores — crmLeadId é o vínculo padrão; o
    // portalLeadId cobre leads anteriores à integração (modo manual).
    const lead = await prisma.lead.findFirst({
      where: {
        OR: [
          ...(body.crmLeadId ? [{ crmLeadId: body.crmLeadId }] : []),
          ...(body.portalLeadId ? [{ id: body.portalLeadId }] : []),
        ],
      },
      select: { id: true, status: true },
    });
    if (!lead) {
      await logInbound({ payload: body, success: false, error: "lead não encontrado" });
      return NextResponse.json({ error: "lead não encontrado" }, { status: 404 });
    }

    // Status custom do CRM não mapeado → ignorado sem erro (por design).
    const mapped = mapCrmStatus(body.status);
    if (!mapped) {
      await logInbound({
        payload: body,
        response: { ignored: true, reason: `status do CRM não mapeado: ${body.status}` },
        success: true,
      });
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Mesmo status e sem dados novos de fechamento → economiza a transação
    // (applyStatusChange já seria no-op). "fechado" sempre passa porque
    // pode trazer valorLiberadoCentavos/dataFechamento atualizados.
    const isClosing = body.status === "fechado";
    if (mapped === lead.status && !isClosing) {
      await logInbound({
        payload: body,
        response: { unchanged: true, status: mapped },
        success: true,
      });
      return NextResponse.json({ ok: true });
    }

    await applyStatusChange({
      leadId: lead.id,
      to: mapped,
      source: "CRM_WEBHOOK",
      extras: isClosing
        ? {
            disbursedAmount:
              body.valorLiberadoCentavos !== undefined
                ? body.valorLiberadoCentavos / 100
                : undefined,
            disbursedAt: body.dataFechamento ? new Date(body.dataFechamento) : undefined,
            note: body.bancoAprovador
              ? `Banco aprovador: ${body.bancoAprovador}`
              : undefined,
          }
        : undefined,
    });

    await logInbound({
      payload: body,
      response: { applied: mapped, leadId: lead.id },
      success: true,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[webhook crm] erro inesperado:", err);
    await logInbound({ payload: raw, success: false, error: message }).catch(() => {
      /* best-effort — não mascarar o 500 */
    });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

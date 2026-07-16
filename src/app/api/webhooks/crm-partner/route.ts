import { NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { crmAdapter } from "@/lib/crm/adapter";
import { generateToken } from "@/lib/tokens";
import { sendInviteEmail } from "@/lib/email/templates";
import { addPartnerToAudience } from "@/lib/email/audience";

/**
 * Webhook inbound CRM → portal: HANDOFF de parceiro.
 *
 * O CRM fechou a parceria no pipeline de relacionamento e pede a criação do
 * Partner aqui (status INVITED) + envio do convite com o contrato. Espelha o
 * createPartnerAction do admin, sem sessão — autenticado pelo mesmo
 * x-portal-secret do webhook de leads.
 *
 * Regras herdadas do action:
 *   - document único (CPF 11 díg. = PF; CNPJ 14 díg. = PJ)
 *   - PJ exige representante legal → o CRM não coleta, então PJ retorna 422
 *     com instrução de criar manualmente no admin do portal
 *   - carteira: cai no primeiro ADMIN_MASTER ativo (triagem de carteira é
 *     feita depois, em /admin/equipe)
 */

const ENDPOINT = "/api/webhooks/crm-partner";

const ARCHETYPE_MAP: Record<string, string> = {
  corretor: "corretor",
  imobiliaria: "imobiliaria",
  contador: "contador",
  advogado: "advogado",
  assessor: "assessor",
  correspondente: "outro",
  outro: "outro",
};

const bodySchema = z.object({
  event: z.literal("partner.create_invite"),
  legalName: z.string().min(3),
  document: z.string().transform((v) => v.replace(/\D/g, "")),
  email: z
    .string()
    .email()
    .transform((e) => e.toLowerCase().trim()),
  phone: z.string().min(10),
  archetype: z.string().optional(),
  city: z.string().optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  notes: z.string().optional().nullable(),
  crmPartnerRef: z.string().min(1),
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
  if (!crmAdapter.verifyWebhook(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    await logInbound({
      payload,
      success: false,
      error: parsed.error.issues.map((i) => i.message).join("; "),
    });
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "payload inválido" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Idempotência natural: mesmo crmPartnerRef já vinculado → devolve o vínculo.
  const jaVinculado = await prisma.partner.findFirst({
    where: { crmPartnerRef: data.crmPartnerRef },
    select: { id: true },
  });
  if (jaVinculado) {
    await logInbound({
      payload,
      response: { partnerId: jaVinculado.id, idempotent: true },
      success: true,
    });
    return NextResponse.json({ ok: true, partnerId: jaVinculado.id });
  }

  if (data.document.length === 14) {
    await logInbound({ payload, success: false, error: "PJ via handoff não suportado" });
    return NextResponse.json(
      {
        error:
          "CNPJ detectado: parceria PJ exige representante legal — crie o parceiro direto no admin do portal.",
      },
      { status: 422 }
    );
  }
  if (data.document.length !== 11) {
    await logInbound({ payload, success: false, error: "documento inválido" });
    return NextResponse.json({ error: "CPF inválido." }, { status: 422 });
  }

  const [docExists, emailExists, master] = await Promise.all([
    prisma.partner.findUnique({ where: { document: data.document } }),
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findFirst({
      where: { role: "ADMIN_MASTER" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  if (docExists) {
    await logInbound({ payload, success: false, error: "document duplicado" });
    return NextResponse.json(
      { error: "Já existe um parceiro no portal com este CPF." },
      { status: 409 }
    );
  }
  if (emailExists) {
    await logInbound({ payload, success: false, error: "email duplicado" });
    return NextResponse.json(
      { error: "Já existe um usuário no portal com este e-mail." },
      { status: 409 }
    );
  }
  if (!master) {
    await logInbound({ payload, success: false, error: "sem ADMIN_MASTER" });
    return NextResponse.json(
      { error: "Portal sem administrador master configurado." },
      { status: 500 }
    );
  }

  const { token, hash } = generateToken();
  const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60_000);

  const partner = await prisma.$transaction(async (tx) => {
    const p = await tx.partner.create({
      data: {
        status: "INVITED",
        personType: "PF",
        legalName: data.legalName,
        document: data.document,
        email: data.email,
        phone: data.phone,
        archetype: ARCHETYPE_MAP[data.archetype ?? "outro"] ?? "outro",
        city: data.city ?? null,
        state: data.state ?? null,
        notes: data.notes ? `[via CRM] ${data.notes}` : "[via CRM]",
        crmPartnerRef: data.crmPartnerRef,
        managerId: master.id,
      },
    });
    await tx.user.create({
      data: {
        email: data.email,
        name: data.legalName,
        role: "PARTNER",
        partnerId: p.id,
        inviteToken: hash,
        inviteExpiry,
      },
    });
    return p;
  });

  await sendInviteEmail({ to: data.email, partnerName: data.legalName, token });
  after(() => addPartnerToAudience({ name: data.legalName, email: data.email }));
  await logInbound({
    payload,
    response: { partnerId: partner.id },
    success: true,
  });

  return NextResponse.json({ ok: true, partnerId: partner.id }, { status: 201 });
}

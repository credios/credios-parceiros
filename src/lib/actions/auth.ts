"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/email/templates";
import { createAndSendContract } from "@/lib/contracts/service";
import {
  loginSchema,
  acceptInviteSchema,
  requestResetSchema,
  resetPasswordSchema,
} from "@/lib/validators";

/** Estado padrão de toda server action usada com useActionState. */
export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

/** Converte issues do Zod em { campo: primeira mensagem }. */
function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase().trim();

  const allowed = await rateLimit(`login:${email}`, { max: 5, windowMinutes: 15 });
  if (!allowed) {
    return { ok: false, error: "Muitas tentativas. Aguarde 15 minutos." };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/app", // o callback authorized leva ADMIN para /admin sozinho
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          ok: false,
          error: "Email ou senha incorretos. Confira e tente de novo.",
        };
      }
      return {
        ok: false,
        error: "Não foi possível entrar agora. Tente novamente em instantes.",
      };
    }
    // Redirect do Next (login bem-sucedido) e erros inesperados sobem.
    throw error;
  }
}

export async function acceptInviteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const invalidMessage =
    "Este convite expirou ou já foi usado. Peça um novo à Credios.";

  const user = await prisma.user.findUnique({
    where: { inviteToken: hashToken(parsed.data.token) },
  });
  if (!user || !user.inviteExpiry || user.inviteExpiry <= new Date()) {
    return { ok: false, error: invalidMessage };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  // Convite de GERENTE (ADMIN): só cria a senha — sem contrato de parceria.
  if (user.role === "ADMIN" || user.role === "ADMIN_MASTER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, inviteToken: null, inviteExpiry: null },
    });
    redirect("/entrar?conta=ok");
  }

  if (user.role !== "PARTNER" || !user.partnerId) {
    return { ok: false, error: invalidMessage };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, inviteToken: null, inviteExpiry: null },
    }),
    prisma.partner.updateMany({
      where: { id: user.partnerId, status: "INVITED" },
      data: { status: "PENDING_CONTRACT" },
    }),
  ]);

  let signPath: string;
  try {
    ({ signPath } = await createAndSendContract(user.partnerId));
  } catch {
    return {
      ok: false,
      error:
        "Sua senha foi criada, mas não conseguimos gerar o contrato agora. Fale com a Credios em parceiros@credios.com.br.",
    };
  }

  redirect(signPath);
}

export async function requestPasswordResetAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = requestResetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Resposta sempre idêntica (ok: true) — não revela se o email existe.
  const allowed = await rateLimit(`reset:${email}`, { max: 3, windowMinutes: 60 });
  if (!allowed) return { ok: true };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const { token, hash } = generateToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hash,
        resetExpiry: new Date(Date.now() + 60 * 60_000), // 1 hora
      },
    });
    await sendPasswordResetEmail({ to: email, token });
  }

  return { ok: true };
}

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: toFieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { resetToken: hashToken(parsed.data.token) },
  });
  if (!user || !user.resetExpiry || user.resetExpiry <= new Date()) {
    return {
      ok: false,
      error: "Este link expirou ou já foi usado. Peça um novo em recuperar senha.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetExpiry: null },
  });

  redirect("/entrar?reset=ok");
}

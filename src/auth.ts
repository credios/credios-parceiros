import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase().trim();

        const user = await prisma.user.findUnique({
          where: { email },
          include: { partner: { select: { status: true } } },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Parceiro suspenso/inativo não entra (preserva dados, bloqueia login)
        if (
          user.role === "PARTNER" &&
          (user.partner?.status === "SUSPENDED" || user.partner?.status === "INACTIVE")
        ) {
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          partnerId: user.partnerId,
        };
      },
    }),
  ],
});

/** Sessão obrigatória de parceiro — joga erro se não for PARTNER. */
export async function requirePartnerSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PARTNER" || !session.user.partnerId) {
    throw new Error("UNAUTHORIZED");
  }
  return { userId: session.user.id, partnerId: session.user.partnerId };
}

/** Sessão obrigatória de admin — joga erro se não for ADMIN. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return { userId: session.user.id };
}

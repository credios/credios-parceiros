import type { NextAuthConfig } from "next-auth";

/**
 * Config sem dependência de Prisma — usada também no middleware (edge-safe).
 * O provider de credenciais (que toca o banco) entra apenas em src/auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/entrar",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 dias
  },
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        token.partnerId = user.partnerId ?? null;
      }
      if (trigger === "update" && session) {
        // permite atualizar claims após mudanças de perfil
        Object.assign(token, session);
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "ADMIN_MASTER" | "ADMIN" | "PARTNER";
      session.user.partnerId = (token.partnerId as string | null) ?? null;
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const user = auth?.user;

      if (pathname.startsWith("/admin")) {
        if (!user) return false; // redireciona para /entrar
        if (user.role !== "ADMIN" && user.role !== "ADMIN_MASTER")
          return Response.redirect(new URL("/app", request.nextUrl));
        return true;
      }
      if (pathname.startsWith("/app")) {
        if (!user) return false;
        if (user.role !== "PARTNER")
          return Response.redirect(new URL("/admin", request.nextUrl));
        return true;
      }
      return true;
    },
  },
  providers: [], // preenchido em src/auth.ts
} satisfies NextAuthConfig;

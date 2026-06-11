import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Proteção de /app e /admin acontece no callback `authorized` (auth.config.ts).
// Verificações de ownership e de status do parceiro são refeitas no servidor
// em cada query/action — o middleware é só a primeira barreira.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/app/:path*", "/admin/:path*"],
};

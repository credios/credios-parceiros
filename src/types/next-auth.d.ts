import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    role: "ADMIN_MASTER" | "ADMIN" | "PARTNER";
    partnerId?: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: "ADMIN_MASTER" | "ADMIN" | "PARTNER";
      partnerId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN_MASTER" | "ADMIN" | "PARTNER";
    partnerId: string | null;
  }
}

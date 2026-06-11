import type { ReactNode } from "react";
import { auth, signOut } from "@/auth";
import { AdminNav } from "./_components/admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const adminName = session?.user?.name ?? "Admin";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/entrar" });
  }

  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav adminName={adminName} signOutAction={signOutAction} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

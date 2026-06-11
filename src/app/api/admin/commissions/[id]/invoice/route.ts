import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Serve a nota fiscal anexada pelo parceiro (Bytes no banco). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ADMIN_MASTER")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  // Gerente só baixa NFs de comissões da própria carteira.
  const partnerScope =
    session.user.role === "ADMIN_MASTER" ? {} : { managerId: session.user.id };
  const commission = await prisma.commission.findFirst({
    where: { id, partner: partnerScope },
    select: { invoice: true, invoiceMime: true, invoiceName: true },
  });
  if (!commission?.invoice) {
    return new Response("Not found", { status: 404 });
  }

  const mime = commission.invoiceMime ?? "application/octet-stream";
  const filename = commission.invoiceName ?? `nf-${id}`;

  return new Response(new Uint8Array(commission.invoice), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

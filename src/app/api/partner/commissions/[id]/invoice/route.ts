import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Nota fiscal anexada pelo parceiro PJ — download autenticado com ownership. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const partnerId = session?.user?.partnerId;
  if (!session?.user || session.user.role !== "PARTNER" || !partnerId) {
    return new Response("Não autorizado", { status: 401 });
  }

  const { id } = await params;
  const commission = await prisma.commission.findFirst({
    where: { id, partnerId },
    select: { invoice: true, invoiceMime: true, invoiceName: true },
  });
  if (!commission?.invoice) {
    return new Response("Não encontrado", { status: 404 });
  }

  const filename = (commission.invoiceName ?? `nota-fiscal-${id}.pdf`).replace(
    /[^\w.\- ]/g,
    "_"
  );

  return new Response(new Uint8Array(commission.invoice), {
    headers: {
      "Content-Type": commission.invoiceMime ?? "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

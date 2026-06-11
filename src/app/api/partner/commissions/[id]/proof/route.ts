import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Comprovante de pagamento da comissão — download autenticado com ownership. */
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
    select: { paymentProof: true, paymentProofMime: true },
  });
  if (!commission?.paymentProof) {
    return new Response("Não encontrado", { status: 404 });
  }

  const mime = commission.paymentProofMime ?? "application/octet-stream";
  const ext = EXT_BY_MIME[mime] ?? "bin";

  return new Response(new Uint8Array(commission.paymentProof), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="comprovante-${id}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

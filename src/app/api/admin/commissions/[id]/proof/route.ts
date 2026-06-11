import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Serve o comprovante de pagamento da comissão (Bytes no banco). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "ADMIN_MASTER")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  // Gerente só baixa comprovantes de comissões da própria carteira.
  const partnerScope =
    session.user.role === "ADMIN_MASTER" ? {} : { managerId: session.user.id };
  const commission = await prisma.commission.findFirst({
    where: { id, partner: partnerScope },
    select: { paymentProof: true, paymentProofMime: true },
  });
  if (!commission?.paymentProof) {
    return new Response("Not found", { status: 404 });
  }

  const mime = commission.paymentProofMime ?? "application/octet-stream";
  const ext = EXT_BY_MIME[mime] ?? "bin";

  return new Response(new Uint8Array(commission.paymentProof), {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="comprovante-${id}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

/**
 * Serve o PDF do contrato no fluxo público de assinatura, localizado pelo
 * token raw do link (comparação via SHA-256). Vale enquanto o link não
 * expirou — ou indefinidamente após assinado (cópia do documento final).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const contract = await prisma.contract.findUnique({
    where: { signToken: hashToken(token) },
    select: {
      status: true,
      signTokenExp: true,
      pdfSigned: true,
      pdfUnsigned: true,
    },
  });

  if (!contract || contract.status === "CANCELLED") {
    return new Response("Não encontrado", { status: 404 });
  }
  const accessible =
    contract.status === "SIGNED" || contract.signTokenExp > new Date();
  if (!accessible) {
    return new Response("Link expirado", { status: 410 });
  }

  const bytes = contract.pdfSigned ?? contract.pdfUnsigned;
  if (!bytes) {
    return new Response("Documento indisponível", { status: 404 });
  }

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contrato-parceria-credios.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

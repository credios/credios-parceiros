import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Download autenticado do contrato: admin baixa qualquer um; parceiro baixa
 * apenas o próprio. Registra evento DOWNLOADED na trilha de auditoria.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return new Response("Não autenticado", { status: 401 });
  }

  const contract = await prisma.contract.findUnique({
    where: { id },
    select: {
      id: true,
      partnerId: true,
      pdfSigned: true,
      pdfUnsigned: true,
    },
  });
  if (!contract) {
    return new Response("Não encontrado", { status: 404 });
  }

  const isAdmin = session.user.role === "ADMIN";
  if (!isAdmin && session.user.partnerId !== contract.partnerId) {
    return new Response("Acesso negado", { status: 403 });
  }

  const bytes = contract.pdfSigned ?? contract.pdfUnsigned;
  if (!bytes) {
    return new Response("Documento indisponível", { status: 404 });
  }

  await prisma.contractAuditEvent.create({
    data: {
      contractId: contract.id,
      event: "DOWNLOADED",
      ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: req.headers.get("user-agent"),
      metadata: { userId: session.user.id, role: session.user.role },
    },
  });

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="contrato-parceria-credios.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

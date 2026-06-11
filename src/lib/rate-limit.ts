import { prisma } from "@/lib/prisma";

/**
 * Rate limiting persistente (sobrevive a cold starts da Vercel).
 * Retorna true se a ação está DENTRO do limite (permitida) e registra o hit.
 */
export async function rateLimit(
  key: string,
  opts: { max: number; windowMinutes: number }
): Promise<boolean> {
  const since = new Date(Date.now() - opts.windowMinutes * 60_000);
  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: since } },
  });
  if (count >= opts.max) return false;
  await prisma.rateLimitHit.create({ data: { key } });
  return true;
}

/** Limpa hits antigos — chamado oportunisticamente pelo cron de integrações. */
export async function pruneRateLimitHits(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
  await prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: cutoff } } });
}

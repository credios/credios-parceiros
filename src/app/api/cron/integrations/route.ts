import { NextResponse } from "next/server";
import { reprocessFailedSyncs } from "@/lib/crm/sync";
import { pruneRateLimitHits } from "@/lib/rate-limit";

/**
 * Cron de integrações (Vercel Cron, a cada 15 min — ver vercel.json):
 * - reprocessa syncs outbound FAILED/PENDING pro CRM;
 * - limpa hits antigos de rate limit (housekeeping oportunista).
 *
 * Protegido por Authorization: Bearer ${CRON_SECRET} — a Vercel injeta o
 * header automaticamente quando a env var CRON_SECRET existe no projeto.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = req.headers.get("authorization");
  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { processed, succeeded } = await reprocessFailedSyncs(20);
  await pruneRateLimitHits();

  return NextResponse.json({
    ok: true,
    crmSync: { processed, succeeded, failed: processed - succeeded },
    rateLimitPruned: true,
  });
}

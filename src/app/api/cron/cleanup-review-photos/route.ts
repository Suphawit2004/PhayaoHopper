import { createClient } from "@supabase/supabase-js";
import { cleanupAbandonedReviewPhotos } from "@/lib/cleanup-review-photos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return Response.json({ error: "Cleanup is not configured" }, { status: 503 });

  try {
    const sb = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await cleanupAbandonedReviewPhotos(sb, cutoff);
    return Response.json({ ok: true, cutoff: cutoff.toISOString(), ...result });
  } catch (error) {
    console.error("Review photo cleanup failed:", error);
    return Response.json({ error: "Review photo cleanup failed" }, { status: 500 });
  }
}

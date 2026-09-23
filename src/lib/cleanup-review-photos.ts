import type { SupabaseClient } from "@supabase/supabase-js";

const BATCH_SIZE = 1000; // Supabase Storage remove accepts at most 1000 paths per request.

export async function cleanupAbandonedReviewPhotos(sb: SupabaseClient, olderThan: Date) {
  let removedPhotos = 0;
  for (;;) {
    const { data: rows, error: readError } = await sb.from("cafe_photos")
      .select("id,path")
      .not("review_batch", "is", null)
      .is("review_id", null)
      .lt("created_at", olderThan.toISOString())
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);
    if (readError) throw new Error(`Could not read staged review photos: ${readError.message}`);
    if (!rows?.length) return { removedPhotos };

    // Keep the database rows when Storage fails; the next cron run can safely retry.
    const { error: storageError } = await sb.storage.from("cafe-community").remove(rows.map((row) => row.path as string));
    if (storageError) throw new Error(`Could not remove staged review photo files: ${storageError.message}`);

    // Recheck the staging predicates so rows linked to reviews since the read are preserved.
    const { data: deleted, error: deleteError } = await sb.from("cafe_photos").delete()
      .in("id", rows.map((row) => row.id))
      .not("review_batch", "is", null)
      .is("review_id", null)
      .lt("created_at", olderThan.toISOString())
      .select("id");
    if (deleteError) throw new Error(`Could not remove staged review photo records: ${deleteError.message}`);
    removedPhotos += deleted?.length ?? 0;
    if (rows.length < BATCH_SIZE) return { removedPhotos };
  }
}

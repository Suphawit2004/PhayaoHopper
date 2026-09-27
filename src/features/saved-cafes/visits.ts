import type { SupabaseClient } from "@supabase/supabase-js";

export interface CafeVisit { cafe_slug: string; created_at: string }

export async function removeVisit(client: SupabaseClient, userId: string, slug: string): Promise<void> {
  const { error } = await client.from("cafe_visits").delete().eq("user_id", userId).eq("cafe_slug", slug);
  if (error) throw error;
  const { data, error: readError } = await client.from("cafe_visits").select("cafe_slug")
    .eq("user_id", userId).eq("cafe_slug", slug).maybeSingle();
  if (readError || data) throw readError ?? new Error("Visit was not removed");
}

export async function loadVisits(client: SupabaseClient, userId: string): Promise<CafeVisit[]> {
  const rows: CafeVisit[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from("cafe_visits")
      .select("cafe_slug,created_at").eq("user_id", userId)
      .order("created_at", { ascending: false }).order("cafe_slug")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

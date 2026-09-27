import { CAFES, type Cafe } from "@/features/cafes/data/cafes";
import { getSupabaseServer } from "@/lib/supabase-server";
import { cache } from "react";
import { cafeFromRow } from "@/features/cafes/cafe-row";

// The static catalogue keeps the site usable until the migration is installed.
// Once the table exists it is authoritative, including an intentionally empty list.
export const getCatalog = cache(async (): Promise<Cafe[]> => {
  const sb = await getSupabaseServer();
  if (!sb) return CAFES;
  const { data, error } = await sb.from("cafes").select("*").eq("is_active", true).order("slug");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return CAFES;
    throw new Error("ไม่สามารถโหลดข้อมูลร้านได้ กรุณาลองใหม่");
  }
  return (data ?? []).map(cafeFromRow);
});

export async function getCafe(slug: string) {
  return (await getCatalog()).find(cafe => cafe.slug === slug);
}

"use server";
import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function redeemCoupon(id: string) {
  const sb = await getSupabaseServer();
  if (!sb || !(await sb.auth.getUser()).data.user) return { ok: false };
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) return { ok: false };
  const { data, error } = await sb.rpc("redeem_review_coupon", { p_id: id });
  revalidatePath("/coupons");
  return { ok: !error && data === true };
}

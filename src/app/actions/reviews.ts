"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getCafe } from "@/lib/catalog";
import { checkReviewRateLimit } from "@/lib/rate-limit-supabase";
import { resolveClientIp } from "@/lib/client-ip";
import { getSupabaseServer } from "@/lib/supabase-server";
import type { ReviewRow } from "@/lib/types";
import { revalidatePath } from "next/cache";

export type ReviewResult =
  | { ok: true; data: ReviewRow; reward: "5_baht" | "10_percent" | null }
  | { ok: false; error: string };

export async function submitReview(formData: {
  id: string;
  photoIds: string[];
  slug: string;
  name: string;
  rating: number;
  comment: string;
}): Promise<ReviewResult> {
  const sb = await getSupabaseServer();
  if (!sb) {
    return { ok: false, error: "Database not configured" };
  }
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };
  const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
  if (!uuid.test(formData.id) || !Array.isArray(formData.photoIds) || formData.photoIds.length > 5 || formData.photoIds.some(id => !uuid.test(id))) return { ok: false, error: "invalid_photos" };

  // Rate limit by client IP (Supabase-backed durable limiter)
  const hdrs = await headers();
  const ipHash = createHash("sha256")
    .update(resolveClientIp((name) => hdrs.get(name)))
    .digest("hex");
  const rl = await checkReviewRateLimit(ipHash);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const { slug, name, rating, comment } = formData;

  // Server-side validation
  const cafe = await getCafe(slug);
  if (!cafe) return { ok: false, error: "Invalid cafe" };

  const safeName = typeof name === "string" ? name.trim() : "";
  const safeComment = typeof comment === "string" ? comment.trim() : "";

  if (!safeName || safeName.length > 60) {
    return { ok: false, error: "Name must be 1-60 characters" };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Invalid rating" };
  }

  if (safeComment.length > 500) {
    return { ok: false, error: "Comment too long (max 500)" };
  }

  const { data, error } = await sb.rpc("submit_review_reward", {
    p_id: formData.id, p_slug: slug, p_name: safeName, p_rating: rating,
    p_comment: safeComment, p_photos: formData.photoIds,
  });

  if (error || !data) {
    if (error?.code === "23505" || error?.message === "already_reviewed") {
      return { ok: false, error: "already_reviewed" };
    }
    if (["visit_required", "not_authenticated", "invalid_photos"].includes(error?.message ?? "")) return { ok: false, error: error!.message };
    console.error("submitReview failed:", error);
    return { ok: false, error: "Failed to submit review" };
  }

  revalidatePath(`/cafes/${slug}`);
  revalidatePath("/profile");
  revalidatePath("/coupons");
  return { ok: true, data: data.review, reward: data.coupon?.reward ?? null };
}

export async function deleteOwnReview(id: string): Promise<{ ok: boolean }> {
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false };
  if (typeof id !== "string" || id.length !== 36) return { ok: false };

  const { data: authData } = await sb.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return { ok: false };

  // RLS "reviews_delete_own" is the backstop; the explicit eq() keeps the
  // statement scoped even if policies change later.
  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("deleteOwnReview failed:", error);
    return { ok: false };
  }
  revalidatePath("/coupons");
  revalidatePath("/profile");
  return { ok: true };
}

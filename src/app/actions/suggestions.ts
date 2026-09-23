"use server";

import { createHash, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { checkSuggestionRateLimit } from "@/lib/rate-limit-supabase";
import { resolveClientIp } from "@/lib/client-ip";
import { isSupportedCafeCoordinate } from "@/lib/cafe-coordinates";

export type SuggestionResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "not_configured" | "rate_limited" | "invalid" | "photo_too_big" | "photo_wrong_type" | "upload_failed" | "failed" };

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "gif";
}

function optionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function submitSuggestion(input: {
  name: string;
  address?: string | null;
  openTime?: string | null;
  closeTime?: string | null;
  priceRange?: number | null;
  note?: string | null;
  contact?: string | null;
  lat: number;
  lng: number;
  photo?: File | null;
}): Promise<SuggestionResult> {
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Rate limit by client IP (Supabase-backed durable limiter)
  const hdrs = await headers();
  const ipHash = createHash("sha256")
    .update(resolveClientIp((name) => hdrs.get(name)))
    .digest("hex");
  const rl = await checkSuggestionRateLimit(ipHash);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const name = input.name?.trim() ?? "";
  if (!name || name.length > 120) return { ok: false, error: "invalid" };
  if (!isSupportedCafeCoordinate(input.lat, input.lng)) {
    return { ok: false, error: "invalid" };
  }
  if (
    input.priceRange !== null &&
    input.priceRange !== undefined &&
    (!Number.isInteger(input.priceRange) || input.priceRange < 1 || input.priceRange > 2)
  ) {
    return { ok: false, error: "invalid" };
  }

  let photoUrl: string | null = null;
  let photoPath: string | null = null;

  if (input.photo && input.photo.size > 0) {
    if (!PHOTO_TYPES.has(input.photo.type)) return { ok: false, error: "photo_wrong_type" };
    if (input.photo.size > MAX_PHOTO_BYTES) return { ok: false, error: "photo_too_big" };

    photoPath = `uploads/${randomUUID()}.${extFor(input.photo.type)}`;
    const { error: upErr } = await sb.storage
      .from("cafe-suggestions")
      .upload(photoPath, input.photo, { contentType: input.photo.type });
    if (upErr) {
      console.error("photo upload failed:", upErr);
      return { ok: false, error: "upload_failed" };
    }
    const { data } = sb.storage.from("cafe-suggestions").getPublicUrl(photoPath);
    photoUrl = data.publicUrl;
  }

  const { error } = await sb.from("cafe_suggestions").insert({
    user_id: user.id,
    name,
    address: optionalText(input.address, 300),
    lat: input.lat,
    lng: input.lng,
    open_time: optionalText(input.openTime, 10),
    close_time: optionalText(input.closeTime, 10),
    price_range: input.priceRange ?? null,
    note: optionalText(input.note, 500),
    contact: optionalText(input.contact, 120),
    photo_url: photoUrl,
  });

  if (error) {
    console.error("submitSuggestion failed:", error);
    // Clean up the just-uploaded photo so no orphan is left in the bucket
    if (photoPath) await sb.storage.from("cafe-suggestions").remove([photoPath]);
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}

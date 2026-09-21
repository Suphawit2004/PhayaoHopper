"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase-server";
import { checkReportRateLimit } from "@/lib/rate-limit-supabase";
import { resolveClientIp } from "@/lib/client-ip";
import { getCafe } from "@/lib/catalog";

export type ReportResult =
  | { ok: true }
  | { ok: false; error: "not_authenticated" | "not_configured" | "rate_limited" | "invalid" | "failed" };

const FIELDS = new Set(["hours", "phone", "address", "location", "closed_days", "other"]);

function optionalText(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed.slice(0, max) : null;
}

export async function submitReport(input: {
  slug: string;
  field: string;
  message: string;
  suggestedValue?: string | null;
  contact?: string | null;
}): Promise<ReportResult> {
  const sb = await getSupabaseServer();
  if (!sb) return { ok: false, error: "not_configured" };

  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, error: "not_authenticated" };

  // Rate limit by client IP (Supabase-backed durable limiter)
  const hdrs = await headers();
  const ipHash = createHash("sha256")
    .update(resolveClientIp((name) => hdrs.get(name)))
    .digest("hex");
  const rl = await checkReportRateLimit(ipHash);
  if (!rl.allowed) {
    return { ok: false, error: "rate_limited" };
  }

  const slug = input.slug?.trim() ?? "";
  const message = input.message?.trim() ?? "";
  if (!slug || !(await getCafe(slug)) || !FIELDS.has(input.field)) {
    return { ok: false, error: "invalid" };
  }
  if (!message || message.length > 500) return { ok: false, error: "invalid" };

  const { error } = await sb.from("data_reports").insert({
    user_id: user.id,
    cafe_slug: slug,
    field: input.field,
    message,
    suggested_value: optionalText(input.suggestedValue, 300),
    contact: optionalText(input.contact, 120),
  });

  if (error) {
    console.error("submitReport failed:", error);
    return { ok: false, error: "failed" };
  }

  return { ok: true };
}

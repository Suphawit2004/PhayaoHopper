"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ReviewRow } from "@/lib/types";
import { useProfile } from "@/lib/use-profile";
import { useLang } from "@/i18n/LangProvider";
import { submitReview, deleteOwnReview } from "@/app/actions/reviews";
import { useAuth } from "./AuthProvider";
import RatingStars from "./RatingStars";

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useLang();
  return (
    <div className="flex gap-0.5 text-2xl leading-none" role="group" aria-label={t("form.rating")}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-pressed={value === n}
          aria-label={t("form.rateNStars").replaceAll("{n}", String(n))}
          onClick={() => onChange(n)}
          className={`min-h-11 min-w-11 transition hover:scale-110 ${n <= value ? "text-latte" : "text-[#a08a66]"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

interface ReviewSectionProps {
  slug: string;
  baseRating: number;
}

export default function ReviewSection({ slug, baseRating }: ReviewSectionProps) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Name field: null means "not touched" → fall back to the profile name.
  const { profile } = useProfile();
  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const nameValue = nameOverride ?? profile?.display_name ?? "";

  const configured = getSupabaseBrowser() !== null;
  const [loading, setLoading] = useState(configured);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      const sb = getSupabaseBrowser();
      if (!sb) return;
      const { data, error } = await sb
        .from("reviews")
        .select("*")
        .eq("cafe_slug", slug)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!active) return;
      if (error || !data) {
        console.error("Failed to load reviews:", error);
        setLoadError(true);
      } else {
        setReviews(data);
      }
      setLoading(false);
    })().catch(() => {
      if (!active) return;
      setLoadError(true);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [slug, retryKey]);

  function handleRetry() {
    setLoading(true);
    setLoadError(false);
    setReviews([]);
    setRetryKey((k) => k + 1);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nameValue.trim()) return;
    setSending(true);
    setNotice(null);
    const res = await submitReview({ slug, name: nameValue, rating, comment })
      .catch(() => ({ ok: false, error: "failed" } as const));
    setSending(false);
    if (!res.ok) {
      setNotice({
        ok: false,
        text:
          res.error === "rate_limited"
            ? t("reviews.rateLimited")
            : res.error === "already_reviewed"
              ? t("reviews.alreadyReviewed")
              : t("form.error"),
      });
      return;
    }
    setReviews((prev) => [res.data, ...prev].slice(0, 50));
    setComment("");
    setNotice({ ok: true, text: t("form.success") });
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("reviews.deleteConfirm"))) return;
    setDeletingId(id);
    const res = await deleteOwnReview(id).catch(() => ({ ok: false }));
    setDeletingId(null);
    if (res.ok) {
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setNotice({ ok: true, text: t("reviews.deleted") });
    } else {
      setNotice({ ok: false, text: t("form.error") });
    }
  }

  const avg = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const locale = lang === "th" ? "th-TH" : "en-GB";

  return (
    <section className="rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-espresso">💬 {t("reviews.title")}</h2>
        <span className="flex items-center gap-2">
          {avg !== null && <RatingStars value={avg} size="md" />}
          <strong className="text-sm text-coffee">{avg?.toFixed(1) ?? "—"}</strong>
          <span className="text-xs font-medium text-espresso/70">
            {t("reviews.count").replaceAll("{n}", String(reviews.length))}
          </span>
        </span>
      </div>
      {!loading && !loadError && (
        <p className="mt-1 text-xs text-espresso/70">{lang === "th" ? `คะแนนจากรีวิวล่าสุดที่แสดง ${reviews.length} รายการ (สูงสุด 50) แยกจากคะแนนตั้งต้น ${baseRating.toFixed(1)}` : `Average of the ${reviews.length} latest reviews shown (up to 50), separate from the reference rating ${baseRating.toFixed(1)}`}</p>
      )}

      {!configured && (
        <p className="mt-4 rounded-xl bg-sand px-4 py-3 text-sm text-espresso/70">
          ⚙️ {t("db.notConfigured")}
        </p>
      )}

      {loadError && (
        <div
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          <span>⚠️ {t("reviews.loadError")}</span>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            ↻ {t("reviews.retry")}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 rounded-xl bg-cream p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-espresso/70">
              {t("form.name")}
            </span>
            <input
              required
              maxLength={60}
              value={nameValue}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder={t("form.namePh")}
              className="w-full rounded-lg border border-[#e8dcc8] bg-white px-3 py-2 text-sm outline-none focus:border-latte"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-espresso/70">
              {t("form.rating")}
            </span>
            <StarPicker value={rating} onChange={setRating} />
          </label>
        </div>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-espresso/60">
            {t("form.comment")}
          </span>
          <textarea
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("form.commentPh")}
            className="w-full resize-y rounded-lg border border-[#e8dcc8] bg-white px-3 py-2 text-sm outline-none focus:border-latte"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
          {notice && (
            <span
              className={`text-sm font-medium ${notice.ok ? "text-emerald-700" : "text-rose-600"}`}
              role="status"
            >
              {notice.text}
            </span>
          )}
          <button
            type="submit"
            disabled={sending || !configured}
            className="rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? t("form.sending") : t("form.submit")}
          </button>
        </div>
      </form>

      <ul className="mt-5 space-y-3">
        {loading && <li className="text-sm text-espresso/70" role="status">{lang === "th" ? "กำลังโหลดรีวิว…" : "Loading reviews…"}</li>}
        {!loading && !loadError && reviews.length === 0 && (
          <li className="rounded-xl border border-dashed border-[#e0d3ba] px-4 py-6 text-center text-sm text-espresso/70">
            {t("reviews.none")}
          </li>
        )}
        {reviews.map((r) => (
          <li key={r.id} className="rounded-xl border border-[#eee3d2] bg-cream/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold text-espresso">{r.author_name}</span>
              <span className="flex items-center gap-2">
                <RatingStars value={r.rating} />
                <time className="text-xs text-espresso/70">
                  {new Date(r.created_at).toLocaleDateString(locale, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </time>
              </span>
            </div>
            {r.comment && (r.comment.length > 180 ? <details className="mt-2 break-words"><summary>{r.comment.slice(0, 120)}… <span className="underline">{lang === "th" ? "อ่านเพิ่มเติม" : "Read more"}</span></summary><p className="whitespace-pre-wrap">{r.comment}</p></details> : <p className="mt-2 break-words whitespace-pre-wrap">{r.comment}</p>)}
            {user && r.user_id === user.id && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={deletingId === r.id}
                  className="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  🗑 {deletingId === r.id ? t("form.sending") : t("reviews.delete")}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

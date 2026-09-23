"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ReviewRow } from "@/lib/types";
import { useProfile } from "@/lib/use-profile";
import { useLang } from "@/i18n/LangProvider";
import { submitReview, deleteOwnReview } from "@/app/actions/reviews";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { listReviewPhotos, type CommunityPhoto } from "@/app/actions/photos";
import { stageReviewPhoto, discardReviewPhotos } from "@/app/actions/review-photos";
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

export default function ReviewSection(props: ReviewSectionProps) {
  const { user, loading } = useAuth();
  return <ReviewContent key={`${props.slug}:${user?.id ?? "guest"}`} {...props} authLoading={loading} />;
}
function ReviewContent({ slug, baseRating, authLoading }: ReviewSectionProps & { authLoading: boolean }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const router = useRouter();
  const th = lang === "th";
  const [visited, setVisited] = useState<boolean | null>(null);
  const [visitError, setVisitError] = useState(false);
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [uploadFailed, setUploadFailed] = useState(false);
  const [progress, setProgress] = useState("");
  const batch = useRef<string | null>(null);
  const staged = useRef<string[]>([]);
  const sendingRef = useRef(false);
  useEffect(() => () => previews.forEach(url => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) return;
      try {
        const sb = getSupabaseBrowser();
        if (!sb) throw Error();
        const {data,error} = await sb.from("cafe_visits").select("cafe_slug").eq("user_id",user.id).eq("cafe_slug",slug).maybeSingle();
        if (error) throw error;
        if (active) { setVisited(!!data); setVisitError(false); }
      } catch { if(active) setVisitError(true); }
    };
    void load(); window.addEventListener("cafe-visit-changed", load);
    return () => { active=false; window.removeEventListener("cafe-visit-changed", load); };
  }, [user,slug]);
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

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try { const result = await listReviewPhotos(slug, reviews.map(r => r.id)); if(active) setPhotos(result.photos); } catch { /* Keep visible photos during a temporary network failure. */ }
    };
    void refresh(); const timer = window.setInterval(refresh, 45000);
    window.addEventListener("focus", refresh); window.addEventListener("cafe-photos-changed", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); window.removeEventListener("cafe-photos-changed", refresh); };
  }, [slug, reviews]);

  function handleRetry() {
    setLoading(true);
    setLoadError(false);
    setReviews([]);
    setRetryKey((k) => k + 1);
  }

  async function sendReview(withoutPhotos = false) {
    if (!nameValue.trim() || !user || !visited || sendingRef.current) return;
    sendingRef.current = true; setSending(true); setNotice(null); setUploadFailed(false);
    batch.current ??= crypto.randomUUID(); setLocked(true);
    try {
      if (withoutPhotos) {
        await discardReviewPhotos(batch.current);
        staged.current = []; setFiles([]); setPreviews([]);
      } else {
        for(let i=staged.current.length;i<files.length;i++) {
          setProgress(th ? `กำลังอัปโหลดรูป ${i+1}/${files.length}` : `Uploading photo ${i+1}/${files.length}`);
          const form = new FormData(); form.set("photo",files[i]); form.set("slug",slug); form.set("batch",batch.current);
          let photo;
          try { photo = await stageReviewPhoto(form); } catch { photo = {error: th ? "อัปโหลดไม่สำเร็จ กรุณาลองใหม่" : "Upload failed. Please retry."}; }
          if(!photo.id) { setUploadFailed(true); setNotice({ok:false,text:photo.error ?? "Upload failed"}); return; }
          staged.current.push(photo.id);
        }
      }
      setProgress(th ? "กำลังบันทึกรีวิวและคูปอง…" : "Saving review and coupon…");
      const res = await submitReview({id:batch.current,photoIds:staged.current,slug,name:nameValue,rating,comment});
      if(!res.ok) {
        const errors: Record<string,string> = {
          rate_limited:t("reviews.rateLimited"), already_reviewed:t("reviews.alreadyReviewed"),
          not_authenticated:th?"กรุณาเข้าสู่ระบบอีกครั้ง":"Please sign in again.",
          visit_required:th?"กรุณาบันทึกว่าเคยไปร้านนี้ก่อนรีวิว":"Mark this cafe as visited before reviewing.",
          invalid_photos:th?"รูปไม่ครบหรือไม่ถูกต้อง กรุณาลองใหม่ หรือเลือกส่งโดยไม่มีรูป":"Invalid or incomplete photos. Retry or choose to send without photos."
        };
        if(res.error==="invalid_photos") setUploadFailed(true);
        setNotice({ok:false,text:errors[res.error] ?? t("form.error")}); return;
      }
      setReviews(prev=>[res.data,...prev.filter(r=>r.id!==res.data.id)].slice(0,50));
      setComment(""); setFiles([]); staged.current=[]; batch.current=null; setLocked(false); setPreviews([]);
      setNotice({ok:true,text:res.reward ? (th ? `บันทึกแล้ว ได้รับคูปองทดลอง ${res.reward==="10_percent"?"10%":"5 บาท"} อายุ 30 วัน` : `Saved. Your 30-day demo ${res.reward==="10_percent"?"10%":"฿5"} coupon is ready.`) : (th?"บันทึกรีวิวแล้ว บัญชีนี้เคยรับรางวัลร้านนี้แล้ว จึงไม่ออกคูปองใหม่":"Review saved. This account has already received this cafe’s reward.")});
      router.refresh();
      window.dispatchEvent(new Event("cafe-photos-changed"));
    } catch { setNotice({ok:false,text:th?"ยังยืนยันผลไม่ได้ กดส่งอีกครั้งได้โดยไม่รับคูปองซ้ำ":"Could not confirm the result. Retry safely without duplicate coupons."}); }
    finally { sendingRef.current=false; setSending(false); setProgress(""); }
  }
  async function handleSubmit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); await sendReview(); }
  async function chooseFiles(selected: File[]) {
    if(selected.length>5 || selected.some(f=>!f.size||f.size>5242880||!["image/jpeg","image/png","image/webp"].includes(f.type))) {
      setNotice({ok:false,text:th?"เลือกไม่เกิน 5 รูป JPG/PNG/WebP ไม่เกิน 5 MB ต่อรูป":"Choose up to 5 JPG/PNG/WebP images, at most 5 MB each."}); return;
    }
    // Draft selection is locked once submission starts, making retries idempotent.
    setFiles(selected); setPreviews(selected.map(file => URL.createObjectURL(file))); setUploadFailed(false); setNotice(null);
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t("reviews.deleteConfirm") + (th ? " คูปองที่ยังไม่ใช้จะถูกยกเลิก และไม่สามารถรับรางวัลใหม่ได้" : " Unused coupons will be cancelled. No new reward can be earned."))) return;
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
    <section className="review-panel rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
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

      {notice && <div role="status" className={`review-notice mt-4 text-sm ${notice.ok ? "review-notice-success" : "review-notice-error"}`}>{notice.text}{notice.ok && <Link className="ml-3 underline" href="/coupons">{th ? "คูปองของฉัน →" : "My coupons →"}</Link>}</div>}
      {authLoading ? <p role="status" className="mt-5">…</p> : !user ? <div className="mt-5 border-y border-[#d8c9b7] py-5"><p>{th ? "เข้าสู่ระบบและอัปโหลดรูปจากร้านนี้ก่อนแบ่งปันรีวิว" : "Sign in and upload a photo from this cafe before reviewing."}</p><Link className="ui-secondary mt-3" href={`/login?next=${encodeURIComponent(`/cafes/${slug}`)}`}>{th ? "เข้าสู่ระบบเพื่อรีวิว" : "Sign in to review"}</Link></div> : reviews.some(r=>r.user_id===user.id) ? <p className="mt-5">{th ? "คุณรีวิวร้านนี้แล้ว" : "You have reviewed this cafe."}</p> : visitError ? <button className="ui-secondary mt-5" onClick={()=>window.dispatchEvent(new Event("cafe-visit-changed"))}>{th ? "ตรวจประวัติไม่สำเร็จ · ลองใหม่" : "Could not check visit · Retry"}</button> : visited === null ? <p role="status" className="mt-5">{th?"กำลังตรวจประวัติ…":"Checking visit…"}</p> : !visited ? <p className="mt-5 border-y border-[#d8c9b7] py-5">{th ? "อัปโหลดรูปจากร้านนี้ที่ด้านบนก่อน จึงจะเขียนรีวิวได้" : "Upload a photo from this cafe above before writing a review."}</p> : <form onSubmit={handleSubmit} className="mt-5 rounded-xl bg-cream p-4">
        <fieldset disabled={sending || locked} className="contents"><div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
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
        <label className="mt-4 block text-sm font-semibold">{th ? "รูปประกอบรีวิว (ไม่เกิน 5 รูป)" : "Review photos (up to 5)"}<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-sm" onChange={e=>{void chooseFiles(Array.from(e.target.files ?? []));e.target.value="";}} /></label>
        <p className="mt-2 text-sm">{th ? "JPG/PNG/WebP ไม่เกิน 5 MB ต่อรูป รูปแนบเป็นสาธารณะ แสดงในรีวิว หน้าร้าน และแกลเลอรีของคุณ" : "JPG/PNG/WebP, max 5 MB each. Attached photos are public in your review, cafe gallery and your photo gallery."}</p>
        {previews.length>0 && <div className="mt-3 flex flex-wrap gap-2">{previews.map((url,i)=><Image unoptimized key={url} src={url} alt={`${th?"รูปแนบ":"Attachment"} ${i+1}`} width={96} height={96} className="h-24 w-24 rounded-lg object-cover" />)}<button type="button" className="ui-secondary" onClick={()=>void chooseFiles([])}>{th?"เอารูปออก":"Remove photos"}</button></div>}
        </fieldset>
        <p className="mt-4 text-sm font-semibold">{th ? `คูปองทดลอง ${files.length>=3?"10%":"5 บาท"} · อายุ 30 วัน · รับได้ครั้งเดียวต่อบัญชีต่อร้าน · ใช้แลกส่วนลดจริงไม่ได้` : `Demo ${files.length>=3?"10%":"฿5"} coupon · 30 days · One reward per account per cafe · No real discount`}</p>
        <p role="status" className="mt-2 text-sm">{progress}</p>
        {uploadFailed && <div className="mt-3 text-sm"><p>{th?"รูปยังไม่ครบ รีวิวจึงยังไม่ถูกส่ง เลือกลองส่งใหม่ หรือส่งโดยไม่มีรูปเพื่อรับคูปอง 5 บาท":"Photos are incomplete; review has not been submitted. Retry, or explicitly send without photos for a ฿5 coupon."}</p><button type="button" disabled={sending} className="ui-secondary mt-2" onClick={()=>void sendReview(true)}>{th?"ส่งรีวิวโดยไม่มีรูป":"Send review without photos"}</button></div>}
        <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
          <button
            type="submit"
            disabled={sending || !configured}
            className="rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? t("form.sending") : t("form.submit")}
          </button>
        </div>
      </form>}

      <ul className="review-list mt-5 space-y-3">
        {loading && <li className="text-sm text-espresso/70" role="status">{lang === "th" ? "กำลังโหลดรีวิว…" : "Loading reviews…"}</li>}
        {!loading && !loadError && reviews.length === 0 && (
          <li className="rounded-xl border border-dashed border-[#e0d3ba] px-4 py-6 text-center text-sm text-espresso/70">
            {t("reviews.none")}
          </li>
        )}
        {reviews.map((r) => (
          <li key={r.id} className="review-item rounded-xl border border-[#eee3d2] bg-cream/50 p-4">
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
            {photos.some(p=>p.review_id===r.id) && <div className="mt-3 flex flex-wrap gap-2">{photos.filter(p=>p.review_id===r.id).map((p,i)=><a key={p.id} href={p.url} target="_blank" rel="noreferrer"><Image unoptimized src={p.url} width={128} height={128} alt={`${th?"รูปรีวิวโดย":"Review photo by"} ${r.author_name} ${i+1}`} className="h-28 w-28 rounded-lg object-cover" /></a>)}</div>}
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

"use client";
import Icon from "./Icon";
import {useUi} from "@/i18n/UiText";
import { useCatalog } from "@/components/CatalogProvider";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/components/FavoritesProvider";
import { useProfile } from "@/lib/use-profile";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type { ReviewRow } from "@/lib/types";
import { deleteOwnReview } from "@/app/actions/reviews";
import { useLang } from "@/i18n/LangProvider";
import RatingStars from "./RatingStars";
import { MyPhotos } from "./CafeCommunity";
import PasswordSettings from "./PasswordSettings";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

function extFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  return "webp";
}

function avatarPathFromUrl(url: string): string | null {
  const marker = "/object/public/avatars/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length).split("?")[0];
}

export default function ProfileView() {
  const ui=useUi();
  const CAFES = useCatalog();
  const { t, tr, lang } = useLang();
  const { user, loading, signOut, isOwner, isAdmin } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { slugs } = useFavorites();

  // Name form: null means "not touched" → derive from profile / email prefix.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const displayName = nameDraft ?? profile?.display_name ?? user?.email?.split("@")[0] ?? "";

  const [reviewError,setReviewError] = useState(false);
  const [reviewRetry,setReviewRetry] = useState(0);
  const [myReviews, setMyReviews] = useState<{ userId: string; rows: ReviewRow[] } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const userId = user.id;
    let cancelled = false;
    Promise.resolve(supabase
      .from("reviews")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50))
      .then(({ data, error }) => {
        if (!cancelled) {setReviewError(!!error); if(!error) setMyReviews({ userId, rows: data ?? [] });}
      }).catch(()=>{if(!cancelled)setReviewError(true);});
    return () => {
      cancelled = true;
    };
  }, [user,reviewRetry]);

  // null ⇒ still loading for this user.
  const myReviewRows = user && myReviews?.userId === user.id ? myReviews.rows : null;

  const [avatarState, setAvatarState] = useState<
    "idle" | "uploading" | "tooBig" | "wrongType" | "error"
  >("idle");

  async function replaceAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarState("idle");
    if (!AVATAR_TYPES.includes(file.type)) {
      setAvatarState("wrongType");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarState("tooBig");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase || !user) return;

    setAvatarState("uploading");
    try {
    const oldPath = profile?.avatar_url ? avatarPathFromUrl(profile.avatar_url) : null;
    const path = `${user.id}/${crypto.randomUUID()}.${extFor(file.type)}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type });
    if (error) {
      console.error("avatar upload failed:", error);
      setAvatarState("error");
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const ok = await updateProfile({
      avatar_url: `${data.publicUrl}?v=${Date.now()}`,
    });
    if (ok && oldPath && oldPath !== path) {
      // Best effort cleanup of the replaced avatar.
      await supabase.storage.from("avatars").remove([oldPath]);
    }
    if (!ok) await supabase.storage.from("avatars").remove([path]);
    setAvatarState(ok ? "idle" : "error");
    } catch { setAvatarState("error"); }
  }

  async function removeAvatar() {
    const supabase = getSupabaseBrowser();
    if (!supabase || !profile?.avatar_url) return;
    setAvatarState("uploading");
    try {
      const oldPath = avatarPathFromUrl(profile.avatar_url);
      const ok = await updateProfile({ avatar_url: null });
      if (ok && oldPath) await supabase.storage.from("avatars").remove([oldPath]);
      setAvatarState(ok ? "idle" : "error");
    } catch { setAvatarState("error"); }
  }

  async function handleDeleteReview(id: string) {
    if (!window.confirm(t("reviews.deleteConfirm"))) return;
    setDeletingId(id);
    setAccountError("");
    try {
    const res = await deleteOwnReview(id);
    if (res.ok) {
      setMyReviews((prev) => (prev ? { ...prev, rows: prev.rows.filter((r) => r.id !== id) } : prev));
    } else { setAccountError(t("form.error")); }
    } catch { setAccountError(t("form.error")); } finally { setDeletingId(null); }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-espresso/60" role="status">{lang==="th"?ui("กำลังโหลดโปรไฟล์…"):"Loading profile…"}</div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-lg font-semibold text-espresso/80">🔒 {t("profile.notSignedIn")}</h1>
        <Link
          href="/login?next=/profile"
          className="mt-5 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          {t("profile.signInCta")}
        </Link>
      </div>
    );
  }

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name || name.length > 60) return;
    setSaveState("saving");
    const ok = await updateProfile({ display_name: name });
    setSaveState(ok ? "saved" : "error");
  };
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-center text-2xl font-bold text-espresso">👤 {t("profile.title")}</h1>

      <nav className="profile-sections" aria-label={lang==="th"?ui("ส่วนต่าง ๆ ของโปรไฟล์"):"Profile sections"}><a href="#account">{lang==="th"?ui("บัญชี"):"Account"}</a><a href="#my-photos">{lang==="th"?ui("รูปที่โพสต์"):"My photos"}</a><a href="#my-reviews">{t("profile.myReviews")}</a><a href="#security">{lang==="th"?ui("ความปลอดภัย"):"Security"}</a></nav>
      {/* Account */}
      <div id="account" className="mt-8 flex flex-col gap-5 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="group relative cursor-pointer rounded-full focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-coffee">
            <input
              type="file"
              accept={AVATAR_TYPES.join(",")}
              disabled={avatarState === "uploading"}
              aria-label={lang === "en" ? "Upload profile photo" : ui("อัปโหลดรูปโปรไฟล์")}
              className="sr-only"
              onChange={(e) => {
                replaceAvatar(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <span className="block text-sm font-semibold mb-2">{lang==="th"?ui("เปลี่ยนรูป"):"Change photo"}</span>
            {profile?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={profile.avatar_url}
                alt=""
                className="size-16 rounded-full border border-[#e8dcc8] object-cover"
              />
            ) : (
              <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-[#d9c9ac] bg-sand/40 text-2xl transition group-hover:bg-sand/70">
                📷
              </span>
            )}
            {avatarState === "uploading" && (
              <span className="absolute inset-0 grid place-items-center rounded-full bg-espresso/40 text-xs font-bold text-white">
                ⏳
              </span>
            )}
          </label>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-espresso/60">
              {t("profile.email")}
            </span>
            <p className="truncate text-sm font-medium text-espresso">{user.email}</p>
          </div>
          {profile?.avatar_url && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={avatarState === "uploading"}
              aria-label={t("profile.avatarRemove")}
              className="self-start rounded-lg p-1 text-sm leading-none text-espresso/50 transition hover:bg-sand hover:text-espresso"
            >
              ✕
            </button>
          )}
        </div>
        <p className="text-sm">{lang==="th"?ui("รูปโปรไฟล์: JPG, PNG หรือ WebP ไม่เกิน 5 MB"):"Profile photo: JPG, PNG or WebP, up to 5 MB"}</p>
        {(avatarState === "wrongType" || avatarState === "tooBig" || avatarState === "error") && (
          <p className="-mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            ⚠️{" "}
            {avatarState === "tooBig"
              ? t("profile.avatarTooBig")
              : avatarState === "wrongType"
                ? t("profile.avatarTypeError")
                : t("form.error")}
          </p>
        )}

        <form onSubmit={saveProfile} className="flex flex-col gap-2">
          <label htmlFor="display-name" className="block text-sm font-semibold text-espresso">
            {t("profile.displayName")}
          </label>
          <input
            id="display-name"
            type="text"
            required
            maxLength={60}
            value={displayName}
            onChange={(e) => {
              setNameDraft(e.target.value);
              setSaveState("idle");
            }}
            className="w-full rounded-xl border border-[#e8dcc8] bg-sand/40 px-4 py-3 text-sm outline-none transition focus:border-latte focus:bg-white"
          />
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="mt-1 self-start rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37] disabled:opacity-60"
          >
            {saveState === "saving"
              ? `⏳ ${t("profile.saving")}`
              : saveState === "saved"
                ? `✓ ${t("profile.saved")}`
                : t("profile.save")}
          </button>
          <p role="status" className={saveState==="error"?"text-rose-700":"text-emerald-800"}>{saveState==="saved"?t("profile.saved"):saveState==="error"?t("form.error"):""}</p>
        </form>

        <hr className="border-[#eee3d2]" />

        <button
          type="button"
          onClick={async () => { try { await signOut(); } catch { setAccountError(t("form.error")); } }}
          className="self-start rounded-full border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
        >
          <Icon name="logout" /> {t("profile.signOut")}
        </button>
      </div>

      {accountError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{accountError}</p>}
      <nav aria-label={ui("บริการสำหรับสมาชิก")} className="mt-6 flex flex-wrap gap-3">
        <Link href="/membership" className="feature-button">{ui("บัตรสมาชิก")}</Link>
        {isOwner && <Link href="/owner" className="rounded-xl border border-[#d9c9ac] px-5 py-3">{ui("จัดการร้านของคุณ")}</Link>}
        {isAdmin && <Link href="/admin" className="rounded-xl border border-[#d9c9ac] px-5 py-3">{ui("สำหรับผู้ดูแลระบบ")}</Link>}
      </nav>
      <div id="my-photos"><MyPhotos /></div>
      <details className="feature-card" id="security"><summary className="font-semibold">{lang==="th"?ui("รหัสผ่านและความปลอดภัย"):"Password and security"}</summary><PasswordSettings /></details>
      {/* Favorites summary */}
      <section className="mt-6 flex items-center justify-between rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-espresso">❤️ {t("profile.favoritesTitle")}</h2>
          <p className="mt-0.5 text-sm text-espresso/70">
            {t("cafes.found").replaceAll("{n}", String(slugs.length))}
          </p>
        </div>
        <Link
          href="/favorites"
          className="rounded-full bg-coffee px-5 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]"
        >
          {t("profile.goToFavorites")} →
        </Link>
      </section>

      {/* My reviews */}
      <section id="my-reviews" className="mt-6 rounded-2xl border border-[#eee3d2] bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold text-espresso">💬 {t("profile.myReviews")}</h2>
        {reviewError ? <div role="alert"><p>{t("reviews.loadError")}</p><button className="ui-secondary" onClick={()=>{setReviewError(false);setReviewRetry(n=>n+1);}}>{t("reviews.retry")}</button></div> : myReviewRows === null ? (
          <p className="mt-3 text-sm text-espresso/60" role="status">{lang==="th"?ui("กำลังโหลดรีวิวของคุณ…"):"Loading your reviews…"}</p>
        ) : myReviewRows.length === 0 ? (
          <p className="mt-3 text-sm text-espresso/60">{t("profile.myReviewsEmpty")}</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {myReviewRows.map((r) => {
              const cafe = CAFES.find((c) => c.slug === r.cafe_slug);
              return (
                <li key={r.id} className="rounded-xl border border-[#eee3d2] bg-cream/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/cafes/${r.cafe_slug}`}
                      className="text-sm font-bold text-espresso hover:text-coffee hover:underline"
                    >
                      {cafe ? tr(cafe.name) : r.cafe_slug}
                    </Link>
                    <span className="flex items-center gap-2">
                      <RatingStars value={r.rating} />
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(r.id)}
                        disabled={deletingId === r.id}
                        aria-label={t("reviews.delete")}
                        className="rounded-full p-1 text-xs text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        {deletingId === r.id ? "⏳" : "🗑"}
                      </button>
                    </span>
                  </div>
                  {r.comment && <p className="mt-1 text-sm text-espresso/80">{r.comment}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

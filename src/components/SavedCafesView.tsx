"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useCatalog } from "./CatalogProvider";
import { useFavorites } from "./FavoritesProvider";
import { useLang } from "@/i18n/LangProvider";
import type { CafeVisit } from "@/lib/visits";
import CafeCard from "./CafeCard";
import Icon from "./Icon";

export type SavedCafeList = "visited" | "wanted" | "favorite";

const listPaths: Record<SavedCafeList, string> = {
  visited: "/visited",
  wanted: "/favorites",
  favorite: "/favorite-cafes",
};

export default function SavedCafesView({ list }: { list: SavedCafeList }) {
  const cafes = useCatalog();
  const { user, loading } = useAuth();
  const { lang, t } = useLang();
  const { slugs, wantedSlugs, wantedReady, visits, visitsError, retryVisits } = useFavorites();
  const th = lang === "th";
  const favoriteSet = new Set(slugs);
  const visitedOnly = (visits ?? []).filter(row => !favoriteSet.has(row.cafe_slug));
  const favoriteVisited = (visits ?? []).filter(row => favoriteSet.has(row.cafe_slug));
  const wanted = wantedSlugs.map(slug => cafes.find(cafe => cafe.slug === slug))
    .filter((cafe): cafe is (typeof cafes)[number] => Boolean(cafe));
  const labels = {
    visited: th ? "ร้านที่เคยไป" : "Visited cafes",
    wanted: th ? "ร้านที่อยากไป" : "Want to visit",
    favorite: th ? "ร้านโปรด" : "Favorites",
  };
  const descriptions = {
    visited: th ? "ร้านที่เคยไปแล้ว แต่ยังไม่ได้กดหัวใจ" : "Cafes you visited but have not heart-saved",
    wanted: th ? "ร้านที่กดใจไว้และยังไม่เคยไป" : "Heart-saved cafes you have not visited yet",
    favorite: th ? "ร้านที่เคยไปแล้วและกดหัวใจไว้" : "Cafes you visited and heart-saved",
  };
  const counts = { visited: visitedOnly.length, wanted: wanted.length, favorite: favoriteVisited.length };
  const rows = list === "visited" ? visitedOnly : favoriteVisited;
  const ready = !loading && wantedReady;

  const renderVisit = (row: CafeVisit) => {
    const cafe = cafes.find(item => item.slug === row.cafe_slug);
    return <div key={row.cafe_slug} className="visited-cafe-entry min-w-0">
      {cafe ? <CafeCard cafe={cafe} /> : <div className="rounded-xl border border-[#ddd6c7] p-5"><p className="font-semibold">{th ? "ร้านนี้ไม่เปิดให้เข้าชมแล้ว" : "This cafe is no longer available"}</p><p className="mt-2 break-words text-sm">{row.cafe_slug}</p></div>}
      <p className="mt-2 text-xs text-espresso/60">{th ? "บันทึกเมื่อ " : "Saved on "}<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })}</time></p>
    </div>;
  };

  const emptyHint = list === "visited"
    ? (favoriteVisited.length
      ? <>{th ? "ร้านที่เคยไปและกดใจอยู่ใน" : "Heart-saved visited cafes are in "}<Link href={listPaths.favorite} className="font-semibold underline underline-offset-2">{labels.favorite}</Link></>
      : (th ? "อัปโหลดรูปจากร้านที่เคยไปเพื่อบันทึกไว้ที่นี่" : "Upload a cafe photo to record your visit here."))
    : list === "wanted"
      ? (favoriteVisited.length
        ? <>{th ? "ร้านที่กดใจไว้และเคยไปแล้วอยู่ใน" : "Heart-saved visited cafes are in "}<Link href={listPaths.favorite} className="font-semibold underline underline-offset-2">{labels.favorite}</Link></>
        : t("fav.emptyHint"))
      : (th ? "กดหัวใจร้านที่เคยไปเพื่อเพิ่มเป็นร้านโปรด" : "Heart a visited cafe to add it to Favorites.");

  return <div className="mx-auto max-w-6xl px-4 py-10">
    <header className="mb-6">
      <h1 className="flex items-center gap-3 text-3xl font-bold text-espresso"><Icon name={list === "visited" ? "check" : "heart"} width={30} height={30} className="text-coffee" />{labels[list]}</h1>
      <p className="mt-1 text-espresso/70">{descriptions[list]}{ready && <> · {t("cafes.found").replaceAll("{n}", String(counts[list]))}</>}</p>
    </header>

    <nav className="my-cafes-tabs mb-7" aria-label={th ? "หมวดคาเฟ่ที่บันทึกไว้" : "Saved cafe lists"}>
      {(["visited", "wanted", "favorite"] as const).map(kind => <Link key={kind} href={listPaths[kind]} aria-current={kind === list ? "page" : undefined}>
        {labels[kind]}{ready && <span>{counts[kind]}</span>}
      </Link>)}
    </nav>

    {!user && list === "wanted" && ready && slugs.length > 0 && <p className="mb-5 rounded-xl bg-sand/60 px-4 py-3 text-sm text-espresso/80">
      {t("fav.guestNote")} <Link href="/login?next=/favorites" className="font-semibold text-coffee underline underline-offset-2">{t("profile.signInCta")}</Link>
    </p>}

    {!loading && !user && list !== "wanted" ? <div className="rounded-2xl border border-dashed border-[#d9c9ac] bg-white/60 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-espresso/80">{th ? "เข้าสู่ระบบเพื่อดูรายการนี้" : "Sign in to view this list"}</p>
      <Link href={`/login?next=${encodeURIComponent(listPaths[list])}`} className="ui-secondary mt-5 inline-block">{th ? "เข้าสู่ระบบ" : "Sign in"}</Link>
    </div> : visitsError ? <div role="alert" className="rounded-xl border border-[#d9c9ac] bg-white/60 px-6 py-8 text-center">
      <p>{th ? "โหลดประวัติร้านที่เคยไปไม่สำเร็จ" : "Could not load your visited cafes."}</p>
      <button type="button" className="ui-secondary mt-4" onClick={retryVisits}>{th ? "ลองอีกครั้ง" : "Retry"}</button>
    </div> : !ready ? <div role="status" className="py-24 text-center text-sm text-espresso/60">{th ? "กำลังโหลดรายการ…" : "Loading cafes…"}</div>
      : counts[list] === 0 ? <div className="rounded-2xl border border-dashed border-[#d9c9ac] bg-white/60 px-6 py-16 text-center">
        <p className="text-lg font-semibold text-espresso/80">{th ? `ยังไม่มี${labels[list]}` : `No ${labels[list].toLowerCase()} yet`}</p>
        <p className="mt-1 text-sm text-espresso/70">{emptyHint}</p>
        <Link href={list === "favorite" ? listPaths.visited : "/cafes"} className="mt-5 inline-block rounded-full bg-coffee px-6 py-2.5 text-sm font-semibold text-cream transition hover:bg-[#684a37]">
          {list === "favorite" ? (th ? "ดูร้านที่เคยไป" : "View visited cafes") : t("fav.explore")} →
        </Link>
      </div> : <section aria-label={labels[list]} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list === "wanted" ? wanted.map(cafe => <CafeCard key={cafe.slug} cafe={cafe} />) : rows.map(renderVisit)}
      </section>}
  </div>;
}

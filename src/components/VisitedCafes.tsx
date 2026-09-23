"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import { useFavorites } from "./FavoritesProvider";
import type { CafeVisit } from "@/lib/visits";
import CafeCard from "./CafeCard";

export default function VisitedCafes({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const th = lang === "th";
  return <section id="visited" className={compact ? "feature-card" : "mx-auto max-w-6xl px-4 py-10"}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {compact ? <h2 className="text-xl font-bold">{th ? "ร้านของฉัน" : "My cafes"}</h2> : <h1 className="text-3xl font-bold">{th ? "ร้านของฉัน" : "My cafes"}</h1>}
      {compact && <Link className="text-sm font-semibold underline underline-offset-4" href="/visited">{th ? "ดูทั้งหมด" : "View all"} →</Link>}
    </div>
    <p className="mb-5 text-sm text-espresso/65">{th ? "แยกร้านที่เคยไป ร้านที่อยากไป และร้านโปรดตามการกดหัวใจของคุณ" : "Your visited, want-to-visit, and favorite cafes are organized by your visits and hearts."}</p>
    {loading ? <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p> : !user ? <Link className="feature-button" href="/login?next=/visited">{th ? "เข้าสู่ระบบเพื่อดูร้านของฉัน" : "Sign in to view your cafes"}</Link> : <VisitList key={user.id} compact={compact} />}
  </section>;
}

function VisitList({ compact }: { compact: boolean }) {
  const cafes = useCatalog();
  const { slugs: favoriteSlugs, wantedSlugs, wantedReady, visits: rows, visitsError, retryVisits } = useFavorites();
  const { lang } = useLang();
  const th = lang === "th";
  if (visitsError) return <div role="alert"><p>{th ? "โหลดประวัติไม่สำเร็จ" : "Could not load visits."}</p><button className="ui-secondary mt-3" onClick={retryVisits}>{th ? "ลองอีกครั้ง" : "Retry"}</button></div>;
  if (!rows) return <p role="status">{th ? "กำลังโหลดประวัติ…" : "Loading visits…"}</p>;
  const favoriteSet = new Set(favoriteSlugs);
  const visitedOnly = rows.filter(row => !favoriteSet.has(row.cafe_slug));
  const favoriteVisited = rows.filter(row => favoriteSet.has(row.cafe_slug));
  const wanted = wantedSlugs
    .map(slug => cafes.find(cafe => cafe.slug === slug))
    .filter((cafe): cafe is (typeof cafes)[number] => Boolean(cafe));
  const visitCards = (items: CafeVisit[]) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {(compact ? items.slice(0, 3) : items).map(row => {
      const cafe = cafes.find(c => c.slug === row.cafe_slug);
      return <div key={row.cafe_slug} className="visited-cafe-entry min-w-0">
        {cafe ? <CafeCard cafe={cafe} /> : <div className="rounded-xl border border-[#ddd6c7] p-5"><p className="font-semibold">{th ? "ร้านนี้ไม่เปิดให้เข้าชมแล้ว" : "This cafe is no longer available"}</p><p className="mt-2 break-words text-sm">{row.cafe_slug}</p></div>}
        <p className="mt-2 text-xs text-espresso/60">{th ? "บันทึกเมื่อ " : "Saved on "}<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })}</time></p>
      </div>;
    })}
  </div>;
  return <>
    <section id="visited-only" aria-labelledby="visited-list-heading" className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="visited-list-heading" className="text-xl font-bold">{th ? "ร้านที่เคยไป" : "Visited cafes"}</h2>
          <p className="mt-1 text-sm text-espresso/65">{th ? "บันทึกว่าเคยไปแล้ว แต่ยังไม่ได้กดหัวใจ" : "Visited cafes you have not heart-saved."}</p></div>
        <p className="text-sm text-espresso/65">{th ? `${visitedOnly.length} ร้าน` : `${visitedOnly.length} cafes`}</p>
      </div>
      {visitedOnly.length ? visitCards(visitedOnly) : <div className="rounded-xl border border-dashed border-[#ddd6c7] p-6 text-sm text-espresso/70">{rows.length ? (th ? "ร้านที่เคยไปและกดหัวใจจะอยู่ในร้านโปรดด้านล่าง" : "Heart-saved visited cafes are in Favorites below.") : (th ? "อัปโหลดรูปจากร้านที่เคยไปเพื่อบันทึกไว้ที่นี่" : "Upload a cafe photo to record your visit here.")}</div>}
    </section>
    <section id="want-to-go" aria-labelledby="want-to-go-heading" className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="want-to-go-heading" className="text-xl font-bold">{th ? "ร้านที่อยากไป" : "Want to visit"}</h2>
          <p className="mt-1 text-sm text-espresso/65">{th ? "ร้านที่กดหัวใจไว้และยังไม่เคยไป" : "Heart-saved cafes you have not visited yet."}</p></div>
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-espresso/65">{th ? `${wanted.length} ร้าน` : `${wanted.length} cafes`}</p><Link href="/favorites" className="text-sm font-semibold underline underline-offset-4">{th ? "ดูเฉพาะหมวดนี้" : "View this list"} →</Link><Link href="/cafes" className="ui-secondary">{th ? "เพิ่มร้านที่อยากไป" : "Add a cafe"} →</Link></div>
      </div>
      {!wantedReady ? <p role="status">{th ? "กำลังโหลดร้านที่อยากไป…" : "Loading want-to-visit list…"}</p> : wanted.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{wanted.map(cafe => <CafeCard key={cafe.slug} cafe={cafe} />)}</div> :
        <div className="rounded-xl border border-dashed border-[#ddd6c7] p-5 text-sm text-espresso/70">
          {favoriteVisited.length
            ? (th ? "ร้านที่กดหัวใจไว้และเคยไปแล้วอยู่ในร้านโปรดด้านล่าง ลองเพิ่มร้านที่ยังไม่เคยไป" : "Heart-saved visited cafes are in Favorites below. Add a cafe you have not visited yet.")
            : (th ? "กดไอคอนหัวใจบนการ์ดคาเฟ่เพื่อเพิ่มร้านที่ยังไม่เคยไป" : "Select the heart on a cafe card to save a cafe you have not visited yet.")}
        </div>}
    </section>
    <section id="favorite-visited" aria-labelledby="favorite-visited-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="favorite-visited-heading" className="text-xl font-bold">{th ? "ร้านโปรด" : "Favorites"}</h2>
          <p className="mt-1 text-sm text-espresso/65">{th ? "ร้านที่เคยไปแล้วและกดหัวใจไว้" : "Cafes you have visited and heart-saved."}</p></div>
        <p className="text-sm text-espresso/65">{th ? `${favoriteVisited.length} ร้าน` : `${favoriteVisited.length} cafes`}</p>
      </div>
      {favoriteVisited.length ? visitCards(favoriteVisited) : <div className="rounded-xl border border-dashed border-[#ddd6c7] p-6 text-sm text-espresso/70">{th ? "กดหัวใจที่ร้านในหมวดเคยไป เพื่อเพิ่มเป็นร้านโปรด" : "Heart a cafe in Visited cafes to add it to Favorites."}</div>}
    </section>
  </>;
}

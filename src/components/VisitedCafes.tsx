"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import { useFavorites } from "./FavoritesProvider";
import CafeCard from "./CafeCard";

export default function VisitedCafes({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const th = lang === "th";
  return <section id="visited" className={compact ? "feature-card" : "mx-auto max-w-6xl px-4 py-10"}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {compact ? <h2 className="text-xl font-bold">{th ? "ร้านของฉัน" : "My cafes"}</h2> : <h1 className="text-3xl font-bold">{th ? "ร้านโปรดและร้านที่อยากไป" : "Places to revisit and want to visit"}</h1>}
      {compact && <Link className="text-sm font-semibold underline underline-offset-4" href="/visited">{th ? "ดูทั้งหมด" : "View all"} →</Link>}
    </div>
    <p className="mb-5 text-sm text-espresso/65">{th ? "ดูร้านที่เคยไปและร้านที่กดหัวใจเก็บไว้ในสองรายการส่วนตัว" : "Your visited cafes and heart-saved cafes are shown in two private lists."}</p>
    {loading ? <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p> : !user ? <Link className="feature-button" href="/login?next=/visited">{th ? "เข้าสู่ระบบเพื่อดูร้านโปรดและร้านที่อยากไป" : "Sign in to view your saved cafes"}</Link> : <VisitList key={user.id} compact={compact} />}
  </section>;
}

function VisitList({ compact }: { compact: boolean }) {
  const cafes = useCatalog();
  const { slugs: favoriteSlugs, wantedSlugs, wantedReady, visits: rows, visitsError, retryVisits } = useFavorites();
  const { lang } = useLang();
  const th = lang === "th";
  if (visitsError) return <div role="alert"><p>{th ? "โหลดประวัติไม่สำเร็จ" : "Could not load visits."}</p><button className="ui-secondary mt-3" onClick={retryVisits}>{th ? "ลองอีกครั้ง" : "Retry"}</button></div>;
  if (!rows) return <p role="status">{th ? "กำลังโหลดประวัติ…" : "Loading visits…"}</p>;
  const wanted = wantedSlugs
    .map(slug => cafes.find(cafe => cafe.slug === slug))
    .filter((cafe): cafe is (typeof cafes)[number] => Boolean(cafe));
  const hasVisitedSaved = favoriteSlugs.some(slug => rows.some(row => row.cafe_slug === slug));
  return <>
    <section aria-labelledby="visited-list-heading" className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="visited-list-heading" className="text-xl font-bold">{th ? "ร้านโปรด" : "Places to revisit"}</h2>
          <p className="mt-1 text-sm text-espresso/65">{th ? "ร้านที่คุณบันทึกว่าเคยไปแล้ว" : "Cafes you have recorded as visited."}</p></div>
        <p className="text-sm text-espresso/65">{th ? `${rows.length} ร้าน` : `${rows.length} cafes`}</p>
      </div>
      {!rows.length ? <div className="rounded-xl border border-dashed border-[#ddd6c7] p-6"><p className="font-semibold">{th ? "ยังไม่มีร้านโปรดที่บันทึกไว้" : "No places to revisit yet"}</p><p className="mt-2 text-sm text-espresso/65">{th ? "เมื่ออัปโหลดรูปจากร้านที่เคยไป ร้านจะปรากฏในรายการนี้" : "Upload a photo from a cafe you have visited to add it here."}</p><Link href="/cafes" className="ui-secondary mt-4 inline-block">{th ? "ค้นหาร้านคาเฟ่" : "Explore cafes"} →</Link></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(compact ? rows.slice(0, 3) : rows).map(row => {
          const cafe = cafes.find(c => c.slug === row.cafe_slug);
          return <div key={row.cafe_slug} className="visited-cafe-entry min-w-0">
            {cafe ? <CafeCard cafe={cafe} /> : <div className="rounded-xl border border-[#ddd6c7] p-5"><p className="font-semibold">{th ? "ร้านนี้ไม่เปิดให้เข้าชมแล้ว" : "This cafe is no longer available"}</p><p className="mt-2 break-words text-sm">{row.cafe_slug}</p></div>}
            <p className="mt-2 text-xs text-espresso/60">{th ? "บันทึกเมื่อ " : "Saved on "}<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })}</time></p>
          </div>;
        })}
      </div>}
    </section>
    <section aria-labelledby="want-to-go-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="want-to-go-heading" className="text-xl font-bold">{th ? "ร้านที่อยากไป" : "Want to visit"}</h2>
          <p className="mt-1 text-sm text-espresso/65">{th ? "ร้านที่กดหัวใจไว้และยังไม่เคยไป" : "Heart-saved cafes you have not visited yet."}</p></div>
        <Link href="/cafes" className="ui-secondary">{th ? "เพิ่มร้านที่อยากไป" : "Add a cafe"} →</Link>
      </div>
      {!wantedReady ? <p role="status">{th ? "กำลังโหลดร้านที่อยากไป…" : "Loading want-to-visit list…"}</p> : wanted.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{wanted.map(cafe => <CafeCard key={cafe.slug} cafe={cafe} />)}</div> :
        <div className="rounded-xl border border-dashed border-[#ddd6c7] p-5 text-sm text-espresso/70">
          {hasVisitedSaved
            ? (th ? "ร้านที่กดหัวใจไว้และเคยไปแล้วอยู่ในรายการร้านโปรดด้านบน ลองเพิ่มร้านที่ยังไม่เคยไป" : "Heart-saved cafes you have visited are in the list above. Add a cafe you have not visited yet.")
            : (th ? "กดไอคอนหัวใจบนการ์ดคาเฟ่เพื่อเพิ่มร้านที่ยังไม่เคยไป" : "Select the heart on a cafe card to save a cafe you have not visited yet.")}
        </div>}
    </section>
  </>;
}

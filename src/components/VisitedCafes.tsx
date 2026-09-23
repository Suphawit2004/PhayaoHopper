"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { useCatalog } from "./CatalogProvider";
import { useLang } from "@/i18n/LangProvider";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { loadVisits, type CafeVisit } from "@/lib/visits";
import CafeCard from "./CafeCard";

export default function VisitedCafes({ compact = false }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const { lang } = useLang();
  const th = lang === "th";
  return <section id="visited" className={compact ? "feature-card" : "mx-auto max-w-6xl px-4 py-10"}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      {compact ? <h2 className="text-xl font-bold">{th ? "เคยไปแล้ว" : "Visited cafes"}</h2> : <h1 className="text-3xl font-bold">{th ? "เคยไปแล้ว" : "Visited cafes"}</h1>}
      {compact && <Link className="text-sm font-semibold underline underline-offset-4" href="/visited">{th ? "ดูทั้งหมด" : "View all"} →</Link>}
    </div>
    <p className="mb-5 text-sm text-espresso/65">{th ? "บันทึกร้านที่คุณเคยแวะไป เก็บไว้ดูได้เฉพาะคุณ" : "Your personal record of cafes you have visited. Only you can see it."}</p>
    {loading ? <p role="status">{th ? "กำลังโหลด…" : "Loading…"}</p> : !user ? <Link className="feature-button" href="/login?next=/visited">{th ? "เข้าสู่ระบบเพื่อดูร้านที่เคยไป" : "Sign in to view your visits"}</Link> : <VisitList key={user.id} userId={user.id} compact={compact} />}
  </section>;
}

function VisitList({ userId, compact }: { userId: string; compact: boolean }) {
  const cafes = useCatalog();
  const { lang } = useLang();
  const th = lang === "th";
  const [rows, setRows] = useState<CafeVisit[] | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const client = getSupabaseBrowser();
        if (!client) throw new Error("Unavailable");
        const data = await loadVisits(client, userId);
        if (!cancelled) setRows(data);
      } catch { if (!cancelled) setError(true); }
    }
    void load();
    return () => { cancelled = true; };
  }, [userId, retry]);
  if (error) return <div role="alert"><p>{th ? "โหลดประวัติไม่สำเร็จ" : "Could not load visits."}</p><button className="ui-secondary mt-3" onClick={() => { setError(false); setRetry(n => n + 1); }}>{th ? "ลองอีกครั้ง" : "Retry"}</button></div>;
  if (!rows) return <p role="status">{th ? "กำลังโหลดประวัติ…" : "Loading visits…"}</p>;
  if (!rows.length) return <div className="rounded-xl border border-dashed border-[#ddd6c7] p-6"><p className="font-semibold">{th ? "ยังไม่มีร้านที่บันทึกว่าเคยไป" : "No visits saved yet"}</p><p className="mt-2 text-sm text-espresso/65">{th ? "เปิดหน้าร้านที่คุณเคยไป แล้วอัปโหลดรูปจากร้านนั้น" : "Open a cafe you visited and upload a photo from there."}</p><Link href="/cafes" className="ui-secondary mt-4 inline-block">{th ? "ค้นหาร้านคาเฟ่" : "Explore cafes"} →</Link></div>;
  return <><p className="mb-4 text-sm text-espresso/65">{th ? `${rows.length} ร้าน` : `${rows.length} cafes`}</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
    {(compact ? rows.slice(0, 3) : rows).map(row => {
      const cafe = cafes.find(c => c.slug === row.cafe_slug);
      return <div key={row.cafe_slug} className="min-w-0">
        {cafe ? <CafeCard cafe={cafe} /> : <div className="rounded-xl border border-[#ddd6c7] p-5"><p className="font-semibold">{th ? "ร้านนี้ไม่เปิดให้เข้าชมแล้ว" : "This cafe is no longer available"}</p><p className="mt-2 break-words text-sm">{row.cafe_slug}</p></div>}
        <p className="mt-2 text-xs text-espresso/60">{th ? "บันทึกเมื่อ " : "Saved on "}<time dateTime={row.created_at}>{new Date(row.created_at).toLocaleDateString(th ? "th-TH" : "en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" })}</time></p>
      </div>;
    })}
  </div></>;
}

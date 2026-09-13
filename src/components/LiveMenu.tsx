"use client";
import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useLang } from "@/i18n/LangProvider";
type MenuItem = { id: string; name_th: string; name_en: string; price: number | null; photo_url: string | null; is_available: boolean };
export default function LiveMenu({ slug }: { slug: string }) {
  const { lang } = useLang();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const sb = getSupabaseBrowser();
    const refresh = async () => {
      try {
        if (!sb) throw Error();
        const result = await sb.from("menu_items").select("id,name_th,name_en,price,photo_url,is_available").eq("cafe_slug", slug).order("created_at");
        if (result.error) throw Error();
        if (active) { setItems(result.data ?? []); setState("ready"); }
      } catch { if (active) setState("error"); }
    };
    void refresh();
    const channel = sb?.channel(`menu-${slug}`).on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `cafe_slug=eq.${slug}` }, refresh).subscribe();
    const timer = setInterval(refresh, 30000); window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); if (sb && channel) void sb.removeChannel(channel); };
  }, [slug, retry]);
  return <section className="feature-card"><h2 className="text-xl font-bold">{lang === "th" ? "เมนูจากร้านและสถานะพร้อมขาย" : "Menu and availability from the cafe"}</h2>
    {state === "loading" ? <p role="status">{lang === "th" ? "กำลังโหลดเมนู…" : "Loading menu…"}</p> : state === "error" ? <div role="alert"><p>{lang === "th" ? "โหลดเมนูไม่สำเร็จ" : "Could not load the menu"}</p><button className="ui-secondary" onClick={() => {setState("loading"); setRetry(n => n + 1);}}>{lang === "th" ? "ลองใหม่" : "Retry"}</button></div> : !items.length ? <p className="mt-3">{lang === "th" ? "ร้านยังไม่ได้เพิ่มเมนู" : "The cafe has not added its menu yet"}</p> :
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">{items.map(item => <article key={item.id} className="rounded-xl bg-[#f3f7f5] p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.photo_url && <img src={item.photo_url} alt={lang === "th" ? item.name_th : item.name_en || item.name_th} className="aspect-[4/3] w-full rounded-lg object-cover mb-3" />}
      <h3 className="font-semibold">{lang === "th" ? item.name_th : item.name_en || item.name_th}</h3><p>{item.price === null ? (lang === "th" ? "สอบถามราคาที่ร้าน" : "Ask the cafe for the price") : `฿${Number(item.price).toLocaleString()}`}</p><p className={item.is_available ? "text-emerald-800" : "text-rose-800"}>{item.is_available ? (lang === "th" ? "✓ พร้อมขาย" : "✓ Available") : (lang === "th" ? "— หมดแล้ว" : "— Sold out")}</p>
    </article>)}</div>}
  </section>;
}

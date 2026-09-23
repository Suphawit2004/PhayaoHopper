"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/i18n/LangProvider";
import { redeemCoupon } from "@/app/actions/coupons";

type Coupon = { id: string; cafe_slug: string; reward: string; issued_at: string; expires_at: string; used_at: string | null; cancelled_at: string | null };
export default function CouponsView({ coupons, cafes, serverNow, error }: { coupons: Coupon[]; cafes: { slug: string; name: { th: string; en: string } }[]; serverNow: number; error: boolean }) {
  const { lang } = useLang(), router = useRouter();
  const th = lang === "th";
  const [confirm, setConfirm] = useState<string | null>(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [router]);
  async function handleRedeem(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await redeemCoupon(id);
      setNotice(result.ok ? (th ? "ใช้คูปองทดลองแล้ว" : "Demo coupon used.") : (th ? "ใช้ไม่ได้ คูปองอาจถูกใช้ ยกเลิก หรือหมดอายุแล้ว" : "Unavailable: this coupon may be used, cancelled or expired."));
      setConfirm(null); router.refresh();
    } catch { setNotice(th ? "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่" : "Connection failed. Please retry."); }
    finally { setBusy(false); }
  }
  return <div className="feature-page"><p className="text-sm font-semibold text-coffee">PHAYAOHOPPER · DEMO REWARDS</p><h1>{th ? "คูปองของฉัน" : "My coupons"}</h1>
    <p>{th ? "คูปองทดลองเท่านั้น ไม่สามารถแลกส่วนลดจริงกับร้านค้า" : "Demo coupons only. These cannot be exchanged for real discounts."}</p>
    <p className="mt-2 text-sm">{th ? "ใช้ได้เฉพาะร้านที่รีวิว ภายใน 30 วัน รับรางวัลครั้งเดียวต่อบัญชีต่อร้าน ลบรีวิวแล้วคูปองที่ยังไม่ใช้จะถูกยกเลิก" : "For the reviewed cafe only, within 30 days. One reward per account per cafe. Deleting a review cancels its unused coupon."}</p>
    {notice && <p role="status" className="coupon-notice my-4">{notice}</p>}
    {error ? <div role="alert"><p>{th ? "โหลดคูปองไม่สำเร็จ" : "Could not load coupons."}</p><button className="ui-secondary" onClick={() => router.refresh()}>{th ? "ลองใหม่" : "Retry"}</button></div> : !coupons.length ? <div className="coupon-empty py-12"><h2>{th ? "ยังไม่มีคูปอง" : "No coupons yet"}</h2><p>{th ? "รีวิวรับ 5 บาท หรือแนบรูปสาธารณะตั้งแต่ 3 รูปเพื่อรับ 10% แทน" : "Review for ฿5, or attach at least 3 public photos for 10% instead."}</p><div className="mt-4 flex flex-wrap justify-center gap-3"><Link href="/visited" className="ui-secondary">{th ? "ร้านที่เคยไป →" : "Visited cafes →"}</Link><Link href="/favorite-cafes" className="ui-secondary">{th ? "ร้านโปรด →" : "Favorites →"}</Link></div></div> :
      <ul className="coupon-list grid gap-6 md:grid-cols-2">{coupons.map(c => {
        const cafe = cafes.find(x => x.slug === c.cafe_slug);
        const state = c.used_at ? "used" : c.cancelled_at ? "cancelled" : Date.parse(c.expires_at) <= serverNow ? "expired" : "available";
        const label = { used: th ? "ใช้แล้ว" : "Used", cancelled: th ? "ยกเลิก" : "Cancelled", expired: th ? "หมดอายุ" : "Expired", available: th ? "พร้อมใช้" : "Available" }[state];
        return <li key={c.id} className={`coupon-card coupon-card-${state}`}><div className="coupon-card-heading"><h2 className="text-xl">{cafe ? <Link className="underline underline-offset-4" href={`/cafes/${c.cafe_slug}`}>{cafe.name[lang]}</Link> : c.cafe_slug}</h2><span className={`coupon-state coupon-state-${state}`} role="status">{label}</span></div>
          <p className="coupon-value">{c.reward === "10_percent" ? "10%" : "5 ฿"}<span>{th ? "ส่วนลดทดลอง" : "Demo discount"}</span></p>
          <p>{th ? "หมดอายุ " : "Expires "}<time dateTime={c.expires_at}>{new Date(c.expires_at).toLocaleString(th ? "th-TH" : "en-GB")}</time></p>
          {c.used_at && <p>{th ? "ใช้เมื่อ " : "Used "}{new Date(c.used_at).toLocaleString(th ? "th-TH" : "en-GB")}</p>}
          {state === "available" && (confirm === c.id ? <div className="coupon-confirm mt-4"><p>{th ? "ยืนยันใช้คูปองทดลอง? เมื่อยืนยันจะใช้ซ้ำไม่ได้ และไม่มีส่วนลดจริง" : "Confirm demo use? This cannot be used again and provides no real discount."}</p><div className="mt-3 flex flex-wrap gap-3"><button className="feature-button" disabled={busy} onClick={() => handleRedeem(c.id)}>{busy ? "…" : th ? "ยืนยันใช้คูปองทดลอง" : "Confirm demo use"}</button><button className="ui-secondary" disabled={busy} onClick={() => setConfirm(null)}>{th ? "ยกเลิก" : "Cancel"}</button></div></div> : <button className="ui-secondary mt-4" disabled={busy} onClick={() => setConfirm(c.id)}>{th ? "ทดลองใช้คูปอง" : "Use demo coupon"}</button>)}
        </li>;
      })}</ul>}
  </div>;
}

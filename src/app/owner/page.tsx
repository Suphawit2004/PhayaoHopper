import UiText from "@/i18n/UiText";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getCatalog } from "@/lib/catalog";
export default async function OwnerPage() {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!user || !sb) return <div className="feature-page"><h1><UiText text="สำหรับเจ้าของร้าน"/></h1><p><UiText text="ดูแลข้อมูลคาเฟ่ อัปเดตเมนูและรูปภาพได้ในที่เดียว"/></p><section className="feature-card"><h2><UiText text="พร้อมดูแลร้านของคุณ"/></h2><p className="mb-6"><UiText text="เข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์จากผู้ดูแลเว็บไซต์"/></p><Link className="feature-button inline-block" href="/login?next=/owner"><UiText text="เข้าสู่ระบบเพื่อจัดการร้าน"/></Link></section></div>;
  const { data: owners, error } = await sb.from("cafe_owners").select("cafe_slug").eq("user_id", user.id);
  const { data: admin } = await sb.rpc("is_admin");
  const cafes = (await getCatalog()).filter(c => admin || owners?.some(o => o.cafe_slug === c.slug));
  return <div className="feature-page"><h1><UiText text="ร้านของคุณ"/></h1><p><UiText text="อัปเดตข้อมูลร้าน เมนู และสถานะพร้อมขาย"/></p>
    {error ? <p role="alert" className="feature-card"><UiText text="ระบบจัดการร้านยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแล"/></p> : cafes.length ? <div className="feature-grid">{cafes.map(c => <Link className="feature-card" href={`/owner/${c.slug}`} key={c.slug}><h2>{<UiText text={c.name.th} en={c.name.en}/>}</h2><UiText text="จัดการร้าน →"/></Link>)}</div>
    : <div className="feature-card"><h2><UiText text="ยังไม่มีร้านที่ได้รับสิทธิ์"/></h2><p><UiText text="ส่งรหัสสมาชิกนี้ให้ผู้ดูแลเพื่อยืนยันและเชื่อมร้านกับบัญชีของคุณ"/></p><code className="break-all">{user.id}</code><p className="mt-4"><Link href="/suggest"><UiText text="แนะนำร้านที่ยังไม่มีในระบบ →"/></Link></p></div>}
  </div>;
}

import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase-server";
import CouponsView from "@/components/CouponsView";
import { getCatalog } from "@/lib/catalog";

async function serverTimestamp() { return Date.now(); }

export const metadata = { title: "คูปองของฉัน | PhayaoHopper", robots: { index: false, follow: false } };
export default async function CouponsPage() {
  const sb = await getSupabaseServer();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (!sb || !user) return <div className="feature-page"><h1>คูปองของฉัน / My coupons</h1><Link className="feature-button mt-5" href="/login?next=/coupons">เข้าสู่ระบบ / Sign in</Link></div>;
  const [{ data, error }, cafes] = await Promise.all([
    sb.from("review_coupons").select("id,cafe_slug,reward,issued_at,expires_at,used_at,cancelled_at").eq("user_id", user.id).order("issued_at", { ascending: false }),
    getCatalog(),
  ]);
  const serverNow = await serverTimestamp();
  return <CouponsView key={user.id} coupons={data ?? []} cafes={cafes.map(c => ({ slug: c.slug, name: c.name }))} serverNow={serverNow} error={!!error} />;
}

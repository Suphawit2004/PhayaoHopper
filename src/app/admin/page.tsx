import UiText from "@/i18n/UiText";
import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase-server";
import AdminDashboard, { type AdminReport, type AdminReview, type AdminSuggestion } from "@/components/admin/AdminDashboard";
import Link from "next/link";
import { cafeFromRow } from "@/lib/cafe-row";
import { suggestionPublication } from "@/lib/suggestion-publication";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string; tab?: string; filter?: string }> }) {
  const params = await searchParams;
  const viewQuery = new URLSearchParams({tab:params.tab==="reviews"||params.tab==="reports"?params.tab:"suggestions",filter:params.filter==="all"?"all":"pending"}).toString();
  const page = Math.max(0, Math.min(10000, Math.floor(Number(params.page) || 0)));
  const sb = await getSupabaseServer();
  if (!sb) return <AdminDashboard mode="not-configured" />;

  const { data } = await sb.auth.getUser();
  if (!data.user) return <AdminDashboard mode="login" />;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return <AdminDashboard mode="forbidden" />;

  const [suggestions, reports, reviews] = await Promise.all([
    sb.from("cafe_suggestions").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49),
    sb.from("data_reports").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49),
    sb.from("reviews").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49),
  ]);

  const statusRank: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
  const suggestionRows: AdminSuggestion[] = (suggestions.data ?? [])
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      address: (r.address as string | null) ?? null,
      lat: r.lat as number,
      lng: r.lng as number,
      openTime: (r.open_time as string | null) ?? null,
      closeTime: (r.close_time as string | null) ?? null,
      priceRange: (r.price_range as number | null) ?? null,
      note: (r.note as string | null) ?? null,
      photoUrl: (r.photo_url as string | null) ?? null,
      contact: (r.contact as string | null) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    }))
    .sort(
      (a, b) =>
        (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt)
    );

  const reportRank: Record<string, number> = { pending: 0, resolved: 1, dismissed: 2 };
  const reportRows: AdminReport[] = (reports.data ?? [])
    .map((r) => ({
      id: r.id as string,
      cafeSlug: r.cafe_slug as string,
      field: r.field as string,
      message: r.message as string,
      suggestedValue: (r.suggested_value as string | null) ?? null,
      contact: (r.contact as string | null) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    }))
    .sort(
      (a, b) =>
        (reportRank[a.status] ?? 9) - (reportRank[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt)
    );

  const reviewRows: AdminReview[] = (reviews.data ?? []).map((r) => ({
    id: r.id as string,
    cafe_slug: r.cafe_slug as string,
    author_name: r.author_name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  const [catalog, profiles, pendingS, pendingR] = await Promise.all([
    sb.from("cafes").select("*").order("slug"), sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("cafe_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("data_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  const cafes = (catalog.data ?? []).map(cafeFromRow);
  const totalPages = Math.max(1, Math.ceil(Math.max(suggestions.count ?? 0, reports.count ?? 0, reviews.count ?? 0) / 50));
  return (
    <>
    <div className="feature-page !max-w-7xl !px-4 sm:!px-6 !pb-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="feature-card"><p><UiText text="ร้านที่เผยแพร่ / ร้านทั้งหมด"/></p><strong className="text-3xl">{catalog.error ? "—" : `${catalog.data?.filter(c => c.is_active).length} / ${cafes.length}`}</strong></div>
        <div className="feature-card"><p><UiText text="สมาชิกทั้งหมด"/></p><strong className="text-3xl">{profiles.error ? "—" : profiles.count}</strong></div>
        <div className="feature-card"><p><UiText text="คำขอรอดำเนินการทั้งหมด"/></p><strong className="text-3xl">{pendingS.error || pendingR.error ? "—" : (pendingS.count ?? 0) + (pendingR.count ?? 0)}</strong></div>
      </div>
      <details className="feature-card"><summary className="cursor-pointer font-bold"><UiText text="จัดการข้อมูลและรูปภาพร้าน ("/>{cafes.length})</summary><div className="grid gap-3 sm:grid-cols-2 mt-5">{cafes.map(cafe => <Link key={cafe.slug} href={`/owner/${cafe.slug}`} className="rounded-xl border border-[#eadfcd] p-4">{<UiText text={cafe.name.th} en={cafe.name.en}/>} →</Link>)}</div></details>
      {(suggestions.error || reports.error || reviews.error) && <p role="alert" className="mt-4 text-rose-700"><UiText text="ข้อมูลบางส่วนโหลดไม่สำเร็จ กรุณาโหลดหน้าใหม่"/></p>}
    </div>
    <AdminDashboard
      mode="ready"
      suggestions={suggestionRows.map(s => ({ ...s, publishedSlug: suggestionPublication(s.id, catalog.error ? null : cafes) }))}
      reports={reportRows}
      reviews={reviewRows}
    />
    <nav className="feature-page !max-w-7xl !px-4 sm:!px-6 !pt-0 flex justify-between" aria-label="หน้ารายการแอดมิน">
      {page > 0 ? <Link href={`/admin?page=${page - 1}&${viewQuery}`}><UiText text="← หน้าก่อน"/></Link> : <span />}
      <span><UiText text="หน้า"/>{page + 1} / {totalPages} · <UiText text="หมวดละ 50 รายการ"/></span>
      {page + 1 < totalPages ? <Link href={`/admin?page=${page + 1}&${viewQuery}`}><UiText text="หน้าถัดไป →"/></Link> : <span />}
    </nav>
    </>
  );
}

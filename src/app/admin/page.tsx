import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase-server";
import AdminDashboard, { type AdminReport, type AdminReview, type AdminSuggestion } from "@/components/admin/AdminDashboard";
import { redirect } from "next/navigation";
import { cafeFromRow } from "@/lib/cafe-row";
import { suggestionPublication } from "@/lib/suggestion-publication";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string; tab?: string; filter?: string }> }) {
  const params = await searchParams;
  const tab = params.tab === "reviews" || params.tab === "reports" ? params.tab : "suggestions";
  const pendingOnly = params.filter !== "all";
  const viewQuery = new URLSearchParams({tab:params.tab==="reviews"||params.tab==="reports"?params.tab:"suggestions",filter:params.filter==="all"?"all":"pending"}).toString();
  const page = Math.max(0, Math.min(10000, Math.floor(Number(params.page) || 0)));
  const sb = await getSupabaseServer();
  if (!sb) return <AdminDashboard mode="not-configured" />;

  const { data } = await sb.auth.getUser();
  if (!data.user) return <AdminDashboard mode="login" />;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return <AdminDashboard mode="forbidden" />;

  let sq = sb.from("cafe_suggestions").select("*", { count: "exact" });
  let rq = sb.from("data_reports").select("*", { count: "exact" });
  let vq = sb.from("reviews").select("*", { count: "exact" });
  // Apply queue filters before pagination so older pending items remain reachable.
  if (pendingOnly) { sq = sq.eq("status", "pending"); rq = rq.eq("status", "pending"); vq = vq.lte("rating", 2); }
  const [suggestions, reports, reviews] = await Promise.all([
    sq.order("created_at", { ascending: !pendingOnly }).order("id").range(page * 50, page * 50 + 49),
    rq.order("created_at", { ascending: !pendingOnly }).order("id").range(page * 50, page * 50 + 49),
    vq.order("created_at", { ascending: false }).order("id").range(page * 50, page * 50 + 49),
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
        (pendingOnly ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
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
        (pendingOnly ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
    );

  const reviewRows: AdminReview[] = (reviews.data ?? []).map((r) => ({
    id: r.id as string,
    cafe_slug: r.cafe_slug as string,
    author_name: r.author_name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  const [catalog, profiles, pendingS, pendingR, lowReviews] = await Promise.all([
    sb.from("cafes").select("*").order("slug"), sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("cafe_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("data_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("reviews").select("id", { count: "exact", head: true }).lte("rating", 2),
  ]);
  const cafes = (catalog.data ?? []).map(cafeFromRow);
  const selected = tab === "reports" ? reports : tab === "reviews" ? reviews : suggestions;
  const totalPages = Math.max(1, Math.ceil((selected.count ?? 0) / 50));
  if (!selected.error && page >= totalPages) redirect(`/admin?page=${totalPages - 1}&${viewQuery}`);
  return (
    <AdminDashboard
      mode="ready"
      queueCounts={{ suggestions: pendingS.error ? null : pendingS.count ?? 0, reports: pendingR.error ? null : pendingR.count ?? 0, reviews: lowReviews.error ? null : lowReviews.count ?? 0 }}
      loadError={!!selected.error}
      suggestions={suggestionRows.map(s => ({ ...s, publishedSlug: suggestionPublication(s.id, catalog.error ? null : cafes) }))}
      reports={reportRows}
      reviews={reviewRows}
      overview={{
        publishedCafes: catalog.error ? null : catalog.data?.filter(c => c.is_active).length ?? 0,
        totalCafes: catalog.error ? null : cafes.length,
        members: profiles.error ? null : profiles.count,
        pendingRequests: pendingS.error || pendingR.error ? null : (pendingS.count ?? 0) + (pendingR.count ?? 0),
      }}
      pageInfo={{ page, totalPages }}
      cafeLinks={cafes.map(cafe => ({ slug: cafe.slug, nameTh: cafe.name.th, nameEn: cafe.name.en }))}
      partialError={!!(suggestions.error || reports.error || reviews.error || catalog.error || profiles.error || pendingS.error || pendingR.error || lowReviews.error)}
    />
  );
}

import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase-server";
import AdminDashboard, { type AdminReport, type AdminReview, type AdminSuggestion } from "@/components/admin/AdminDashboard";
import { redirect } from "next/navigation";
import { cafeFromRow } from "@/lib/cafe-row";
import { suggestionPublication } from "@/lib/suggestion-publication";
import type { EditableMenu } from "@/components/MenuManager";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ page?: string; tab?: string; filter?: string; cafe?: string }> }) {
  const params = await searchParams;
  const tab = params.tab === "reviews" || params.tab === "reports" || params.tab === "cafes" ? params.tab : "suggestions";
  // New submissions start in the review queue; reports and reviews show all records by default.
  const pendingOnly = params.filter === "pending" || (params.filter !== "all" && tab === "suggestions");
  const viewQuery = new URLSearchParams({tab,filter:pendingOnly?"pending":"all"}).toString();
  const page = Math.max(0, Math.min(10000, Math.floor(Number(params.page) || 0)));
  const sb = await getSupabaseServer();
  if (!sb) return <AdminDashboard mode="not-configured" />;

  const { data } = await sb.auth.getUser();
  if (!data.user) return <AdminDashboard mode="login" />;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return <AdminDashboard mode="forbidden" />;

  // Fetch the full records only for the visible tab; the other tabs use count-only queries below.
  const [suggestions, reports, reviews] = await Promise.all([
    tab === "suggestions" ? (() => {
      let query = sb.from("cafe_suggestions").select("*", { count: "exact" });
      if (pendingOnly) query = query.eq("status", "pending");
      return query.order("created_at", { ascending: !pendingOnly }).order("id").range(page * 50, page * 50 + 49);
    })() : null,
    tab === "reports" ? (() => {
      let query = sb.from("data_reports").select("*", { count: "exact" });
      if (pendingOnly) query = query.eq("status", "pending");
      return query.order("created_at", { ascending: !pendingOnly }).order("id").range(page * 50, page * 50 + 49);
    })() : null,
    tab === "reviews" ? (() => {
      let query = sb.from("reviews").select("*", { count: "exact" });
      if (pendingOnly) query = query.lte("rating", 2);
      return query.order("created_at", { ascending: false }).order("id").range(page * 50, page * 50 + 49);
    })() : null,
  ]);

  const statusRank: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
  const suggestionRows: AdminSuggestion[] = (suggestions?.data ?? [])
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
  const reportRows: AdminReport[] = (reports?.data ?? [])
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

  const reviewRows: AdminReview[] = (reviews?.data ?? []).map((r) => ({
    id: r.id as string,
    cafe_slug: r.cafe_slug as string,
    author_name: r.author_name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  const [catalog, profiles, pendingS, pendingR, lowReviews, allReports, allReviews] = await Promise.all([
    sb.from("cafes").select("*").order("slug"), sb.from("profiles").select("id", { count: "exact", head: true }),
    sb.from("cafe_suggestions").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("data_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("reviews").select("id", { count: "exact", head: true }).lte("rating", 2),
    sb.from("data_reports").select("id", { count: "exact", head: true }),
    sb.from("reviews").select("id", { count: "exact", head: true }),
  ]);
  const cafes = (catalog.data ?? []).map(cafeFromRow);
  const selectedCafeRow = tab === "cafes" ? (catalog.data ?? []).find(cafe => cafe.slug === params.cafe) : undefined;
  const [selectedMenu, selectedOwner] = selectedCafeRow ? await Promise.all([
    sb.from("menu_items").select("id,name:name_th,nameEn:name_en,price,available:is_available,photo_url").eq("cafe_slug", selectedCafeRow.slug).order("created_at"),
    sb.from("cafe_owners").select("user_id").eq("cafe_slug", selectedCafeRow.slug).maybeSingle(),
  ]) : [null, null];
  const selected = tab === "reports" ? reports : tab === "reviews" ? reviews : suggestions;
  const totalPages = Math.max(1, Math.ceil((selected?.count ?? 0) / 50));
  if (selected && !selected.error && page >= totalPages) redirect(`/admin?page=${totalPages - 1}&${viewQuery}`);
  const statusIssues: Array<"catalog" | "members" | "workQueue" | "currentView"> = [];
  if (catalog.error) statusIssues.push("catalog");
  if (profiles.error) statusIssues.push("members");
  if (pendingS.error || pendingR.error || lowReviews.error || allReports.error || allReviews.error) {
    statusIssues.push("workQueue");
  }
  const currentViewFailed = !!(selected?.error || (tab === "cafes" && (catalog.error || selectedMenu?.error || selectedOwner?.error)));
  if (currentViewFailed) statusIssues.push("currentView");
  const statusLevel = currentViewFailed || (statusIssues.includes("catalog") && statusIssues.includes("members") && statusIssues.includes("workQueue"))
    ? "failed" : statusIssues.length > 0 ? "partial" : "ready";
  return (
    <AdminDashboard
      mode="ready"
      systemStatus={{ level: statusLevel, issues: statusIssues, checkedAt: new Date().toISOString() }}
      queueCounts={{ suggestions: pendingS.error ? null : pendingS.count ?? 0, reports: pendingR.error ? null : pendingR.count ?? 0, reviews: lowReviews.error ? null : lowReviews.count ?? 0 }}
      itemCounts={{ reports: allReports.error ? null : allReports.count ?? 0, reviews: allReviews.error ? null : allReviews.count ?? 0 }}
      loadError={tab === "cafes" ? !!catalog.error : !!selected?.error}
      suggestions={suggestionRows.map(s => ({ ...s, publishedSlug: suggestionPublication(s.id, catalog.error ? null : cafes) }))}
      reports={reportRows}
      reviews={reviewRows}
      overview={{
        publishedCafes: catalog.error ? null : catalog.data?.filter(c => c.is_active).length ?? 0,
        totalCafes: catalog.error ? null : cafes.length,
        members: profiles.error ? null : profiles.count,
        pendingRequests: pendingS.error || pendingR.error ? null : (pendingS.count ?? 0) + (pendingR.count ?? 0),
      }}
      pageInfo={selected ? { page, totalPages } : undefined}
      cafeLinks={cafes.map(cafe => ({ slug: cafe.slug, nameTh: cafe.name.th, nameEn: cafe.name.en }))}
      selectedCafe={selectedCafeRow ? {
        cafe: cafeFromRow(selectedCafeRow),
        isActive: selectedCafeRow.is_active as boolean,
        menu: (selectedMenu?.data ?? []) as EditableMenu[],
        menuError: !!selectedMenu?.error,
        ownerId: selectedOwner?.data?.user_id ?? "",
      } : undefined}
      partialError={!!(selected?.error || catalog.error || profiles.error || pendingS.error || pendingR.error || lowReviews.error || allReports.error || allReviews.error)}
    />
  );
}

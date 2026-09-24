import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  queries: [] as { table: string; steps: string[]; head: boolean }[],
  user: true, admin: true, errorTable: "",
}));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user ? { id: "admin" } : null } }) },
  rpc: async () => ({ data: state.admin }),
  from(table: string) {
    const q = { table, steps: [] as string[], head: false }; state.queries.push(q);
    const chain = {
      select(_columns: string, options?: { head?: boolean }) { q.head = !!options?.head; return chain; },
      eq(key: string, value: string) { q.steps.push(`eq:${key}:${value}`); return chain; },
      lte(key: string, value: number) { q.steps.push(`lte:${key}:${value}`); return chain; },
      order(key: string) { q.steps.push(`order:${key}`); return chain; },
      range(from: number, to: number) { q.steps.push(`range:${from}:${to}`); return chain; },
      then(resolve: (r: unknown) => unknown) { return Promise.resolve(resolve({ data: [], error: state.errorTable === table ? { message: "unavailable" } : null, count: table === "cafe_suggestions" ? 62 : 2 })); },
    }; return chain;
  },
}) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/components/admin/AdminDashboard", () => ({ default: () => null }));
vi.mock("@/i18n/UiText", () => ({ default: () => null }));
import AdminPage from "./page";

beforeEach(() => { state.queries = []; state.user = true; state.admin = true; state.errorTable = ""; });
describe("Admin queue data boundaries", () => {
  it("does not query moderation records for a non-admin", async () => {
    state.admin = false;
    const page = await AdminPage({ searchParams: Promise.resolve({}) });
    expect(state.queries).toHaveLength(0);
    expect(page.props.systemStatus).toBeUndefined();
  });
  it("filters pending records before the second page and counts without a range", async () => {
    await AdminPage({ searchParams: Promise.resolve({ page: "1", tab: "suggestions" }) });
    const query = state.queries.find(q => q.table === "cafe_suggestions" && !q.head)!;
    expect(query.steps.indexOf("eq:status:pending")).toBeLessThan(query.steps.indexOf("range:50:99"));
    expect(query.steps).toContain("range:50:99");
    const counts = state.queries.filter(q => q.head);
    expect(counts.every(q => !q.steps.some(s => s.startsWith("range:")))).toBe(true);
    expect(counts.find(q => q.table === "reviews")?.steps).toContain("lte:rating:2");
  });
  it("uses the selected category count when a page no longer exists", async () => {
    await expect(AdminPage({ searchParams: Promise.resolve({ page: "1", tab: "reports", filter: "pending" }) })).rejects.toThrow("redirect:/admin?page=0&tab=reports&filter=pending");
  });
  it("does not apply the low-rating filter when all reviews are requested", async () => {
    await AdminPage({ searchParams: Promise.resolve({ tab: "reviews", filter: "all" }) });
    const query = state.queries.find(q => q.table === "reviews" && !q.head)!;
    expect(query.steps).not.toContain("lte:rating:2");
  });
  it("keeps cafe management outside moderation pagination", async () => {
    await expect(AdminPage({ searchParams: Promise.resolve({ page: "9", tab: "cafes" }) })).resolves.toBeTruthy();
    expect(state.queries.some(q => q.table === "cafes" && q.steps.includes("order:slug"))).toBe(true);
    expect(state.queries.filter(query => !query.head).map(query => query.table)).toEqual(["cafes"]);
  });
  it("loads review records only when the reviews tab is open", async () => {
    await AdminPage({ searchParams: Promise.resolve({ tab: "reviews", filter: "all" }) });
    expect(state.queries.filter(query => !query.head).map(query => query.table)).toEqual(["reviews", "cafes"]);
    expect(state.queries.filter(query => query.head).map(query => query.table)).toContain("cafe_suggestions");
  });
  it("reports a healthy dashboard from its existing queries without an extra probe", async () => {
    const page = await AdminPage({ searchParams: Promise.resolve({}) });
    expect(page.props.systemStatus).toMatchObject({ level: "ready", issues: [] });
    expect(Date.parse(page.props.systemStatus.checkedAt)).not.toBeNaN();
    expect(state.queries).toHaveLength(8);
    expect(state.queries.filter(query => !query.head).map(query => query.table)).toEqual(["cafe_suggestions", "cafes"]);
  });
  it("names partial and current-view failures without hiding unavailable counts", async () => {
    state.errorTable = "profiles";
    const partial = await AdminPage({ searchParams: Promise.resolve({}) });
    expect(partial.props.systemStatus).toMatchObject({ level: "partial", issues: ["members"] });
    expect(partial.props.overview).toMatchObject({ members: null });

    state.errorTable = "cafe_suggestions";
    const failed = await AdminPage({ searchParams: Promise.resolve({}) });
    expect(failed.props.systemStatus).toMatchObject({ level: "failed", issues: ["workQueue", "currentView"] });
    expect(failed.props.loadError).toBe(true);
  });
});

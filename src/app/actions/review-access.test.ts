import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ server: vi.fn(), limit: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mock.server }));
vi.mock("@/lib/rate-limit-supabase", () => ({ checkReviewRateLimit: mock.limit, checkReportRateLimit: mock.limit, checkSuggestionRateLimit: mock.limit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/catalog", () => ({ getCafe: async () => ({ slug: "test" }) }));
import { submitReview } from "./reviews";
import { submitReport } from "./reports";
import { submitSuggestion } from "./suggestions";
import { stageReviewPhoto } from "./review-photos";
beforeEach(() => vi.clearAllMocks());
it("rejects guest server actions before writes, uploads or rate-limit side effects", async () => {
  const from = vi.fn(), storage = vi.fn();
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from, storage });
  expect(await submitReview({ id: crypto.randomUUID(), photoIds: [], slug: "test", name: "Guest", rating: 5, comment: "" })).toMatchObject({ ok: false, error: "not_authenticated" });
  expect(await submitReport({ slug: "test", field: "hours", message: "Report" })).toMatchObject({ ok: false, error: "not_authenticated" });
  expect(await submitSuggestion({ name: "Cafe", lat: 19.17, lng: 99.9 })).toMatchObject({ ok: false, error: "not_authenticated" });
  expect(await stageReviewPhoto(new FormData())).toHaveProperty("error");
  expect(from).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled(); expect(mock.limit).not.toHaveBeenCalled();
});
it("does not write photo records after a storage upload failure", async () => {
  const insert = vi.fn(), upload = vi.fn().mockResolvedValue({ error: { message: "network" } });
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { cafe_slug: "test" } }), insert };
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: crypto.randomUUID() } } }) }, from: () => query, storage: { from: () => ({ upload }) } });
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 0x01, 0x02, 0xff, 0xd9]);
  const form = new FormData(); form.set("batch", crypto.randomUUID()); form.set("slug", "test"); form.set("photo", new File([jpeg], "test.jpg", { type: "image/jpeg" }));
  expect(await stageReviewPhoto(form)).toHaveProperty("error");
  expect(upload).toHaveBeenCalledOnce(); expect(insert).not.toHaveBeenCalled();
});

it("rejects a review image whose bytes do not match its declared MIME before Storage", async () => {
  const upload = vi.fn();
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: crypto.randomUUID() } } }) }, storage: { from: () => ({ upload }) } });
  const form = new FormData(); form.set("batch", crypto.randomUUID()); form.set("slug", "test"); form.set("photo", new File(["not a png"], "test.png", { type: "image/png" }));
  expect(await stageReviewPhoto(form)).toMatchObject({ error: expect.stringContaining("ไฟล์รูปไม่ถูกต้อง") });
  expect(upload).not.toHaveBeenCalled();
});

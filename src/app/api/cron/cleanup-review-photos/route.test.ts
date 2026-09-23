import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ createClient: vi.fn(), cleanup: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));
vi.mock("@/lib/cleanup-review-photos", () => ({ cleanupAbandonedReviewPhotos: mock.cleanup }));
import { GET } from "./route";

beforeEach(() => { vi.clearAllMocks(); process.env.CRON_SECRET = "cron-test-secret"; process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret"; });

it("rejects missing and incorrect bearer secrets without contacting Supabase", async () => {
  const missing = await GET(new Request("https://example.test/api/cron/cleanup-review-photos"));
  const wrong = await GET(new Request("https://example.test/api/cron/cleanup-review-photos", { headers: { authorization: "Bearer wrong" } }));
  expect(missing.status).toBe(401); expect(wrong.status).toBe(401); expect(mock.createClient).not.toHaveBeenCalled();
});

it("fails closed when CRON_SECRET is not configured", async () => {
  delete process.env.CRON_SECRET;
  const response = await GET(new Request("https://example.test/api/cron/cleanup-review-photos", { headers: { authorization: "Bearer anything" } }));
  expect(response.status).toBe(401); expect(mock.createClient).not.toHaveBeenCalled();
});

it("runs the cleanup with a server-side service-role client", async () => {
  mock.createClient.mockReturnValue({}); mock.cleanup.mockResolvedValue({ removedPhotos: 2 });
  const response = await GET(new Request("https://example.test/api/cron/cleanup-review-photos", { headers: { authorization: "Bearer cron-test-secret" } }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ ok: true, removedPhotos: 2 });
  expect(mock.createClient).toHaveBeenCalledWith("https://example.supabase.co", "service-role-secret", { auth: { autoRefreshToken: false, persistSession: false } });
  const cutoff = mock.cleanup.mock.calls[0][1] as Date;
  expect(Date.now() - cutoff.getTime()).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000);
});

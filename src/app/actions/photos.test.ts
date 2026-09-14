import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ server: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mocks.server }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
import { listMyPhotos, listPhotos, uploadPhoto } from "./photos";

describe("community photo authentication and profile ownership", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects guest uploads before touching storage", async () => {
    const storage = { from: vi.fn() };
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, storage });
    expect(await uploadPhoto(new FormData())).toMatchObject({ ok: false });
    expect(storage.from).not.toHaveBeenCalled();
  });
  it("returns no profile photos to a guest", async () => {
    const eq = vi.fn();
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({ select: () => ({ eq }) }) });
    expect(await listMyPhotos()).toEqual({ photos: [], error: "กรุณาเข้าสู่ระบบ" });
    expect(eq).not.toHaveBeenCalled();
  });
  it("filters by the authenticated ID even for an admin account", async () => {
    const query = { eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }) };
    mocks.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "admin-id" } } }) }, from: () => ({ select: () => query }) });
    expect(await listMyPhotos()).toEqual({ photos: [] });
    expect(query.eq).toHaveBeenCalledWith("user_id", "admin-id");
  });
  it("includes an older linked photo scoped to the requested cafe", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const row = { id, user_id: "owner", cafe_slug: "test-cafe", path: "owner/photo.jpg", caption: "", is_public: true };
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) };
    const sign = vi.fn().mockResolvedValue({ data: { signedUrl: "signed-photo-url" } });
    mocks.server.mockResolvedValue({ from: () => query, storage: { from: () => ({ createSignedUrl: sign }) } });
    const result = await listPhotos("test-cafe", id);
    expect(result.photos).toHaveLength(1);
    expect(result.photos[0].id).toBe(id);
    expect(query.eq.mock.calls).toEqual([["cafe_slug", "test-cafe"], ["cafe_slug", "test-cafe"], ["id", id]]);
    expect(sign).toHaveBeenCalledWith(row.path, 60);
  });
  it("does not sign a linked photo hidden by row permissions or from another cafe", async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [], error: null }), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    const storage = { from: vi.fn() };
    mocks.server.mockResolvedValue({ from: () => query, storage });
    expect(await listPhotos("test-cafe", "00000000-0000-4000-8000-000000000001")).toEqual({ photos: [] });
    expect(storage.from).not.toHaveBeenCalled();
  });
});

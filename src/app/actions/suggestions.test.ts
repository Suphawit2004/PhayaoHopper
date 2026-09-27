import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ server: vi.fn(), rateLimit: vi.fn() }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mocks.server }));
vi.mock("@/lib/rate-limit-supabase", () => ({ checkSuggestionRateLimit: mocks.rateLimit }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue({ get: () => null }) }));

import { submitSuggestion } from "./suggestions";

const png = Uint8Array.from([137,80,78,71,13,10,26,10, 0,0,0,13, 73,72,68,82, 0,0,0,1, 0,0,0,1, 8,6,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 73,69,78,68, 0,0,0,0]);
const photo = (bytes: Uint8Array, type: string) => new File([Buffer.from(bytes)], "photo", { type });
const input = { name: "New cafe", lat: 19.1, lng: 99.9 };

describe("cafe suggestion photo validation", () => {
  beforeEach(() => vi.clearAllMocks());

  function client() {
    const storage = { upload: vi.fn().mockResolvedValue({ error: null }), getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.test/photo.png" } }), remove: vi.fn() };
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.server.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user" } } }) }, storage: { from: vi.fn().mockReturnValue(storage) }, from: vi.fn().mockReturnValue({ insert }) });
    mocks.rateLimit.mockResolvedValue({ allowed: true });
    return { storage, insert };
  }

  it("rejects a spoofed PNG and GIF before Storage or database writes", async () => {
    const { storage, insert } = client();
    await expect(submitSuggestion({ ...input, photo: photo(Uint8Array.from([1, 2, 3]), "image/png") })).resolves.toEqual({ ok: false, error: "photo_wrong_type" });
    await expect(submitSuggestion({ ...input, photo: photo(Uint8Array.from([71, 73, 70, 56, 57, 97]), "image/gif") })).resolves.toEqual({ ok: false, error: "photo_wrong_type" });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects an oversized photo before Storage or database writes", async () => {
    const { storage, insert } = client();
    const large = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" });
    await expect(submitSuggestion({ ...input, photo: large })).resolves.toEqual({ ok: false, error: "photo_too_big" });
    expect(storage.upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("uploads a valid image with its verified extension and MIME", async () => {
    const { storage, insert } = client();
    await expect(submitSuggestion({ ...input, photo: photo(png, "image/png") })).resolves.toEqual({ ok: true });
    expect(storage.upload).toHaveBeenCalledWith(expect.stringMatching(/^uploads\/.+\.png$/), expect.any(File), { contentType: "image/png" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "user", photo_url: "https://example.test/photo.png" }));
  });
});

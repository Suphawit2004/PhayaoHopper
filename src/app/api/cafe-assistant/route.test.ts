import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Cafe } from "@/data/cafes";
const mock = vi.hoisted(() => ({ catalog: vi.fn(), server: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getCatalog: mock.catalog }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mock.server }));
import { POST } from "./route";
import { validatedAnswer } from "@/lib/cafe-assistant";
const cafe = { slug: "test", name: { th: "ร้านทดสอบ", en: "Test Cafe" }, description: { th: "เงียบ", en: "Quiet" }, address: { th: "เมืองพะเยา", en: "Phayao" }, tags: ["work"], lifestyleTags: ["wifi"], openTime: "08:00", closeTime: "17:00", closedDays: [1] } as Cafe;
beforeEach(() => { vi.clearAllMocks(); mock.catalog.mockResolvedValue([cafe]); vi.stubEnv("OPENAI_API_KEY", ""); vi.stubEnv("OPENAI_MODEL", ""); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const ask = () => POST(new Request("http://localhost/api/cafe-assistant", { method: "POST", body: JSON.stringify({ query: "Test Cafe opening hours", lang: "en" }) }));
it("honestly returns the catalogue without a key and never calls OpenAI", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("catalog"); expect(result.fallbackReason).toBe("not_configured"); expect(result.cafes[0].openTime).toBe("08:00"); expect(fetcher).not.toHaveBeenCalled();
});
it("does not spend AI calls for guests or an exhausted quota", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only"); vi.stubEnv("OPENAI_MODEL", "configured-model"); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
  expect((await (await ask()).json()).fallbackReason).toBe("sign_in_required");
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async () => ({ data: false }) });
  expect((await (await ask()).json()).fallbackReason).toBe("quota_unavailable"); expect(fetcher).not.toHaveBeenCalled();
});
it("passes hours and facilities to Responses and accepts a grounded structured answer", async () => {
  vi.stubEnv("OPENAI_API_KEY", "test-only"); vi.stubEnv("OPENAI_MODEL", "configured-model");
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async () => ({ data: true }) });
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify({ answer: "Test Cafe opens 08:00–17:00 and closes Mondays.", slugs: ["test"] }) }] }] }) }); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("ai"); expect(result.message).toContain("08:00");
  const body = JSON.parse(fetcher.mock.calls[0][1].body); expect(JSON.parse(body.input).cafes[0]).toMatchObject({ openTime: "08:00", closedDays: [1], lifestyle: ["wifi"] }); expect(body.store).toBe(false);
});
it("rejects invented cafe links, external URLs and malformed model output", () => {
  expect(validatedAnswer({ answer: "Go here https://evil.test", slugs: ["test"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ answer: "A cafe", slugs: ["unknown"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ slugs: ["test"] }, [cafe])).toBeNull();
});

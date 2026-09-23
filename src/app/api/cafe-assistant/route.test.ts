import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Cafe } from "@/data/cafes";
const mock = vi.hoisted(() => ({ catalog: vi.fn(), server: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getCatalog: mock.catalog }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mock.server }));
import { POST } from "./route";
import { validatedAnswer } from "@/lib/cafe-assistant";
const cafe = { slug: "test", name: { th: "ร้านทดสอบ", en: "Test Cafe" }, description: { th: "เงียบ", en: "Quiet" }, address: { th: "เมืองพะเยา", en: "Phayao" }, tags: ["work"], lifestyleTags: ["wifi"], openTime: "08:00", closeTime: "17:00", closedDays: [1] } as Cafe;
const makeCafes = (count: number) => Array.from({ length: count }, (_, i) => ({ ...cafe, slug: `cafe-${i + 1}`, name: { th: `ร้าน ${i + 1}`, en: `Cafe ${i + 1}` } }));
const memberServer = (quota: boolean) => ({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async (name: string) => ({ data: name === "is_admin" ? false : quota, error: null }) });
beforeEach(() => { vi.clearAllMocks(); mock.catalog.mockResolvedValue([cafe]); vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("GEMINI_MODEL", ""); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const ask = () => POST(new Request("http://localhost/api/cafe-assistant", { method: "POST", body: JSON.stringify({ query: "Test Cafe opening hours", lang: "en" }) }));
it("honestly returns the catalogue without a key and never calls Gemini", async () => {
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("catalog"); expect(result.fallbackReason).toBe("not_configured"); expect(result.cafes[0].openTime).toBe("08:00"); expect(fetcher).not.toHaveBeenCalled();
});
it("does not spend AI calls for guests or an exhausted quota", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model"); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
  expect((await (await ask()).json()).fallbackReason).toBe("sign_in_required");
  mock.server.mockResolvedValue(memberServer(false));
  expect((await (await ask()).json()).fallbackReason).toBe("quota_unavailable"); expect(fetcher).not.toHaveBeenCalled();
});
it("passes hours and facilities to Gemini and accepts a grounded structured answer", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Test Cafe opens 08:00–17:00 and closes Mondays.", slugs: ["test"] }) }] } }] }) }); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("ai"); expect(result.message).toContain("08:00");
  const body = JSON.parse(fetcher.mock.calls[0][1].body); expect(JSON.parse(body.contents[0].parts[0].text).cafes[0]).toMatchObject({ openTime: "08:00", closedDays: [1], lifestyle: ["wifi"] }); expect(body.generationConfig.responseMimeType).toBe("application/json");
  expect(fetcher.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/configured-model:generateContent");
  expect(fetcher.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-only");
  expect(result.provider).toBe("gemini");
});
it("rejects invented cafe links, external URLs and malformed model output", () => {
  expect(validatedAnswer({ answer: "Go here https://evil.test", slugs: ["test"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ answer: "A cafe", slugs: ["unknown"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ slugs: ["test"] }, [cafe])).toBeNull();
  const cafes = makeCafes(6);
  expect(validatedAnswer({ answer: "Too many", slugs: cafes.map(({ slug }) => slug) }, cafes)).toBeNull();
});

it("lets admins exceed the member daily quota and returns at most five cafes", async () => {
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  const cafes = makeCafes(6); mock.catalog.mockResolvedValue(cafes);
  const rpc = vi.fn(async (name: string) => ({ data: name === "is_admin", error: null }));
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "admin" } } }) }, rpc });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Five cafes.", slugs: cafes.slice(0, 5).map(({ slug }) => slug) }) }] } }] }),
  }));
  for (let i = 0; i < 31; i += 1) {
    const result = await (await ask()).json();
    expect(result.mode).toBe("ai"); expect(result.cafes).toHaveLength(5);
  }
  expect(rpc).toHaveBeenCalledTimes(31);
  expect(rpc).toHaveBeenCalledWith("is_admin");
  expect(rpc).not.toHaveBeenCalledWith("consume_assistant_quota");
});

it.each([
  { ok: false, body: {} },
  { ok: true, body: { promptFeedback: { blockReason: "SAFETY" } } },
  { ok: true, body: { candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{}" }] } }] } },
  { ok: true, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] } },
  { ok: true, body: { candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Invented cafe", slugs: ["unknown"] }) }] } }] } },
])("falls back transparently on Gemini errors or unusable output %#", async ({ ok, body }) => {
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok, json: async () => body }));
  const result = await (await ask()).json();
  expect(result).toMatchObject({ mode: "catalog-fallback", fallbackReason: "unavailable", provider: null });
  expect(result.cafes[0].slug).toBe("test");
});

it("does not use OpenAI configuration or send a key in the request URL", async () => {
  vi.stubEnv("OPENAI_API_KEY", "unused-test-key"); vi.stubEnv("OPENAI_MODEL", "unused-model");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  expect((await (await ask()).json()).mode).toBe("catalog");
  expect(fetcher).not.toHaveBeenCalled();
});

it("logs only stage and HTTP status without exposing provider bodies or secrets", async () => {
  vi.stubEnv("GEMINI_API_KEY", "secret-test-key"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async () => ({ data: true }) });
  const body = vi.fn().mockResolvedValue({ error: { message: "sensitive provider body" } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: body }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await (await ask()).json()).mode).toBe("catalog-fallback");
  expect(warning).toHaveBeenCalledExactlyOnceWith("cafe-assistant Gemini fallback", { stage: "http", status: 429 });
  expect(body).not.toHaveBeenCalled();
});

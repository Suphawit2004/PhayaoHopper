import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Cafe } from "@/data/cafes";
const mock = vi.hoisted(() => ({ catalog: vi.fn(), server: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getCatalog: mock.catalog }));
vi.mock("@/lib/supabase-server", () => ({ getSupabaseServer: mock.server }));
import { POST } from "./route";
import { validatedAnswer } from "@/lib/cafe-assistant";
const cafe = { slug: "test", name: { th: "ร้านทดสอบ", en: "Test Cafe" }, description: { th: "เงียบ", en: "Quiet" }, address: { th: "เมืองพะเยา", en: "Phayao" }, tags: ["work"], lifestyleTags: ["wifi"], openTime: "08:00", closeTime: "17:00", closedDays: [1], baseRating: 4 } as Cafe;
const makeCafes = (count: number) => Array.from({ length: count }, (_, i) => ({ ...cafe, slug: `cafe-${i + 1}`, name: { th: `ร้าน ${i + 1}`, en: `Cafe ${i + 1}` } }));
const memberServer = (quota: boolean) => ({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async (name: string) => ({ data: name === "is_admin" ? false : quota, error: null }) });
beforeEach(() => { vi.clearAllMocks(); mock.catalog.mockResolvedValue([cafe]); vi.stubEnv("GEMINI_API_KEY", ""); vi.stubEnv("GEMINI_MODEL", ""); vi.stubEnv("CAFE_ASSISTANT_MODE", ""); vi.stubEnv("VERCEL_ENV", ""); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const ask = () => POST(new Request("http://localhost/api/cafe-assistant", { method: "POST", body: JSON.stringify({ query: "Test Cafe opening hours", lang: "en" }) }));
const enableLiveGemini = () => vi.stubEnv("CAFE_ASSISTANT_MODE", "gemini");
it.each(["", "preview", "development", "production"])("defaults to quota-free simulation during automated tests when VERCEL_ENV=%s", async (deployment) => {
  vi.stubEnv("VERCEL_ENV", deployment);
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("mock"); expect(result.fallbackReason).toBe("simulation"); expect(result.provider).toBeNull(); expect(result.cafes[0].openTime).toBe("08:00"); expect(fetcher).not.toHaveBeenCalled();
});
it("uses catalogue search when live Gemini is explicitly selected but not configured", async () => {
  enableLiveGemini();
  const result = await (await ask()).json(); expect(result.mode).toBe("catalog"); expect(result.fallbackReason).toBe("not_configured");
});
it("answers a broad recommendation immediately from top-rated catalogue entries without spending quota", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.catalog.mockResolvedValue(makeCafes(6).map((item, index) => ({ ...item, baseRating: index + 1 })));
  const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  const result = await (await POST(new Request("http://localhost/api/cafe-assistant", { method: "POST", body: JSON.stringify({ query: "แนะนำคาเฟ่", lang: "th" }) }))).json();
  expect(result).toMatchObject({ mode: "catalog", fallbackReason: "catalog_answer", provider: null });
  expect(result.cafes.map((item: { slug: string }) => item.slug)).toEqual(["cafe-6", "cafe-5", "cafe-4", "cafe-3", "cafe-2"]);
  expect(fetcher).not.toHaveBeenCalled(); expect(mock.server).not.toHaveBeenCalled();
});
it("answers a named cafe's recorded hours when Gemini times out", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const result = await (await ask()).json();
  expect(result).toMatchObject({ mode: "catalog-fallback", fallbackReason: "provider_timeout" });
  expect(result.message).toContain("08:00–17:00");
  expect(result.message).toContain("Monday");
});
it("does not spend AI calls for guests or an exhausted quota", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model"); const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: null } }) } });
  expect((await (await ask()).json()).fallbackReason).toBe("sign_in_required");
  mock.server.mockResolvedValue(memberServer(false));
  expect((await (await ask()).json()).fallbackReason).toBe("account_quota"); expect(fetcher).not.toHaveBeenCalled();
});
it("passes hours and facilities to Gemini and accepts a grounded structured answer", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Test Cafe opens 08:00–17:00 and closes Mondays.", slugs: ["test"] }) }] } }] }) }); vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json(); expect(result.mode).toBe("ai"); expect(result.message).toContain("08:00");
  const body = JSON.parse(fetcher.mock.calls[0][1].body); expect(JSON.parse(body.contents[0].parts[0].text).cafes[0]).toMatchObject({ openTime: "08:00", closedDays: [1], lifestyle: ["wifi"] }); expect(body.generationConfig.responseMimeType).toBe("application/json");
  expect(fetcher.mock.calls[0][0]).toBe("https://generativelanguage.googleapis.com/v1beta/models/configured-model:generateContent");
  expect(fetcher.mock.calls[0][1].headers["x-goog-api-key"]).toBe("test-only");
  expect(result.provider).toBe("gemini");
});
it("sends only the relevant cafe for a named question", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.catalog.mockResolvedValue([cafe, ...makeCafes(13)]);
  mock.server.mockResolvedValue(memberServer(true));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Test Cafe opens at 08:00.", slugs: ["test"] }) }] } }] }) });
  vi.stubGlobal("fetch", fetcher);
  await ask();
  const body = JSON.parse(fetcher.mock.calls[0][1].body);
  const suppliedCafes = JSON.parse(body.contents[0].parts[0].text).cafes;
  expect(suppliedCafes.map((item: { slug: string }) => item.slug)).toEqual(["test"]);
});
it.each([
  { status: 429, reason: "provider_rate_limit" },
  { status: 503, reason: "provider_unavailable" },
])("names a Gemini HTTP $status failure accurately", async ({ status, reason }) => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status }));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await (await ask()).json()).fallbackReason).toBe(reason);
});
it("identifies a Gemini timeout without claiming the account quota was exhausted", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Timed out", "TimeoutError")));
  vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await (await ask()).json()).fallbackReason).toBe("provider_timeout");
});
it("rejects invented cafe links, external URLs and malformed model output", () => {
  expect(validatedAnswer({ answer: "Go here https://evil.test", slugs: ["test"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ answer: "A cafe", slugs: ["unknown"] }, [cafe])).toBeNull();
  expect(validatedAnswer({ slugs: ["test"] }, [cafe])).toBeNull();
  const cafes = makeCafes(6);
  expect(validatedAnswer({ answer: "Too many", slugs: cafes.map(({ slug }) => slug) }, cafes)).toBeNull();
});

it("lets admins exceed the member daily quota and returns at most five cafes", async () => {
  enableLiveGemini();
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
  enableLiveGemini();
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
  expect((await (await ask()).json()).mode).toBe("mock");
  expect(fetcher).not.toHaveBeenCalled();
});

it("logs only stage and HTTP status without exposing provider bodies or secrets", async () => {
  enableLiveGemini();
  vi.stubEnv("GEMINI_API_KEY", "secret-test-key"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: "member" } } }) }, rpc: async () => ({ data: true }) });
  const body = vi.fn().mockResolvedValue({ error: { message: "sensitive provider body" } });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: body }));
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  expect((await (await ask()).json()).mode).toBe("catalog-fallback");
  expect(warning).toHaveBeenCalledExactlyOnceWith("cafe-assistant Gemini fallback", { stage: "http", status: 429, reason: "provider_rate_limit" });
  expect(body).not.toHaveBeenCalled();
});

it("keeps Gemini live in Vercel Production even if a mock value is configured", async () => {
  vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("CAFE_ASSISTANT_MODE", "mock");
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GEMINI_API_KEY", "test-only"); vi.stubEnv("GEMINI_MODEL", "configured-model");
  mock.server.mockResolvedValue(memberServer(true));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ answer: "Test Cafe opens 08:00–17:00.", slugs: ["test"] }) }] } }] }) });
  vi.stubGlobal("fetch", fetcher);
  const result = await (await ask()).json();
  expect(result.mode).toBe("ai"); expect(fetcher).toHaveBeenCalledOnce();
});

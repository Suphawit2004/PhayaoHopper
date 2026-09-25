import { afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

it("returns to the browser's loopback host during local development", async () => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://phayaohopper.vercel.app");
  const request = new NextRequest("http://localhost:3017/auth/callback", { headers: { host: "127.0.0.1:3017" } });
  const response = await GET(request);
  expect(response.headers.get("location")).toBe("http://127.0.0.1:3017/login?error=auth");
});

it("does not redirect a recovery callback to an untrusted Host header", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://phayaohopper.vercel.app");
  const request = new NextRequest("https://internal.test/auth/callback", { headers: { host: "attacker.example" } });
  const response = await GET(request);
  expect(response.headers.get("location")).toBe("https://phayaohopper.vercel.app/login?error=auth");
});

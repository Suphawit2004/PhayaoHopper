import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3017";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node tests/e2e/mock-supabase.mjs", url: "http://127.0.0.1:54321/health", reuseExistingServer: !process.env.CI, timeout: 30_000 },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3017",
      url: `${baseURL}/`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "e2e-publishable-key",
        NEXT_PUBLIC_SITE_URL: baseURL,
        CAFE_ASSISTANT_MODE: "mock",
        TZ: "UTC",
      },
    },
  ],
});

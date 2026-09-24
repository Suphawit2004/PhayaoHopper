import { expect, test } from "@playwright/test";

test.describe("key page visuals", () => {
  test.skip(!process.env.VISUAL_REGRESSION, "Run visual baselines with VISUAL_REGRESSION=1.");
  test.use({ reducedMotion: "reduce", timezoneId: "Asia/Bangkok", locale: "th-TH" });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-24T03:00:00Z"));
  });

  test("home page at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await waitForVisibleAssets(page);
    await expect(page).toHaveScreenshot("home-desktop.png", { maxDiffPixelRatio: 0.02 });
  });

  test("cafe filters at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cafes");
    await page.getByRole("button", { name: /ตัวกรอง/ }).click();
    await expect(page.getByRole("dialog", { name: "ตัวกรอง" })).toBeVisible();
    await waitForVisibleAssets(page);
    await expect(page).toHaveScreenshot("filters-mobile.png", { maxDiffPixelRatio: 0.02 });
  });

  test("cafe detail at mobile width", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cafes/baan-baann");
    await waitForVisibleAssets(page);
    await expect(page).toHaveScreenshot("cafe-detail-mobile.png", { maxDiffPixelRatio: 0.02 });
  });

  test("administrator dashboard at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login?next=%2Fadmin");
    await page.locator(".password-login input[name=email]").fill("admin-visual@example.test");
    await page.locator(".password-login input[name=password]").fill("demo-password");
    await page.locator(".password-login form button").last().click();
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("region", { name: "สถานะข้อมูลบนเว็บ" })).toBeVisible();
    await waitForVisibleAssets(page);
    await expect(page).toHaveScreenshot("admin-desktop.png", {
      mask: [page.getByRole("region", { name: "สถานะข้อมูลบนเว็บ" }).locator("time")],
      maxDiffPixelRatio: 0.02,
    });
  });
});

async function waitForVisibleAssets(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images)
      .filter(image => {
        const bounds = image.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.top < innerHeight;
      })
      .map(image => image.decode().catch(() => undefined)));
  });
}

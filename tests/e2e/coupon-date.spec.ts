import { expect, test } from "@playwright/test";

test.describe("coupon date hydration", () => {
  test.use({ timezoneId: "Asia/Bangkok" });

  test("renders coupon dates consistently between UTC server and Thai browser", async ({ page }) => {
    const hydrationErrors: string[] = [];
    const isHydrationError = (text: string) => /Hydration failed|Minified React error #418/.test(text);
    page.on("pageerror", (error) => {
      if (isHydrationError(error.message)) hydrationErrors.push(error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error" && isHydrationError(message.text())) {
        hydrationErrors.push(message.text());
      }
    });

    await page.goto("/login?next=%2Fcoupons");
    await page.locator('.password-login input[name="email"]').fill("member-coupon-date@example.test");
    await page.locator('.password-login input[name="password"]').fill("demo-password");
    await page.locator(".password-login form button").last().click();
    await expect(page).toHaveURL(/\/coupons$/);

    await expect(page.locator(".coupon-card time").first()).toHaveText("23/10/2569 01:32:05");
    expect(hydrationErrors).toHaveLength(0);
  });
});

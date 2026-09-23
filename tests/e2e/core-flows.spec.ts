import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const cafePath = "/cafes/baan-baann";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto(`/login?next=${encodeURIComponent(cafePath)}`);
  await page.locator(".password-login input[name=email]").fill(email);
  await page.locator(".password-login input[name=password]").fill("demo-password");
  await page.locator(".password-login form button").last().click();
  await expect(page).toHaveURL(new RegExp(`${cafePath.replaceAll("/", "\\/")}$`));
}

test("guests are sent to login and returned to the cafe page", async ({ page }) => {
  await page.goto(cafePath);
  await page.getByRole("link", { name: /เข้าสู่ระบบเพื่อรีวิว|Sign in to review/ }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.locator(".password-login input[name=email]")).toBeVisible();
});

test("member must upload a valid photo to record a visit, then can review and see both photos", async ({ page }) => {
  await signIn(page, "member-e2e@example.test");
  const visitForm = page.locator("form").filter({ has: page.locator('input[name="isPublic"][type="hidden"]') });
  await visitForm.locator('input[type="file"]').setInputFiles({ name: "bad.png", mimeType: "image/png", buffer: Buffer.from("not a real PNG") });
  await visitForm.getByRole("button", { name: "อัปโหลดรูป" }).click();
  await expect(visitForm.getByRole("status")).toContainText("ไฟล์รูปไม่ถูกต้อง");
  await expect(page.locator(".review-panel form")).toHaveCount(0);
  await visitForm.locator('input[type="file"]').setInputFiles({
    name: "visit.png", mimeType: "image/png",
    buffer: await import("node:fs/promises").then(fs => fs.readFile(resolve("tests/e2e/fixtures/transparent.png"))),
  });
  await visitForm.getByRole("button", { name: "อัปโหลดรูป" }).click();
  await expect(page.getByRole("link", { name: "ดูร้านที่เคยไปแล้ว" })).toBeVisible();
  await expect(page.getByRole("list", { name: "แกลเลอรีของร้าน" }).getByRole("listitem")).toHaveCount(1, { timeout: 20_000 });

  const reviewForm = page.locator(".review-panel form");
  await expect(reviewForm).toBeVisible();
  await reviewForm.locator("input[type=file]").setInputFiles({
    name: "review.png",
    mimeType: "image/png",
    buffer: await import("node:fs/promises").then(fs => fs.readFile(resolve("tests/e2e/fixtures/transparent.png"))),
  });
  await reviewForm.locator("input:not([type])").first().fill("ผู้รีวิวทดสอบ");
  await reviewForm.locator("textarea").fill("ร้านบรรยากาศดี");
  await reviewForm.locator("button[type=submit]").click();
  await expect(page.getByRole("status").filter({ hasText: "คูปองทดลอง 5 บาท" })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".review-list")).toContainText("ผู้รีวิวทดสอบ");
  await expect(page.locator(".review-list img").first()).toBeVisible({ timeout: 20_000 });

  await page.goto("/photos");
  const gallery = page.getByRole("list", { name: "แกลเลอรีของฉัน" });
  await expect(gallery.getByRole("listitem")).toHaveCount(2, { timeout: 20_000 });
  await expect(gallery.locator("img").first()).toBeVisible();
});

test("administrator can open the moderation dashboard", async ({ page }) => {
  await page.goto("/login?next=%2Fadmin");
  await page.locator(".password-login input[name=email]").fill("admin-e2e@example.test");
  await page.locator(".password-login input[name=password]").fill("demo-password");
  await page.locator(".password-login form button").last().click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "จัดการข้อมูล", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "งานที่ควรจัดการ" })).toBeVisible();
});

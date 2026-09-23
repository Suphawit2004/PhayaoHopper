import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const cafePath = "/cafes/baan-baann";

test("navbar keeps search within reach on mobile and marks the active section", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(cafePath);

  const search = page.locator(".nav-search input");
  await expect(search).toBeVisible();
  await search.fill("บ้านบานน์");
  await expect(page.locator(".search-results")).toContainText("บ้านบานน์");
  await search.fill("");

  await page.getByRole("button", { name: "เมนู" }).click();
  const navigation = page.locator(".main-navigation");
  await expect(navigation).toBeVisible();
  await expect(navigation.locator('a[href="/cafes"]')).toHaveAttribute("aria-current", "page");
  const headerBounds = await page.locator(".nav-main").evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(headerBounds.scrollWidth).toBeLessThanOrEqual(headerBounds.clientWidth);
  const menuButton = page.getByRole("button", { name: "เมนู" });
  const menuButtonBounds = await menuButton.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(menuButtonBounds.scrollWidth).toBeLessThanOrEqual(menuButtonBounds.clientWidth);
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await page.getByRole("button", { name: "เมนู" }).click();
  await search.click();
  await expect(navigation).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(navigation).toBeVisible();
  await expect(page.getByRole("button", { name: "เมนู" })).toBeHidden();
  await expect(search).toBeVisible();

  await page.setViewportSize({ width: 320, height: 700 });
  const narrowHeader = await page.locator(".nav-main").evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(narrowHeader.scrollWidth).toBeLessThanOrEqual(narrowHeader.clientWidth);
});

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
  await expect(page.getByRole("link", { name: "ดูร้านโปรด" })).toBeVisible();
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

test("a favorited cafe remains in the want-to-visit list after recording a visit", async ({ page }) => {
  await signIn(page, "wishlist-e2e@example.test");
  const favoriteButton = page.locator(".favorite-control");
  await favoriteButton.click();
  await expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

  const visitForm = page.locator("form").filter({ has: page.locator('input[name="isPublic"][type="hidden"]') });
  await visitForm.locator('input[type="file"]').setInputFiles({
    name: "visit.png",
    mimeType: "image/png",
    buffer: await import("node:fs/promises").then(fs => fs.readFile(resolve("tests/e2e/fixtures/transparent.png"))),
  });
  await visitForm.getByRole("button", { name: "อัปโหลดรูป" }).click();
  await expect(page.getByRole("link", { name: "ดูร้านโปรด" })).toBeVisible();

  await page.goto("/visited");
  const wantToVisit = page.locator("section[aria-labelledby='want-to-go-heading']");
  await expect(wantToVisit.locator(".cafe-card")).toHaveCount(1);
  await expect(wantToVisit).toContainText("บ้านบานน์");

  await page.locator("details.account-menu summary").click();
  await expect(page.locator(".account-menu-panel")).toContainText("ร้านที่อยากไป (1)");
});

test("profile popup edits name and photo, sends password reset, removes membership card, and logs out", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/login?next=%2F");
  await page.locator(".password-login input[name=email]").fill("profile-e2e@example.test");
  await page.locator(".password-login input[name=password]").fill("demo-password");
  await page.locator(".password-login form button").last().click();
  await expect(page).toHaveURL(/\/$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "เมนู" }).click();
  await page.locator("details.account-menu summary").click();
  const panel = page.locator(".account-menu-panel");
  const panelBounds = await panel.boundingBox();
  expect(panelBounds).not.toBeNull();
  expect(panelBounds!.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds!.x + panelBounds!.width).toBeLessThanOrEqual(390);
  await expect(panel.locator(".account-services")).not.toContainText("บัตรสมาชิก");
  await expect(panel.locator(".account-member-id code")).toHaveText("00000000-0000-4000-8000-000000000003");
  await panel.getByRole("button", { name: "คัดลอกรหัสสมาชิก" }).click();
  await expect(panel.getByRole("status")).toContainText("คัดลอกรหัสสมาชิกแล้ว");
  await panel.getByRole("button", { name: "แก้ไขชื่อ" }).click();
  await panel.locator('input[name="displayName"]').fill("สมาชิกทดสอบ Phayao");
  await panel.getByRole("button", { name: "บันทึก", exact: true }).click();
  await expect(panel.locator(".account-identity-copy strong")).toHaveText("สมาชิกทดสอบ Phayao", { timeout: 20_000 });

  const avatarChooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "เปลี่ยนรูปโปรไฟล์" }).click();
  await (await avatarChooser).setFiles({ name: "fake.png", mimeType: "image/png", buffer: Buffer.from("not a PNG") });
  await expect(panel.getByRole("status")).toContainText("รูปไม่ถูกต้อง");
  const validAvatarChooser = page.waitForEvent("filechooser");
  await panel.getByRole("button", { name: "เปลี่ยนรูปโปรไฟล์" }).click();
  await (await validAvatarChooser).setFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: await import("node:fs/promises").then(fs => fs.readFile(resolve("tests/e2e/fixtures/transparent.png"))),
  });
  await expect(panel.getByRole("status")).toContainText("อัปเดตรูปโปรไฟล์แล้ว", { timeout: 20_000 });
  await expect(panel.locator(".account-identity-copy strong")).toHaveText("สมาชิกทดสอบ Phayao", { timeout: 20_000 });
  await expect(panel.locator(".account-identity .account-avatar img")).toBeVisible();

  await panel.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" }).click();
  await expect(panel.getByRole("status")).toContainText("ส่งลิงก์ตั้งรหัสผ่านไปยังอีเมลแล้ว");

  await page.goto("/auth/reset-password");
  await expect(page.getByRole("heading", { name: "ตั้งหรือเปลี่ยนรหัสผ่าน" })).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "เมนู" }).click();
  await page.locator("details.account-menu summary").click();
  const reopenedPanel = page.locator(".account-menu-panel");
  await expect(reopenedPanel.locator(".account-identity-copy strong")).toHaveText("สมาชิกทดสอบ Phayao");
  await expect(page.locator("details.account-menu > summary .account-avatar img")).toBeVisible();
  await reopenedPanel.getByRole("button", { name: "ออกจากระบบ" }).click();
  await expect(page.locator("details.account-menu")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();

  await page.goto("/auth/reset-password");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/membership");
  await expect(page).toHaveURL(/\/$/);
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

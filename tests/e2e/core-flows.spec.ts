import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const cafePath = "/cafes/baan-baann";

test("forgot-password email returns to the new-password form", async ({ page }) => {
  await page.goto("/login");
  await page.locator(".password-login").getByRole("button", { name: "ลืมรหัสผ่าน?" }).click();
  await page.locator('.password-login input[name="email"]').fill("reset-e2e@example.test");
  const recoveryRequest = page.waitForRequest(request => request.url().includes("/auth/v1/recover"));
  await page.locator(".password-login").getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" }).click();
  const request = await recoveryRequest;
  const redirectTo = new URL(request.url()).searchParams.get("redirect_to");
  expect(redirectTo).toBe(`${new URL(page.url()).origin}/auth/callback?next=%2Fauth%2Freset-password`);
  await expect(page.locator(".password-login [role=status]")).toContainText("หากอีเมลนี้มีบัญชี");
});

test("forgot-password form explains the email send cooldown", async ({ page }) => {
  await page.route("**/auth/v1/recover**", route => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ code: "over_email_send_rate_limit", message: "Too many requests" }),
  }));
  await page.goto("/login");
  await page.locator(".password-login").getByRole("button", { name: "ลืมรหัสผ่าน?" }).click();
  await page.locator('.password-login input[name="email"]').fill("reset-e2e@example.test");
  await page.locator(".password-login").getByRole("button", { name: "ส่งลิงก์ตั้งรหัสผ่าน" }).click();
  await expect(page.locator(".password-login [role=status]")).toContainText("ส่งบ่อยเกินไป");
});

test("profile password reset explains the email send cooldown", async ({ page }) => {
  await signIn(page, "member-reset-e2e@example.test");
  await page.route("**/auth/v1/recover**", route => route.fulfill({
    status: 429,
    contentType: "application/json",
    body: JSON.stringify({ code: "over_email_send_rate_limit", message: "Too many requests" }),
  }));
  await page.locator("details.account-menu summary").click();
  const panel = page.locator(".account-menu-panel");
  await panel.getByRole("button", { name: "ส่งลิงก์รีเซ็ตรหัสผ่าน" }).click();
  await expect(panel.getByRole("status")).toContainText("ส่งบ่อยเกินไป");
});

test("cafe explorer filters fit mobile screens", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ["/cafes", "/map"]) {
      await page.goto(route);
      const bounds = await page.locator("body").evaluate(element => ({
        width: element.clientWidth,
        scroll: element.scrollWidth,
      }));
      expect(bounds.scroll, `${route} at ${width}px should not scroll horizontally`).toBeLessThanOrEqual(bounds.width);
    }
  }
  expect(pageErrors).toEqual([]);
});

test("my photos page exposes its title as the main heading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "photos-heading-e2e@example.test");
  await page.goto("/photos");

  await expect(page.getByRole("heading", { level: 1, name: "รูปของฉัน" })).toBeVisible();
  const bounds = await page.locator("body").evaluate(element => ({
    width: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
});

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

test("language selector marks the current language and switches without leaving the page", async ({ page }) => {
  await page.goto("/cafes");
  const language = page.locator(".language-toggle");
  const thai = language.locator("button[lang='th']");
  const english = language.locator("button[lang='en']");
  await expect(thai).toHaveAttribute("aria-pressed", "true");
  await english.click();
  await expect(page).toHaveURL(/\/cafes$/);
  await expect(english).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".main-navigation a[href='/cafes']")).toContainText("All cafes");
  await thai.click();
  await expect(thai).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".main-navigation a[href='/cafes']")).toContainText("คาเฟ่ทั้งหมด");
});

test("cafe assistant is a primary navbar link and completes a catalogue search", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const assistantLink = page.locator(".main-navigation a[href='/chat']");
  await expect(assistantLink).toBeVisible();
  await expect(assistantLink).toContainText("ผู้ช่วยค้นหาร้าน");
  await assistantLink.click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(page.getByRole("heading", { name: /วันนี้อยากนั่งร้านแบบไหน/ })).toBeVisible();
  await expect(page.locator(".chat-sidebar")).toContainText("ค้นหาในพื้นที่เมืองพะเยา");

  await page.locator(".chat-quick-prompt").first().click();
  await expect(page.locator(".chat-user-message")).toHaveText("แนะนำคาเฟ่");
  await expect(page.locator(".chat-recommendation")).toHaveCount(5);
  await expect(page.locator(".chat-fallback-note")).toBeVisible();
  await expect(page.locator(".chat-fallback-note")).toContainText("ตอบจากข้อมูลร้านโดยตรง");
  await expect(page.locator(".chat-answer-source")).toContainText("ข้อมูลร้าน");
  await expect(page.locator(".chat-recommendation").first()).toHaveAttribute("href", /^\/cafes\//);

  await page.locator(".chat-reset").click();
  const composer = page.getByRole("textbox", { name: "เล่าให้ฟังว่ากำลังมองหาร้านแบบไหน" });
  await composer.fill("แนะนำคาเฟ่");
  const sendButton = page.getByRole("button", { name: "ส่งข้อความ" });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.locator(".chat-user-message")).toHaveText("แนะนำคาเฟ่");
  await expect(page.locator(".chat-recommendation")).toHaveCount(5);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".chat-reset").click();
  await expect(page.locator(".chat-mobile-prompts")).toBeVisible();
  const pageBounds = await page.locator("body").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(pageBounds.scroll).toBeLessThanOrEqual(pageBounds.width);
  await page.getByRole("button", { name: "เมนู" }).click();
  await expect(page.locator(".main-navigation a[href='/chat']")).toHaveAttribute("aria-current", "page");
  const bounds = await page.locator(".nav-main").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width);
});

test("cafe assistant labels an upstream timeout without blaming account quota", async ({ page }) => {
  await page.route("**/api/cafe-assistant", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ mode: "catalog-fallback", fallbackReason: "provider_timeout", provider: null,
        message: "พบร้านที่เกี่ยวข้องในเมืองพะเยา", cafes: [] }),
    });
  });
  await page.goto("/chat");
  await page.locator(".chat-quick-prompt").first().click();
  await expect(page.locator(".chat-fallback-note")).toContainText("Gemini ตอบช้าเกินเวลาที่กำหนด");
  await expect(page.locator(".chat-fallback-note")).not.toContainText("โควตา");
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

test("manual cafe coordinates update the map pin and reject points outside Phayao", async ({ page }) => {
  await signIn(page, "member-coordinates-e2e@example.test");
  await page.goto("/suggest");

  await page.getByLabel("ละติจูด", { exact: true }).fill("19.123456");
  await page.getByLabel("ลองจิจูด", { exact: true }).fill("99.890720");
  await expect(page.getByText("19.123456, 99.890720", { exact: true })).toBeVisible();
  await expect(page.locator(".coffee-marker")).toBeVisible();

  await page.getByLabel("ลองจิจูด", { exact: true }).fill("98.661210");
  await expect(page.getByRole("alert").filter({ hasText: "พิกัดอยู่นอกพื้นที่ที่รองรับ" })).toBeVisible();
  await expect(page.getByText("ยังไม่ได้เลือกตำแหน่ง", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "ดูร้านที่เคยไป" })).toBeVisible();
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

test("a cafe moves between want-to-visit, favorites, and visited-only as its states change", async ({ page }) => {
  await signIn(page, "wishlist-e2e@example.test");
  const favoriteButton = page.locator(".favorite-control");
  await favoriteButton.click();
  await expect(favoriteButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.main-navigation > a[href="/visited"]')).toContainText("คาเฟ่ที่บันทึกไว้ (1)");

  await page.goto("/favorites");
  await expect(page.locator(".cafe-card")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "หมวดคาเฟ่ที่บันทึกไว้" }).getByRole("link", { name: "ร้านที่อยากไป 1" })).toHaveAttribute("aria-current", "page");
  await page.goto(cafePath);

  const visitForm = page.locator("form").filter({ has: page.locator('input[name="isPublic"][type="hidden"]') });
  await visitForm.locator('input[type="file"]').setInputFiles({
    name: "visit.png",
    mimeType: "image/png",
    buffer: await import("node:fs/promises").then(fs => fs.readFile(resolve("tests/e2e/fixtures/transparent.png"))),
  });
  await visitForm.getByRole("button", { name: "อัปโหลดรูป" }).click();
  await expect(page.getByRole("link", { name: "ดูร้านโปรด" })).toBeVisible();
  await expect(page.locator('.main-navigation > a[href="/visited"]')).toContainText("คาเฟ่ที่บันทึกไว้ (1)");

  await page.goto("/visited");
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "ร้านที่เคยไป" })).toBeVisible();

  await page.locator("details.account-menu summary").click();
  await expect(page.locator(".account-menu-panel")).toContainText("ร้านโปรด (1)");
  await expect(page.locator('.account-menu-panel a[href="/favorite-cafes"]')).toBeVisible();
  await expect(page.locator(".account-menu-panel")).toContainText("ร้านที่อยากไป");
  await expect(page.locator(".account-menu-panel")).not.toContainText("ร้านที่อยากไป (1)");
  await page.goto("/favorites");
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  const listNavigation = page.getByRole("navigation", { name: "หมวดคาเฟ่ที่บันทึกไว้" });
  await expect(page.locator('.main-navigation > a[href="/visited"]')).toContainText("คาเฟ่ที่บันทึกไว้ (1)");
  await expect(listNavigation.getByRole("link", { name: "ร้านที่เคยไป 0" })).toBeVisible();
  await expect(listNavigation.getByRole("link", { name: "ร้านที่อยากไป 0" })).toHaveAttribute("aria-current", "page");
  await expect(listNavigation.getByRole("link", { name: "ร้านโปรด 1" })).toBeVisible();
  await listNavigation.getByRole("link", { name: "ร้านโปรด 1" }).click();
  await expect(page).toHaveURL(/\/favorite-cafes$/);
  await expect(page.locator(".cafe-card")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "ร้านโปรด" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "หมวดคาเฟ่ที่บันทึกไว้" }).getByRole("link", { name: "ร้านโปรด 1" })).toHaveAttribute("aria-current", "page");
  await page.locator(".favorite-control").click();
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  await page.goto("/visited");
  await expect(page.locator(".cafe-card")).toHaveCount(1);
  await page.locator(".favorite-control").click();
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  await page.goto("/favorite-cafes");
  await expect(page.locator(".cafe-card")).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/visited", "/favorites", "/favorite-cafes"]) {
    await page.goto(path);
    const pageWidth = await page.locator("body").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
    expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.width);
    await expect(page.getByRole("navigation", { name: "หมวดคาเฟ่ที่บันทึกไว้" }).locator('a[aria-current="page"]')).toHaveAttribute("href", path);
  }
});

test("guest want-to-visit cafes remain local while visit lists ask for sign-in", async ({ page }) => {
  await page.goto(cafePath);
  await page.locator(".favorite-control").click();
  await page.goto("/favorites");
  await expect(page.locator(".cafe-card")).toHaveCount(1);
  await page.goto("/visited");
  await expect(page.locator("main").getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.locator(".cafe-card")).toHaveCount(0);
  await page.goto("/favorite-cafes");
  await expect(page.locator("main").getByRole("link", { name: "เข้าสู่ระบบ" })).toBeVisible();
  await expect(page.locator(".cafe-card")).toHaveCount(0);
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
  await expect(page.getByRole("heading", { name: "งานที่ควรจัดการ" })).toBeVisible();
  const systemStatus = page.getByRole("region", { name: "สถานะข้อมูลบนเว็บ" });
  await expect(systemStatus).toContainText("ข้อมูลบางส่วนมีปัญหา");
  await expect(systemStatus).toContainText("ข้อมูลร้าน");
  await expect(systemStatus).toContainText("ตรวจล่าสุด");
  await systemStatus.getByRole("button", { name: "ตรวจอีกครั้ง" }).click();
  await expect(systemStatus).toContainText("ข้อมูลบางส่วนมีปัญหา");
  await expect(page.locator("#admin-workspace")).toBeVisible();
  await page.getByRole("button", { name: /จัดการข้อมูลและรูปภาพร้าน/ }).click();
  await expect(page).toHaveURL(/\/admin\?tab=cafes/);
  await expect(page.locator("#admin-workspace").getByRole("heading", { name: "จัดการข้อมูลและรูปภาพร้าน" })).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "ค้นหาชื่อร้านหรือรหัสร้าน" })).toBeVisible();
});

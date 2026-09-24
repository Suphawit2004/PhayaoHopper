import { expect, test } from "@playwright/test";

test("admin work tabs stay visible and easy to press on narrow phones", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page, "admin-mobile-layout@example.test", "/admin");

  const navigation = page.locator("#admin-workspace aside nav");
  await navigation.scrollIntoViewIfNeeded();
  const tabBounds = await navigation.getByRole("button").evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
  }));

  expect(tabBounds).toHaveLength(4);
  for (const bounds of tabBounds) {
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(320);
    expect(bounds.width).toBeGreaterThanOrEqual(100);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }

  await navigation.getByRole("button", { name: /รีวิวล่าสุด/ }).click();
  await expect(page).toHaveURL(/tab=reviews/);
  await expect(page.locator("#admin-workspace > div h2")).toHaveText("รีวิวล่าสุด");
});

test("suggested cafe opening hours have usable controls on 320px screens", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page, "member-mobile-hours@example.test", "/suggest");

  const hours = page.locator(".suggest-hours-grid");
  const controls = hours.locator("select");
  await expect(controls).toHaveCount(4);
  const widths = await controls.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().width));
  expect(widths.every(width => width >= 80)).toBe(true);

  await controls.nth(0).selectOption("09");
  await controls.nth(1).selectOption("30");
  await expect(controls.nth(0)).toHaveValue("09");
  await expect(controls.nth(1)).toHaveValue("30");
});

test("mobile map zoom and cafe markers meet touch-size targets", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/map");

  const zoomIn = page.locator(".leaflet-control-zoom-in");
  const zoomOut = page.locator(".leaflet-control-zoom-out");
  const marker = page.locator(".leaflet-marker-icon").first();
  await expect(zoomIn).toBeVisible();
  await expect(zoomOut).toBeVisible();
  await expect(marker).toBeVisible();

  for (const control of [zoomIn, zoomOut, marker]) {
    const bounds = await control.boundingBox();
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
  }

  await zoomIn.click();
  await marker.focus();
  await marker.press("Enter");
  await expect(page.locator(".leaflet-popup")).toBeVisible();
});

test("mobile filter dialog stays on-screen and applies a selected cafe style", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/cafes");
  await page.getByRole("button", { name: /ตัวกรอง/ }).click();

  const dialog = page.getByRole("dialog", { name: "ตัวกรอง" });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  expect(bounds?.height).toBeLessThanOrEqual(720);
  await dialog.getByRole("button", { name: /เหมาะทำงาน/ }).click();
  await expect(dialog.getByRole("button", { name: /เหมาะทำงาน/ })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "ปิด", exact: true }).click();
  await expect(page.getByRole("button", { name: /ตัวกรอง \(1\)/ })).toBeVisible();
});

test("mobile profile popup keeps account shortcuts in reach", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await signIn(page, "member-mobile-profile@example.test", "/cafes");
  await page.getByRole("button", { name: "เมนู" }).click();
  await page.locator(".account-menu > summary").click();

  const panel = page.locator(".account-menu-panel");
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  const photos = panel.getByRole("link", { name: "รูปของฉัน" });
  await expect(photos).toBeVisible();
  await photos.click();
  await expect(page).toHaveURL(/\/photos$/);
});

test("mobile chat recommendations and composer fit the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/chat");
  await page.locator(".chat-quick-prompt").first().click();
  await expect(page.locator(".chat-recommendation")).toHaveCount(5);

  const composer = page.locator(".chat-composer");
  await expect(composer).toBeVisible();
  const bounds = await composer.boundingBox();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320);
  const pageWidth = await page.locator("body").evaluate(element => ({ width: element.clientWidth, scroll: element.scrollWidth }));
  expect(pageWidth.scroll).toBeLessThanOrEqual(pageWidth.width);
});

test("home carousel keeps its mobile navigation buttons full size", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");

  const next = page.getByRole("button", { name: "ร้านถัดไป" });
  test.skip(await next.count() === 0, "This test catalogue contains only one featured cafe, so the carousel controls are intentionally omitted.");
  await expect(next).toBeVisible();
  const bounds = await next.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  await next.click();
  await expect(page.locator('[class*="slideCount"]')).toContainText("2");
});

async function signIn(page: import("@playwright/test").Page, email: string, next: string) {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.locator('.password-login input[name="email"]').fill(email);
  await page.locator('.password-login input[name="password"]').fill("demo-password");
  await page.locator(".password-login form button").last().click();
  await expect(page).toHaveURL(new RegExp(`${next.replaceAll("/", "\\/")}$`));
}

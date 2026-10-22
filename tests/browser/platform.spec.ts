import { test, expect } from "@playwright/test";
import { formatJalaliInput, tehranDateTime } from "../../src/lib/date-time";
const uuid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("public SSR, SEO, Persian layout and reduced-motion fallback", async ({
  page,
  request,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const html = await (await request.get("/")).text();
  expect(html).toContain("بازی بعدیت");
  expect(html).toContain("application/ld+json");
  expect(html).toContain('rel="canonical"');
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "بازی بعدیت",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "هم‌بازی هم‌سطح", exact: true })
    .click();
  await expect(page.getByText("سه جای خالی، چهار دوست.")).toBeVisible();
  const structured = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  for (const value of structured)
    expect(JSON.parse(value)["@context"]).toBe("https://schema.org");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/clubs/browser-test-club");
  expect(sitemap).not.toContain("/account");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^http:\/\/127\.0\.0\.1:3100\/?$/,
  );
  const og = await request.get("/opengraph-image");
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toContain("image/png");
  await page.screenshot({
    path: `test-results/platform-landing-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("member profile → real SQL booking → admin hold → no fake payment without credentials", async ({
  page,
  browser,
}) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "ایمیل", exact: true })
    .fill("player@example.com");
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL("/account");
  await page.goto("/account/profile");
  await page.getByRole("textbox", { name: "نام نمایشی" }).fill("بازیکن آزمون");
  await page.getByRole("combobox", { name: "سطح خوداظهاری" }).selectOption("1");
  await page
    .getByRole("button", { name: "ذخیره پروفایل", exact: true })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "اطلاعات با موفقیت ثبت شد." })
      .first(),
  ).toBeVisible();
  await page.goto(`/clubs/browser-test-club/book?court=${uuid(702)}`);
  const slot = uuid(test.info().project.name === "mobile" ? 721 : 720);
  await page.getByRole("button", { name: "رفتن به نخستین روز آزاد" }).click();
  await page.locator(`[data-slot-id="${slot}"]`).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "ارسال درخواست رزرو", exact: true })
    .click();
  await expect(page).toHaveURL("/account/bookings");
  const article = page
    .locator("article")
    .filter({ hasText: "در انتظار تأیید باشگاه" })
    .last();
  await expect(article).toBeVisible();
  const bookingId = await article
    .locator('input[name="booking_id"]')
    .getAttribute("value");
  await expect(page.getByText("درگاه زرین‌پال هنوز تنظیم نشده")).toBeVisible();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const admin = await context.newPage();
  await admin.goto("/login");
  await admin
    .getByRole("textbox", { name: "ایمیل", exact: true })
    .fill("admin@example.com");
  await admin.getByLabel("رمز عبور").fill("browser-test-password");
  await admin
    .getByRole("button", { name: "ورود به حساب", exact: true })
    .click();
  await expect(admin).toHaveURL("/admin");
  await admin.goto("/admin/operations");
  const card = admin.locator("#approvals article").filter({
    has: admin.locator(`input[name="booking_id"][value="${bookingId}"]`),
  });
  await expect(card).toBeVisible();
  await card
    .getByRole("textbox", { name: "نام مسئول و مرجع تأیید باشگاه" })
    .fill("تأیید واقعی در دیتابیس آزمون");
  const hold = tehranDateTime(new Date(Date.now() + 50 * 60000));
  await card
    .getByRole("textbox", { name: "اعتبار نگه‌داشت؛ وقت تهران" })
    .fill(formatJalaliInput(hold, true));
  await card
    .getByRole("button", { name: "ثبت نگه‌داشت باشگاه و فعال‌کردن پرداخت" })
    .click();
  await admin
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  // Closing the dialog precedes the asynchronous database write; wait for the
  // specific approval card to disappear before reloading the player's receipt.
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "پرداخت در زرین‌پال" }).first(),
  ).toBeDisabled();
  await expect(page.getByText("رزرو قطعی", { exact: true })).toHaveCount(0);
  await context.close();
});
test("private routes and worker remain unauthorized; public filters remain crawlable", async ({
  page,
  request,
}) => {
  for (const path of [
    "/account",
    "/account/payments",
    "/admin/operations",
    "/admin/clubs",
    "/admin/integrations",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  expect((await request.get("/api/jobs")).status()).toBe(401);
  await page.goto("/clubs");
  await page
    .getByRole("textbox", { name: "نام باشگاه", exact: true })
    .fill("نام ناموجود");
  await page.getByRole("button", { name: "پیدا کردن زمین" }).click();
  await expect(page.getByText("باشگاهی با این مشخصات پیدا نشد.")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://127.0.0.1:3100/clubs",
  );
});

test("admin calendar interval and pause persist through real SQL", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "ایمیل", exact: true })
    .fill("admin@example.com");
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL("/admin");
  await page.goto("/admin/integrations");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "اتصال تقویم باشگاه‌ها",
  );
  const source =
    test.info().project.name === "mobile" ? "سرزمین صبا" : "گیلان پدل کلاب";
  const card = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: source, exact: true }) });
  await expect(
    card.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)"),
  ).toHaveValue("60");
  await card.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)").fill("90");
  await card.getByRole("checkbox", { name: "همگام‌سازی فعال باشد" }).uncheck();
  await card.getByRole("button", { name: "ذخیره تنظیمات اتصال" }).click();
  await expect(
    card.getByRole("status").filter({ hasText: "اطلاعات با موفقیت ثبت شد." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    card.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)"),
  ).toHaveValue("90");
  await expect(
    card.getByRole("checkbox", { name: "همگام‌سازی فعال باشد" }),
  ).not.toBeChecked();
  await expect(
    card.getByRole("button", { name: "درخواست همگام‌سازی اکنون" }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/calendar-admin-${test.info().project.name}.png`,
    fullPage: true,
  });
});

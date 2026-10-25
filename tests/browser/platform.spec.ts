import { test, expect } from "@playwright/test";
import { formatJalaliInput, tehranDateTime } from "../../src/lib/date-time";
const uuid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("inline booking wizard, private receipt and admin review", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const project = test.info().project.name,
    slot = uuid(project === "mobile" ? 725 : 724),
    person = `رزروکنندهٔ مسیر ${project}`;
  await page.goto(
    `/clubs/browser-test-club/book?court=${uuid(702)}&slot=${slot}`,
  );
  await expect(
    page.getByRole("navigation", { name: "مراحل رزرو" }),
  ).toBeVisible();
  await expect(page.locator(`[data-slot-id="${slot}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await page.getByRole("button", { name: "افزایش تعداد راکت آزمون" }).click();
  await page.getByRole("button", { name: "مرحلهٔ قبل", exact: true }).click();
  await expect(page.locator(`[data-slot-id="${slot}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await expect(page.getByLabel("تعداد راکت آزمون", { exact: true })).toHaveText(
    "۱",
  );
  await page
    .getByRole("button", { name: "ادامه با این تجهیزات", exact: true })
    .click();
  const auth = page.getByRole("region", { name: "ورود و ادامه رزرو" });
  if (project === "desktop") {
    await auth.getByRole("button", { name: "ساخت حساب", exact: true }).click();
    await auth
      .getByLabel("شماره موبایل ایران", { exact: true })
      .fill("09120000004");
    await auth.getByRole("checkbox").check();
    await auth
      .getByRole("button", { name: "دریافت کد تأیید", exact: true })
      .click();
    await auth.getByLabel("کد تأیید", { exact: true }).fill("123456");
    await auth
      .getByRole("button", { name: "تأیید کد و ادامه", exact: true })
      .click();
  } else {
    await auth
      .getByRole("button", { name: "ورود با رمز", exact: true })
      .click();
    await auth
      .getByLabel("شماره موبایل ایران", { exact: true })
      .fill("09120000005");
    await auth
      .getByLabel("رمز عبور", { exact: true })
      .fill("browser-test-password");
    await auth
      .getByRole("button", { name: "ورود به حساب", exact: true })
      .click();
  }
  await auth.getByLabel("نام و نام خانوادگی", { exact: true }).fill(person);
  await auth
    .getByRole("combobox", { name: "سطح بازی", exact: true })
    .selectOption("1");
  await auth
    .getByRole("button", { name: "تکمیل اطلاعات و ادامه", exact: true })
    .click();
  await expect(auth).toHaveCount(0);
  await expect(page.locator("button.bg-primary:visible")).toHaveCount(1);
  if (project === "mobile") {
    expect(
      await page
        .locator(".booking-actions")
        .evaluate((el) => getComputedStyle(el).position),
    ).toBe("fixed");
    const bounds = await page.locator(".booking-actions").boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height + 1,
    );
  }
  await expect(page.getByRole("radio", { name: /کارت‌به‌کارت/ })).toBeChecked();
  await page.getByRole("checkbox").check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/wizard-review-${project}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "ادامه واریز کارت‌به‌کارت", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/payments\/[a-f0-9-]+$/);
  const payment = page.url().split("/").at(-1)!;
  await expect(
    page.getByText("کارت آزمایشی بدون واریز واقعی", { exact: true }),
  ).toBeVisible();
  const upload = async (label: string) => {
    await page.getByLabel("عکس رسید واریز", { exact: true }).setInputFiles({
      name: "test-only.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(
      page.getByRole("heading", {
        name: "رسید در انتظار بررسی است",
        exact: true,
      }),
    ).toBeVisible();
  };
  await upload("واریز کردم؛ ثبت عکس رسید");
  const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3100",
    }),
    adminPage = await context.newPage();
  await adminPage.goto("/login");
  await adminPage
    .getByRole("button", { name: "ورود با رمز", exact: true })
    .click();
  await adminPage
    .getByLabel("شماره موبایل ایران", { exact: true })
    .fill("09120000001");
  await adminPage
    .getByLabel("رمز عبور", { exact: true })
    .fill("browser-test-password");
  await adminPage
    .getByRole("button", { name: "ورود به حساب", exact: true })
    .click();
  await expect(adminPage).toHaveURL("/admin");
  await adminPage.goto("/admin/operations?tab=queue");
  await expect(
    adminPage.getByRole("heading", { name: person, exact: true }),
  ).toHaveCount(0);
  const openReceipt = async () => {
    if (await adminPage.getByRole("dialog").isVisible())
      await adminPage.keyboard.press("Escape");
    await adminPage
      .getByRole("link", { name: "بررسی واریزها", exact: true })
      .first()
      .click();
    await expect(adminPage).toHaveURL(/\/admin\/payments$/);
    await adminPage.reload();
    await adminPage
      .locator("[data-record-id]")
      .filter({ hasText: person })
      .getByRole("button", { name: /جزئیات/ })
      .click();
    await expect(
      adminPage.getByAltText("رسید واریز ارسال‌شده توسط کاربر"),
    ).toBeVisible();
  };
  await openReceipt();
  if (project === "desktop") {
    await adminPage.getByText("رد رسید با ذکر علت", { exact: true }).click();
    await adminPage
      .getByLabel("علت رد رسید", { exact: true })
      .fill("عکس رسید خوانا نیست");
    await adminPage
      .getByRole("button", { name: "رد رسید و اطلاع به کاربر", exact: true })
      .click();
    await adminPage
      .getByRole("button", { name: "تأیید و ادامه", exact: true })
      .click();
    await expect(
      adminPage.getByText("علت رد: عکس رسید خوانا نیست", { exact: false }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("alert").filter({ hasText: "عکس رسید خوانا نیست" }),
    ).toBeVisible();
    await upload("ثبت رسید اصلاح‌شده");
    await openReceipt();
  }
  await adminPage
    .getByLabel("شناسهٔ واقعی تراکنش در گردش حساب", { exact: true })
    .fill(`BROWSER_ONLY_${project}_${payment}`);
  await adminPage
    .getByRole("button", { name: "تأیید واریز پس از تطبیق حساب", exact: true })
    .click();
  await adminPage
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(
    adminPage.getByRole("button", {
      name: "تأیید واریز پس از تطبیق حساب",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "واریز بررسی و تأیید شد", exact: true }),
  ).toBeVisible();
  await page.goto("/account/bookings");
  await expect(
    page.getByText("پرداخت موفق؛ در انتظار تأیید نهایی", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("رزرو قطعی", { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: `test-results/transfer-paid-${project}.png`,
    fullPage: true,
  });
  await context.close();
});

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
  test.setTimeout(120000);
  await page.goto("/login");
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page
    .getByRole("textbox", { name: "شماره موبایل ایران", exact: true })
    .fill(
      test.info().project.name === "mobile" ? "09120000003" : "09120000002",
    );
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill("بازیکن آزمون");
  await page
    .getByRole("combobox", { name: "سطح بازی", exact: true })
    .selectOption("1");
  await page
    .getByRole("button", { name: "تکمیل اطلاعات و ادامه", exact: true })
    .click();
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
  await page.getByRole("button", { name: /بازی باز چهار نفره/ }).click();
  await page.getByLabel("عنوان بازی").fill("بازی آزمون پیگیری سانس");
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  const slot = uuid(test.info().project.name === "mobile" ? 721 : 720);
  await page.getByRole("button", { name: "رفتن به نخستین روز آزاد" }).click();
  await page.locator(`[data-slot-id="${slot}"]`).click();
  await page
    .getByRole("button", { name: "ادامه با این تجهیزات", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "اطلاعات رزروکننده" }),
  ).toHaveCount(0);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "ثبت بازی و درخواست رزرو", exact: true })
    .click();
  await expect(page).toHaveURL("/account/bookings");
  const article = page
    .locator("article")
    .filter({ hasText: "در انتظار تأیید باشگاه" })
    .last();
  await expect(article).toBeVisible();
  const countdown = article.getByRole("timer");
  await expect(countdown).toBeVisible();
  const firstTick = await countdown.innerText();
  await expect.poll(() => countdown.innerText()).not.toBe(firstTick);
  const bookingId = await article
    .locator('input[name="booking_id"]')
    .getAttribute("value");
  await expect(
    page
      .getByRole("link", { name: "پیگیری پرداخت و استرداد", exact: true })
      .first(),
  ).toBeVisible();
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
  });
  const admin = await context.newPage();
  await admin.goto("/login");
  await admin.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await admin
    .getByRole("textbox", { name: "شماره موبایل ایران", exact: true })
    .fill("09120000001");
  await admin.getByLabel("رمز عبور").fill("browser-test-password");
  await admin
    .getByRole("button", { name: "ورود به حساب", exact: true })
    .click();
  await expect(admin).toHaveURL("/admin");
  await admin.goto("/admin/operations");
  await admin
    .locator(`[data-record-id="${bookingId}"]`)
    .getByRole("button", { name: /جزئیات/ })
    .click();
  const card = admin.getByRole("dialog").first();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "پیشنهاد تاریخ و ساعت جایگزین", exact: true })
    .click();
  const replacement = admin.getByRole("dialog", {
    name: "پیشنهاد سانس جایگزین",
    exact: true,
  });
  await expect(replacement.getByText(/مبلغ رزرو تغییر نمی‌کند/)).toBeVisible();
  await replacement
    .getByRole("button", { name: "رفتن به نخستین روز آزاد" })
    .click();
  const target = uuid(test.info().project.name === "mobile" ? 723 : 722);
  // Relative fixture times can cross Tehran midnight; select the target's day,
  // rather than assuming it is on the first day with any free inventory.
  for (const day of await replacement
    .getByRole("group", { name: "انتخاب روز", exact: true })
    .getByRole("button")
    .all()) {
    if (await replacement.locator(`[data-slot-id="${target}"]`).count()) break;
    await day.click();
  }
  await replacement.locator(`[data-slot-id="${target}"]`).click();
  await admin.screenshot({
    path: `test-results/replacement-calendar-${test.info().project.name}.png`,
    fullPage: true,
  });
  await replacement
    .getByLabel("دلیل تغییر و توضیح برای کاربر")
    .fill("سانس فعلی در سایت زمین آزاد نیست؛ پیشنهاد هم‌قیمت");
  await replacement
    .getByRole("button", { name: "ارسال پیشنهاد به کاربر", exact: true })
    .click();
  await admin
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(replacement).toHaveCount(0);
  await page.reload();
  const proposed = page
    .locator("article")
    .filter({
      has: page.locator(`input[name="booking_id"][value="${bookingId}"]`),
    })
    .getByRole("region", { name: "تغییر زمان رزرو" });
  await expect(proposed.getByText(/مبلغ رزرو تغییر نمی‌کند/)).toBeVisible();
  await page.screenshot({
    path: `test-results/replacement-consent-${test.info().project.name}.png`,
    fullPage: true,
  });
  await proposed
    .getByRole("button", {
      name: "این تاریخ و ساعت را تأیید می‌کنم",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(
    page
      .getByRole("heading", {
        name: "زمان پیشنهادی تأیید شد؛ در انتظار تأیید نهایی",
      })
      .last(),
  ).toBeVisible();
  await admin.reload();
  await admin
    .locator(`[data-record-id="${bookingId}"]`)
    .getByRole("button", { name: /جزئیات/ })
    .click();
  await expect(
    card.getByText(
      "کاربر تأیید کرده؛ اکنون سانس جدید را در سایت زمین رزرو کنید.",
    ),
  ).toBeVisible();
  await card
    .getByRole("textbox", { name: "کد رزرو یا نام مسئول و مرجع تأیید زمین" })
    .fill("تأیید واقعی در دیتابیس آزمون");
  const hold = tehranDateTime(new Date(Date.now() + 50 * 60000));
  await card
    .getByRole("textbox", { name: "اعتبار رزرو یا نگه‌داشت زمین؛ ساعت تهران" })
    .fill(formatJalaliInput(hold, true));
  await card
    .getByRole("button", { name: "زمین را رزرو کردم؛ ثبت مرجع" })
    .click();
  await admin
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  // Closing the dialog precedes the asynchronous database write; wait for the
  // specific approval card to disappear before reloading the player's receipt.
  await expect(
    card.getByRole("button", {
      name: "زمین را رزرو کردم؛ ثبت مرجع",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.reload();
  const receipt = page.locator("article").filter({
    has: page.locator(`input[name="booking_id"][value="${bookingId}"]`),
  });
  await expect(
    page.getByRole("button", { name: "ادامهٔ پرداخت" }).first(),
  ).toBeEnabled();
  await expect(receipt.getByText("رزرو قطعی", { exact: true })).toHaveCount(0);
  const code = `BROWSER_${test.info().project.name.toUpperCase()}`;
  await admin.goto("/admin/operations?tab=discounts");
  await admin
    .getByRole("button", { name: "ساخت کد تخفیف", exact: true })
    .click();
  const discountForm = admin.locator("form").filter({
    has: admin.getByRole("button", { name: "ساخت کد تخفیف", exact: true }),
  });
  await discountForm.getByRole("textbox", { name: "کد انگلیسی" }).fill(code);
  await discountForm
    .getByRole("combobox", { name: "نوع تخفیف" })
    .selectOption("percent");
  await discountForm.getByLabel("مقدار (درصد یا تومان)").fill("25");
  await discountForm.getByLabel("سقف کل استفاده؛ هر حساب یک بار").fill("10");
  await discountForm
    .getByRole("textbox", { name: "تاریخ انقضا؛ تهران" })
    .fill(
      formatJalaliInput(tehranDateTime(new Date(Date.now() + 86400000)), true),
    );
  await discountForm
    .getByRole("button", { name: "ساخت کد تخفیف", exact: true })
    .click();
  await expect(
    discountForm.getByRole("status").filter({ hasText: "با موفقیت" }),
  ).toBeVisible();
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "بستن", exact: true })
    .click();
  await admin
    .getByRole("textbox", { name: "جست‌وجو در کدهای تخفیف" })
    .fill(code);
  await expect(
    admin.getByRole("heading", { name: code, exact: true }),
  ).toBeVisible();
  const coupon = page
    .locator("form")
    .filter({
      has: page.getByRole("button", { name: "اعمال کد تخفیف", exact: true }),
    })
    .last();
  const participantId = await coupon
    .locator('input[name="participant_id"]')
    .inputValue();
  await coupon.getByRole("textbox").fill(code);
  await coupon
    .getByRole("button", { name: "اعمال کد تخفیف", exact: true })
    .click();
  await expect(
    page.getByText(`کد تخفیف: ${code}`, { exact: false }),
  ).toBeVisible();
  await admin.goto("/admin/operations?tab=bookings");
  await admin
    .locator(`[data-record-id="${bookingId}"]`)
    .getByRole("button", { name: /جزئیات/ })
    .click();
  await admin
    .getByRole("dialog")
    .first()
    .getByText("معافیت مانده و رزرو بدون پرداخت", { exact: true })
    .click();
  const waiver = admin.locator("form").filter({
    has: admin.locator(
      `input[name="participant_id"][value="${participantId}"]`,
    ),
  });
  await waiver
    .getByRole("textbox", { name: "دلیل معافیت" })
    .fill("هدیه آزمون بدون پرداخت بانکی");
  await waiver
    .getByRole("button", {
      name: "صفر کردن مبلغ و تسویه بدون پرداخت",
      exact: true,
    })
    .click();
  await admin
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(waiver).toHaveCount(0);
  await admin
    .getByRole("dialog")
    .first()
    .getByRole("button", { name: "بستن", exact: true })
    .click();
  await page.reload();
  await expect(
    receipt.getByText("تسویه بدون پرداخت", { exact: true }),
  ).toBeVisible();
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
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page
    .getByRole("textbox", { name: "شماره موبایل ایران", exact: true })
    .fill("09120000001");
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
  await card
    .getByRole("button", { name: `مدیریت اتصال ${source}`, exact: true })
    .click();
  const settings = page.getByRole("dialog");
  await expect(
    settings.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)"),
  ).toHaveValue("60");
  await settings.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)").fill("90");
  await settings
    .getByRole("checkbox", { name: "همگام‌سازی فعال باشد" })
    .uncheck();
  await settings.getByRole("button", { name: "ذخیره تنظیمات اتصال" }).click();
  await expect(
    settings
      .getByRole("status")
      .filter({ hasText: "اطلاعات با موفقیت ثبت شد." }),
  ).toBeVisible();
  await page.reload();
  await card
    .getByRole("button", { name: `مدیریت اتصال ${source}`, exact: true })
    .click();
  await expect(
    settings.getByLabel("فاصله همگام‌سازی (دقیقه، ۱۵ تا ۱۴۴۰)"),
  ).toHaveValue("90");
  await expect(
    settings.getByRole("checkbox", { name: "همگام‌سازی فعال باشد" }),
  ).not.toBeChecked();
  await expect(
    settings.getByRole("button", { name: "درخواست همگام‌سازی اکنون" }),
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

import { test, expect, type Page } from "@playwright/test";
const uuid = (n: number) =>
  `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function login(page: Page, phone = "09120000001") {
  await page.goto("/login");
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page.getByLabel("شماره موبایل ایران", { exact: true }).fill(phone);
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/(admin|account)$/);
}
test("public open-game journey carries the intent and preserves the draft across navigation", async ({
  page,
}) => {
  await page.goto("/matches");
  await page
    .getByRole("link", { name: /^ساخت بازی (باز|تازه)$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/kind=open/);
  await page.goto(`/clubs/browser-test-club?kind=open`);
  await page.locator('a[href*="/book?"]').first().click();
  await expect(page).toHaveURL(/kind=open/);
  await expect(page.locator('input[name="kind"]')).toHaveValue("open");
  await page
    .getByLabel("عنوان بازی", { exact: true })
    .fill("بازی دوستانهٔ عصر");
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await page.reload();
  await expect(page.locator('input[name="title"]')).toHaveValue(
    "بازی دوستانهٔ عصر",
  );
  await expect(page.locator('input[name="kind"]')).toHaveValue("open");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("booking skips optional equipment, shows a server-checked coupon and receives an image preview", async ({
  page,
}) => {
  await login(page);
  const slot = uuid(test.info().project.name === "desktop" ? 736 : 737);
  await page.goto(
    `/clubs/browser-test-club/book?court=${uuid(703)}&slot=${slot}`,
  );
  await page.getByRole("button", { name: "مرحلهٔ بعد", exact: true }).click();
  await expect(page.locator("[data-booking-step]")).toHaveAttribute(
    "data-booking-step",
    "4",
  );
  await page.locator("summary").filter({ hasText: "تجهیزات" }).click();
  await page
    .getByRole("button", { name: "افزایش تعداد راکت آزمون", exact: true })
    .click();
  await expect(page.locator('input[name="equipment"]')).toHaveValue(
    /"quantity":1/,
  );
  await page.locator("summary").filter({ hasText: "کد تخفیف دارم" }).click();
  await page
    .getByLabel("کد تخفیف", { exact: true })
    .fill(`UX_CHECKOUT_${test.info().project.name.toUpperCase()}`);
  await page
    .getByRole("button", { name: "بررسی و اعمال تخفیف", exact: true })
    .click();
  await expect(
    page.getByText("تخفیف در مبلغ نهایی اعمال شد.", { exact: true }),
  ).toBeVisible();
  // Equipment is optional and its cost is included in the final review.
  await expect(
    page.getByRole("heading", { name: "مرور و پرداخت", exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "ادامه واریز کارت‌به‌کارت", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account\/payments\/[a-f\d-]+$/);
  await expect(
    page.getByRole("button", { name: "کپی شماره کارت", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "receipt.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(
    page.getByAltText("پیش‌نمایش رسید انتخاب‌شده؛ هنوز ارسال نشده"),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath(`fix-payment.png`),
    fullPage: true,
  });
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "واریز کردم؛ ثبت عکس رسید", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "رسید در انتظار بررسی است",
      exact: true,
    }),
  ).toBeVisible();
});
test("support request has a persistent admin record and an answer visible to its owner", async ({
  page,
}) => {
  await login(
    page,
    test.info().project.name === "desktop" ? "09120000010" : "09120000011",
  );
  await page.goto("/account/support");
  const subject = `پیگیری تجربه ${test.info().project.name}`;
  await page.getByLabel("موضوع", { exact: true }).fill(subject);
  await page
    .getByLabel("چه اتفاقی افتاده و چه کمکی نیاز داری؟", { exact: true })
    .fill("نیاز به بررسی وضعیت رزرو و زمان پاسخ دارم.");
  await page
    .getByRole("button", { name: "ثبت درخواست پیگیری", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: subject, exact: true }),
  ).toBeVisible();
  await page.context().clearCookies();
  await login(page);
  await page.goto("/admin/support?state=open");
  await page
    .getByRole("button", { name: `جزئیات ${subject}`, exact: true })
    .click();
  await expect(page).toHaveURL(/record=/);
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByLabel("پاسخ قابل نمایش به کاربر", { exact: true })
    .fill("درخواست بررسی شد؛ نتیجه در حساب قابل پیگیری است.");
  await page
    .getByRole("button", { name: "ثبت پاسخ و اطلاع به کاربر", exact: true })
    .click();
  await expect(
    page.getByText("اطلاعات با موفقیت ثبت شد.").first(),
  ).toBeVisible();
  await page.context().clearCookies();
  await login(
    page,
    test.info().project.name === "desktop" ? "09120000010" : "09120000011",
  );
  await page.goto("/account/support");
  await expect(
    page
      .locator("article")
      .filter({
        has: page.getByRole("heading", { name: subject, exact: true }),
      })
      .getByText("درخواست بررسی شد؛ نتیجه در حساب قابل پیگیری است.", {
        exact: true,
      }),
  ).toBeVisible();
});
test("administrator search, filtering and opened record survive reload", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/operations?tab=discounts");
  await page
    .getByRole("textbox", { name: "جست‌وجو در کدهای تخفیف" })
    .fill("UI_AUDIT_00");
  await expect(page.locator(".admin-record")).toHaveCount(1);
  await page
    .getByRole("button", { name: "جزئیات UI_AUDIT_00", exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "جست‌وجو در کدهای تخفیف" }),
  ).toHaveValue("UI_AUDIT_00");
});
test("operation filters follow the destination URL and browser Back", async ({
  page,
}) => {
  await login(page);
  await page.goto("/admin/operations?tab=bookings&q=نام‌ناموجود");
  const search = page.getByRole("textbox", { name: /^جست‌وجو در / });
  await expect(search).toHaveValue("نام‌ناموجود");
  await page.getByRole("link", { name: /^در انتظار باشگاه/ }).click();
  await expect(search).toHaveValue("");
  await expect(page).toHaveURL(/state=pending_club/);
  await page.goBack();
  await expect(search).toHaveValue("نام‌ناموجود");
});
test("member and admin pages stay readable without horizontal overflow", async ({
  page,
}) => {
  await login(page);
  for (const path of [
    "/account",
    "/account/profile",
    "/account/bookings",
    "/account/events",
    "/account/payments",
    "/account/notifications",
    "/account/results",
    "/account/support",
    "/admin",
    "/admin/clubs?view=calendar",
    "/admin/events",
    "/admin/support",
    "/leaderboard",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
    if (
      ["/account/profile", "/admin", "/admin/clubs?view=calendar"].includes(
        path,
      )
    )
      await page.screenshot({
        path: test
          .info()
          .outputPath(
            `fix-${path.replaceAll("/", "-").replaceAll("?", "-")}.png`,
          ),
        fullPage: true,
      });
  }
});

test("protected member destination survives login", async ({ page }) => {
  await page.goto(
    "/account/support?event=10000000-0000-4000-8000-000000000555",
  );
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page
    .getByLabel("شماره موبایل ایران", { exact: true })
    .fill("09120000001");
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(/account\/support\?event=/);
});

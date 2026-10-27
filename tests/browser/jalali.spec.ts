import { test, expect } from "@playwright/test";
test.use({ timezoneId: "America/Los_Angeles" });

test("public Persian calendar handles leap Esfand and submits the matching civil day", async ({
  page,
}) => {
  await page.goto("/matches");
  const input = page.getByRole("textbox", { name: "روز بازی؛ شمسی" });
  await page.getByRole("button", { name: "باز کردن تقویم شمسی" }).click();
  const dialog = page.getByRole("dialog").last();
  await dialog.getByRole("combobox", { name: "سال شمسی" }).selectOption("1403");
  await dialog.getByRole("combobox", { name: "ماه شمسی" }).selectOption("12");
  await dialog
    .getByRole("button", { name: "۳۰ اسفند ۱۴۰۳", exact: true })
    .click();
  await expect(dialog.getByText("۱۴۰۳/۱۲/۳۰", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "انتخاب تاریخ", exact: true })
    .click();
  await expect(input).toHaveValue("۱۴۰۳/۱۲/۳۰");
  await page.getByRole("button", { name: "جست‌وجوی بازی" }).click();
  await expect(page).toHaveURL(/date=2025-03-20/);
  await expect(input).toHaveValue("۱۴۰۳/۱۲/۳۰");
  await page.getByRole("button", { name: "باز کردن تقویم شمسی" }).click();
  await dialog.getByRole("combobox", { name: "سال شمسی" }).selectOption("1404");
  await expect(
    dialog.getByRole("button", { name: "۳۰ اسفند ۱۴۰۴", exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "ماه بعد", exact: true }).click();
  await expect(dialog.getByRole("combobox", { name: "سال شمسی" })).toHaveValue(
    "1405",
  );
  await expect(dialog.getByRole("combobox", { name: "ماه شمسی" })).toHaveValue(
    "1",
  );
  await page.screenshot({
    path: `test-results/jalali-picker-${test.info().project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await input.fill("۱۴۰۴/۱۲/۳۰");
  await page.getByRole("button", { name: "جست‌وجوی بازی" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "تاریخ یا ساعت شمسی معتبر وارد کنید." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/date=2025-03-20/);
});

test("admin creates an exact Tehran slot using Persian date/time from a foreign timezone", async ({
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
  await page.goto("/admin/clubs?view=calendar");
  await page.getByRole("button", { name: "انتشار سانس", exact: true }).click();
  const section = page.getByRole("dialog").first();
  const form = section.locator("form").filter({
    has: page.getByRole("button", { name: "انتشار سانس", exact: true }),
  });
  await form
    .getByRole("combobox", { name: "زمین", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000702");
  const day = test.info().project.name === "mobile" ? 3 : 2;
  const persianDay = day === 3 ? "۰۳" : "۰۲";
  await form
    .getByRole("textbox", { name: "شروع؛ شمسی / وقت تهران" })
    .fill(`۱۴۱۰/۰۱/${persianDay} ۱۸:۰۰`);
  await form
    .getByRole("button", { name: "انتخاب شروع؛ شمسی / وقت تهران" })
    .first()
    .click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByRole("combobox", { name: "ساعت", exact: true })
    .selectOption("14");
  await dialog
    .getByRole("combobox", { name: "دقیقه", exact: true })
    .selectOption("30");
  await dialog
    .getByRole("button", { name: "انتخاب تاریخ و ساعت", exact: true })
    .click();
  await form
    .getByRole("textbox", { name: "پایان؛ شمسی / وقت تهران" })
    .fill(`۱۴۱۰/۰۱/${persianDay} ۱۵:۳۰`);
  await form
    .getByRole("spinbutton", { name: "قیمت کل زمین برای این سانس؛ تومان" })
    .fill("200000");
  // Confirm the backend receives civil Tehran time, never the browser's Los Angeles clock.
  await expect(form.locator('input[name="starts_at"]')).toHaveValue(
    `2031-03-${day + 20}T14:30`,
  );
  await form.getByRole("button", { name: "انتشار سانس", exact: true }).click();
  await expect(
    form.getByRole("status").filter({ hasText: "اطلاعات با موفقیت ثبت شد." }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("textbox", { name: "جست‌وجو در سانس‌های منتشرشده" })
    .fill("۱۴۱۰");
  await expect(
    page
      .locator("#calendar")
      .locator(".admin-record p")
      .filter({ hasText: "۱۴۱۰" })
      .filter({ hasText: "۱۴:۳۰" }),
  ).not.toHaveCount(0);
});

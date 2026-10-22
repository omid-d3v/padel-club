import { test, expect } from "@playwright/test";
test("visitor chooses a real day and time before login; switching day clears selection", async ({
  page,
}) => {
  await page.goto(
    "/clubs/browser-test-club/book?court=10000000-0000-4000-8000-000000000703",
  );
  const calendar = page.getByRole("region", { name: "تقویم سانس‌ها" });
  await expect(
    calendar.getByRole("group", { name: "انتخاب روز" }).getByRole("button"),
  ).toHaveCount(7);
  await calendar
    .getByRole("button", { name: "رفتن به نخستین روز آزاد" })
    .click();
  const slot = calendar
    .locator("[data-slot-id]")
    .filter({ visible: true })
    .first();
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");
  await expect(
    calendar.getByText("سانس انتخاب شد", { exact: true }),
  ).toBeVisible();
  await expect(
    calendar.getByRole("link", { name: "ورود و ادامه رزرو" }),
  ).toHaveAttribute("href", /slot%3D/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/booking-calendar-${test.info().project.name}.png`,
    fullPage: true,
  });
  const days = calendar
    .getByRole("group", { name: "انتخاب روز" })
    .getByRole("button");
  await days.first().click();
  await expect(
    calendar.getByRole("link", { name: "ورود و ادامه رزرو" }),
  ).toHaveCount(0);
  await expect(
    calendar.getByText("برای این روز سانس آزادی نداریم"),
  ).toBeVisible();
  await calendar
    .getByRole("button", { name: "رفتن به نخستین روز آزاد" })
    .click();
  const id = await calendar
    .locator("[data-slot-id]")
    .first()
    .getAttribute("data-slot-id");
  await calendar.locator("[data-slot-id]").first().click();
  await calendar.getByRole("link", { name: "ورود و ادامه رزرو" }).click();
  await page
    .getByRole("textbox", { name: "ایمیل", exact: true })
    .fill("admin@example.com");
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL(/\/book\?.*slot=/);
  await expect(page.locator(`[data-slot-id="${id}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

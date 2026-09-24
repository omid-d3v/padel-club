import { test, expect } from "@playwright/test";
const tid = "10000000-0000-4000-8000-000000000100";
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "ایمیل مدیر" })
    .fill("admin@example.com");
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به پنل مدیریت" }).click();
  await expect(page).toHaveURL("/");
});
test("dashboard and round winner entry render with mobile-safe controls", async ({
  page,
}) => {
  await expect(
    page.getByRole("heading", { name: "سلام، به زمین خوش آمدید 👋" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: "مشاهده مسابقات", exact: true }).click();
  await expect(page).toHaveURL(`/tournaments/${tid}`);
  await expect(page.getByRole("heading", { name: "جدول زنده" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/tournament-${test.info().project.name}.png`,
    fullPage: true,
  });
  const teamOne = page.getByRole("button", { name: /تیم اول:/ }).first();
  await teamOne.click();
  await expect(teamOne).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "دور بعد" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "ثبت برنده راندها" }).first(),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: /حذف بازی زمین/ }).first(),
  ).toBeVisible();
});
test("player dialog and exactly eight-player selection are accessible", async ({
  page,
}) => {
  await page.goto("/players");
  await page.getByRole("button", { name: "بازیکن جدید", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "نام خانوادگی" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/player-dialog-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "بستن", exact: true }).click();
  await page.goto("/tournaments/new");
  const submit = page.getByRole("button", {
    name: "ساخت مچ‌میکینگ",
    exact: true,
  });
  await expect(submit).toBeDisabled();
  const boxes = page.getByRole("checkbox");
  for (let i = 0; i < 8; i++) await boxes.nth(i).check();
  await expect(submit).toBeEnabled();
  await expect(page.getByText("۸ از ۸ بازیکن انتخاب شده")).toBeVisible();
  await boxes.first().uncheck();
  await expect(submit).toBeDisabled();
});
test("tournament deletion requires explicit irreversible confirmation", async ({
  page,
}) => {
  await page.goto("/tournaments");
  await page
    .getByRole("button", { name: /حذف کامل مچ‌میکینگ پدل پنجشنبه/ })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "این مچ‌میکینگ کامل حذف شود؟" }),
  ).toBeVisible();
  await expect(dialog.getByText("بازیکنان باشگاه حذف نمی‌شوند")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "حذف برای همیشه" }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "انصراف" }).click();
  await expect(dialog).not.toBeVisible();
});

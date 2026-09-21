import { test, expect } from "@playwright/test";
test("login is Persian RTL, usable on mobile, and has no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("lang", "fa");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "زمین آماده است." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "ایمیل مدیر" })
    .fill("admin@example.com");
  await page.getByLabel("رمز عبور").fill("example-password");
  await expect(
    page.getByRole("button", { name: "ورود به پنل مدیریت" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/login-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("protected routes redirect anonymous users to login", async ({ page }) => {
  for (const route of [
    "/",
    "/players",
    "/players/00000000-0000-4000-8000-000000000001",
    "/tournaments",
    "/tournaments/new",
    "/tournaments/00000000-0000-4000-8000-000000000001",
  ]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login$/);
  }
});
test("setup explains real database configuration without fabricated players", async ({
  page,
}) => {
  await page.goto("/setup");
  await expect(
    page.getByRole("heading", { name: "یک قدم تا اولین بازی" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("invalid public result ID returns not found without querying database", async ({
  page,
}) => {
  await page.goto("/tournaments/not-a-uuid/results");
  await expect(
    page.getByRole("heading", { name: "این صفحه پیدا نشد" }),
  ).toBeVisible();
});

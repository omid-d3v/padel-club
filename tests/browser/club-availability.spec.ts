import { test, expect } from "@playwright/test";

test("admin disables and reactivates a club; direct public links close even in the admin session", async ({
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
  await page.goto("/admin/clubs?club=10000000-0000-4000-8000-000000000701");
  await page
    .getByRole("button", { name: "غیرفعال کردن باشگاه", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("رزرو جدید متوقف می‌شود");
  await dialog
    .getByRole("button", { name: "تأیید و ادامه", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "باشگاه غیرفعال است", exact: true }),
  ).toBeVisible();
  try {
    await page.locator('section[aria-label="وضعیت فعالیت باشگاه"]').screenshot({
      path: `test-results/club-availability-${test.info().project.name}.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const publicPage = await page.context().newPage();
    try {
      for (const url of [
        "/clubs/browser-test-club",
        "/clubs/browser-test-club/book?court=10000000-0000-4000-8000-000000000702",
      ]) {
        await publicPage.goto(url);
        // Next may already have streamed a 200 shell before notFound(). Assert
        // the actual user-facing denial and noindex, not a transport-only code.
        await expect(
          publicPage.getByRole("heading", {
            name: "این صفحه پیدا نشد",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          publicPage.locator('meta[name="robots"]').first(),
        ).toHaveAttribute("content", /noindex/);
        await expect(
          publicPage.getByRole("heading", {
            name: "باشگاه آزمون مرورگر",
            exact: true,
          }),
        ).toHaveCount(0);
      }
    } finally {
      await publicPage.close();
    }
    expect(await (await page.request.get("/clubs")).text()).not.toContain(
      "باشگاه آزمون مرورگر",
    );
  } finally {
    await page
      .getByRole("button", { name: "فعال کردن باشگاه", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "تأیید و ادامه", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "باشگاه فعال است", exact: true }),
    ).toBeVisible();
  }
  expect((await page.request.get("/clubs/browser-test-club")).status()).toBe(
    200,
  );
});

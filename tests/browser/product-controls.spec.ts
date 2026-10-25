import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page
    .getByRole("textbox", { name: "شماره موبایل ایران", exact: true })
    .fill("09120000001");
  await page.getByLabel("رمز عبور").fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL("/admin");
});
test("equipment stepper enforces stock, does not submit, and sends the selected count", async ({
  page,
}) => {
  await page.goto(
    "/clubs/browser-test-club/book?court=10000000-0000-4000-8000-000000000703",
  );
  const group = page.getByRole("group", {
    name: "انتخاب تعداد راکت آزمون",
    exact: true,
  });
  const minus = group.getByRole("button", { name: "کاهش تعداد راکت آزمون" });
  const plus = group.getByRole("button", { name: "افزایش تعداد راکت آزمون" });
  await expect(minus).toBeDisabled();
  await plus.click();
  await plus.click();
  await expect(group.locator("output")).toHaveText("۲");
  const equipment = page.locator('input[name="equipment"]');
  await expect(equipment).toHaveValue(/"quantity":2/);
  for (let i = 0; i < 6; i++) await plus.click();
  await expect(plus).toBeDisabled();
  await expect(group.locator("output")).toHaveText("۸");
  for (let i = 0; i < 8; i++) await minus.click();
  await expect(minus).toBeDisabled();
  await expect(equipment).toHaveValue("[]");
  await expect(page).toHaveURL(/\/book\?/);
  expect(await group.getByRole("spinbutton").count()).toBe(0);
  await page.screenshot({
    path: `test-results/stepper-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("booking mode tabs change the flow, preserve eligible slots, and support RTL keyboard navigation", async ({
  page,
}) => {
  await page.goto(
    "/clubs/browser-test-club/book?court=10000000-0000-4000-8000-000000000703",
  );
  const tabs = page.getByRole("tablist", { name: "شیوه بازی" });
  const privateTab = tabs.getByRole("tab", { name: /رزرو خصوصی زمین/ });
  const openTab = tabs.getByRole("tab", { name: /بازی باز چهار نفره/ });
  await expect(privateTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveCount(1);
  await expect(page.locator('input[name="kind"]')).toHaveValue("private");
  await expect(page.getByRole("textbox", { name: "عنوان بازی" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "رفتن به نخستین روز آزاد" }).click();
  const slot = page.locator("[data-slot-id]").filter({ visible: true }).first();
  await slot.click();
  const selected = await slot.getAttribute("data-slot-id");
  await page.getByRole("checkbox").check();
  await openTab.click();
  await expect(openTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator('input[name="kind"]')).toHaveValue("open");
  await expect(page.getByRole("textbox", { name: "عنوان بازی" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "برآورد سهم من در بازی" }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.locator(`[data-slot-id="${selected}"]`)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "درخواست زمین و ساخت بازی", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/booking-mode-open-${test.info().project.name}.png`,
    fullPage: true,
  });
  await openTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(privateTab).toBeFocused();
  await expect(privateTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("textbox", { name: "عنوان بازی" })).toHaveCount(
    0,
  );
  const form = page.locator("form").filter({ has: tabs });
  const payload = await form.evaluate((node) =>
    Object.fromEntries(new FormData(node as HTMLFormElement)),
  );
  expect(payload.kind).toBe("private");
  expect(payload).not.toHaveProperty("title");
  expect(payload.min_skill).toBe("");
  await page.screenshot({
    path: `test-results/booking-mode-private-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("admin lists paginate, filter, search, and restore focus from the details modal", async ({
  page,
}) => {
  await page.goto("/admin/operations?tab=discounts");
  const list = page.locator(".admin-list");
  await expect(list.locator(".admin-record")).toHaveCount(8);
  const first = await list
    .locator(".admin-record")
    .first()
    .getAttribute("data-record-id");
  await list.getByRole("button", { name: "صفحه بعد", exact: true }).click();
  await expect(list.locator(".admin-record").first()).not.toHaveAttribute(
    "data-record-id",
    first!,
  );
  const search = list.getByRole("textbox", { name: "جست‌وجو در کدهای تخفیف" });
  await search.fill("UI_AUDIT_00");
  await expect(list.locator(".admin-record")).toHaveCount(1);
  await expect(list.getByRole("button", { name: "صفحه قبل" })).toBeDisabled();
  const trigger = list.getByRole("button", {
    name: "جزئیات UI_AUDIT_00",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "به‌روزرسانی کد" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await search.fill("نام ناموجود");
  await expect(list.getByText("موردی با این جست‌وجو پیدا نشد.")).toBeVisible();
  await list.getByRole("button", { name: "پاک‌کردن فیلترها" }).click();
  await list
    .getByRole("combobox", { name: "فیلتر وضعیت کدهای تخفیف" })
    .selectOption("disabled");
  await expect(list.locator(".admin-record")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/admin-list-${test.info().project.name}.png`,
    fullPage: true,
  });
});
test("member account and profile show active navigation and mobile-safe player cards", async ({
  page,
}) => {
  for (const path of ["/account", "/account/profile"]) {
    await page.goto(path);
    await expect(
      page.locator('.account-nav a[aria-current="page"]'),
    ).toHaveCount(1);
    await expect(page.locator(".player-avatar").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/member-${path.endsWith("profile") ? "profile" : "home"}-${test.info().project.name}.png`,
      fullPage: true,
    });
  }
});

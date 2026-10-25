import { test, expect } from "@playwright/test";
test.use({ actionTimeout: 15000 });

test("phone signup stays in place through OTP and profile, then resumes the requested page", async ({
  page,
}) => {
  const mobile = test.info().project.name === "mobile";
  const phone = mobile ? "09120000007" : "09120000006";
  await page.goto("/register?next=%2Fmatches");
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByLabel("شماره موبایل ایران", { exact: true }).fill(phone);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "دریافت کد تأیید", exact: true })
    .click();
  await expect(page).toHaveURL(/\/register\?/);
  await page.getByLabel("کد تأیید", { exact: true }).fill("000000");
  await page
    .getByRole("button", { name: "تأیید کد و ادامه", exact: true })
    .click();
  await expect(page.locator(".auth-message.is-error")).toContainText(
    "کد نادرست",
  );
  await expect(page).toHaveURL(/\/register\?/);
  await page.getByLabel("کد تأیید", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "تأیید کد و ادامه", exact: true })
    .click();
  await expect(
    page.getByLabel("نام و نام خانوادگی", { exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/register\?/);
  await page
    .getByLabel("نام و نام خانوادگی", { exact: true })
    .fill(`بازیکن موبایلی ${mobile ? "موبایل" : "دسکتاپ"}`);
  await page
    .getByRole("combobox", { name: "سطح بازی", exact: true })
    .selectOption("2");
  await page.getByRole("checkbox", { name: /برای ورودهای بعدی رمز/ }).check();
  await page
    .getByLabel("رمز جدید؛ حداقل ۱۰ کاراکتر", { exact: true })
    .fill("browser-auth-new-password");
  await page
    .getByLabel("تکرار رمز جدید", { exact: true })
    .fill("browser-auth-new-password");
  await page.screenshot({
    path: `test-results/phone-profile-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "تکمیل اطلاعات و ادامه", exact: true })
    .click();
  await expect(page).toHaveURL("/matches");
  await page.goto("/account");
  await page.getByRole("button", { name: "خروج از حساب", exact: true }).click();
  await expect(page).toHaveURL("/login");
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page.getByLabel("شماره موبایل ایران", { exact: true }).fill(phone);
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill("browser-auth-new-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL("/account");
});

test("password recovery verifies the phone before accepting a new password", async ({
  page,
}) => {
  const phone =
    test.info().project.name === "mobile" ? "09120000009" : "09120000008";
  await page.goto("/forgot-password");
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByLabel("شماره موبایل ایران", { exact: true }).fill(phone);
  await page
    .getByRole("button", { name: "دریافت کد تأیید", exact: true })
    .click();
  await page.getByLabel("کد تأیید", { exact: true }).fill("123456");
  await page
    .getByRole("button", { name: "تأیید کد و ادامه", exact: true })
    .click();
  await page
    .getByLabel("رمز جدید؛ حداقل ۱۰ کاراکتر", { exact: true })
    .fill("recovered-browser-password");
  await page
    .getByLabel("تکرار رمز جدید", { exact: true })
    .fill("wrong-confirmation");
  await page
    .getByRole("button", { name: "ذخیره رمز و ورود", exact: true })
    .click();
  await expect(page.locator(".auth-message.is-error")).toContainText(
    "یکسان نیستند",
  );
  await expect(page).toHaveURL("/forgot-password");
  await page
    .getByLabel("تکرار رمز جدید", { exact: true })
    .fill("recovered-browser-password");
  await page
    .getByRole("button", { name: "ذخیره رمز و ورود", exact: true })
    .click();
  await expect(page).toHaveURL("/account");
});

test("admin signs in with phone and password and a wrong password cannot enter the panel", async ({
  page,
}) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await page.getByRole("button", { name: "ورود با رمز", exact: true }).click();
  await page
    .getByLabel("شماره موبایل ایران", { exact: true })
    .fill("09120000001");
  await page.getByLabel("رمز عبور", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page.locator(".auth-message.is-error")).toContainText(
    "شماره یا رمز عبور درست نیست",
  );
  await expect(page).toHaveURL("/login");
  await page
    .getByLabel("رمز عبور", { exact: true })
    .fill("browser-test-password");
  await page.getByRole("button", { name: "ورود به حساب", exact: true }).click();
  await expect(page).toHaveURL("/admin");
});

test("mobile navigation has labeled icons and remains usable after scrolling", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 650));
  const nav = page.getByRole("navigation", { name: "دسترسی سریع موبایل" });
  if (test.info().project.name === "mobile") {
    await expect(nav).toBeVisible();
    const clubs = nav.getByRole("link", { name: "زمین", exact: true });
    await expect(clubs.locator("svg")).toHaveCount(1);
    await clubs.click();
    await expect(page).toHaveURL("/clubs");
    await expect(
      nav.getByRole("link", { name: "زمین", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  } else {
    await expect(nav).toBeHidden();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/glass-navigation-${test.info().project.name}.png`,
    fullPage: false,
  });
});

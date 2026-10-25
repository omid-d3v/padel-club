import { test, expect } from "@playwright/test";
test("admin can create a club and validation names the invalid field", async ({
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
  await page.goto("/admin/clubs");
  await page
    .getByRole("button", { name: "افزودن باشگاه", exact: true })
    .click();
  const form = page.locator("form").filter({
    has: page.getByRole("textbox", { name: "نام باشگاه", exact: true }),
  });
  await form.evaluate((node) => ((node as HTMLFormElement).noValidate = true));
  await form
    .getByRole("textbox", { name: "نام باشگاه", exact: true })
    .fill("آ");
  await form
    .getByRole("combobox", { name: "شهر", exact: true })
    .selectOption("10000000-0000-4000-8000-000000000700");
  await form.locator('[name="slug"]').fill("Rally-" + test.info().project.name);
  await form.locator('[name="address"]').fill("رشت، نشانی آزمون");
  await form.getByRole("button", { name: "ذخیره باشگاه", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("نام");
  const name = "رالی آزمون " + test.info().project.name;
  await form
    .getByRole("textbox", { name: "نام باشگاه", exact: true })
    .fill(name);
  await form.getByRole("button", { name: "ذخیره باشگاه", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("با موفقیت");
  await page.reload();
  await expect(
    page.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
});

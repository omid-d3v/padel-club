import { describe, it, expect } from "vitest";
import {
  formText,
  formNumber,
  formSlug,
  formId,
} from "../src/lib/platform/form-values";
const data = (values: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) f.set(k, v);
  return f;
};
describe("Persian admin form contract", () => {
  it("normalizes Persian and Arabic numerals, grouped prices and decimal coordinates", () => {
    const f = data({ price: "۱٬۲۵۰٬۰۰۰", latitude: "۳۷٫۲۸", stock: "١٢" });
    expect(formNumber(f, "price", 0, 1e9)).toBe(1250000);
    expect(formNumber(f, "latitude", -90, 90, false)).toBe(37.28);
    expect(formNumber(f, "stock", 0, 100)).toBe(12);
  });
  it("accepts uppercase and surrounding whitespace in stable Latin slugs", () =>
    expect(formSlug(data({ slug: "  Rally Rasht  " }))).toBe("rally-rasht"));
  it("identifies the invalid field and never silently coerces an omitted amount to zero", () => {
    expect(() => formNumber(data({}), "price", 0, 100)).toThrow("قیمت");
    expect(() =>
      formNumber(
        data({ completion_cutoff_hours: "۳" }),
        "completion_cutoff_hours",
        4,
        72,
      ),
    ).toThrow("مهلت تکمیل");
    expect(() => formText(data({ name: "آ" }), "name", 2, 100)).toThrow("نام");
    expect(() => formSlug(data({ slug: "رشت" }))).toThrow("حروف انگلیسی");
    expect(() => formId("bad")).toThrow("گزینه");
  });
});

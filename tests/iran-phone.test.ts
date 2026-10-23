import { describe, expect, it } from "vitest";
import { iranMobile } from "../src/lib/iran-phone";

describe("Iranian mobile identities", () => {
  it("normalizes Persian, Arabic and international numbers to the same identity", () => {
    for (const phone of [
      "09123456789",
      "۰۹۱۲۳۴۵۶۷۸۹",
      "٠٩١٢٣٤٥٦٧٨٩",
      "+98 912 345 6789",
      "00989123456789",
    ])
      expect(iranMobile(phone)).toBe("+989123456789");
  });
  it("rejects landlines, foreign numbers and incomplete identities", () => {
    for (const phone of [
      "02112345678",
      "+447123456789",
      "0912345678",
      "091234567890",
      "0912abc6789",
    ])
      expect(() => iranMobile(phone)).toThrow("INVALID_IRAN_MOBILE");
  });
});

import { describe, it, expect } from "vitest";
import {
  normalizeCard,
  validCard,
  receiptExtension,
} from "../src/lib/payments/card";
describe("transfer input validation", () => {
  it("normalizes Persian card digits and validates the checksum", () => {
    expect(normalizeCard("۴۲۴۲-۴۲۴۲ ۴۲۴۲-۴۲۴۲")).toBe("4242424242424242");
    expect(validCard("4242424242424242")).toBe(true);
    for (const n of ["4242424242424241", "0000000000000000", "123", "abcd"])
      expect(validCard(n)).toBe(false);
  });
  it("rejects executable/SVG and checks image signatures rather than client MIME", () => {
    expect(
      receiptExtension(new TextEncoder().encode("<svg><script/></svg>")),
    ).toBeNull();
    expect(
      receiptExtension(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    ).toBe("png");
    expect(receiptExtension(new Uint8Array([255, 216, 255]))).toBe("jpg");
  });
});

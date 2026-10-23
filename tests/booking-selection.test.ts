import { describe, expect, it } from "vitest";
import { equipmentSelection } from "../src/lib/booking/selection";
describe("booking return selection", () => {
  const allowed = [{ id: "racket", stock: 3 }];
  it("restores only known inventory and clamps quantities, not client prices", () => {
    expect(
      equipmentSelection('{"racket":999,"unknown":2,"price":1}', allowed),
    ).toEqual({ racket: 3 });
  });
  it("rejects malformed and excessive drafts", () => {
    for (const value of [
      undefined,
      "null",
      "[]",
      "{",
      "x".repeat(4001),
      '{"racket":-1}',
      '{"racket":1.5}',
    ])
      expect(equipmentSelection(value, allowed)).toEqual({});
  });
});

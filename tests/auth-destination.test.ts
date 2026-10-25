import { describe, it, expect } from "vitest";
import { authDestination } from "../src/lib/auth-flow";
describe("post-auth destinations", () => {
  it("defaults to the dashboard authorized for the current identity", () => {
    expect(authDestination(undefined)).toBe("/account");
    expect(authDestination(undefined, true)).toBe("/admin");
    expect(authDestination("/admin/operations", false)).toBe("/account");
    expect(authDestination("/admin/operations", true)).toBe(
      "/admin/operations",
    );
  });
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\t/evil.test",
    "/%2f%2fevil.test",
    "/login",
    "/register?next=/login",
    "/onboarding",
    "/auth/confirm",
  ])("rejects an unsafe or looping return path %s", (path) => {
    expect(authDestination(path)).toBe("/account");
  });
  it("preserves booking choices and ordinary internal destinations", () => {
    expect(authDestination("/clubs/test/book?slot=123&equipment=%7B%7D")).toBe(
      "/clubs/test/book?slot=123&equipment=%7B%7D",
    );
  });
});

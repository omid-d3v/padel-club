import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithOtp, createClient } = vi.hoisted(() => ({
  signInWithOtp: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/platform/data", () => ({ requireMember: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { requestPhoneCode } from "../src/app/phone-auth-actions";

beforeEach(() => {
  vi.stubEnv("PHONE_AUTH_ENABLED", "true");
  createClient.mockResolvedValue({ auth: { signInWithOtp } });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("phone OTP requests", () => {
  it("keeps login and signup separate and sends normalized numbers", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    for (const signup of [false, true]) {
      expect((await requestPhoneCode("۰۹۱۲۳۴۵۶۷۸۹", signup)).success).toBe(
        true,
      );
      expect(signInWithOtp).toHaveBeenLastCalledWith({
        phone: "+989123456789",
        options: { shouldCreateUser: signup, channel: "sms" },
      });
    }
  });
  it("explains membership/linking when login cannot create a phone identity", async () => {
    signInWithOtp.mockResolvedValue({
      error: { code: "otp_disabled", status: 422 },
    });
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain("عضویت");
    expect(result.message).toContain("پروفایل");
  });
  it.each([
    ["over_sms_send_rate_limit", "صبر"],
    ["phone_provider_disabled", "ایمیل"],
    ["sms_send_failed", "سرویس ارسال پیامک"],
    ["hook_timeout", "سرویس ارسال پیامک"],
  ])("handles %s without leaking upstream data", async (code, text) => {
    signInWithOtp.mockResolvedValue({
      error: {
        code,
        status: 503,
        message: "private-key 09123456789 123456",
      },
    });
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain(text);
    expect(console.error).toHaveBeenCalledWith(
      "[phone-auth] OTP request failed",
      { code, status: 503 },
    );
    expect(
      JSON.stringify([result, vi.mocked(console.error).mock.calls]),
    ).not.toContain("private-key");
  });
  it("rejects invalid input without contacting Auth", async () => {
    expect((await requestPhoneCode("123", false)).message).toContain(
      "شماره موبایل ایران",
    );
    expect(createClient).not.toHaveBeenCalled();
  });
  it("does not label connection failures as invalid phone numbers", async () => {
    createClient.mockRejectedValue(new Error("private-key"));
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ارتباط");
    expect(result.message).not.toContain("private-key");
  });
  it("does not request an OTP when disabled", async () => {
    vi.stubEnv("PHONE_AUTH_ENABLED", "false");
    expect((await requestPhoneCode("09123456789", false)).success).toBe(false);
    expect(createClient).not.toHaveBeenCalled();
  });
});

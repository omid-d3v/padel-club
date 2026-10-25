import { afterEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { sendSms, smsConfig } from "../src/lib/notifications/online-payamak";
afterEach(() => vi.unstubAllEnvs());
describe("Online Payamak transport", () => {
  it("trims copied environment values and rejects a blank key before sending", () => {
    vi.stubEnv("ONLINEPAYAMAK_API_KEY", " test-key\n");
    vi.stubEnv("ONLINEPAYAMAK_OTP_TEMPLATE", " loginotp ");
    expect(smsConfig()).toMatchObject({
      apiKey: "test-key",
      otpTemplate: "loginotp",
    });
    vi.stubEnv("ONLINEPAYAMAK_API_KEY", " \n");
    expect(smsConfig).toThrow("SMS_NOT_CONFIGURED");
  });
  it("retains only numeric provider diagnostics for a rejected OTP template", async () => {
    const error = await sendSms(
      "09123456789",
      { otp: "123456" },
      { apiKey: "private-key", otpTemplate: "loginotp" },
      vi.fn().mockResolvedValue(
        Response.json(
          {
            return: { status: 432, message: "private-key 09123456789 123456" },
            entries: null,
          },
          { status: 400 },
        ),
      ),
    ).catch((error) => error);
    expect(error).toMatchObject({
      code: "SMS_PROVIDER_REJECTED",
      httpStatus: 400,
      providerStatus: 432,
    });
    expect(JSON.stringify(error)).not.toContain("private-key");
    expect(error.message).toBe("SMS_PROVIDER_REJECTED");
  });
  it("sends form-encoded OTP to the approved template and normalizes Iranian numbers", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        return: { status: 200 },
        entries: [{ messageid: 42 }],
      }),
    );
    expect(
      await sendSms(
        "۰۹۱۲۳۴۵۶۷۸۹",
        { otp: "123456" },
        { apiKey: "test-key", otpTemplate: "login" },
        fetcher,
      ),
    ).toBe("42");
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(
      "https://api.onlinepayamak.com/v1/test-key/verify/lookup.json",
    );
    expect(Object.fromEntries(init.body)).toEqual({
      receptor: "09123456789",
      template: "login",
      token: "123456",
    });
    expect(init.method).toBe("POST");
  });
  it("uses a stable provider localid for retry and rejects logical failures", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ return: { status: 418 }, entries: null }),
      );
    await expect(
      sendSms(
        "09123456789",
        { message: "رزرو ثبت شد", localId: "12300" },
        { apiKey: "secret" },
        fetcher,
      ),
    ).rejects.toThrow("SMS_PROVIDER_REJECTED");
    expect(fetcher.mock.calls[0][1].body.get("localid")).toBe("12300");
  });
  it("does not expose a secret URL in network failures", async () => {
    await expect(
      sendSms(
        "09123456789",
        { otp: "123456" },
        { apiKey: "sensitive", otpTemplate: "login" },
        vi.fn().mockRejectedValue(new Error("https://secret")),
      ),
    ).rejects.toThrow("SMS_DELIVERY_UNKNOWN");
  });
});

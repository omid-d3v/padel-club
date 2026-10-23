import { afterEach, describe, it, expect, vi } from "vitest";
import { Webhook } from "standardwebhooks";
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/notifications/online-payamak", () => ({
  sendSms: vi.fn().mockResolvedValue("42"),
}));
import { sendSms } from "../src/lib/notifications/online-payamak";
import { POST } from "../src/app/api/auth/send-sms/route";
const secret = Buffer.from(
  "test-only-hook-secret-with-enough-entropy",
).toString("base64");
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("signed Supabase SMS hook", () => {
  it("rejects unsigned requests before contacting the provider", async () => {
    vi.stubEnv("SUPABASE_SEND_SMS_HOOK_SECRET", `v1,whsec_${secret}`);
    const response = await POST(
      new Request("https://example.test/api/auth/send-sms", {
        method: "POST",
        body: JSON.stringify({
          user: { phone: "+989123456789" },
          sms: { otp: "123456" },
        }),
      }),
    );
    expect(response.status).toBe(401);
    expect(sendSms).not.toHaveBeenCalled();
  });
  it("accepts a valid short-lived signature and forwards only the verified payload", async () => {
    vi.stubEnv("SUPABASE_SEND_SMS_HOOK_SECRET", `v1,whsec_${secret}`);
    const body = JSON.stringify({
        user: { phone: "+989123456789" },
        sms: { otp: "123456" },
      }),
      time = new Date();
    const signature = new Webhook(secret).sign("sms-test-id", time, body);
    const response = await POST(
      new Request("https://example.test/api/auth/send-sms", {
        method: "POST",
        body,
        headers: {
          "webhook-id": "sms-test-id",
          "webhook-timestamp": String(Math.floor(+time / 1000)),
          "webhook-signature": signature,
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(sendSms).toHaveBeenCalledWith(
      "+989123456789",
      { otp: "123456" },
      undefined,
      expect.any(Function),
    );
  });
});

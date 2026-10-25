import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  notificationSmsTemplate,
  smsTemplates,
} from "../src/lib/notifications/sms-templates";

const { rpc, getUserById, sendSms } = vi.hoisted(() => ({
  rpc: vi.fn(),
  getUserById: vi.fn(),
  sendSms: vi.fn(),
}));
vi.mock("@/lib/supabase/trusted", () => ({
  trustedClient: () => ({ rpc, auth: { admin: { getUserById } } }),
}));
vi.mock("@/lib/notifications/online-payamak", async (original) => ({
  ...(await original<
    typeof import("../src/lib/notifications/online-payamak")
  >()),
  sendSms,
}));
vi.mock("@/lib/notifications/firebase", () => ({
  pushConfigured: () => false,
}));
import { runNotificationWorker } from "../src/lib/notifications/worker";
import { SmsError } from "../src/lib/notifications/online-payamak";

const delivery = (key: string) => ({
  id: 42,
  notification_id: "20000000-0000-4000-8000-000000000010",
  lease_token: "20000000-0000-4000-8000-000000000011",
  user_id: "20000000-0000-4000-8000-000000000012",
  channel: "sms",
  title: "متن دلخواه",
  body: "متن آزاد نباید ارسال شود",
  href: "/account/payments",
  dedupe_key: key,
  created_at: new Date().toISOString(),
});
beforeEach(() => {
  vi.stubEnv("ONLINEPAYAMAK_API_KEY", "test-key");
  vi.stubEnv("ONLINEPAYAMAK_NOTIFICATION_SMS_ENABLED", "true");
  rpc.mockResolvedValue({ data: [], error: null });
  getUserById.mockResolvedValue({
    data: { user: { phone: "989123456789", phone_confirmed_at: "2026-10-25" } },
    error: null,
  });
  sendSms.mockResolvedValue("1234");
});
afterEach(() => {
  vi.resetAllMocks();
  vi.unstubAllEnvs();
});

describe("notification SMS patterns", () => {
  it.each([
    ["booking:x", "bookingrequest"],
    ["hold:x", "bookinghold"],
    ["paid-awaiting:x", "bookingpaid"],
    ["confirmed:x", "bookingconfirmed"],
    ["confirmed-seat:x:u", "bookingconfirmed"],
    ["fulfilled:x:p:u", "bookingfulfilled"],
    ["reschedule:x:u", "bookingreschedule"],
    ["reschedule-reply:x:u", "msreschedule"],
    ["seat-expired:x", "bookingexpired"],
    ["external-quote:x", "bookingquote"],
    ["joined:x:u", "playerjoined"],
    ["receipt:x:1", "receiptsubmitted"],
    ["receipt-approved:x:1", "receiptapproved"],
    ["receipt-rejected:x:1", "receiptrejected"],
    ["refund:x", "refundrequested"],
    ["refund-completed:x", "refundcompleted"],
    ["admin:new-booking:x:u", "adminbooking"],
    ["admin:paid-booking:x:u", "adminbooking"],
    ["admin:receipt:x:1:u", "msreceipt"],
  ])("maps %s to the registered %s pattern", (key, template) => {
    expect(notificationSmsTemplate(key)).toBe(template);
  });
  it("requires explicit activation after template approval", async () => {
    vi.stubEnv("ONLINEPAYAMAK_NOTIFICATION_SMS_ENABLED", "false");
    expect((await runNotificationWorker()).configured).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  });
  it("uses only numeric identifiers in a single token; the text stays fixed", async () => {
    rpc.mockResolvedValueOnce({ data: [delivery("receipt:x:1")], error: null });
    expect((await runNotificationWorker()).sent).toBe(1);
    expect(sendSms).toHaveBeenCalledWith(
      "+989123456789",
      { template: "receiptsubmitted", token: "42" },
      undefined,
      expect.any(Function),
    );
    expect(rpc).toHaveBeenCalledWith(
      "finish_notification_delivery",
      expect.objectContaining({ p_status: "sent", p_reference: "1234" }),
    );
    for (const text of Object.values(smsTemplates)) {
      expect(text.match(/%token/g)).toHaveLength(1);
      expect(text).not.toMatch(/%token[0-9]/);
    }
  });
  it("skips unmapped types instead of sending arbitrary free text", async () => {
    rpc.mockResolvedValueOnce({ data: [delivery("new-type:x")], error: null });
    expect((await runNotificationWorker()).sent).toBe(0);
    expect(sendSms).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      "finish_notification_delivery",
      expect.objectContaining({
        p_status: "skipped",
        p_error: "SMS_TEMPLATE_UNMAPPED",
      }),
    );
  });
  it("records template rejection as a failure rather than successful delivery", async () => {
    rpc.mockResolvedValueOnce({ data: [delivery("receipt:x:1")], error: null });
    sendSms.mockRejectedValueOnce(
      new SmsError("SMS_PROVIDER_REJECTED", 400, 432),
    );
    expect((await runNotificationWorker()).failed).toBe(1);
    expect(rpc).toHaveBeenCalledWith(
      "finish_notification_delivery",
      expect.objectContaining({
        p_status: "failed",
        p_error: "SMS_PROVIDER_REJECTED:432",
      }),
    );
  });
});

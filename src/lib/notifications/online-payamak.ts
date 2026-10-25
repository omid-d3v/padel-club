import "server-only";
import { iranMobile } from "@/lib/iran-phone";
import { smsTemplates, type NotificationSmsTemplate } from "./sms-templates";

type SmsConfig = { apiKey: string; sender?: string; otpTemplate?: string };
export class SmsError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus?: number,
    public readonly providerStatus?: number,
  ) {
    super(code);
  }
}
export function smsConfig(): SmsConfig {
  const apiKey = process.env.ONLINEPAYAMAK_API_KEY?.trim();
  if (!apiKey) throw new SmsError("SMS_NOT_CONFIGURED");
  return {
    apiKey,
    sender: process.env.ONLINEPAYAMAK_SENDER?.trim(),
    otpTemplate: process.env.ONLINEPAYAMAK_OTP_TEMPLATE?.trim() || "loginotp",
  };
}

/** Never expose request URLs or provider bodies: they contain credentials and personal data. */
export async function sendSms(
  phone: string,
  payload:
    { template: NotificationSmsTemplate; token: string } | { otp: string },
  config = smsConfig(),
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const receptor = iranMobile(phone).replace(/^\+98/, "0");
  let fields: Record<string, string>;
  if ("otp" in payload) {
    if (!config.otpTemplate) throw new SmsError("SMS_TEMPLATE_NOT_CONFIGURED");
    if (!/^\d{6,10}$/.test(payload.otp)) throw new SmsError("INVALID_OTP");
    fields = { receptor, template: config.otpTemplate, token: payload.otp };
  } else {
    if (
      !Object.hasOwn(smsTemplates, payload.template) ||
      payload.template === ("loginotp" as string) ||
      !/^\d{1,20}$/.test(payload.token)
    )
      throw new SmsError("INVALID_SMS");
    fields = { receptor, template: payload.template, token: payload.token };
  }
  let response: Response;
  try {
    response = await fetcher(
      `https://api.onlinepayamak.com/v1/${encodeURIComponent(config.apiKey)}/verify/lookup.json`,
      {
        method: "POST",
        redirect: "error",
        body: new URLSearchParams(fields),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
  } catch {
    throw new SmsError("SMS_DELIVERY_UNKNOWN");
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SmsError("SMS_INVALID_RESPONSE");
  }
  const data = body as {
    return?: { status?: number };
    entries?: { messageid?: unknown }[];
  } | null;
  if (!response.ok || data?.return?.status !== 200)
    throw new SmsError(
      "SMS_PROVIDER_REJECTED",
      response.status,
      typeof data?.return?.status === "number" &&
        Number.isInteger(data.return.status)
        ? data.return.status
        : undefined,
    );
  const messageId = data.entries?.[0]?.messageid;
  if (
    (typeof messageId !== "number" && typeof messageId !== "string") ||
    !/^\d+$/.test(String(messageId))
  )
    throw new SmsError("SMS_INVALID_RESPONSE");
  return String(messageId);
}

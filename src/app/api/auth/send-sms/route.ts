import { Webhook } from "standardwebhooks";
import { sendSms, SmsError } from "@/lib/notifications/online-payamak";

export async function POST(request: Request) {
  const secret = process.env.SUPABASE_SEND_SMS_HOOK_SECRET;
  if (!secret || Number(request.headers.get("content-length")) > 32768)
    return new Response(null, { status: 503 });
  const body = await request.text();
  if (body.length > 32768) return new Response(null, { status: 413 });
  let event: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    event = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(
      body,
      Object.fromEntries(request.headers),
    ) as typeof event;
  } catch {
    return new Response(null, { status: 401 });
  }
  if (!event.user?.phone || !event.sms?.otp)
    return new Response(null, { status: 400 });
  try {
    await sendSms(
      event.user.phone,
      { otp: event.sms.otp },
      undefined,
      (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(4000) }),
    );
    return Response.json({});
  } catch (error) {
    // Log only our codes and numeric statuses; provider messages/URLs can contain PII and keys.
    console.error("[sms-hook] delivery failed", {
      code: error instanceof SmsError ? error.code : "SMS_UNEXPECTED_ERROR",
      httpStatus: error instanceof SmsError ? error.httpStatus : undefined,
      providerStatus:
        error instanceof SmsError ? error.providerStatus : undefined,
    });
    return Response.json(
      { error: { http_code: 503, message: "SMS delivery unavailable" } },
      { status: 503 },
    );
  }
}

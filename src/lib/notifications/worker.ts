import "server-only";
import { z } from "zod";
import { trustedClient } from "@/lib/supabase/trusted";
import { sendSms, SmsError } from "./online-payamak";
import { pushConfigured, sendPush } from "./firebase";
import { iranMobile } from "@/lib/iran-phone";
import { siteUrl } from "@/lib/seo";
const deliverySchema = z.object({
  id: z.number().int().positive(),
  notification_id: z.uuid(),
  channel: z.enum(["sms", "push"]),
  lease_token: z.uuid(),
  user_id: z.uuid(),
  title: z.string(),
  body: z.string(),
  href: z.string(),
  dedupe_key: z.string(),
  created_at: z.string(),
});

export async function runNotificationWorker() {
  const channels: string[] = [];
  if (process.env.ONLINEPAYAMAK_API_KEY) channels.push("sms");
  if (pushConfigured()) channels.push("push");
  if (!channels.length) return { sent: 0, failed: 0, configured: false };
  const db = trustedClient(),
    deadline = Date.now() + 45000;
  const fetcher: typeof fetch = (input, init) => {
    const remaining = deadline - Date.now();
    if (remaining < 1000) throw new Error("DELIVERY_BUDGET_EXHAUSTED");
    return fetch(input, {
      ...init,
      signal: AbortSignal.timeout(Math.min(12000, remaining)),
    });
  };
  let sent = 0,
    failed = 0;
  for (let i = 0; i < 10 && Date.now() < deadline - 25000; i++) {
    const { data, error } = await db.rpc("claim_notification_deliveries", {
      p_channels: channels,
    });
    if (error) throw new Error("DELIVERY_CLAIM_FAILED");
    const rows = z.array(deliverySchema).parse(data);
    if (!rows.length) break;
    const delivery = rows[0];
    let status: "sent" | "failed" | "skipped" = "sent",
      reference: string | undefined,
      errorCode: string | undefined;
    try {
      if (Date.now() - Date.parse(delivery.created_at) > 48 * 3600000) {
        status = "skipped";
        errorCode = "NOTICE_TOO_OLD";
      } else if (delivery.channel === "sms") {
        const { data: user, error: lookupError } =
          await db.auth.admin.getUserById(delivery.user_id);
        if (lookupError) throw new Error("RECIPIENT_LOOKUP_FAILED");
        const phone = user.user?.phone_confirmed_at
          ? user.user.phone
          : undefined;
        let phones = phone ? [phone] : [];
        if (!phone) {
          const { data: admins, error: adminsError } = await db
            .from("admins")
            .select("user_id")
            .order("user_id");
          if (adminsError) throw new Error("RECIPIENT_LOOKUP_FAILED");
          if (admins?.[0]?.user_id === delivery.user_id)
            phones = (process.env.ADMIN_NOTIFICATION_PHONES ?? "")
              .split(",")
              .map((p) => p.trim())
              .filter(Boolean);
        }
        phones = [...new Set(phones.map(iranMobile))];
        if (!phones.length) {
          status = "skipped";
          errorCode = "NO_VERIFIED_PHONE";
        }
        for (let index = 0; index < phones.length; index++) {
          // Reserve two decimal digits for distinct configured admin recipients.
          if (index >= 20) break;
          reference = await sendSms(
            phones[index],
            {
              localId: String(delivery.id * 100 + index),
              message: `رالی‌یار\n${delivery.title}\n${delivery.body}\n${siteUrl()}${delivery.href.startsWith("/") && !delivery.href.startsWith("//") ? delivery.href : "/account"}`,
            },
            undefined,
            fetcher,
          );
        }
      } else {
        const { data: devices, error: deviceError } = await db
          .from("push_devices")
          .select("device_id,token")
          .eq("user_id", delivery.user_id);
        if (deviceError) throw new Error("DEVICE_LOOKUP_FAILED");
        if (!devices?.length) {
          status = "skipped";
          errorCode = "NO_PUSH_DEVICE";
        }
        for (const device of devices ?? []) {
          const result = await sendPush(
            device.token,
            {
              id: delivery.notification_id,
              title: delivery.title,
              body: delivery.body,
              href: delivery.href,
            },
            fetcher,
          );
          if (result.invalid) {
            await db
              .from("push_devices")
              .delete()
              .eq("device_id", device.device_id)
              .eq("token", device.token);
          } else reference = result.reference;
        }
      }
    } catch (error) {
      status = "failed";
      failed++;
      errorCode =
        error instanceof SmsError
          ? error.code
          : error instanceof Error && /^[A-Z_]+$/.test(error.message)
            ? error.message
            : "DELIVERY_FAILED";
    }
    const { error: finishError } = await db.rpc(
      "finish_notification_delivery",
      {
        p_id: delivery.id,
        p_lease: delivery.lease_token,
        p_status: status,
        p_reference: reference,
        p_error: errorCode,
      },
    );
    if (finishError) throw new Error("DELIVERY_RESULT_FAILED");
    if (status === "sent") sent++;
  }
  return { sent, failed, configured: true };
}

"use server";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
import { trustedClient } from "@/lib/supabase/trusted";
import {
  requestGateway,
  verifyGateway,
  gatewayUrl,
  paymentConfigured,
} from "@/lib/payments/zarinpal";
import { siteUrl } from "@/lib/seo";
import { errorResult, type PlatformResult } from "@/app/platform-actions";
export async function beginPayment(form: FormData): Promise<PlatformResult> {
  const m = await requireMember();
  try {
    if (!paymentConfigured())
      return {
        success: false,
        message: "درگاه پرداخت هنوز تنظیم نشده است؛ هیچ مبلغی دریافت نمی‌شود.",
      };
    const participant = form.get("participant_id")
      ? z.uuid().parse(form.get("participant_id"))
      : null;
    const registration = form.get("registration_id")
      ? z.uuid().parse(form.get("registration_id"))
      : null;
    const { data: pid, error } = await m.db.rpc("start_checkout", {
      p_participant: participant,
      p_registration: registration,
    });
    if (error) throw error;
    const { data: p, error: readError } = await m.db
      .from("payments")
      .select("*")
      .eq("id", pid)
      .single();
    if (readError || !p) throw readError;
    if (p.status === "paid")
      return {
        success: true,
        message: "این پرداخت قبلاً تأیید شده است.",
        redirect: "/account/payments",
      };
    if (p.authority && p.status === "pending")
      return {
        success: true,
        message: "در حال انتقال به درگاه",
        redirect: gatewayUrl(p.authority),
      };
    const db = trustedClient();
    const { data: claimed, error: claimError } = await db.rpc(
      "claim_payment_request",
      { p_payment: p.id },
    );
    if (claimError || !claimed)
      return {
        success: false,
        message:
          "درخواست قبلی در حال بررسی است؛ برای جلوگیری از پرداخت دوباره، منتظر تعیین وضعیت بمانید.",
      };
    // No blind retry after an ambiguous timeout. The order becomes an operational priority.
    const authority = await requestGateway(
      p,
      `${siteUrl()}/api/payments/zarinpal/callback`,
    );
    const { error: attachError } = await db.rpc("attach_payment_authority", {
      p_payment: p.id,
      p_authority: authority,
    });
    if (attachError) throw attachError;
    return {
      success: true,
      message: "در حال انتقال به درگاه",
      redirect: gatewayUrl(authority),
    };
  } catch (error) {
    console.error(
      "Payment request failed",
      error instanceof Error ? error.message : "unknown",
    );
    return {
      success: false,
      message:
        "اتصال به درگاه کامل نشد. دوباره پرداخت نکنید؛ وضعیت درخواست از بخش پرداخت‌ها قابل پیگیری است.",
    };
  }
}
export async function retryVerifyPayment(
  form: FormData,
): Promise<PlatformResult> {
  const m = await requireMember();
  try {
    const pid = z.uuid().parse(form.get("payment_id"));
    const { data: p, error } = await m.db
      .from("payments")
      .select("*")
      .eq("id", pid)
      .single();
    if (error || !p || !p.authority) throw error ?? new Error("NO_AUTHORITY");
    const reference = await verifyGateway(p.authority, p.amount);
    const { error: saveError } = await trustedClient().rpc("settle_payment", {
      p_payment: p.id,
      p_reference: reference,
      p_amount: p.amount,
    });
    if (saveError) throw saveError;
    return {
      success: true,
      message: "استعلام و بررسی پرداخت انجام شد.",
      redirect: "/account/payments",
    };
  } catch (error) {
    return errorResult(error);
  }
}

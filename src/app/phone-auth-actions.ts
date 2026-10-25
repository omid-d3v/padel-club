"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { iranMobile } from "@/lib/iran-phone";
import { requireMember } from "@/lib/platform/data";
import { revalidatePath } from "next/cache";

export async function requestPhoneCode(phone: string, signup: boolean) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return {
      success: false,
      message: "ورود پیامکی هنوز فعال نشده است؛ از ایمیل استفاده کنید.",
    };
  let normalizedPhone: string;
  try {
    normalizedPhone = iranMobile(phone);
  } catch {
    return {
      success: false,
      message: "شماره موبایل ایران را کامل وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.",
    };
  }
  try {
    const db = await createClient();
    const { error } = await db.auth.signInWithOtp({
      phone: normalizedPhone,
      options: { shouldCreateUser: signup, channel: "sms" },
    });
    if (error) {
      // Never log the error object: hook errors may include provider data.
      console.error("[phone-auth] OTP request failed", {
        code: error.code?.match(/^[a-z_]{1,64}$/)?.[0] ?? "unknown",
        status: error.status,
      });
      let message = "ارسال کد انجام نشد؛ کمی بعد دوباره تلاش کنید.";
      switch (error.code) {
        case "otp_disabled":
        case "user_not_found":
          message =
            "برای ورود با موبایل، ابتدا از بخش عضویت ثبت‌نام کنید؛ اگر حساب ایمیلی دارید، با ایمیل وارد شوید و شماره را در پروفایل تأیید کنید.";
          break;
        case "over_sms_send_rate_limit":
        case "over_request_rate_limit":
          message =
            "تعداد درخواست‌ها زیاد است؛ کمی صبر کنید و دوباره کد بگیرید.";
          break;
        case "phone_provider_disabled":
        case "signup_disabled":
          message =
            "ورود یا عضویت پیامکی هنوز آماده نیست؛ از ایمیل استفاده کنید.";
          break;
        case "sms_send_failed":
        case "hook_timeout":
        case "hook_timeout_after_retry":
        case "unexpected_failure":
          message =
            "سرویس ارسال پیامک در دسترس نیست؛ کمی بعد تلاش کنید یا با ایمیل وارد شوید.";
          break;
      }
      return {
        success: false,
        message,
      };
    }
    return { success: true, message: "کد تأیید برای شمارهٔ شما ارسال شد." };
  } catch {
    console.error("[phone-auth] OTP request failed", {
      code: "request_failed",
    });
    return {
      success: false,
      message:
        "ارتباط با سرویس ورود برقرار نشد؛ کمی بعد تلاش کنید یا با ایمیل وارد شوید.",
    };
  }
}
export async function verifyPhoneCode(phone: string, code: string) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return { success: false, message: "ورود پیامکی فعال نیست." };
  try {
    const token = z
      .string()
      .regex(/^\d{6,10}$/)
      .parse(
        code
          .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
          .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632)),
      );
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({
      phone: iranMobile(phone),
      token,
      type: "sms",
    });
    if (error)
      return {
        success: false,
        message: "کد نادرست یا منقضی شده است. دوباره بررسی کنید.",
      };
    const { data: admin } = await db.rpc("is_admin");
    return {
      success: true,
      message: "شماره تأیید شد.",
      redirect: admin ? "/admin" : "/account",
    };
  } catch {
    return { success: false, message: "شماره و کد تأیید را بررسی کنید." };
  }
}
export async function requestNotificationPhone(phone: string) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return { success: false, message: "تأیید موبایل هنوز فعال نشده است." };
  const { db } = await requireMember();
  try {
    const { error } = await db.auth.updateUser({ phone: iranMobile(phone) });
    return {
      success: !error,
      message: error
        ? "ارسال کد انجام نشد؛ شماره یا محدودیت ارسال را بررسی کنید."
        : "کد تأیید شماره ارسال شد.",
    };
  } catch {
    return { success: false, message: "شماره موبایل ایران را کامل وارد کنید." };
  }
}
export async function confirmNotificationPhone(phone: string, code: string) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return { success: false, message: "تأیید موبایل هنوز فعال نشده است." };
  const { db } = await requireMember();
  try {
    const token = code
      .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
      .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
    z.string()
      .regex(/^\d{6,10}$/)
      .parse(token);
    const { error } = await db.auth.verifyOtp({
      phone: iranMobile(phone),
      token,
      type: "phone_change",
    });
    if (error)
      return { success: false, message: "کد نادرست یا منقضی شده است." };
    revalidatePath("/account/profile");
    return {
      success: true,
      message: "شماره تأیید شد؛ اعلان‌های پیامکی برای این شماره ارسال می‌شوند.",
    };
  } catch {
    return { success: false, message: "شماره و کد تأیید را بررسی کنید." };
  }
}

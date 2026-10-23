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
  try {
    const db = await createClient();
    const { error } = await db.auth.signInWithOtp({
      phone: iranMobile(phone),
      options: { shouldCreateUser: signup, channel: "sms" },
    });
    if (error)
      return {
        success: false,
        message:
          "ارسال کد انجام نشد؛ شماره را بررسی کنید یا کمی بعد دوباره تلاش کنید.",
      };
    return { success: true, message: "کد تأیید برای شمارهٔ شما ارسال شد." };
  } catch {
    return {
      success: false,
      message: "شماره موبایل ایران را کامل وارد کنید؛ مانند ۰۹۱۲۳۴۵۶۷۸۹.",
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

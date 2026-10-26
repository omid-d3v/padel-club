"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { iranMobile } from "@/lib/iran-phone";
import { requireMember } from "@/lib/platform/data";
import { revalidatePath } from "next/cache";
import { legacyAdminIdentity, phoneAuthState } from "@/lib/phone-auth";
import type { PhoneAuthResult } from "@/lib/auth-flow";

export async function requestPhoneCode(
  phone: string,
  signup: boolean,
  acceptedTerms = false,
) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return {
      success: false,
      message:
        "ارسال کد پیامکی فعلاً فعال نیست؛ اگر رمز دارید با رمز وارد شوید.",
    };
  if (signup && acceptedTerms !== true)
    return {
      success: false,
      message: "برای عضویت، قوانین و حریم خصوصی را بپذیرید.",
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
    if (signup && (await legacyAdminIdentity(normalizedPhone)))
      return {
        success: false,
        message:
          "این حساب از قبل وجود دارد؛ با شماره و رمز فعلی وارد شوید و شماره را در پروفایل تأیید کنید.",
      };
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
            "برای این شماره ابتدا از بخش عضویت حساب بسازید؛ اگر حساب قبلی دارید، ورود با رمز را امتحان کنید.";
          break;
        case "over_sms_send_rate_limit":
        case "over_request_rate_limit":
          message =
            "تعداد درخواست‌ها زیاد است؛ کمی صبر کنید و دوباره کد بگیرید.";
          break;
        case "phone_provider_disabled":
        case "signup_disabled":
          message =
            "ورود یا عضویت پیامکی فعلاً آماده نیست؛ کمی بعد دوباره تلاش کنید.";
          break;
        case "sms_send_failed":
        case "hook_timeout":
        case "hook_timeout_after_retry":
        case "unexpected_failure":
          message =
            "سرویس ارسال پیامک در دسترس نیست؛ کمی بعد تلاش کنید یا با رمز وارد شوید.";
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
      message: "ارتباط با سرویس ورود برقرار نشد؛ کمی بعد دوباره تلاش کنید.",
    };
  }
}
export async function verifyPhoneCode(
  phone: string,
  code: string,
): Promise<PhoneAuthResult> {
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
    return await phoneAuthState(db);
  } catch {
    return { success: false, message: "شماره و کد تأیید را بررسی کنید." };
  }
}
export async function signInPhonePassword(
  phone: string,
  password: string,
): Promise<PhoneAuthResult> {
  const failure = {
    success: false,
    message:
      "شماره یا رمز عبور درست نیست؛ دوباره بررسی کنید یا کد تأیید بگیرید.",
  };
  try {
    const normalized = iranMobile(phone);
    z.string().min(1).max(128).parse(password);
    const db = await createClient();
    const result = await db.auth.signInWithPassword({
      phone: normalized,
      password,
    });
    if (result.error) {
      if (result.error.code !== "invalid_credentials") return failure;
      const identity = await legacyAdminIdentity(normalized);
      if (!identity) return failure;
      const alias = await db.auth.signInWithPassword({
        email: identity.email,
        password,
      });
      if (alias.error) return failure;
      const { data: admin, error } = await db.rpc("is_admin");
      if (alias.data.user?.id !== identity.id || error || !admin) {
        await db.auth.signOut();
        return failure;
      }
    }
    return await phoneAuthState(db);
  } catch {
    return failure;
  }
}

export async function completePhoneProfile(
  input: unknown,
): Promise<PhoneAuthResult> {
  try {
    const values = z
      .object({
        displayName: z.string().trim().min(2).max(100),
        skillLevel: z.union([
          z.number().int().min(0).max(5),
          z
            .string()
            .regex(/^[0-5]$/)
            .transform(Number),
        ]),
        cityId: z.uuid().nullable(),
        password: z.union([z.literal(""), z.string().min(10).max(128)]),
        passwordConfirmation: z.string(),
      })
      .refine((v) => v.password === v.passwordConfirmation)
      .parse(input);
    const { db, admin, profile } = await requireMember();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user || (!user.phone_confirmed_at && !admin))
      return {
        success: false,
        message: "پیش از تکمیل اطلاعات، شماره موبایل را تأیید کنید.",
      };
    const { error: saveError } = await db.rpc("save_my_profile", {
      p_name: values.displayName,
      p_skill: values.skillLevel,
      p_city: values.cityId,
      p_avatar: profile?.avatar_path ?? null,
    });
    if (saveError)
      return {
        success: false,
        message: "ذخیره اطلاعات انجام نشد؛ دوباره تلاش کنید.",
      };
    if (values.password) {
      const { error: passwordError } = await db.auth.updateUser({
        password: values.password,
      });
      if (passwordError)
        return {
          success: false,
          message:
            "اطلاعات ذخیره شد؛ تنظیم رمز انجام نشد. رمز را بررسی و دوباره تلاش کنید.",
        };
    }
    revalidatePath("/", "layout");
    return await phoneAuthState(db);
  } catch {
    return {
      success: false,
      message:
        "نام، سطح بازی و یکسان بودن رمزها را بررسی کنید؛ رمز تازه حداقل ۱۰ کاراکتر باشد.",
    };
  }
}

export async function setPhonePassword(
  password: string,
  confirmation: string,
): Promise<PhoneAuthResult> {
  try {
    z.string().min(10).max(128).parse(password);
    if (password !== confirmation)
      return { success: false, message: "رمز و تکرار آن یکسان نیستند." };
    const { db, admin } = await requireMember();
    const {
      data: { user },
      error,
    } = await db.auth.getUser();
    if (error || !user || (!user.phone_confirmed_at && !admin))
      return {
        success: false,
        message: "ابتدا شماره موبایل را با کد تأیید کنید.",
      };
    const { error: updateError } = await db.auth.updateUser({ password });
    if (updateError)
      return {
        success: false,
        message: "ذخیره رمز انجام نشد؛ دوباره تلاش کنید.",
      };
    return await phoneAuthState(db);
  } catch {
    return {
      success: false,
      message: "رمز تازه باید بین ۱۰ تا ۱۲۸ کاراکتر باشد.",
    };
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
export async function resendNotificationPhone(phone: string) {
  if (process.env.PHONE_AUTH_ENABLED !== "true")
    return { success: false, message: "تأیید موبایل هنوز فعال نشده است." };
  const { db } = await requireMember();
  try {
    const { error } = await db.auth.resend({
      type: "phone_change",
      phone: iranMobile(phone),
    });
    return {
      success: !error,
      message: error
        ? "ارسال دوباره انجام نشد؛ کمی صبر کنید و دوباره تلاش کنید."
        : "کد تازه برای شمارهٔ جدید ارسال شد.",
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

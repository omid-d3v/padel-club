"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/platform/data";
import { requireAdmin } from "@/lib/auth";
import {
  normalizeCard,
  validCard,
  receiptExtension,
} from "@/lib/payments/card";
import { errorResult, type PlatformResult } from "./platform-actions";

export async function savePaymentSettings(
  form: FormData,
): Promise<PlatformResult> {
  const db = await requireAdmin();
  try {
    const card = form.get("card_enabled") === "on",
      number = normalizeCard(String(form.get("card_number") ?? ""));
    if ((number && !validCard(number)) || (card && !validCard(number)))
      return { success: false, message: "شماره کارت ۱۶ رقمی معتبر وارد کنید." };
    const { error } = await db.rpc("save_payment_settings", {
      p_zarinpal: form.get("zarinpal_enabled") === "on",
      p_card: card,
      p_number: number,
      p_holder: z.string().trim().max(100).parse(form.get("card_holder")),
    });
    if (error) throw error;
    revalidatePath("/", "layout");
    return { success: true, message: "تنظیمات روش‌های پرداخت ذخیره شد." };
  } catch (e) {
    return errorResult(e);
  }
}
export async function submitTransferReceipt(
  form: FormData,
): Promise<PlatformResult> {
  const m = await requireMember();
  try {
    const payment = z.uuid().parse(form.get("payment_id"));
    const { data: r, error: readError } = await m.db
      .from("card_transfer_receipts")
      .select("id,status,user_id")
      .eq("payment_id", payment)
      .single();
    if (
      readError ||
      !r ||
      r.user_id !== m.userId ||
      !["draft", "rejected"].includes(r.status)
    )
      throw new Error("STALE_RECEIPT");
    const file = form.get("receipt");
    if (!(file instanceof File) || !file.size || file.size > 5242880)
      return {
        success: false,
        message:
          "عکس رسید را با فرمت JPG، PNG یا WebP و حداکثر حجم ۵ مگابایت انتخاب کنید.",
      };
    const bytes = new Uint8Array(await file.arrayBuffer()),
      extension = receiptExtension(bytes);
    if (!extension)
      return {
        success: false,
        message: "فایل انتخابی عکس معتبر JPG، PNG یا WebP نیست.",
      };
    const path = `${m.userId}/${payment}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await m.db.storage
      .from("payment-receipts")
      .upload(path, bytes, {
        contentType: extension === "jpg" ? "image/jpeg" : `image/${extension}`,
        upsert: false,
      });
    if (uploadError)
      return {
        success: false,
        message:
          "بارگذاری عکس انجام نشد. مهلت پرداخت و اتصال را بررسی کنید؛ دوباره واریز نکنید.",
      };
    const { error } = await m.db.rpc("submit_card_receipt", {
      p_payment: payment,
      p_path: path,
    });
    if (error) throw error;
    revalidatePath("/account/payments");
    revalidatePath(`/account/payments/${payment}`);
    revalidatePath("/admin/operations");
    return {
      success: true,
      message: "رسید ثبت شد؛ منتظر بررسی پرداخت باشید و دوباره واریز نکنید.",
    };
  } catch (e) {
    return errorResult(e);
  }
}
export async function reviewTransferReceipt(
  form: FormData,
): Promise<PlatformResult> {
  const db = await requireAdmin();
  try {
    const { error } = await db.rpc("review_card_receipt", {
      p_receipt: z.uuid().parse(form.get("receipt_id")),
      p_revision: z.coerce
        .number()
        .int()
        .nonnegative()
        .parse(form.get("revision")),
      p_accept:
        z.enum(["accept", "reject"]).parse(form.get("decision")) === "accept",
      p_reason: String(form.get("reason") ?? ""),
      p_bank_reference: String(form.get("bank_reference") ?? ""),
    });
    if (error) {
      if (error.code === "23505")
        return {
          success: false,
          message:
            "این شناسهٔ تراکنش قبلاً برای پرداخت دیگری ثبت شده است؛ گردش حساب و پروندهٔ قبلی را بررسی کنید.",
        };
      throw error;
    }
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "نتیجهٔ بررسی پرداخت ثبت و به کاربر اطلاع داده شد.",
    };
  } catch (e) {
    return errorResult(e);
  }
}

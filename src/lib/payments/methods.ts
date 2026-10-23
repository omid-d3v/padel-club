import "server-only";
import { createClient } from "@/lib/supabase/server";
import { paymentConfigured } from "./zarinpal";
export async function paymentMethods() {
  const db = await createClient();
  const { data, error } = await db
    .from("payment_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error)
    throw new Error(
      "دریافت روش‌های پرداخت انجام نشد؛ تنظیمات و مایگریشن را بررسی کنید.",
    );
  return {
    zarinpal: !!data.zarinpal_enabled && paymentConfigured(),
    card: !!data.card_enabled,
  };
}

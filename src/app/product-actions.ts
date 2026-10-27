"use server";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
import { errorResult } from "./platform-actions";
export async function cancellationQuote(booking: string) {
  const m = await requireMember();
  try {
    const { data, error } = await m.db.rpc("booking_cancellation_quote", {
      p_booking: z.uuid().parse(booking),
    });
    if (error) throw error;
    return { success: true, message: "", quote: data };
  } catch (e) {
    return { ...(await errorResult(e)), quote: null };
  }
}
export async function previewBookingDiscount(input: {
  slot: string;
  kind: string;
  equipment: { id: string; quantity: number }[];
  code: string;
}) {
  const m = await requireMember();
  try {
    const values = z
      .object({
        slot: z.uuid(),
        kind: z.enum(["private", "open"]),
        equipment: z
          .array(
            z.object({
              id: z.uuid(),
              quantity: z.number().int().min(1).max(20),
            }),
          )
          .max(20),
        code: z.string().trim().min(3).max(40),
      })
      .parse(input);
    const { data, error } = await m.db.rpc("quote_booking_discount", {
      p_slot: values.slot,
      p_kind: values.kind,
      p_equipment: values.equipment,
      p_code: values.code,
    });
    if (error) throw error;
    return {
      success: true,
      message: "تخفیف در مبلغ نهایی اعمال شد.",
      quote: data,
    };
  } catch (e) {
    return { ...(await errorResult(e)), quote: null };
  }
}

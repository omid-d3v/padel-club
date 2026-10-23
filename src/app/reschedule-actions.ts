"use server";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";

export async function replacementCalendar(bookingId: string) {
  const db = await requireAdmin();
  const id = z.uuid().parse(bookingId);
  const { data: booking, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !booking) throw new Error("دریافت رزرو انجام نشد.");
  const { data: slot } = await db
    .from("court_slots")
    .select("*")
    .eq("id", booking.slot_id)
    .single();
  if (!slot) throw new Error("زمین رزرو پیدا نشد.");
  const now = Date.now();
  const { data, error: availabilityError } = await db.rpc("discover_slots", {
    p_court: slot.court_id,
    p_from: new Date(now).toISOString(),
    p_to: new Date(now + 14 * 86400000).toISOString(),
  });
  if (availabilityError)
    throw new Error("دریافت تقویم انجام نشد؛ دوباره تلاش کنید.");
  const duration = Date.parse(slot.ends_at) - Date.parse(slot.starts_at);
  return {
    now,
    slots: (data ?? []).filter(
      (s) =>
        s.id !== slot.id &&
        s.court_price === booking.court_price &&
        Date.parse(s.ends_at) - Date.parse(s.starts_at) === duration,
    ),
  };
}

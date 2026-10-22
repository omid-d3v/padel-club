import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, configured } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { MatchPreview } from "./types";
type Tables = Database["public"]["Tables"];
type PublicTable =
  | "cities"
  | "clubs"
  | "courts"
  | "court_slots"
  | "equipment"
  | "platform_events";
export async function publicRows<K extends PublicTable>(table: K) {
  if (!configured())
    return { rows: [] as Tables[K]["Row"][], unavailable: true };
  const db = await createClient();
  const { data, error } = await db.from(table).select("*").limit(500);
  if (error) {
    console.error("Public data unavailable", table, error.code);
    return { rows: [] as Tables[K]["Row"][], unavailable: true };
  }
  return {
    rows: (data ?? []) as unknown as Tables[K]["Row"][],
    unavailable: false,
  };
}
export const catalog = cache(async () => {
  const [cities, clubs, courts, equipment] = await Promise.all([
    publicRows("cities"),
    publicRows("clubs"),
    publicRows("courts"),
    publicRows("equipment"),
  ]);
  return {
    cities: cities.rows,
    clubs: clubs.rows.filter((c) => c.published),
    courts: courts.rows.filter((c) => c.active),
    equipment: equipment.rows.filter((e) => e.active),
    unavailable: clubs.unavailable,
  };
});
export const events = cache(() => publicRows("platform_events"));
export async function matches(
  id?: string,
  offset = 0,
  filters?: { skill?: number; city?: string; date?: string },
) {
  if (!configured()) return { rows: [] as MatchPreview[], unavailable: true };
  const db = await createClient();
  const { data, error } = await db.rpc("discover_matches", {
    p_id: id ?? null,
    p_limit: 24,
    p_offset: offset,
    p_skill: filters?.skill ?? null,
    p_city: filters?.city ?? null,
    p_date: filters?.date ?? null,
  });
  if (error) console.error("Match discovery unavailable", error.code);
  return { rows: data ?? [], unavailable: !!error };
}
export const member = cache(async () => {
  if (!configured()) return null;
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  if (error || !data?.claims.sub) return null;
  const [{ data: profile }, { data: admin }] = await Promise.all([
    db
      .from("user_profiles")
      .select("*")
      .eq("user_id", data.claims.sub)
      .maybeSingle(),
    db.rpc("is_admin"),
  ]);
  return { db, userId: data.claims.sub, profile, admin: !!admin };
});
export async function requireMember() {
  const m = await member();
  if (!m) redirect("/login");
  return m;
}
export async function ownRows<
  K extends
    | "bookings"
    | "booking_participants"
    | "payments"
    | "event_registrations"
    | "notifications"
    | "rating_history"
    | "booking_benefits",
>(table: K) {
  const m = await requireMember();
  const { data, error } = await m.db
    .from(table)
    .select("*")
    .filter("user_id", "eq", m.userId)
    .limit(500);
  if (error) throw new Error("دریافت اطلاعات حساب انجام نشد.");
  return (data ?? []) as unknown as Tables[K]["Row"][];
}

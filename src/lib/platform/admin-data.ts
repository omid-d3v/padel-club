import "server-only";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
type Tables = Database["public"]["Tables"];
export async function adminRows<K extends keyof Tables>(table: K) {
  const db = await requireAdmin();
  const rows: Tables[K]["Row"][] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .range(start, start + 499);
    if (error)
      throw new Error(
        "دریافت اطلاعات مدیریت انجام نشد؛ نصب migrationهای جدید را بررسی کنید.",
      );
    const batch = (data ?? []) as unknown as Tables[K]["Row"][];
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}

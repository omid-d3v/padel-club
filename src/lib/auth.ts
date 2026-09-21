import { cache } from "react";
import { redirect } from "next/navigation";
import { configured, createClient } from "@/lib/supabase/server";
export const requireAdmin = cache(async () => {
  if (!configured()) redirect("/setup");
  const db = await createClient();
  const { data, error } = await db.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  const { data: admin, error: adminError } = await db.rpc("is_admin");
  if (adminError || !admin) redirect("/login?error=admin");
  return db;
});

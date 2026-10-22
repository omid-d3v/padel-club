import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
export function trustedClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("TRUSTED_SERVER_NOT_CONFIGURED");
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

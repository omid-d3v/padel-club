import { createServerClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { cookies } from "next/headers";
export const configured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("YOUR_PROJECT"),
  );
export async function createClient() {
  const jar = await cookies();
  if (!configured()) throw new Error("اتصال Supabase تنظیم نشده است.");
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server Component: session refresh is handled by proxy. */
          }
        },
      },
    },
  );
}

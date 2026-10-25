import "server-only";
import { z } from "zod";
import { iranMobile } from "@/lib/iran-phone";
import { trustedClient } from "@/lib/supabase/trusted";
import type { createClient } from "@/lib/supabase/server";
import type { PhoneAuthResult } from "@/lib/auth-flow";

export function primaryAdminPhone(): string | null {
  try {
    return iranMobile(
      process.env.ADMIN_LOGIN_PHONE?.trim() ||
        (process.env.ADMIN_NOTIFICATION_PHONES ?? "").split(",")[0].trim(),
    );
  } catch {
    return null;
  }
}

/** A password-only alias for an EXISTING admin. This never creates users or grants roles. */
export async function legacyAdminIdentity(
  phone: string,
): Promise<{ id: string; email: string } | null> {
  if (phone !== primaryAdminPhone()) return null;
  const service = trustedClient();
  const requested = process.env.ADMIN_LOGIN_USER_ID?.trim();
  if (requested && !z.uuid().safeParse(requested).success) return null;
  let query = service.from("admins").select("user_id");
  if (requested) query = query.eq("user_id", requested);
  const { data: admins, error } = await query.limit(2);
  // A recipient list cannot determine which identity to use when several admins exist.
  if (error || admins?.length !== 1) return null;
  const { data, error: userError } = await service.auth.admin.getUserById(
    admins[0].user_id,
  );
  if (userError || !data.user?.email || data.user.phone) return null;
  return { id: data.user.id, email: data.user.email };
}

export async function phoneAuthState(
  db: Awaited<ReturnType<typeof createClient>>,
): Promise<PhoneAuthResult> {
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return {
      success: false,
      message: "اعتبار ورود بررسی نشد؛ دوباره تلاش کنید.",
    };
  const [profile, admin] = await Promise.all([
    db
      .from("user_profiles")
      .select("display_name,skill_level,city_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    db.rpc("is_admin"),
  ]);
  if (profile.error || admin.error)
    return {
      success: false,
      message: "دریافت اطلاعات حساب انجام نشد؛ دوباره تلاش کنید.",
    };
  const p = profile.data;
  const complete =
    !!p &&
    p.display_name.trim().length >= 2 &&
    Number.isInteger(p.skill_level) &&
    p.skill_level >= 0 &&
    p.skill_level <= 5;
  return {
    success: true,
    message: complete
      ? "خوش آمدید؛ وارد حساب شدید."
      : "شماره تأیید شد؛ حالا اطلاعات بازی خود را تکمیل کنید.",
    needsProfile: !complete,
    profile: p
      ? {
          displayName: p.display_name,
          skillLevel: p.skill_level,
          cityId: p.city_id,
        }
      : undefined,
    redirect: admin.data ? "/admin" : "/account",
  };
}

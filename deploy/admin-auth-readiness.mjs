// Read-only production troubleshooting. Never logs identities, keys or response bodies.
export async function adminAuthReadiness(env = process.env, fetcher = fetch) {
  const report = {
    configured: Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      env.SUPABASE_SECRET_KEY,
    ),
    primary_phone_configured: Boolean(
      env.ADMIN_LOGIN_PHONE?.trim() ||
      env.ADMIN_NOTIFICATION_PHONES?.split(",")[0]?.trim(),
    ),
    explicit_admin_configured: Boolean(env.ADMIN_LOGIN_USER_ID?.trim()),
  };
  if (!report.configured) return { ...report, state: "missing_configuration" };
  let stage = "settings";
  try {
    const get = async (path, key) => {
      const response = await fetcher(
        `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}${path}`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
          redirect: "error",
          cache: "no-store",
        },
      );
      if (!response.ok)
        throw Object.assign(new Error("READINESS_REQUEST_FAILED"), {
          status: response.status,
        });
      return response.json();
    };
    const settings = await get(
      "/auth/v1/settings",
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    report.phone_provider_enabled =
      typeof settings.external?.phone === "boolean"
        ? settings.external.phone
        : null;
    report.email_provider_enabled =
      typeof settings.external?.email === "boolean"
        ? settings.external.email
        : null;
    const requested = env.ADMIN_LOGIN_USER_ID?.trim();
    if (
      requested &&
      !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(requested)
    )
      return { ...report, state: "invalid_admin_selection" };
    stage = "admin_membership";
    const admins = await get(
      `/rest/v1/admins?select=user_id&limit=2${requested ? `&user_id=eq.${encodeURIComponent(requested)}` : ""}`,
      env.SUPABASE_SECRET_KEY,
    );
    report.admin_identity_resolvable =
      Array.isArray(admins) && admins.length === 1;
    if (!report.admin_identity_resolvable)
      return { ...report, state: "admin_selection_required" };
    stage = "admin_user";
    const response = await get(
      `/auth/v1/admin/users/${encodeURIComponent(admins[0].user_id)}`,
      env.SUPABASE_SECRET_KEY,
    );
    const user = response.user ?? response;
    report.admin_has_email = Boolean(user.email);
    report.admin_email_confirmed = Boolean(user.email_confirmed_at);
    report.admin_has_auth_phone = Boolean(user.phone);
    report.admin_phone_confirmed = Boolean(user.phone_confirmed_at);
    report.admin_email_identity_present =
      Array.isArray(user.identities) &&
      user.identities.some((i) => i.provider === "email");
    report.legacy_password_alias_available =
      report.primary_phone_configured &&
      report.admin_has_email &&
      !report.admin_has_auth_phone;
    return { ...report, state: "checked" };
  } catch (error) {
    return {
      ...report,
      state: "unavailable",
      stage,
      http_status: Number.isInteger(error?.status) ? error.status : null,
    };
  }
}
if (process.argv.includes("--admin-auth-readiness"))
  console.log(JSON.stringify(await adminAuthReadiness()));

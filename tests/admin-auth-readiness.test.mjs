import { describe, it, expect, vi } from "vitest";
import { adminAuthReadiness } from "../deploy/admin-auth-readiness.mjs";
const id = "20000000-0000-4000-8000-000000000001";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://auth.example.test",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key-test",
  SUPABASE_SECRET_KEY: "private-key-never-output",
  ADMIN_NOTIFICATION_PHONES: "09123456789",
  ADMIN_LOGIN_USER_ID: "",
};
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), { status });
describe("read-only admin authentication diagnostics", () => {
  it("detects a disabled phone provider and unlinked confirmed email admin without exposing identities", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ external: { phone: false, email: true } }))
      .mockResolvedValueOnce(json([{ user_id: id }]))
      .mockResolvedValueOnce(
        json({
          id,
          email: "private-admin@example.test",
          email_confirmed_at: "2026-10-27",
          phone: "",
          identities: [{ provider: "email" }],
        }),
      );
    const r = await adminAuthReadiness(env, fetcher);
    expect(r).toMatchObject({
      state: "checked",
      phone_provider_enabled: false,
      email_provider_enabled: true,
      admin_email_confirmed: true,
      admin_has_auth_phone: false,
      legacy_password_alias_available: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [, options] of fetcher.mock.calls) {
      expect(options.body).toBeUndefined();
      expect(options.method ?? "GET").toBe("GET");
    }
    const out = JSON.stringify(r);
    for (const value of [
      env.SUPABASE_SECRET_KEY,
      env.ADMIN_NOTIFICATION_PHONES,
      id,
      "private-admin@example.test",
    ])
      expect(out).not.toContain(value);
  });
  it("never echoes malformed provider settings as diagnostic fields", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          external: {
            phone: { secret: "private-key-never-output" },
            email: "private-admin@example.test",
          },
        }),
      )
      .mockResolvedValueOnce(json([]));
    const r = await adminAuthReadiness(env, fetcher);
    expect(r.phone_provider_enabled).toBeNull();
    expect(r.email_provider_enabled).toBeNull();
    expect(JSON.stringify(r)).not.toContain("private-");
  });
  it("does not guess an identity when several admins exist", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ external: { phone: true, email: true } }))
      .mockResolvedValueOnce(json([{ user_id: id }, { user_id: "other" }]));
    expect(await adminAuthReadiness(env, fetcher)).toMatchObject({
      state: "admin_selection_required",
      admin_identity_resolvable: false,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("uses explicit server-side selection and never treats a recipient as a role", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ external: { phone: true, email: true } }))
      .mockResolvedValueOnce(json([]));
    expect(
      await adminAuthReadiness({ ...env, ADMIN_LOGIN_USER_ID: id }, fetcher),
    ).toMatchObject({
      state: "admin_selection_required",
      admin_identity_resolvable: false,
    });
    expect(fetcher.mock.calls[1][0]).toContain(`user_id=eq.${id}`);
  });
  it("reports only a bounded stage and status when an API fails", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ external: { phone: false, email: true } }))
      .mockResolvedValueOnce(
        json(
          {
            message: "private-key-never-output and private-admin@example.test",
          },
          403,
        ),
      );
    const r = await adminAuthReadiness(env, fetcher);
    expect(r).toMatchObject({
      state: "unavailable",
      stage: "admin_membership",
      http_status: 403,
    });
    expect(JSON.stringify(r)).not.toContain("private-");
  });
  it("does not fetch or invent defaults when server configuration is missing", async () => {
    const fetcher = vi.fn();
    expect(await adminAuthReadiness({}, fetcher)).toMatchObject({
      state: "missing_configuration",
      configured: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireMember: vi.fn(),
  trustedClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mock.createClient }));
vi.mock("@/lib/platform/data", () => ({ requireMember: mock.requireMember }));
vi.mock("@/lib/supabase/trusted", () => ({
  trustedClient: mock.trustedClient,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import {
  requestPhoneCode,
  verifyPhoneCode,
  signInPhonePassword,
  completePhoneProfile,
  setPhonePassword,
  resendNotificationPhone,
} from "../src/app/phone-auth-actions";
import { legacyAdminIdentity } from "../src/lib/phone-auth";
const userId = "20000000-0000-4000-8000-000000000010";
const adminId = "20000000-0000-4000-8000-000000000001";
const resend = vi.fn();
const signInWithOtp = vi.fn(),
  verifyOtp = vi.fn(),
  signInWithPassword = vi.fn(),
  getUser = vi.fn(),
  updateUser = vi.fn(),
  signOut = vi.fn();
const profileRead = vi.fn(),
  rpc = vi.fn(),
  adminRows = vi.fn(),
  getAdminUser = vi.fn(),
  adminEq = vi.fn();
const db = {
  auth: {
    resend,
    signInWithOtp,
    verifyOtp,
    signInWithPassword,
    getUser,
    updateUser,
    signOut,
  },
  rpc,
  from: vi.fn(() => ({
    select: () => ({ eq: () => ({ maybeSingle: profileRead }) }),
  })),
};
const profile = { display_name: "بازیکن آزمون", skill_level: 1, city_id: null };
const verifiedUser = {
  id: userId,
  phone: "989123456789",
  phone_confirmed_at: "2026-10-25",
};
const validProfile = {
  displayName: "بازیکن تازه",
  skillLevel: "1",
  cityId: null,
  password: "",
  passwordConfirmation: "",
};
beforeEach(() => {
  vi.stubEnv("PHONE_AUTH_ENABLED", "true");
  vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "");
  vi.stubEnv("ADMIN_LOGIN_PHONE", "");
  vi.stubEnv("ADMIN_LOGIN_USER_ID", "");
  mock.createClient.mockResolvedValue(db);
  db.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: profileRead }) }),
  }));
  mock.requireMember.mockResolvedValue({
    db,
    userId,
    admin: false,
    profile: null,
  });
  signInWithOtp.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ error: null });
  signInWithPassword.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  getUser.mockResolvedValue({ data: { user: verifiedUser }, error: null });
  updateUser.mockResolvedValue({ error: null });
  signOut.mockResolvedValue({ error: null });
  profileRead.mockResolvedValue({ data: profile, error: null });
  rpc.mockImplementation(async (name: string) => ({
    data: name === "is_admin" ? false : null,
    error: null,
  }));
  adminRows.mockResolvedValue({ data: [{ user_id: adminId }], error: null });
  getAdminUser.mockResolvedValue({
    data: {
      user: { id: adminId, email: "private-admin@example.test", phone: "" },
    },
    error: null,
  });
  adminEq.mockReturnValue({ limit: adminRows });
  mock.trustedClient.mockReturnValue({
    from: vi.fn(() => ({ select: () => ({ limit: adminRows, eq: adminEq }) })),
    auth: { admin: { getUserById: getAdminUser } },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("phone OTP requests", () => {
  it("keeps login and consented signup separate and normalizes numbers", async () => {
    for (const signup of [false, true]) {
      expect(
        (await requestPhoneCode("۰۹۱۲۳۴۵۶۷۸۹", signup, true)).success,
      ).toBe(true);
      expect(signInWithOtp).toHaveBeenLastCalledWith({
        phone: "+989123456789",
        options: { shouldCreateUser: signup, channel: "sms" },
      });
    }
  });
  it("requires signup consent on the server before sending an OTP", async () => {
    expect((await requestPhoneCode("09123456789", true)).success).toBe(false);
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
  it("explains membership without directing anyone to email", async () => {
    signInWithOtp.mockResolvedValue({
      error: { code: "otp_disabled", status: 422 },
    });
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain("عضویت");
    expect(result.message).not.toContain("ایمیل");
  });
  it.each([
    ["over_sms_send_rate_limit", "صبر"],
    ["phone_provider_disabled", "فعلاً"],
    ["sms_send_failed", "سرویس ارسال پیامک"],
    ["hook_timeout", "سرویس ارسال پیامک"],
  ])("handles %s without leaking upstream data", async (code, text) => {
    signInWithOtp.mockResolvedValue({
      error: { code, status: 503, message: "private-key 09123456789 123456" },
    });
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain(text);
    expect(console.error).toHaveBeenCalledWith(
      "[phone-auth] OTP request failed",
      { code, status: 503 },
    );
    expect(
      JSON.stringify([result, vi.mocked(console.error).mock.calls]),
    ).not.toContain("private-key");
  });
  it("rejects invalid numbers before contacting Auth", async () => {
    expect((await requestPhoneCode("123", false)).message).toContain(
      "شماره موبایل ایران",
    );
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("distinguishes connection failures from phone validation", async () => {
    mock.createClient.mockRejectedValue(new Error("private-key"));
    const result = await requestPhoneCode("09123456789", false);
    expect(result.success).toBe(false);
    expect(result.message).toContain("ارتباط");
    expect(result.message).not.toContain("private-key");
  });
  it("does not request an OTP when disabled", async () => {
    vi.stubEnv("PHONE_AUTH_ENABLED", "false");
    expect((await requestPhoneCode("09123456789", false)).success).toBe(false);
    expect(mock.createClient).not.toHaveBeenCalled();
  });
  it("requires profile completion after OTP and never fabricates a profile", async () => {
    profileRead.mockResolvedValue({ data: null, error: null });
    const result = await verifyPhoneCode("۰۹۱۲۳۴۵۶۷۸۹", "۱۲۳۴۵۶");
    expect(result).toMatchObject({ success: true, needsProfile: true });
    expect(verifyOtp).toHaveBeenCalledWith({
      phone: "+989123456789",
      token: "123456",
      type: "sms",
    });
    expect(rpc).not.toHaveBeenCalledWith("save_my_profile", expect.anything());
  });
  it("keeps a wrong OTP on the verification step", async () => {
    verifyOtp.mockResolvedValue({ error: { code: "otp_expired" } });
    expect((await verifyPhoneCode("09123456789", "000000")).success).toBe(
      false,
    );
    expect(profileRead).not.toHaveBeenCalled();
  });
});

describe("phone password login and existing admin alias", () => {
  const invalid = {
    data: { user: null },
    error: { code: "invalid_credentials" },
  };
  const legacy = () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789,09120000000");
    signInWithPassword
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce({ data: { user: { id: adminId } }, error: null });
    rpc.mockResolvedValue({ data: true, error: null });
    getUser.mockResolvedValue({ data: { user: { id: adminId } }, error: null });
  };
  it("logs ordinary users in through the phone/password provider", async () => {
    expect(await signInPhonePassword("۰۹۱۲۳۴۵۶۷۸۹", "password")).toMatchObject({
      success: true,
      redirect: "/account",
      needsProfile: false,
    });
    expect(signInWithPassword).toHaveBeenCalledWith({
      phone: "+989123456789",
      password: "password",
    });
    expect(mock.trustedClient).not.toHaveBeenCalled();
  });
  it("never upgrades an ordinary account because its phone is a notification recipient", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789");
    expect(await signInPhonePassword("09123456789", "password")).toMatchObject({
      success: true,
      redirect: "/account",
    });
    expect(mock.trustedClient).not.toHaveBeenCalled();
  });
  it("uses the primary env phone only as a password alias for the sole existing admin", async () => {
    legacy();
    const result = await signInPhonePassword(
      "09123456789",
      "existing-admin-password",
    );
    expect(result).toMatchObject({ success: true, redirect: "/admin" });
    expect(signInWithPassword).toHaveBeenLastCalledWith({
      email: "private-admin@example.test",
      password: "existing-admin-password",
    });
    expect(JSON.stringify(result)).not.toContain("private-admin");
  });
  it("can authenticate the existing email admin when the phone provider is disabled", async () => {
    legacy();
    signInWithPassword
      .mockReset()
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: "phone_provider_disabled", status: 422 },
      })
      .mockResolvedValueOnce({ data: { user: { id: adminId } }, error: null });
    expect(
      await signInPhonePassword("09123456789", "existing-admin-password"),
    ).toMatchObject({ success: true, redirect: "/admin" });
    expect(signInWithPassword).toHaveBeenNthCalledWith(2, {
      email: "private-admin@example.test",
      password: "existing-admin-password",
    });
  });
  it("does not bypass rate limits or blame the password for a provider outage", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789");
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "over_request_rate_limit", status: 429 },
    });
    expect(
      (await signInPhonePassword("09123456789", "password")).message,
    ).toContain("تعداد تلاش");
    expect(mock.trustedClient).not.toHaveBeenCalled();
    signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { code: "unexpected_failure", status: 503 },
    });
    expect(
      (await signInPhonePassword("09123456789", "password")).message,
    ).toContain("ارتباط با سرویس");
    expect(mock.trustedClient).not.toHaveBeenCalled();
  });
  it("identifies an unconfirmed legacy account without leaking its email or password", async () => {
    legacy();
    signInWithPassword
      .mockReset()
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce({
        data: { user: null },
        error: { code: "email_not_confirmed", status: 400 },
      });
    const r = await signInPhonePassword("09123456789", "private-password");
    expect(r.success).toBe(false);
    expect(r.message).toContain("هنوز تأیید نشده");
    expect(JSON.stringify(r)).not.toContain("private-");
    expect(console.error).toHaveBeenLastCalledWith(
      "[phone-auth] password login failed",
      { stage: "admin_email", code: "email_not_confirmed", status: 400 },
    );
  });
  it("never creates an OTP account for an unlinked existing admin alias", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789");
    expect((await requestPhoneCode("09123456789", true, true)).success).toBe(
      false,
    );
    expect(signInWithOtp).not.toHaveBeenCalled();
  });
  it("does not treat additional notification recipients as admin login aliases", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789,09120000000");
    signInWithPassword.mockResolvedValue(invalid);
    expect((await signInPhonePassword("09120000000", "password")).success).toBe(
      false,
    );
    expect(mock.trustedClient).not.toHaveBeenCalled();
  });
  it("does not guess the admin identity when there are multiple admins", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789");
    adminRows.mockResolvedValue({
      data: [{ user_id: adminId }, { user_id: userId }],
      error: null,
    });
    expect(await legacyAdminIdentity("+989123456789")).toBeNull();
    expect(getAdminUser).not.toHaveBeenCalled();
  });
  it("filters an explicitly configured admin by membership, not a client-supplied identity", async () => {
    vi.stubEnv("ADMIN_NOTIFICATION_PHONES", "09123456789");
    vi.stubEnv("ADMIN_LOGIN_USER_ID", adminId);
    expect(await legacyAdminIdentity("+989123456789")).toEqual({
      id: adminId,
      email: "private-admin@example.test",
    });
    expect(adminEq).toHaveBeenCalledWith("user_id", adminId);
  });
  it("rejects a mismatched authenticated identity and signs it out", async () => {
    legacy();
    signInWithPassword
      .mockReset()
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce({ data: { user: { id: userId } }, error: null });
    expect((await signInPhonePassword("09123456789", "password")).success).toBe(
      false,
    );
    expect(signOut).toHaveBeenCalled();
  });
  it("rejects an alias after its admin membership has been revoked", async () => {
    legacy();
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await signInPhonePassword("09123456789", "password")).success).toBe(
      false,
    );
    expect(signOut).toHaveBeenCalled();
  });
  it("still requires the existing admin password", async () => {
    legacy();
    signInWithPassword.mockReset().mockResolvedValue(invalid);
    expect(
      (await signInPhonePassword("09123456789", "wrong-password")).success,
    ).toBe(false);
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe("profile completion and password setup", () => {
  it("saves only the current verified user's explicit profile choices", async () => {
    expect(
      (await completePhoneProfile({ ...validProfile, userId: adminId }))
        .success,
    ).toBe(true);
    expect(rpc).toHaveBeenCalledWith("save_my_profile", {
      p_name: "بازیکن تازه",
      p_skill: 1,
      p_city: null,
      p_avatar: null,
    });
  });
  it("rejects a blank skill selection and mismatched password confirmation before writing", async () => {
    expect(
      (await completePhoneProfile({ ...validProfile, skillLevel: "" })).success,
    ).toBe(false);
    expect(
      (
        await completePhoneProfile({
          ...validProfile,
          password: "long-password",
          passwordConfirmation: "different-password",
        })
      ).success,
    ).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("requires an authenticated verified phone for profile completion", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect((await completePhoneProfile(validProfile)).success).toBe(false);
    expect(rpc).not.toHaveBeenCalledWith("save_my_profile", expect.anything());
  });
  it("does not claim completion when profile storage fails", async () => {
    rpc.mockResolvedValue({ error: { code: "backend-failure" } });
    expect((await completePhoneProfile(validProfile)).success).toBe(false);
  });
  it("sets an optional password only for the active account", async () => {
    expect(
      (
        await completePhoneProfile({
          ...validProfile,
          password: "new-password",
          passwordConfirmation: "new-password",
        })
      ).success,
    ).toBe(true);
    expect(updateUser).toHaveBeenCalledWith({ password: "new-password" });
  });
  it("rejects password updates from unverified users", async () => {
    getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect(
      (await setPhonePassword("new-password", "new-password")).success,
    ).toBe(false);
    expect(updateUser).not.toHaveBeenCalled();
  });
});

it("resends a phone-change code through the authenticated resend endpoint", async () => {
  resend.mockResolvedValue({ error: null });
  expect((await resendNotificationPhone("۰۹۱۲۳۴۵۶۷۸۹")).success).toBe(true);
  expect(resend).toHaveBeenCalledWith({
    type: "phone_change",
    phone: "+989123456789",
  });
  expect((await resendNotificationPhone("bad-number")).success).toBe(false);
});

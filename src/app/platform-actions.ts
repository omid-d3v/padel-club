"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMember } from "@/lib/platform/data";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/seo";
import { isGregorianDate, tehranLocalToISO } from "@/lib/date-time";
import {
  formText,
  formNumber,
  formSlug,
  formId,
  FormValueError,
} from "@/lib/platform/form-values";
import type { Json } from "@/lib/supabase/database.types";
export type PlatformResult = {
  success: boolean;
  message: string;
  id?: string;
  redirect?: string;
};
const errors: Record<string, string> = {
  REPLACEMENT_UNAVAILABLE:
    "این سانس جایگزین دیگر آزاد نیست یا با مبلغ و مدت رزرو فعلی مطابقت ندارد. تقویم را تازه کنید.",
  PROPOSAL_EXPIRED:
    "مهلت پیشنهاد تمام شده یا وضعیت رزرو تغییر کرده است؛ از مدیر بخواهید پیشنهاد تازه‌ای ارسال کند.",
  INVALID_DISCOUNT:
    "کد تخفیف معتبر نیست، منقضی شده یا ظرفیت استفاده آن تمام شده است.",
  REASON_REQUIRED: "دلیل معافیت را وارد کنید.",
  NOT_PAYABLE:
    "ابتدا نگه‌داشت معتبر باشگاه باید ثبت شود و مهلت رزرو باقی مانده باشد.",
  INVALID_DATE:
    "تاریخ یا ساعت معتبر نیست؛ تاریخ شمسی و ساعت تهران را بررسی کنید.",
  CALENDAR_STALE:
    "تقویم باشگاه به‌روز نیست؛ پس از همگام‌سازی دوباره تلاش کنید.",
  CALENDAR_DISABLED: "ابتدا اتصال تقویم را فعال کنید.",
  COURT_CLUB_MISMATCH: "زمین انتخاب‌شده متعلق به باشگاه این اتصال نیست.",
  UNKNOWN_EXTERNAL_COURT:
    "ابتدا فهرست زمین‌ها را از منبع دریافت و سپس زمین را انتخاب کنید.",
  COURT_ALREADY_MAPPED: "این زمین به اتصال دیگری متصل است.",
  LOGIN_REQUIRED: "ابتدا وارد حساب شوید.",
  PROFILE_REQUIRED: "ابتدا نام و سطح بازی را در پروفایل تکمیل کنید.",
  SLOT_UNAVAILABLE: "این سانس دیگر در دسترس نیست؛ سانس دیگری انتخاب کنید.",
  SLOT_OVERLAP: "این بازه با سانس دیگری تداخل دارد.",
  SLOT_HAS_BOOKINGS:
    "سانس دارای سابقه رزرو است؛ زمان یا قیمت آن قابل تغییر نیست.",
  INVALID_HOLD: "مرجع تأیید و مهلت معتبر نگه‌داشت باشگاه را وارد کنید.",
  INVALID_STATUS: "وضعیت تغییر کرده است؛ صفحه را تازه کنید.",
  MATCH_FULL: "ظرفیت بازی تکمیل شده است.",
  MATCH_CLOSED: "مهلت پیوستن به بازی تمام شده است.",
  SKILL_MISMATCH: "سطح پروفایل با محدوده این بازی سازگار نیست.",
  HOLD_EXPIRED: "اعتبار نگه‌داشت باشگاه تمام شده است.",
  PAYMENT_EXPIRED: "مهلت پرداخت تمام شده است.",
  EVENT_FULL: "ظرفیت رویداد تکمیل شده است.",
  EVENT_CLOSED: "ثبت‌نام رویداد بسته است.",
  EVENT_COURTS_UNSECURED: "دو زمین رویداد هنوز تأیید نشده‌اند.",
  COURTS_ALREADY_SECURED: "زمین‌های رویداد قبلاً ثبت شده‌اند.",
  EQUIPMENT_UNAVAILABLE: "تجهیزات انتخاب‌شده در این زمان موجود نیست.",
  ADMIN_REVIEW_REQUIRED:
    "این درخواست به بررسی مدیر نیاز دارد؛ از بخش پیگیری رزرو اقدام کنید.",
  PROVIDER_REQUIRES_LIVE_QUOTE:
    "رزرو خودکار این باشگاه تا پیکربندی اتصال معتبر فعال نیست.",
  EIGHT_PAID_PLAYERS_REQUIRED: "ابتدا ثبت‌نام هشت بازیکن باید قطعی شود.",
  VERIFIED_PLAYERS_REQUIRED:
    "برای تغییر رتبه رقابتی، سطح هر چهار بازیکن باید تأیید شده باشد.",
  BOTH_TEAMS_MUST_CONFIRM: "برای نتیجه رقابتی، تأیید هر دو تیم لازم است.",
  INVALID_RESULT:
    "نتیجه فقط پس از پایان بازی و برای چهار شرکت‌کننده معتبر قابل ثبت است.",
  FORBIDDEN: "دسترسی به این عملیات ندارید.",
  ADMIN_REQUIRED: "دسترسی مدیریت لازم است.",
  PAYMENT_CONFLICT: "درخواست پرداخت در حال بررسی است؛ دوباره پرداخت نکنید.",
  FRIENDLY_RESULT_NO_RATING: "نتیجه دوستانه رتبه رقابتی را تغییر نمی‌دهد.",
  RATING_RESULT_LOCKED:
    "این نتیجه در ریتینگ اثر داشته است؛ اصلاح نیازمند بررسی مستقل تاریخچه رتبه است.",
  RESULT_LOCKED: "نتیجه نهایی شده است و قابل بازگشایی نیست.",
};
export async function errorResult(error: unknown): Promise<PlatformResult> {
  if (error instanceof FormValueError)
    return { success: false, message: error.message };
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "23505")
      return {
        success: false,
        message:
          "این نام یا نشانی کوتاه قبلاً ثبت شده؛ مقدار دیگری انتخاب کنید.",
      };
    if (error.code === "23503")
      return {
        success: false,
        message:
          "گزینه وابسته پیدا نشد؛ ابتدا شهر، باشگاه یا زمین را ثبت و سپس انتخاب کنید.",
      };
  }
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "";
  for (const [code, fa] of Object.entries(errors))
    if (message.includes(code)) return { success: false, message: fa };
  if (error instanceof z.ZodError)
    return {
      success: false,
      message: "اطلاعات فرم کامل یا معتبر نیست؛ مقدارها را بررسی کنید.",
    };
  console.error("Platform operation failed", message);
  return {
    success: false,
    message: "عملیات انجام نشد؛ اتصال و اطلاعات واردشده را بررسی کنید.",
  };
}
const id = formId;
const str = formText;
const int = (f: FormData, k: string, min = 0, max = 100000000000) =>
  formNumber(f, k, min, max);
const bool = (f: FormData, k: string) => f.get(k) === "on";
const optionalId = (f: FormData, k: string) => (f.get(k) ? id(f.get(k)) : null);
function iso(f: FormData, k: string) {
  return tehranLocalToISO(str(f, k));
}
async function upload(
  f: FormData,
  bucket: string,
  prefix: string,
  db: Awaited<ReturnType<typeof createClient>>,
) {
  const file = f.get("photo");
  if (!(file instanceof File) || !file.size) return null;
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  if (
    !types[file.type] ||
    file.size > (bucket === "avatars" ? 2097152 : 3145728)
  )
    throw new Error("INVALID_IMAGE");
  const path = `${prefix}/${crypto.randomUUID()}.${types[file.type]}`;
  const { error } = await db.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}
export async function platformAction(
  operation: string,
  form: FormData,
): Promise<PlatformResult> {
  const m = await requireMember();
  const db = operation.startsWith("admin:") ? await requireAdmin() : m.db;
  try {
    let out: { data?: unknown; error?: { message: string } | null } = {};
    let redirect: string | undefined;
    const equip = () => {
      const raw = form.get("equipment");
      if (typeof raw !== "string") return [] as Json;
      return z
        .array(
          z.object({ id: z.uuid(), quantity: z.number().int().min(1).max(20) }),
        )
        .max(20)
        .parse(JSON.parse(raw));
    };
    switch (operation) {
      case "discount":
        out = await db.rpc("apply_booking_benefit", {
          p_participant: id(form.get("participant_id")),
          p_code: str(form, "code", 3, 40).toUpperCase(),
        });
        break;
      case "admin:waive":
        out = await db.rpc("apply_booking_benefit", {
          p_participant: id(form.get("participant_id")),
          p_reason: str(form, "reason", 3, 500),
        });
        break;
      case "admin:discount":
        out = await db.from("discount_codes").upsert({
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          code: z
            .string()
            .regex(/^[A-Z0-9_-]{3,40}$/)
            .parse(str(form, "code", 3, 40).toUpperCase()),
          kind: z.enum(["percent", "fixed"]).parse(form.get("kind")),
          value:
            int(form, "value", 1, 100000000) *
            (form.get("kind") === "fixed" ? 10 : 1),
          max_uses: int(form, "max_uses", 1, 100000),
          expires_at: iso(form, "expires_at"),
          active: bool(form, "active"),
        });
        break;
      case "admin:calendar-configure":
        out = await db.rpc("configure_calendar", {
          p_id: id(form.get("connection_id")),
          p_club: optionalId(form, "club_id"),
          p_enabled: bool(form, "enabled"),
          p_interval: int(form, "interval_minutes", 15, 1440),
          p_horizon: int(form, "horizon_days", 1, 14),
        });
        break;
      case "admin:calendar-map":
        out = await db.rpc("map_calendar_court", {
          p_connection: id(form.get("connection_id")),
          p_court: id(form.get("court_id")),
          p_ref: str(form, "external_ref", 1, 100),
        });
        break;
      case "admin:calendar-unmap":
        out = await db.rpc("unmap_calendar_court", {
          p_mapping: id(form.get("mapping_id")),
        });
        break;
      case "admin:calendar-refresh":
        out = await db.rpc("request_calendar_sync", {
          p_id: id(form.get("connection_id")),
        });
        break;
      case "profile": {
        const photo = await upload(form, "avatars", m.userId, db);
        out = await db.rpc("save_my_profile", {
          p_name: str(form, "display_name", 2, 100),
          p_skill: int(form, "skill_level", 0, 5),
          p_city: optionalId(form, "city_id"),
          p_avatar: photo ?? m.profile?.avatar_path ?? null,
        });
        break;
      }
      case "request": {
        if (form.get("accept_terms") !== "on")
          return {
            success: false,
            message: "پیش از درخواست، شرایط رزرو را بپذیرید.",
          };
        const key = id(form.get("idempotency_key"));
        out = await db.rpc("request_booking", {
          p_slot: id(form.get("slot_id")),
          p_kind: z.enum(["private", "open"]).parse(form.get("kind")),
          p_key: key,
          p_title: String(form.get("title") ?? ""),
          p_description: String(form.get("description") ?? "").slice(0, 2000),
          p_min_skill:
            form.get("min_skill") !== "" ? int(form, "min_skill", 0, 5) : null,
          p_max_skill:
            form.get("max_skill") !== "" ? int(form, "max_skill", 0, 5) : null,
          p_equipment: equip(),
        });
        redirect = "/account/bookings";
        break;
      }
      case "join":
        out = await db.rpc("join_open_match", {
          p_match: id(form.get("match_id")),
          p_equipment: equip(),
        });
        redirect = "/account/bookings";
        break;
      case "withdraw":
        out = await db.rpc("withdraw_match", {
          p_match: id(form.get("match_id")),
        });
        break;
      case "cancel":
        out = await db.rpc("cancel_booking", {
          p_booking: id(form.get("booking_id")),
          p_reason: str(form, "reason", 2, 500),
        });
        break;
      case "register-event":
        out = await db.rpc("register_event", {
          p_event: id(form.get("event_id")),
        });
        redirect = "/account/events";
        break;
      case "notifications":
        out = await db.rpc("mark_notifications_read");
        break;
      case "reply-slot":
        out = await db.rpc("reply_booking_slot", {
          p_proposal: id(form.get("proposal_id")),
          p_accept: form.get("decision") === "accept",
        });
        break;
      case "admin:review-booking":
        out = await db.rpc("review_booking", {
          p_booking: id(form.get("booking_id")),
        });
        break;
      case "admin:propose-slot":
        out = await db.rpc("propose_booking_slot", {
          p_booking: id(form.get("booking_id")),
          p_slot: id(form.get("slot_id")),
          p_note: str(form, "note", 2, 500),
        });
        break;
      case "admin:fulfill-booking":
        out = await db.rpc("fulfill_booking", {
          p_booking: id(form.get("booking_id")),
          p_reference: str(form, "reference", 2, 200),
          p_hold_until: iso(form, "hold_until"),
        });
        break;
      case "event-score":
        out = await db.rpc("save_match_round_winners", {
          p_match_id: id(form.get("match_id")),
          p_version: int(form, "version", 0, 1000000),
          p_rounds: [1, 2, 3].map((n) => ({
            set_number: n,
            winner_team: form.get(`set${n}`)
              ? int(form, `set${n}`, 1, 2)
              : null,
          })),
        });
        break;
      case "submit-result":
        out = await db.rpc("submit_match_result", {
          p_match: id(form.get("match_id")),
          p_team1: [id(form.get("team1a")), id(form.get("team1b"))],
          p_team2: [id(form.get("team2a")), id(form.get("team2b"))],
          p_sets1: int(form, "sets1", 0, 3),
          p_sets2: int(form, "sets2", 0, 3),
          p_competitive: bool(form, "competitive"),
        });
        break;
      case "confirm-result":
        out = await db.rpc("confirm_match_result", {
          p_result: id(form.get("result_id")),
          p_decision: z
            .enum(["confirm", "dispute"])
            .parse(form.get("decision")),
          p_reason: String(form.get("reason") ?? "").slice(0, 1000),
        });
        break;
      case "admin:city":
        out = await db.from("cities").upsert({
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          name: str(form, "name", 2, 80),
          slug: formSlug(form),
          description: String(form.get("description") ?? "").slice(0, 2000),
        });
        break;
      case "admin:club": {
        const cid = optionalId(form, "id") ?? crypto.randomUUID();
        const photo = await upload(form, "club-images", cid, db);
        const values = {
          id: cid,
          name: str(form, "name", 2, 100),
          city_id: id(form.get("city_id")),
          slug: formSlug(form),
          address: str(form, "address", 3, 500),
          description: String(form.get("description") ?? "").slice(0, 5000),
          latitude: form.get("latitude")
            ? formNumber(form, "latitude", -90, 90, false)
            : null,
          longitude: form.get("longitude")
            ? formNumber(form, "longitude", -180, 180, false)
            : null,
          facilities: String(form.get("facilities") ?? "")
            .split("،")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 20),
          published: bool(form, "published"),
          featured: bool(form, "featured"),
          booking_mode: z
            .enum(["MANUAL_APPROVAL", "EXTERNAL_AUTOMATED"])
            .parse(form.get("booking_mode")),
          provider_key: form.get("provider_key")
            ? str(form, "provider_key", 2, 80)
            : null,
          completion_cutoff_hours: int(form, "completion_cutoff_hours", 4, 72),
          cancellation_policy: {
            full_refund_hours: int(form, "refund_hours", 0, 720),
            late_refund_percent: int(form, "late_refund_percent", 0, 100),
          },
          updated_at: new Date().toISOString(),
          ...(photo ? { photo_path: photo } : {}),
        };
        out = await db.from("clubs").upsert(values);
        break;
      }
      case "admin:court":
        out = await db.from("courts").upsert({
          sport: z
            .enum([
              "padel",
              "tennis",
              "beach_tennis",
              "squash",
              "badminton",
              "other",
            ])
            .parse(form.get("sport") ?? "padel"),
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          club_id: id(form.get("club_id")),
          name: str(form, "name", 2, 100),
          description: String(form.get("description") ?? "").slice(0, 1000),
          hourly_price: int(form, "hourly_price") * 10,
          platform_fee: int(form, "platform_fee", 0, 100000000) * 10,
          active: bool(form, "active"),
          indoor: bool(form, "indoor"),
          external_court_ref: form.get("external_court_ref")
            ? str(form, "external_court_ref", 1, 100)
            : null,
        });
        break;
      case "admin:equipment":
        out = await db.from("equipment").upsert({
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          club_id: id(form.get("club_id")),
          name: str(form, "name", 2, 100),
          kind: z.enum(["personal", "shared"]).parse(form.get("kind")),
          stock: int(form, "stock", 0, 10000),
          price: int(form, "price", 0, 1000000000) * 10,
          active: bool(form, "active"),
        });
        break;
      case "admin:slot":
        out = await db.from("court_slots").insert({
          court_id: id(form.get("court_id")),
          starts_at: iso(form, "starts_at"),
          ends_at: iso(form, "ends_at"),
          court_price: int(form, "court_price") * 10,
          published: true,
        });
        break;
      case "admin:rule":
        out = await db.from("availability_rules").upsert({
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          court_id: id(form.get("court_id")),
          weekday: int(form, "weekday", 0, 6),
          start_minute: int(form, "start_minute", 0, 1439),
          end_minute: int(form, "end_minute", 1, 1440),
          slot_minutes: int(form, "slot_minutes", 60, 120),
          price: int(form, "price") * 10,
        });
        break;
      case "admin:generate":
        out = await db.rpc("generate_court_slots", {
          p_court: id(form.get("court_id")),
          p_date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .refine(isGregorianDate)
            .parse(form.get("date")),
        });
        break;
      case "admin:approve":
        out = await db.rpc("approve_booking", {
          p_booking: id(form.get("booking_id")),
          p_reference: str(form, "reference", 2, 200),
          p_hold_until: iso(form, "hold_until"),
        });
        break;
      case "admin:refund":
        out = await db.rpc("record_refund", {
          p_refund: id(form.get("refund_id")),
          p_reference: str(form, "reference", 3, 200),
        });
        break;
      case "admin:link-player":
        out = await db.rpc("link_historical_player", {
          p_user: id(form.get("user_id")),
          p_player: id(form.get("player_id")),
        });
        break;
      case "admin:verify-skill":
        out = await db
          .from("user_profiles")
          .update({ skill_verified: bool(form, "verified") })
          .eq("user_id", id(form.get("user_id")));
        break;
      case "admin:event":
        out = await db.from("platform_events").upsert({
          ...(optionalId(form, "id") ? { id: id(form.get("id")) } : {}),
          title: str(form, "title", 2, 100),
          slug: formSlug(form),
          kind: z.enum(["americano", "tournament"]).parse(form.get("kind")),
          club_id: id(form.get("club_id")),
          organizer_id: m.userId,
          starts_at: iso(form, "starts_at"),
          registration_deadline: iso(form, "deadline"),
          capacity: int(form, "capacity", 4, 128),
          entry_fee: int(form, "entry_fee") * 10,
          published: bool(form, "published"),
          description: String(form.get("description") ?? "").slice(0, 5000),
        });
        break;
      case "admin:event-courts":
        out = await db.rpc("secure_event_courts", {
          p_event: id(form.get("event_id")),
          p_slots: [id(form.get("slot1")), id(form.get("slot2"))],
          p_reference: str(form, "reference", 2, 200),
        });
        break;
      case "admin:activate-event":
        out = await db.rpc("activate_event", {
          p_event: id(form.get("event_id")),
        });
        break;
      case "admin:event-state":
        out = await db.rpc("change_event_state", {
          p_event: id(form.get("event_id")),
          p_status: z
            .enum(["completed", "cancelled"])
            .parse(form.get("status")),
        });
        break;
      case "admin:placement":
        out = await db.rpc("save_event_placement", {
          p_registration: id(form.get("registration_id")),
          p_rank: int(form, "rank", 1, 128),
          p_points: int(form, "points", 0, 1000000),
        });
        break;
      case "admin:resolve-result":
        out = await db.rpc("resolve_match_result", {
          p_result: id(form.get("result_id")),
          p_accept: form.get("decision") === "accept",
          p_reason: str(form, "reason", 3, 1000),
          p_rating_changes: z
            .array(
              z.object({
                user_id: z.uuid(),
                rating_after: z.number().int().min(0).max(10000),
              }),
            )
            .max(4)
            .parse(
              Array.from(form.entries())
                .filter(
                  ([k, v]) =>
                    k.startsWith("rating_") && String(v).trim() !== "",
                )
                .map(([k, v]) => ({
                  user_id: k.slice(7),
                  rating_after: Number(v),
                })),
            ),
        });
        break;
      case "admin:retry-provider":
        out = await db.rpc("retry_provider_attempt", {
          p_attempt: id(form.get("attempt_id")),
        });
        break;
      default:
        return { success: false, message: "عملیات پشتیبانی نمی‌شود." };
    }
    if (out.error) return errorResult(out.error);
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "اطلاعات با موفقیت ثبت شد.",
      id: typeof out.data === "string" ? out.data : undefined,
      redirect,
    };
  } catch (error) {
    return errorResult(error);
  }
}
export async function registerAccount(form: FormData): Promise<PlatformResult> {
  try {
    const db = await createClient();
    const email = z.email().parse(form.get("email"));
    const password = z.string().min(10).max(128).parse(form.get("password"));
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
    });
    if (error)
      return {
        success: false,
        message:
          "ثبت‌نام انجام نشد؛ ایمیل، شرایط رمز و امکان ثبت‌نام پروژه را بررسی کنید.",
      };
    return {
      success: true,
      message: data.session
        ? "حساب ایجاد شد. پروفایل بازی را تکمیل کنید."
        : "درخواست ثبت‌نام ثبت شد. برای فعال‌سازی، ایمیل تأیید را بررسی کنید.",
      redirect: data.session ? "/account/profile" : undefined,
    };
  } catch (error) {
    return errorResult(error);
  }
}
export async function requestPasswordReset(
  form: FormData,
): Promise<PlatformResult> {
  try {
    const db = await createClient();
    const email = z.email().parse(form.get("email"));
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/confirm?next=/reset-password`,
    });
    if (error)
      return {
        success: false,
        message: "درخواست بازیابی ارسال نشد؛ دوباره تلاش کنید.",
      };
    return {
      success: true,
      message:
        "اگر حسابی با این ایمیل وجود داشته باشد، راهنمای بازیابی برای آن ارسال می‌شود.",
    };
  } catch (error) {
    return errorResult(error);
  }
}
export async function updatePassword(form: FormData): Promise<PlatformResult> {
  try {
    const { db } = await requireMember();
    const password = z.string().min(10).max(128).parse(form.get("password"));
    const { error } = await db.auth.updateUser({ password });
    if (error)
      return {
        success: false,
        message: "تغییر رمز انجام نشد؛ لینک بازیابی تازه دریافت کنید.",
      };
    return {
      success: true,
      message: "رمز جدید ذخیره شد.",
      redirect: "/account",
    };
  } catch (error) {
    return errorResult(error);
  }
}

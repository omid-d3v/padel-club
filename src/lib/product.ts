import { money } from "@/lib/platform/format";

export const SKILL_NAMES = [
  "تازه‌کار؛ آشنایی با قوانین",
  "مقدماتی؛ رالی‌های کوتاه",
  "متوسط؛ رالی و دیواره",
  "متوسط رو به بالا؛ بازی منظم",
  "پیشرفته؛ بازی رقابتی",
  "حرفه‌ای؛ تجربه مسابقات",
] as const;
export const SPORT_NAMES: Record<string, string> = {
  padel: "پدل",
  tennis: "تنیس",
  beach_tennis: "تنیس ساحلی",
  squash: "اسکواش",
  badminton: "بدمینتون",
  other: "سایر ورزش‌ها",
};
export const sportName = (sport: string) => SPORT_NAMES[sport] ?? sport;
export function normalizeSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[\u200c\s]+/g, " ")
    .trim();
}
export const loginHref = (path: string) =>
  `/login?next=${encodeURIComponent(path)}`;
export function supportHref(
  booking?: string,
  payment?: string,
  event?: string,
) {
  return (
    "/account/support?" +
    new URLSearchParams({
      ...(booking ? { booking } : {}),
      ...(payment ? { payment } : {}),
      ...(event ? { event } : {}),
    })
  );
}
export function refundLabel(status: string) {
  return (
    (
      {
        requested: "درخواست بازگشت وجه ثبت شد",
        processing: "در حال انجام انتقال",
        completed: "وجه برگشت داده شد",
        failed: "انتقال ناموفق؛ در حال پیگیری",
        manual_review: "در انتظار اقدام مسئول مالی",
      } as Record<string, string>
    )[status] ?? "در حال پیگیری"
  );
}
export function cancellationAmount(
  paid: number,
  policy: unknown,
  startsAt: string,
  now: number,
  full = false,
) {
  const p = policy as {
    full_refund_hours?: number;
    late_refund_percent?: number;
  } | null;
  const percent =
    full ||
    Date.parse(startsAt) - now >= Number(p?.full_refund_hours ?? 24) * 3600000
      ? 100
      : Number(p?.late_refund_percent ?? 0);
  return Math.floor((paid * Math.max(0, Math.min(100, percent))) / 100);
}
export const cancellationSummary = (paid: number, refund: number) =>
  `پرداخت معتبر: ${money(paid)}؛ بازگشت وجه: ${money(refund)}؛ کسر طبق شرایط لغو: ${money(paid - refund)}. انتقال وجه پس از بررسی مسئول مالی انجام و مرجع آن در حساب ثبت می‌شود.`;

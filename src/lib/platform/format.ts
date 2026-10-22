export const money = (rial: number) =>
  `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(rial / 10)} تومان`;
export const moment = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
export const time = (iso: string) =>
  new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
export const bookingLabels: Record<string, string> = {
  pending_club: "در انتظار تأیید باشگاه",
  awaiting_payment: "آماده پرداخت",
  collecting: "در حال تکمیل بازیکنان",
  booking_in_progress: "در حال رزرو باشگاه",
  confirmed: "رزرو قطعی",
  completed: "پایان‌یافته",
  cancelled: "لغو شده",
  expired: "مهلت تمام شده",
  needs_attention: "نیازمند بررسی",
  registration: "ثبت‌نام باز",
  active: "در حال برگزاری",
  paid: "پرداخت تأییدشده",
  reserved: "جایگاه موقت",
  interested: "اعلام علاقه‌مندی",
  pending: "در انتظار بررسی",
  requested: "درخواست استرداد",
  refund_pending: "در انتظار استرداد",
  refunded: "مستردشده",
  manual_review: "نیازمند استرداد دستی",
  failed: "ناموفق",
  created: "ایجادشده",
  processing: "در حال بررسی",
  withdrawn: "انصراف داده",
  no_show: "عدم حضور",
  disputed: "اعتراض ثبت‌شده",
  accepted: "نتیجه تأییدشده",
  rejected: "نتیجه ردشده",
  queued: "در صف",
  running: "در حال اجرا",
  unknown: "نیازمند استعلام",
  succeeded: "موفق",
};
export function cancellationText(policy: unknown) {
  if (!policy || typeof policy !== "object")
    return "شرایط لغو نیازمند بررسی باشگاه است.";
  const p = policy as Record<string, unknown>;
  const hours = Number(p.full_refund_hours);
  const percent = Number(p.late_refund_percent);
  if (!Number.isFinite(hours) || !Number.isFinite(percent))
    return "شرایط لغو نیازمند بررسی باشگاه است.";
  return `لغو تا ${new Intl.NumberFormat("fa-IR").format(hours)} ساعت قبل با استرداد کامل؛ پس از آن ${new Intl.NumberFormat("fa-IR").format(percent)} درصد مبلغ مسترد می‌شود. درخواست استرداد تا ثبت مرجع بانکی، به معنی واریز نیست.`;
}
export function safeNext(value: unknown, fallback = "/account") {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes("\n") &&
    !value.includes("\r")
    ? value
    : fallback;
}

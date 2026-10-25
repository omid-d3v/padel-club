/** Exact template names/texts to register in OnlinePayamak. Only numeric %token is dynamic. */
export const smsTemplates = {
  loginotp:
    "مچ شو\nکد تأیید شما: %token\nاین کد را در اختیار دیگران قرار ندهید.",
  bookingrequest:
    "مچ شو\nدرخواست رزرو شما ثبت شد. وضعیت پرداخت و تأیید باشگاه را در حساب خود دنبال کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookinghold:
    "مچ شو\nباشگاه سانس شما را موقتاً نگه داشته است. مهلت پرداخت را در حساب خود بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingpaid:
    "مچ شو\nپرداخت شما تأیید شد؛ رزرو در انتظار تأیید نهایی باشگاه است.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingconfirmed:
    "مچ شو\nرزرو بازی شما قطعی شد. زمان و مشخصات زمین را در حساب خود ببینید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingfulfilled:
    "مچ شو\nتأیید نهایی باشگاه ثبت شد. زمان نهایی و وضعیت پرداخت را در حساب خود بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingreschedule:
    "مچ شو\nبرای رزرو شما زمان جایگزین پیشنهاد شده است. ثبت‌کننده رزرو باید پیشنهاد را در حساب خود تأیید یا رد کند.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingexpired:
    "مچ شو\nمهلت جایگاه شما در بازی تمام شد. برای انتخاب جایگاه جدید ظرفیت را در حساب خود بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  bookingquote:
    "مچ شو\nقیمت و وضعیت باشگاه بررسی شد. مبلغ نهایی و مهلت پرداخت را در حساب خود ببینید؛ زمین هنوز قطعی نیست.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  playerjoined:
    "مچ شو\nبازیکن جدیدی به بازی شما پیوست. ترکیب بازیکنان را در حساب خود ببینید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/bookings",
  receiptsubmitted:
    "مچ شو\nرسید واریز شما دریافت شد و در انتظار بررسی است. دوباره واریز نکنید؛ ثبت رسید به معنی قطعی شدن رزرو نیست.\nشناسه اعلان: %token\nhttps://match-sho.com/account/payments",
  receiptapproved:
    "مچ شو\nواریز کارت‌به‌کارت شما تأیید شد. وضعیت رزرو یا استرداد احتمالی را در حساب خود بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/payments",
  receiptrejected:
    "مچ شو\nرسید واریز شما نیازمند اصلاح است. علت را در حساب خود ببینید؛ اگر وجه کسر شده دوباره واریز نکنید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/payments",
  refundrequested:
    "مچ شو\nدرخواست استرداد وجه شما ثبت شد. نتیجه و مرجع بانکی پس از انجام استرداد در حساب ثبت می‌شود.\nشناسه اعلان: %token\nhttps://match-sho.com/account/payments",
  refundcompleted:
    "مچ شو\nاسترداد وجه شما انجام شد. مرجع بانکی را در سوابق پرداخت خود ببینید.\nشناسه اعلان: %token\nhttps://match-sho.com/account/payments",
  adminbooking:
    "مچ شو - مدیر\nیک درخواست رزرو نیازمند اقدام شماست. وضعیت پرداخت و رزرو را در صف مدیریت بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/admin/operations?tab=queue",
  adminreceipt:
    "مچ شو - مدیر\nرسید کارت‌به‌کارت جدید برای بررسی ثبت شد. پیش از تأیید، واریز را با گردش حساب تطبیق دهید.\nشناسه اعلان: %token\nhttps://match-sho.com/admin/operations?tab=receipts",
  adminreschedule:
    "مچ شو - مدیر\nپاسخ کاربر به پیشنهاد زمان جایگزین ثبت شد. نتیجه را در صف مدیریت بررسی کنید.\nشناسه اعلان: %token\nhttps://match-sho.com/admin/operations?tab=queue",
} as const;

export type NotificationSmsTemplate = Exclude<
  keyof typeof smsTemplates,
  "loginotp"
>;

const eventTemplates: Record<string, NotificationSmsTemplate> = {
  booking: "bookingrequest",
  hold: "bookinghold",
  "paid-awaiting": "bookingpaid",
  confirmed: "bookingconfirmed",
  "confirmed-seat": "bookingconfirmed",
  fulfilled: "bookingfulfilled",
  reschedule: "bookingreschedule",
  "seat-expired": "bookingexpired",
  "external-quote": "bookingquote",
  joined: "playerjoined",
  receipt: "receiptsubmitted",
  "receipt-approved": "receiptapproved",
  "receipt-rejected": "receiptrejected",
  refund: "refundrequested",
  "refund-completed": "refundcompleted",
  "admin:new-booking": "adminbooking",
  "admin:paid-booking": "adminbooking",
  "admin:receipt": "adminreceipt",
  "reschedule-reply": "adminreschedule",
};

export function notificationSmsTemplate(
  dedupeKey: string,
): NotificationSmsTemplate | undefined {
  const parts = dedupeKey.split(":");
  const event = parts[0] === "admin" ? parts.slice(0, 2).join(":") : parts[0];
  return Object.hasOwn(eventTemplates, event)
    ? eventTemplates[event]
    : undefined;
}

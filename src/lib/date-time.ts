export const TIME_ZONE = "Asia/Tehran";
export const PERSIAN_LOCALE = "fa-IR-u-ca-persian";
export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;
export const DAY_MS = 86400000;
export type JalaliDate = { year: number; month: number; day: number };
const persianParts = new Intl.DateTimeFormat("en-US", {
  calendar: "persian",
  numberingSystem: "latn",
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});
const gregorianParts = new Intl.DateTimeFormat("en-US", {
  calendar: "gregory",
  numberingSystem: "latn",
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
export function asciiDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}
export const persianDigits = (value: string | number) =>
  String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const pad = (n: number) => String(n).padStart(2, "0");
export function isGregorianDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(+date) && date.toISOString().slice(0, 10) === value;
}
function instant(value: string | Date) {
  return value instanceof Date
    ? value
    : new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
}
export function jalaliParts(value: string | Date): JalaliDate {
  const parts = Object.fromEntries(
    persianParts.formatToParts(instant(value)).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}
export function jalaliToGregorian(
  year: number,
  month: number,
  day: number,
): string | null {
  if (
    ![year, month, day].every(Number.isInteger) ||
    year < 1200 ||
    year > 1600 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  )
    return null;
  // Intl's Persian calendar is the conversion authority on both server and browser.
  // Search civil days at noon, away from timezone transitions and midnight boundaries.
  let low = Date.UTC(year + 621, 0, 1) / DAY_MS;
  let high = Date.UTC(year + 623, 0, 1) / DAY_MS;
  const target = year * 10000 + month * 100 + day;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const date = new Date(middle * DAY_MS + 12 * 3600000);
    const p = jalaliParts(date);
    const key = p.year * 10000 + p.month * 100 + p.day;
    if (key === target) return date.toISOString().slice(0, 10);
    if (key < target) low = middle + 1;
    else high = middle - 1;
  }
  return null;
}
export function jalaliMonth(year: number, month: number) {
  const start = jalaliToGregorian(year, month, 1);
  const next = jalaliToGregorian(
    month === 12 ? year + 1 : year,
    month === 12 ? 1 : month + 1,
    1,
  );
  if (!start || !next) throw new Error("INVALID_DATE");
  return {
    start,
    length: Math.round((Date.parse(next) - Date.parse(start)) / DAY_MS),
    offset: (new Date(`${start}T12:00:00Z`).getUTCDay() + 1) % 7,
  };
}
export function tehranDateTime(value: Date): string {
  const p = Object.fromEntries(
    gregorianParts.formatToParts(value).map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export const tehranToday = (now = new Date()) =>
  tehranDateTime(now).slice(0, 10);
export function tehranLocalToISO(value: string): string {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ||
    !isGregorianDate(value.slice(0, 10))
  )
    throw new Error("INVALID_DATE");
  const desired = Date.parse(`${value}:00Z`);
  let candidate = desired;
  for (let i = 0; i < 3; i++) {
    const observed = tehranDateTime(new Date(candidate));
    if (observed === value) return new Date(candidate).toISOString();
    candidate += desired - Date.parse(`${observed}:00Z`);
  }
  // A civil time that does not exist (historical DST) must not roll into another hour.
  throw new Error("INVALID_DATE");
}
export function formatJalaliInput(value: string, withTime = false): string {
  if (!isGregorianDate(value.slice(0, 10))) return "";
  const p = jalaliParts(value.slice(0, 10));
  return persianDigits(
    `${p.year}/${pad(p.month)}/${pad(p.day)}${withTime ? ` ${value.slice(11, 16)}` : ""}`,
  );
}
export function parseJalaliInput(
  value: string,
  withTime = false,
): string | null {
  const raw = asciiDigits(value)
    .trim()
    .replace(/[\u200e\u200f]/g, "");
  const match = raw.match(
    withTime
      ? /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})[ T](\d{1,2}):(\d{2})$/
      : /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/,
  );
  if (!match) return null;
  if (Number(match[1]) >= 1600) return null;
  const date = jalaliToGregorian(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  );
  if (!date) return null;
  if (!withTime) return date;
  const hour = Number(match[4]),
    minute = Number(match[5]);
  if (hour > 23 || minute > 59) return null;
  const local = `${date}T${pad(hour)}:${pad(minute)}`;
  try {
    tehranLocalToISO(local);
    return local;
  } catch {
    return null;
  }
}
export function formatPersianDate(value: string) {
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
  }).format(instant(value));
}
export function formatPersianMoment(value: string) {
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(instant(value));
}
export function formatTehranTime(value: string) {
  return new Intl.DateTimeFormat(PERSIAN_LOCALE, {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant(value));
}

import { z } from "zod";
import { normalizeDigits } from "@/lib/validation";
export class FormValueError extends Error {}
const labels: Record<string, string> = {
  name: "نام",
  address: "آدرس",
  slug: "نشانی کوتاه",
  completion_cutoff_hours: "مهلت تکمیل بازی",
  refund_hours: "ساعت استرداد کامل",
  late_refund_percent: "درصد استرداد",
  latitude: "عرض جغرافیایی",
  longitude: "طول جغرافیایی",
  price: "قیمت",
  hourly_price: "قیمت ساعتی",
  platform_fee: "کارمزد",
  stock: "موجودی",
  capacity: "ظرفیت",
  entry_fee: "ورودیه",
};
export function formText(f: FormData, key: string, min = 1, max = 200) {
  const raw = f.get(key);
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v.length < min || v.length > max)
    throw new FormValueError(
      `«${labels[key] ?? key}» باید بین ${min} و ${max} نویسه باشد.`,
    );
  return v;
}
export function numericText(value: unknown) {
  return normalizeDigits(String(value ?? ""))
    .trim()
    .replace(/[٬,\s]/g, "")
    .replace("٫", ".");
}
export function formNumber(
  f: FormData,
  key: string,
  min: number,
  max: number,
  integer = true,
) {
  const raw = numericText(f.get(key));
  const value = Number(raw);
  if (
    !raw ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    throw new FormValueError(
      `«${labels[key] ?? key}» باید ${integer ? "عدد صحیح" : "عدد"} بین ${min} و ${max} باشد.`,
    );
  return value;
}
export function formSlug(f: FormData) {
  const value = formText(f, "slug", 1, 120).toLowerCase().replace(/\s+/g, "-");
  if (!/^[a-z0-9-]+$/.test(value))
    throw new FormValueError(
      "نشانی کوتاه را با حروف انگلیسی، عدد و خط تیره بنویسید؛ مثلاً rally-rasht.",
    );
  return value;
}
export function formId(value: FormDataEntryValue | null) {
  const result = z
    .uuid()
    .safeParse(typeof value === "string" ? value.trim() : value);
  if (!result.success)
    throw new FormValueError(
      "گزینه انتخاب‌شده معتبر نیست؛ شهر، باشگاه، زمین یا بازیکن موردنیاز را انتخاب کنید.",
    );
  return result.data;
}

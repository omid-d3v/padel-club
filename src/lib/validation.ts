import { z } from "zod";
export function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (n) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(n)))
    .replace(/[٠-٩]/g, (n) => String("٠١٢٣٤٥٦٧٨٩".indexOf(n)));
}
export const playerSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "نام را وارد کنید.")
    .max(50, "نام بیش از حد طولانی است."),
  last_name: z
    .string()
    .trim()
    .min(1, "نام خانوادگی را وارد کنید.")
    .max(50, "نام خانوادگی بیش از حد طولانی است."),
  phone: z
    .string()
    .transform((v) => normalizeDigits(v).replace(/[\s()-]/g, ""))
    .refine(
      (v) => !v || /^\+?\d{7,15}$/.test(v),
      "شماره موبایل معتبر وارد کنید.",
    ),
});
export const tournamentSchema = z.object({
  title: z.string().trim().min(2, "عنوان حداقل دو حرف باشد.").max(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ را انتخاب کنید.")
    .refine(
      (v) =>
        !Number.isNaN(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v,
      "تاریخ معتبر نیست.",
    ),
  player_ids: z
    .array(z.string().uuid())
    .length(8, "دقیقاً هشت بازیکن انتخاب کنید.")
    .refine((v) => new Set(v).size === 8),
});
export const roundWinnersSchema = z
  .array(
    z.object({
      set_number: z.number().int().min(1).max(3),
      winner_team: z.union([z.literal(1), z.literal(2)]).nullable(),
    }),
  )
  .length(3)
  .refine((s) => new Set(s.map((x) => x.set_number)).size === 3);

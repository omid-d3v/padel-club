import { requireMember, catalog, ownRows } from "@/lib/platform/data";
import { SKILLS } from "@/lib/platform/types";
import { ActionForm } from "@/components/platform/action-form";
import { Field, SelectField } from "@/components/platform/fields";
import { moment } from "@/lib/platform/format";
import { number } from "@/lib/utils";
export default async function Profile() {
  const [m, d, ratings] = await Promise.all([
    requireMember(),
    catalog(),
    ownRows("rating_history"),
  ]);
  return (
    <section className="public-container public-page">
      <h1>پروفایل بازی تو</h1>
      <p className="intro">
        سطح اولیه خوداظهاری است. تأیید سطح و تغییر رتبه رقابتی فقط از مسیر بررسی
        مدیر انجام می‌شود.
      </p>
      <div className="content-grid">
        <div className="platform-card">
          <ActionForm operation="profile" label="ذخیره پروفایل">
            <Field
              label="نام نمایشی"
              name="display_name"
              defaultValue={m.profile?.display_name}
              required
              minLength={2}
              maxLength={100}
            />
            <SelectField
              label="شهر"
              name="city_id"
              options={d.cities}
              value={m.profile?.city_id ?? ""}
              required={false}
            />
            <label className="field">
              سطح خوداظهاری
              <select
                name="skill_level"
                defaultValue={m.profile?.skill_level ?? 1}
              >
                {SKILLS.map((s, i) => (
                  <option key={s} value={i}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="تصویر پروفایل؛ JPG، PNG یا WebP، حداکثر ۲ مگابایت"
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
            />
            <p className="text-xs leading-7 text-muted-foreground">
              تغییر سطح خوداظهاری، تأیید قبلی را غیرفعال می‌کند. برای اتصال
              نتایج تاریخی‌تان به حساب جدید، از مدیر درخواست بررسی کنید.
            </p>
          </ActionForm>
        </div>
        <aside className="platform-card">
          <h2>تاریخچه رتبه رقابتی</h2>
          {ratings.length ? (
            ratings.map((r) => (
              <div className="border-t border-border py-4 text-sm" key={r.id}>
                <p>
                  {number(r.rating_before)} ← {number(r.rating_after)}
                </p>
                <p>{r.reason}</p>
                <p className="text-xs text-muted-foreground">
                  {moment(r.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              هنوز تغییر رتبه رقابتی تأییدشده‌ای ندارید. بازی‌های دوستانه رتبه
              را تغییر نمی‌دهند.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

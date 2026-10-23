import { requireMember, catalog, ownRows } from "@/lib/platform/data";
import { SKILLS } from "@/lib/platform/types";
import { ActionForm } from "@/components/platform/action-form";
import { Field, SelectField } from "@/components/platform/fields";
import { moment } from "@/lib/platform/format";
import { number } from "@/lib/utils";
import {
  UserRound,
  MapPin,
  ChartNoAxesCombined,
  Camera,
  ShieldCheck,
  History,
  BadgeCheck,
} from "lucide-react";
import { PlayerAvatar } from "@/components/platform/player-avatar";
import { AvatarUpload } from "@/components/platform/avatar-upload";
import { NotificationPhone } from "@/components/platform/notification-phone";
export default async function Profile() {
  const [m, d, ratings] = await Promise.all([
    requireMember(),
    catalog(),
    ownRows("rating_history"),
  ]);
  const { data: authUser } = await m.db.auth.getUser();
  return (
    <section className="public-container public-page">
      <header className="profile-heading">
        <span className="member-stat-icon">
          <UserRound size={25} />
        </span>
        <div>
          <h1>پروفایل بازی تو</h1>
          <p className="text-sm text-muted-foreground">
            معرفی تو، پیش از اولین رالی
          </p>
        </div>
      </header>
      <p className="intro">
        سطح اولیه خوداظهاری است. تأیید سطح و تغییر رتبه رقابتی فقط از مسیر بررسی
        مدیر انجام می‌شود.
      </p>
      <div className="content-grid">
        <NotificationPhone
          verifiedPhone={
            authUser.user?.phone_confirmed_at ? authUser.user.phone : undefined
          }
        />
        <div className="platform-card">
          <div className="profile-identity">
            <PlayerAvatar
              name={m.profile?.display_name ?? "بازیکن"}
              path={m.profile?.avatar_path}
              large
            />
            <div>
              <h2>{m.profile?.display_name ?? "پروفایلت را بساز"}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {m.profile
                  ? SKILLS[m.profile.skill_level]
                  : "نام، شهر و سطح بازی‌ات را وارد کن."}
              </p>
              {m.profile?.skill_verified && (
                <span className="member-verified">
                  <BadgeCheck size={16} />
                  سطح تأییدشده
                </span>
              )}
            </div>
          </div>
          <ActionForm
            operation="profile"
            label="ذخیره پروفایل"
            buttonVariant="default"
          >
            <h3 className="form-section-title">
              <UserRound size={18} />
              اطلاعات بازیکن
            </h3>
            <Field
              label="نام نمایشی"
              name="display_name"
              defaultValue={m.profile?.display_name}
              required
              minLength={2}
              maxLength={100}
            />
            <h3 className="form-section-title">
              <MapPin size={18} />
              شهر و سطح بازی
            </h3>
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
            <h3 className="form-section-title">
              <Camera size={18} />
              تصویر پروفایل
            </h3>
            <AvatarUpload />
            <p className="text-xs leading-7 text-muted-foreground">
              تغییر سطح خوداظهاری، تأیید قبلی را غیرفعال می‌کند. برای اتصال
              نتایج تاریخی‌تان به حساب جدید، از مدیر درخواست بررسی کنید.
            </p>
          </ActionForm>
        </div>
        <aside className="space-y-5">
          <div className="profile-trust">
            <ShieldCheck size={28} />
            <h2>پروفایل قابل اعتماد</h2>
            <p>
              سطح خوداظهاری به پیدا کردن هم‌بازی مناسب کمک می‌کند. نشان تأیید،
              پس از بررسی مدیر فعال می‌شود.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <ChartNoAxesCombined size={18} />
              بازی دوستانه رتبه رقابتی را تغییر نمی‌دهد.
            </div>
          </div>
          <div className="platform-card">
            <h2 className="flex items-center gap-2">
              <History size={20} />
              تاریخچه رتبه رقابتی
            </h2>
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
          </div>
        </aside>
      </div>
    </section>
  );
}

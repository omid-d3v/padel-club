"use client";
import { useId, type KeyboardEvent } from "react";
import {
  LockKeyhole,
  UsersRound,
  Check,
  UserRound,
  Plus,
  Wallet,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import { persianDigits } from "@/lib/date-time";
export type BookingMode = "private" | "open";
const modes = [
  {
    id: "private",
    title: "رزرو خصوصی زمین",
    subtitle: "با گروه خودت بازی کن",
    Icon: LockKeyhole,
  },
  {
    id: "open",
    title: "بازی باز چهار نفره",
    subtitle: "هم‌بازی‌های تازه پیدا کن",
    Icon: UsersRound,
  },
] as const;
export function BookingModeTabs({
  value,
  onChange,
  cutoffHours,
}: {
  value: BookingMode;
  onChange: (mode: BookingMode) => void;
  cutoffHours: number;
}) {
  const id = useId();
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowLeft") next = (index + 1) % modes.length;
    else if (event.key === "ArrowRight")
      next = (index + modes.length - 1) % modes.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = modes.length - 1;
    else return;
    event.preventDefault();
    onChange(modes[next].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <section className="booking-mode-card" aria-labelledby={`${id}-heading`}>
      <div className="booking-mode-heading">
        <span className="booking-step">۱</span>
        <div>
          <h2 id={`${id}-heading`}>چه‌جوری بازی می‌کنی؟</h2>
          <p>
            اول شیوه بازی را انتخاب کن؛ ادامه رزرو با انتخاب تو تنظیم می‌شود.
          </p>
        </div>
      </div>
      <input type="hidden" name="kind" value={value} />
      <div
        role="tablist"
        aria-label="شیوه بازی"
        className="booking-mode-tabs"
        aria-orientation="horizontal"
      >
        {modes.map(({ id: mode, title, subtitle, Icon }, index) => (
          <button
            key={mode}
            type="button"
            role="tab"
            id={`${id}-${mode}-tab`}
            aria-controls={`${id}-${mode}-panel`}
            aria-selected={value === mode}
            tabIndex={value === mode ? 0 : -1}
            onClick={() => onChange(mode)}
            onKeyDown={(event) => keyboard(event, index)}
          >
            <span className="booking-mode-icon">
              <Icon size={25} />
            </span>
            <span className="min-w-0">
              <strong>{title}</strong>
              <span className="booking-mode-subtitle">{subtitle}</span>
            </span>
            <span className="booking-mode-check" aria-hidden="true">
              {value === mode && <Check size={15} />}
            </span>
          </button>
        ))}
      </div>
      {modes.map(({ id: mode }) => (
        <section
          key={mode}
          role="tabpanel"
          id={`${id}-${mode}-panel`}
          aria-labelledby={`${id}-${mode}-tab`}
          tabIndex={0}
          hidden={value !== mode}
          className="booking-mode-panel"
        >
          <div className="booking-mode-explainer">
            <div>
              <p className="booking-mode-kicker">
                {mode === "private"
                  ? "گروه خودت، قرار خودت"
                  : "یک قرار تازه، چهار هم‌بازی"}
              </p>
              <h3>
                {mode === "private"
                  ? "زمین برای تو و گروهت"
                  : "بازی را با سه جای خالی بساز"}
              </h3>
              <p>
                {mode === "private"
                  ? "اگر هم‌بازی‌هایت مشخص‌اند، کل زمین را برای گروه خودت درخواست بده. یک نفر هزینه رزرو را می‌پردازد و رزرو به جذب بازیکن از سایت وابسته نیست."
                  : "یک بازی چهار نفره بساز و عنوان و سطح دلخواهت را مشخص کن. بازیکن‌های دیگر می‌توانند به بازی بپیوندند؛ تو فقط سهم خودت را می‌پردازی."}
              </p>
            </div>
            <div className="booking-squad" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={
                    mode === "open" && i > 0
                      ? "booking-squad-empty"
                      : "booking-squad-filled"
                  }
                >
                  {mode === "open" && i > 0 ? (
                    <Plus size={17} />
                  ) : (
                    <UserRound size={18} />
                  )}
                </span>
              ))}
            </div>
          </div>
          <div className="booking-mode-facts">
            <div>
              <Wallet size={18} />
              <span>
                <b>پرداخت</b>
                {mode === "private"
                  ? "کل زمین و تجهیزات انتخابی"
                  : "سهم زمین و تجهیزات مشترک + وسایل شخصی خودت"}
              </span>
            </div>
            <div>
              <Clock3 size={18} />
              <span>
                <b>
                  {mode === "private" ? "قطعی‌شدن رزرو" : "مهلت تکمیل بازی"}
                </b>
                {mode === "private"
                  ? "پس از تأیید باشگاه و تسویه رزرو"
                  : `چهار نفر تا ${persianDigits(cutoffHours)} ساعت قبل از شروع؛ مهلت زودتر باشگاه مقدم است`}
              </span>
            </div>
          </div>
          {mode === "open" && (
            <p className="booking-mode-notice">
              اگر چهار سهم در مهلت مقرر تسویه نشود، بازی لغو و درخواست استرداد
              کامل پرداخت‌های معتبر ثبت می‌شود؛ انجام استرداد جداگانه قابل
              پیگیری است.
            </p>
          )}
        </section>
      ))}
      <p className="booking-mode-trust">
        <ShieldCheck size={16} />
        در هر دو حالت، ارسال درخواست به‌تنهایی رزرو را قطعی نمی‌کند.
      </p>
    </section>
  );
}

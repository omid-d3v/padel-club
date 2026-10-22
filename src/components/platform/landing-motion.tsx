"use client";
import { useEffect, useState } from "react";
import { ArrowUpLeft, Check, Plus } from "lucide-react";
export function LandingMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.animate(
            [
              { opacity: 0.55, transform: "translateY(16px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 600, easing: "cubic-bezier(0.23,1,0.32,1)" },
          );
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return null;
}
export function JourneyDemo() {
  const [step, setStep] = useState(0);
  return (
    <div className="journey-demo">
      <div className="flex flex-wrap gap-2" role="group" aria-label="روش بازی">
        {["زمین خودت", "هم‌بازی هم‌سطح", "رقابت تازه"].map((s, i) => (
          <button
            key={s}
            aria-pressed={step === i}
            onClick={() => setStep(i)}
            className={step === i ? "selected" : ""}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid gap-8 py-10 md:grid-cols-2">
        <div key={step} className="journey-copy">
          <span className="text-sm text-primary">
            ۰{step + 1} / از اینجا شروع کن
          </span>
          <h3 className="my-5 text-3xl font-extrabold">
            {
              [
                "زمان بازی دست توست.",
                "سه جای خالی، چهار دوست.",
                "هر دور، یک هم‌تیمی تازه.",
              ][step]
            }
          </h3>
          <p className="max-w-md text-sm leading-8 text-white/65">
            {
              [
                "باشگاه و سانس را انتخاب کن. تجهیزات لازم و تمام هزینه‌ها را ببین. بعد از تأیید باشگاه، با خیال روشن پرداخت کن.",
                "یک بازی بساز یا به بازی باز ملحق شو. سطح و سهم هر نفر روشن است؛ زمین فقط با تأیید باشگاه و پرداخت چهار بازیکن قطعی می‌شود.",
                "در امریکانو هم‌تیمی‌ها عوض می‌شوند و امتیاز تو همراهت می‌ماند. برنامه هفت دور و رتبه‌بندی از داده واقعی ساخته می‌شود.",
              ][step]
            }
          </p>
          <p className="mt-5 flex items-center gap-2 text-xs text-primary">
            <ArrowUpLeft size={16} />
            هزینه روشن، وضعیت قابل پیگیری
          </p>
        </div>
        <div className="illustration-card">
          <span className="text-[11px] text-white/50">
            نمایش آموزشی — بازی زنده نیست
          </span>
          <div className="my-6 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={`demo-seat ${step === 1 && i > 0 ? "waiting" : ""}`}
              >
                <span>
                  {step === 1 && i > 0 ? (
                    <Plus size={22} />
                  ) : (
                    <Check size={22} />
                  )}
                </span>
                <p>
                  {step === 2
                    ? `اسلات ${["A", "B", "C", "D"][i]}`
                    : `بازیکن ${["اول", "دوم", "سوم", "چهارم"][i]}`}
                </p>
              </div>
            ))}
          </div>
          <div className="demo-court">
            <div />
            <span>بازی در کنار هم</span>
          </div>
          <p className="mt-5 text-xs text-white/55">
            {step === 1
              ? "تکمیل ظرفیت تا چهار ساعت پیش از بازی"
              : "تأیید واقعی، شرایط روشن، تجربه بهتر"}
          </p>
        </div>
      </div>
    </div>
  );
}

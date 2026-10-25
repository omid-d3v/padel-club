import Link from "next/link";
import { ArrowUpLeft, ShieldCheck, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export function AuthPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="auth-page">
      <section className="auth-main">
        <header className="auth-page-header">
          <Link href="/" aria-label="مچ شو، صفحه اصلی">
            <BrandLogo />
          </Link>
          <Link href="/clubs">
            دیدن زمین‌ها <ArrowUpLeft size={15} aria-hidden="true" />
          </Link>
        </header>
        <div className="auth-panel glass-surface">
          <span className="auth-eyebrow">
            <Sparkles size={15} aria-hidden="true" /> رالی بعدی از اینجا شروع
            می‌شود
          </span>
          <h1>{title}</h1>
          <p className="auth-intro">{description}</p>
          {children}
          <p className="auth-security">
            <ShieldCheck size={15} aria-hidden="true" /> شماره‌ات فقط برای ورود
            و پیگیری بازی استفاده می‌شود.
          </p>
        </div>
        <p className="auth-copyright">مچ شو · زمین، هم‌بازی، رالی</p>
      </section>
      <aside className="auth-aside" aria-label="با مچ شو به زمین برگرد">
        <div className="auth-court" aria-hidden="true">
          <span />
          <i />
          <b />
        </div>
        <div className="auth-aside-copy">
          <span>از اولین سرویس تا رالی آخر</span>
          <h2>
            قرار بعدی،
            <br />
            <em>روی زمین.</em>
          </h2>
          <p>
            زمینت را پیدا کن، هم‌بازی‌ات را بشناس
            <br />و باقی‌اش را بسپار به بازی.
          </p>
        </div>
        <div className="auth-aside-footer">
          <span>یک حساب برای تمام بازی‌ها</span>
          <span>مچ شو ↖</span>
        </div>
      </aside>
    </main>
  );
}

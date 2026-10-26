import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { Menu, UserRound } from "lucide-react";
import { member } from "@/lib/platform/data";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "./mobile-bottom-nav";
export async function PublicShell({ children }: { children: React.ReactNode }) {
  const user = await member();
  return (
    <div className="public-site">
      <header className="public-header">
        <Link href="/" className="brand">
          <BrandLogo />
        </Link>
        <nav
          aria-label="منوی سایت"
          className="hidden items-center gap-7 text-sm md:flex"
        >
          <Link href="/clubs">رزرو زمین</Link>
          <Link href="/matches">پیدا کردن هم‌بازی</Link>
          <Link href="/events">رویدادها</Link>
          <Link href="/leaderboard">رتبه‌بندی</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="public-login">
            <Link href={user?.admin ? "/admin" : user ? "/account" : "/login"}>
              <UserRound size={17} />
              {user?.admin ? "پنل مدیریت" : user ? "حساب من" : "ورود / عضویت"}
            </Link>
          </Button>
          <details className="mobile-menu md:hidden">
            <summary aria-label="باز کردن منو">
              <Menu size={22} />
            </summary>
            <nav aria-label="منوی موبایل">
              <Link href="/clubs">رزرو زمین</Link>
              <Link href="/matches">هم‌بازی</Link>
              <Link href="/events">رویدادها</Link>
              <Link href="/leaderboard">رتبه‌بندی</Link>
              {user?.admin && <Link href="/admin">مدیریت</Link>}
            </nav>
          </details>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="public-footer">
        <div className="public-container grid gap-9 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link href="/" className="brand">
              <BrandLogo dark variant="english" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-8 text-white/60">
              مچ شو، جایی برای زمین‌های بهتر، هم‌بازی‌های تازه و رالی‌های بیشتر.
            </p>
          </div>
          <nav className="space-y-3 text-sm" aria-label="کاوش">
            <p className="mb-4 text-white/45">بریم بازی</p>
            <Link href="/clubs">باشگاه‌های پدل</Link>
            <Link href="/matches">بازی‌های باز</Link>
            <Link href="/events">امریکانو و تورنمنت</Link>
          </nav>
          <nav className="space-y-3 text-sm" aria-label="راهنما">
            <p className="mb-4 text-white/45">قبل از سرویس</p>
            <Link href="/help">راهنمای بازی و رزرو</Link>
            <Link href="/terms">قوانین و لغو رزرو</Link>
            <Link href="/privacy">حریم خصوصی</Link>
          </nav>
        </div>
        <p className="public-container mt-12 border-t border-white/10 pt-6 text-xs text-white/45">
          مچ شو · رزرو قطعی فقط پس از تأیید باشگاه و پرداخت معتبر
        </p>
        <div className="public-container mt-6 flex justify-center md:justify-end">
          <a
            referrerPolicy="origin"
            target="_blank"
            rel="noopener"
            href="https://trustseal.enamad.ir/?id=8342476&Code=nQiEpA4KgjMRnugUo749y2brWYZEDobp"
            aria-label="اعتبارسنجی نماد اعتماد الکترونیکی مچ شو (تب جدید)"
            className="inline-flex rounded-xl bg-white p-3 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            {/* Keep the official seal URL and referrer policy intact. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              referrerPolicy="origin"
              src="https://trustseal.enamad.ir/logo.aspx?id=8342476&Code=nQiEpA4KgjMRnugUo749y2brWYZEDobp"
              alt="نماد اعتماد الکترونیکی مچ شو"
              width={125}
              height={136}
              style={{ cursor: "pointer", objectFit: "contain" }}
              {...{ code: "nQiEpA4KgjMRnugUo749y2brWYZEDobp" }}
            />
          </a>
        </div>
      </footer>
      <MobileBottomNav admin={user?.admin} />
    </div>
  );
}

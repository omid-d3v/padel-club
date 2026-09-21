"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Trophy,
  ChartNoAxesColumnIncreasing,
  ArrowUpLeft,
  LogOut,
  PanelTop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions";
const links = [
  { href: "/", label: "داشبورد", icon: LayoutDashboard },
  { href: "/tournaments", label: "مسابقات", icon: Trophy },
  { href: "/players", label: "بازیکنان", icon: Users },
  { href: "/leaderboard", label: "لیدربرد", icon: ChartNoAxesColumnIncreasing },
];
export function Shell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-white p-6 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary">
            <PanelTop size={25} />
          </span>
          <span>
            <strong className="block text-lg">پدل کلاب</strong>
            <span
              className="text-[10px] tracking-[.25em] text-muted-foreground"
              lang="en"
            >
              PADEL CLUB
            </span>
          </span>
        </Link>
        <p className="mb-3 mt-12 text-xs text-muted-foreground">
          زمین بازی شما
        </p>
        <nav className="space-y-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm",
                (href === "/" ? path === href : path.startsWith(href))
                  ? "bg-[#edf4df] font-bold text-[#355a16]"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f5f7ef] p-4">
          <span className="text-2xl">🎾</span>
          <p className="mt-3 font-bold">بازی بهتر، کنار هم</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            هم‌تیمی‌ها عوض می‌شوند؛ لذت بازی همیشه می‌ماند.
          </p>
        </div>
        {admin ? (
          <form action={logout}>
            <button className="mt-4 flex min-h-11 items-center gap-2 px-3 text-sm text-muted-foreground">
              <LogOut size={18} />
              خروج از حساب
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="mt-4 flex min-h-11 items-center justify-between text-sm"
          >
            ورود مدیر
            <ArrowUpLeft size={18} />
          </Link>
        )}
      </aside>
      <div className="lg:ps-64">
        <header className="flex h-20 items-center justify-between border-b border-border bg-white/80 px-5 md:px-10">
          <span className="text-sm font-medium">
            مدیریت پدل <span className="mx-3 text-border">/</span>
            <span className="text-muted-foreground">
              {links.find((x) => x.href !== "/" && path.startsWith(x.href))
                ?.label ?? "خانه"}
            </span>
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald-500" />
            {admin ? "پنل مدیریت" : "باشگاه بازیکنان"}
          </span>
          {admin && (
            <form action={logout} className="lg:hidden">
              <button
                className="grid size-11 place-items-center rounded-xl hover:bg-muted"
                aria-label="خروج از حساب"
              >
                <LogOut size={18} />
              </button>
            </form>
          )}
        </header>
        <main
          id="main"
          className="mx-auto max-w-[1440px] px-4 pb-28 pt-7 md:px-10 md:pt-10 lg:pb-12"
        >
          {children}
        </main>
      </div>
      <nav
        aria-label="ناوبری اصلی"
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex min-h-18 flex-1 flex-col items-center justify-center gap-1 text-[11px]",
              (href === "/" ? path === href : path.startsWith(href))
                ? "font-bold text-emerald-800"
                : "text-muted-foreground",
            )}
          >
            <Icon size={21} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

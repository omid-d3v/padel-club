"use client";
import { BrandLogo } from "@/components/brand-logo";
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
  Settings,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/app/actions";
const links = [
  { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
  { href: "/admin/payments", label: "بررسی واریزها", icon: ReceiptText },
  {
    href: "/admin/operations",
    label: "عملیات و رزروها",
    icon: LayoutDashboard,
  },
  { href: "/admin/clubs", label: "باشگاه و سانس‌ها", icon: PanelTop },
  { href: "/admin/integrations", label: "اتصال تقویم‌ها", icon: PanelTop },
  { href: "/admin/events", label: "رویدادها", icon: Trophy },
  { href: "/tournaments", label: "مسابقات", icon: Trophy },
  { href: "/players", label: "بازیکنان", icon: Users },
  { href: "/leaderboard", label: "لیدربرد", icon: ChartNoAxesColumnIncreasing },
  { href: "/admin/settings", label: "تنظیمات", icon: Settings },
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
          <BrandLogo />
        </Link>
        <p className="mb-3 mt-12 text-xs text-muted-foreground">
          زمین بازی شما
        </p>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm",
                (href === "/admin" ? path === href : path.startsWith(href))
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
        <header className="admin-glass-header flex h-20 items-center justify-between border-b border-border bg-white/80 px-5 md:px-10">
          <span className="text-sm font-medium">
            مدیریت مچ شو <span className="mx-3 text-border">/</span>
            <span className="text-muted-foreground">
              {links.find((x) =>
                x.href === "/admin" ? path === x.href : path.startsWith(x.href),
              )?.label ?? "خانه"}
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
        {admin && (
          <nav
            aria-label="مدیریت باشگاه"
            className="flex gap-2 overflow-x-auto border-b border-border bg-white px-4 py-3 lg:hidden"
          >
            {links
              .filter((x) =>
                [
                  "/admin/clubs",
                  "/admin/payments",
                  "/admin/operations",
                  "/admin/integrations",
                  "/admin/events",
                  "/admin/settings",
                ].includes(x.href),
              )
              .map((x) => (
                <Link
                  key={x.href}
                  href={x.href}
                  className="shrink-0 rounded-xl border border-border px-3 py-2 text-xs"
                  aria-current={path.startsWith(x.href) ? "page" : undefined}
                >
                  {x.label}
                </Link>
              ))}
          </nav>
        )}
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
        {links
          .filter((x) =>
            [
              "/admin",
              "/admin/operations",
              "/tournaments",
              "/players",
            ].includes(x.href),
          )
          .map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-18 flex-1 flex-col items-center justify-center gap-1 text-[11px]",
                (href === "/admin" ? path === href : path.startsWith(href))
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

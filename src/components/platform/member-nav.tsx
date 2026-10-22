"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  House,
  UserRound,
  CalendarDays,
  Trophy,
  Wallet,
  Flag,
  Bell,
  Settings,
} from "lucide-react";
const links = [
  { href: "/account", label: "خانه حساب", Icon: House },
  { href: "/account/profile", label: "پروفایل", Icon: UserRound },
  { href: "/account/bookings", label: "رزرو و بازی‌ها", Icon: CalendarDays },
  { href: "/account/events", label: "رویدادها", Icon: Trophy },
  { href: "/account/payments", label: "پرداخت و استرداد", Icon: Wallet },
  { href: "/account/results", label: "نتایج و اعتراض‌ها", Icon: Flag },
  { href: "/account/notifications", label: "اعلان‌ها", Icon: Bell },
];
export function MemberNav({
  admin,
  children,
}: {
  admin: boolean;
  children: ReactNode;
}) {
  const path = usePathname();
  return (
    <nav aria-label="حساب من" className="account-nav">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon size={17} aria-hidden="true" />
          {label}
        </Link>
      ))}
      {admin && (
        <Link href="/admin">
          <Settings size={17} />
          مدیریت
        </Link>
      )}
      {children}
    </nav>
  );
}

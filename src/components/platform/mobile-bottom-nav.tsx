"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MapPin,
  UsersRound,
  Trophy,
  UserRound,
  ShieldCheck,
} from "lucide-react";

export function MobileBottomNav({ admin = false }: { admin?: boolean }) {
  const path = usePathname();
  const links = [
    { href: "/clubs", label: "زمین", Icon: MapPin },
    { href: "/matches", label: "هم‌بازی", Icon: UsersRound },
    { href: "/events", label: "رویداد", Icon: Trophy },
    {
      href: admin ? "/admin" : "/account",
      label: admin ? "مدیریت" : "حساب من",
      Icon: admin ? ShieldCheck : UserRound,
    },
  ];
  return (
    <nav aria-label="دسترسی سریع موبایل" className="public-bottom md:hidden">
      {links.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            path === href || path.startsWith(`${href}/`) ? "page" : undefined
          }
        >
          <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

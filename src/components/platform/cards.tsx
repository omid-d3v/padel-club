import Link from "next/link";
import Image from "next/image";
import { ArrowUpLeft, MapPin, Clock3, Users, ShieldCheck } from "lucide-react";
import type {
  Club,
  Court,
  City,
  MatchPreview,
  PlatformEvent,
} from "@/lib/platform/types";
import { SKILLS } from "@/lib/platform/types";
import { money, moment, bookingLabels } from "@/lib/platform/format";
import { number } from "@/lib/utils";
export function DataNotice({ unavailable }: { unavailable: boolean }) {
  return unavailable ? (
    <p
      role="status"
      className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"
    >
      اطلاعات زنده فعلاً در دسترس نیست. پس از برقراری اتصال یا تکمیل راه‌اندازی
      دوباره تلاش کنید.
    </p>
  ) : null;
}
export function PublicEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="public-empty">
      <span aria-hidden>↗</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
export function ClubCard({
  club,
  courts,
  city,
}: {
  club: Club;
  courts: Court[];
  city?: City;
}) {
  const prices = courts
    .filter((c) => c.club_id === club.id)
    .map((c) => c.hourly_price);
  const url =
    club.photo_path && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/club-images/${club.photo_path}`
      : null;
  return (
    <Link href={`/clubs/${club.slug}`} className="discovery-card">
      <div className="club-cover">
        {url ? (
          <Image
            src={url}
            alt={`زمین‌های باشگاه ${club.name}`}
            fill
            sizes="(max-width:768px) 90vw,33vw"
            className="object-cover"
          />
        ) : (
          <div className="mini-court" aria-hidden>
            <i />
            <i />
            <i />
          </div>
        )}
        <span>{city?.name ?? "باشگاه پدل"}</span>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold">{club.name}</h3>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin size={14} />
          {club.address}
        </p>
        <p className="mb-6 mt-4 min-h-6 text-xs text-muted-foreground">
          {club.facilities.slice(0, 3).join(" · ")}
        </p>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs">
            {prices.length
              ? `از ${money(Math.min(...prices))} / ساعت`
              : "قیمت در سانس‌های منتشرشده"}
          </span>
          <ArrowUpLeft size={19} />
        </div>
      </div>
    </Link>
  );
}
export function MatchCardPublic({ match: m }: { match: MatchPreview }) {
  return (
    <Link href={`/matches/${m.id}`} className="discovery-card p-6">
      <div className="flex justify-between gap-3">
        <span className="eyebrow text-emerald-800">بازی چهار نفره</span>
        <span className="rounded-full bg-lime-100 px-3 py-1 text-xs">
          {number(4 - m.participants)} جای خالی
        </span>
      </div>
      <h3 className="mb-3 mt-6 text-xl font-bold">{m.title}</h3>
      <p className="text-xs text-muted-foreground">
        {m.club_name} · {m.city_name}
      </p>
      <p className="mt-4 flex gap-2 text-xs">
        <Clock3 size={15} />
        {moment(m.starts_at)}
      </p>
      <div
        className="my-5 flex items-center gap-2"
        aria-label={`${m.participants} بازیکن از چهار نفر`}
      >
        {Array.from({ length: 4 }, (_, i) => (
          <span
            key={i}
            className={`participant-dot ${i < m.participants ? "filled" : ""}`}
          >
            <Users size={16} />
          </span>
        ))}
        <span className="ms-2 text-xs text-muted-foreground">
          {m.min_skill === null
            ? "همه سطح‌ها"
            : `${SKILLS[m.min_skill]} تا ${SKILLS[m.max_skill ?? m.min_skill]}`}
        </span>
      </div>
      <div className="flex justify-between gap-2 border-t border-border pt-4 text-xs">
        <span>
          {money(m.price)}{" "}
          <span className="text-muted-foreground">سهم پایه هر نفر، حداکثر</span>
        </span>
        <ArrowUpLeft size={17} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        {bookingLabels[m.status] ?? m.status} · {number(m.paid)} پرداخت معتبر
      </p>
    </Link>
  );
}
export function EventCard({
  event: e,
  club,
}: {
  event: PlatformEvent;
  club?: Club;
}) {
  return (
    <Link className="discovery-card p-6" href={`/events/${e.slug}`}>
      <div className="flex justify-between">
        <span className="eyebrow text-emerald-800">
          {e.kind === "americano" ? "امریکانو · هم‌تیمی‌های چرخشی" : "تورنمنت"}
        </span>
        <ShieldCheck size={22} />
      </div>
      <h3 className="mb-3 mt-6 text-xl font-bold">{e.title}</h3>
      <p className="text-xs text-muted-foreground">{club?.name}</p>
      <p className="my-5 text-sm">{moment(e.starts_at)}</p>
      <div className="flex justify-between border-t border-border pt-4 text-sm">
        <span>{e.entry_fee ? money(e.entry_fee) : "ثبت‌نام رایگان"}</span>
        <span className="text-muted-foreground">{number(e.capacity)} نفر</span>
      </div>
    </Link>
  );
}

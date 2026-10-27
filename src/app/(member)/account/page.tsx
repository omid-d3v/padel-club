import Link from "next/link";
import {
  CalendarDays,
  Trophy,
  TrendingUp,
  Target,
  UsersRound,
  ArrowUpLeft,
  BadgeCheck,
  Pencil,
  MapPin,
  Wallet,
} from "lucide-react";
import { PlayerAvatar } from "@/components/platform/player-avatar";
import { requireMember, ownRows } from "@/lib/platform/data";
import { number } from "@/lib/utils";
import { SKILLS } from "@/lib/platform/types";
import { moment } from "@/lib/platform/format";
export default async function Account() {
  const [m, participants, registrations] = await Promise.all([
    requireMember(),
    ownRows("booking_participants"),
    ownRows("event_registrations"),
  ]);
  const { data: locations } = await m.db.rpc("my_booking_locations");
  const upcoming =
    locations?.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at)) ?? [];
  const { data: history } = m.profile?.player_id
    ? await m.db
        .from("public_results")
        .select("*")
        .eq("player_id", m.profile.player_id)
    : { data: [] };
  const wins = history?.reduce((s, r) => s + r.matches_won, 0) ?? 0;
  const losses = history?.reduce((s, r) => s + r.matches_lost, 0) ?? 0;
  const { data: recent, error: recentError } = await m.db
    .from("result_submissions")
    .select("*")
    .or(`team1_users.cs.{${m.userId}},team2_users.cs.{${m.userId}}`)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(50);
  if (recentError) throw new Error("دریافت سابقه بازی‌ها انجام نشد.");
  const won = (r: NonNullable<typeof recent>[number]) =>
    r.team1_users.includes(m.userId)
      ? r.team1_sets > r.team2_sets
      : r.team2_sets > r.team1_sets;
  return (
    <section className="public-container public-page">
      <header className="member-hero">
        <div className="member-hero-main">
          <PlayerAvatar
            name={m.profile?.display_name ?? "بازیکن"}
            path={m.profile?.avatar_path}
            large
          />
          <div>
            <span className="member-eyebrow">مچ شو / فضای بازی تو</span>
            <h1>
              {m.profile
                ? `${m.profile.display_name}، وقت بازیه.`
                : "به مچ شو خوش آمدی."}
            </h1>
            <p className="intro">
              {m.profile
                ? `${SKILLS[m.profile.skill_level]} · ${m.profile.skill_verified ? "سطح تأییدشده" : "سطح خوداظهاری"}`
                : "برای رزرو و پیدا کردن هم‌بازی، اول پروفایل بازی را تکمیل کن."}
            </p>
            {m.profile?.skill_verified && (
              <span className="member-verified">
                <BadgeCheck size={16} />
                سطح تأییدشده
              </span>
            )}
          </div>
        </div>
        <Link href="/account/profile" className="member-edit">
          <Pencil size={16} />
          ویرایش پروفایل
        </Link>
      </header>
      {!m.profile && (
        <Link
          href="/account/profile"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold"
        >
          تکمیل پروفایل
        </Link>
      )}
      <section className="platform-card my-6">
        <h2>قدم بعدی شما</h2>
        {upcoming.length ? (
          <div className="space-y-4">
            {upcoming.slice(0, 3).map((l) => (
              <Link
                key={l.booking_id}
                className="block min-h-11 rounded-xl bg-muted p-4"
                href={`/account/bookings#booking-${l.booking_id}`}
              >
                <b>
                  {l.club} · {l.court}
                </b>
                <span className="mt-2 block text-sm">
                  {moment(l.starts_at)} · وضعیت رزرو و پرداخت را ببینید
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href="/clubs"
          >
            برای بازی بعدی سانس انتخاب کنید
          </Link>
        )}
        <Link
          className="mt-3 block min-h-11 underline"
          href="/account/notifications?unread=1"
        >
          اعلان‌هایی که هنوز نخوانده‌اید
        </Link>
      </section>
      <div className="member-stats">
        {[
          [
            "جایگاه‌های فعال",
            participants.filter((p) =>
              ["paid", "reserved", "interested"].includes(p.status),
            ).length,
          ],
          [
            "ثبت‌نام رویداد",
            registrations.filter((r) => r.status === "paid").length,
          ],
          ["برد رقابتی ثبت‌شده", wins],
          [
            "درصد برد تاریخچه",
            wins + losses ? Math.round((100 * wins) / (wins + losses)) : 0,
          ],
        ].map(([label, value], i) => {
          const Icon = [CalendarDays, Trophy, Target, TrendingUp][i];
          return (
            <div className="member-stat" key={label}>
              <span className="member-stat-icon">
                <Icon size={21} />
              </span>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-4 text-3xl font-extrabold">
                {number(Number(value))}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href="/clubs" className="member-action member-action-primary">
          <span className="member-action-icon">
            <MapPin size={28} />
          </span>
          <div>
            <h2>زمین بازی بعدی</h2>
            <p className="text-sm text-muted-foreground">
              باشگاه و سانس دلخواه را پیدا کن.
            </p>
          </div>
          <ArrowUpLeft size={22} />
        </Link>
        <Link href="/matches" className="member-action">
          <span className="member-action-icon">
            <UsersRound size={28} />
          </span>
          <div>
            <h2>هم‌بازی بعدی</h2>
            <p className="text-sm text-muted-foreground">
              به یک بازی چهار نفره ملحق شو.
            </p>
          </div>
          <ArrowUpLeft size={22} />
        </Link>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Link href="/account/bookings" className="member-shortcut">
          <CalendarDays size={20} />
          <span>پیگیری رزروها و مهلت پرداخت</span>
          <ArrowUpLeft size={17} />
        </Link>
        <Link href="/account/payments" className="member-shortcut">
          <Wallet size={20} />
          <span>رسیدها و وضعیت استرداد</span>
          <ArrowUpLeft size={17} />
        </Link>
      </div>
      {history && history.length > 0 && (
        <div className="platform-card mt-8">
          <h2>سابقه حفظ‌شده باشگاه</h2>
          {history.map((r) => (
            <p className="my-3 text-sm" key={r.id}>
              {r.title} · رتبه {number(r.rank)} · {number(r.matches_won)} برد
            </p>
          ))}
        </div>
      )}
      {!!recent?.length && (
        <section className="platform-card mt-8">
          <h2>بازی‌های اخیر با نتیجه تأییدشده</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {number(recent.length)} بازی · {number(recent.filter(won).length)}{" "}
            برد · {number(recent.filter((r) => !won(r)).length)} باخت ·{" "}
            {number(
              Math.round((100 * recent.filter(won).length) / recent.length),
            )}
            ٪ برد در پنجاه نتیجه اخیر
          </p>
          {recent.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap justify-between gap-3 border-t border-border py-4 text-sm"
            >
              <span>
                {won(r) ? "برد" : "باخت"} ·{" "}
                {r.competitive ? "رقابتی" : "دوستانه"}
              </span>
              <span>
                {number(r.team1_sets)} — {number(r.team2_sets)}
              </span>
              <span>{moment(r.created_at)}</span>
            </div>
          ))}
        </section>
      )}
    </section>
  );
}

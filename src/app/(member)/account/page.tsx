import Link from "next/link";
import { requireMember, ownRows } from "@/lib/platform/data";
import { number } from "@/lib/utils";
import { SKILLS } from "@/lib/platform/types";
import { moment } from "@/lib/platform/format";
export default async function Account() {
  const [m, bookings, registrations] = await Promise.all([
    requireMember(),
    ownRows("bookings"),
    ownRows("event_registrations"),
  ]);
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
      <h1>
        {m.profile
          ? `${m.profile.display_name}، وقت بازیه.`
          : "به رالی‌یار خوش آمدی."}
      </h1>
      <p className="intro">
        {m.profile
          ? `${SKILLS[m.profile.skill_level]} · ${m.profile.skill_verified ? "سطح تأییدشده" : "سطح خوداظهاری"}`
          : "برای رزرو و پیدا کردن هم‌بازی، اول پروفایل بازی را تکمیل کن."}
      </p>
      {!m.profile && (
        <Link
          href="/account/profile"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold"
        >
          تکمیل پروفایل
        </Link>
      )}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["درخواست رزرو", bookings.length],
          [
            "ثبت‌نام رویداد",
            registrations.filter((r) => r.status === "paid").length,
          ],
          ["برد رقابتی ثبت‌شده", wins],
          [
            "درصد برد تاریخچه",
            wins + losses ? Math.round((100 * wins) / (wins + losses)) : 0,
          ],
        ].map(([label, value]) => (
          <div className="platform-card" key={label}>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-4 text-3xl font-extrabold">
              {number(Number(value))}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Link href="/clubs" className="platform-card">
          <h2>زمین بازی بعدی</h2>
          <p className="text-sm text-muted-foreground">
            باشگاه و سانس دلخواه را پیدا کن. ↖
          </p>
        </Link>
        <Link href="/matches" className="platform-card">
          <h2>هم‌بازی بعدی</h2>
          <p className="text-sm text-muted-foreground">
            به یک بازی چهار نفره ملحق شو. ↖
          </p>
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

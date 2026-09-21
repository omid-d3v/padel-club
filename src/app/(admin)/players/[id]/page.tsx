import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Trophy,
  Activity,
  Target,
  Crown,
  TrendingUp,
  Medal,
} from "lucide-react";
import { getPlayers, getTournaments, getAdminStats } from "@/lib/data";

import {
  PageHeader,
  StatCard,
  PlayerBadge,
  BackLink,
  EmptyState,
  StatusBadge,
} from "@/components/shared";
import { getBadges } from "@/lib/tournament/badges";
import { date, fullName, number } from "@/lib/utils";
export default async function Profile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [players, tournaments, stats] = await Promise.all([
    getPlayers(),
    getTournaments(),
    getAdminStats(),
  ]);
  const player = players.find((p) => p.id === id);
  if (!player) notFound();
  const rounds = stats.rounds;
  const own = stats.results.filter((r) => r.player_id === id);
  const completed = new Set(
    tournaments.filter((t) => t.status === "completed").map((t) => t.id),
  );
  const results = own.filter((r) => completed.has(r.tournament_id));
  const played = results.reduce(
    (s, r) => s + r.matches_won + r.matches_lost,
    0,
  );
  const wins = results.reduce((s, r) => s + r.matches_won, 0);
  const crowns = results.filter((r) => r.rank === 1).length;
  const badges = getBadges(
    id,
    stats.results,
    stats.matches,
    tournaments,
    Object.fromEntries((rounds ?? []).map((r) => [r.id, r.round_number])),
  );
  return (
    <>
      <PageHeader
        title={fullName(player)}
        description={
          player.phone ? `شماره تماس: ${player.phone}` : "عضو باشگاه پدل"
        }
        action={<BackLink href="/players" label="همه بازیکنان" />}
      />
      <div className="mb-7 grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label="مسابقات پایان‌یافته"
          value={results.length}
          icon={<Trophy size={20} />}
        />
        <StatCard
          label="بازی‌های انجام‌شده"
          value={played}
          icon={<Activity size={20} />}
        />
        <StatCard
          label="درصد برد"
          value={`${number(played ? (100 * wins) / played : 0)}٪`}
          icon={<Target size={20} />}
        />
        <StatCard
          label="پادشاه زمین"
          value={crowns}
          icon={<Crown size={20} />}
        />
        <StatCard
          label="میانگین امتیاز مسابقه"
          value={
            results.length
              ? results.reduce((s, r) => s + r.total_points, 0) / results.length
              : 0
          }
          icon={<TrendingUp size={20} />}
        />
        <StatCard
          label="بهترین رتبه"
          value={results.length ? Math.min(...results.map((r) => r.rank)) : "—"}
          icon={<Medal size={20} />}
        />
      </div>
      <section className="panel mb-8 p-6">
        <h2 className="mb-4 font-bold">نشان‌های بازیکن</h2>
        {badges.length ? (
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <PlayerBadge key={b} label={b} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            با شرکت در مسابقات، اولین نشان خود را به دست بیاورید.
          </p>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          نشان‌ها از مسابقات پایان‌یافته محاسبه می‌شوند؛ «روی فرم» یعنی حداقل
          پنج برد متوالی در آخرین بازی‌ها.
        </p>
      </section>
      <h2 className="mb-5 text-xl font-bold">مسیر بازیکن در مسابقات</h2>
      {own.length ? (
        <div className="panel overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>مسابقه</th>
                <th>تاریخ</th>
                <th>وضعیت</th>
                <th>رتبه</th>
                <th>امتیاز</th>
              </tr>
            </thead>
            <tbody>
              {tournaments
                .filter((t) => own.some((r) => r.tournament_id === t.id))
                .map((t) => {
                  const r = own.find((r) => r.tournament_id === t.id)!;
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link
                          className="font-medium hover:text-emerald-700"
                          href={`/tournaments/${t.id}${t.status === "completed" ? "/results" : ""}`}
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td>{date(t.date)}</td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        {number(r.rank)}
                        {t.status !== "completed" && " (موقت)"}
                      </td>
                      <td>{number(r.total_points)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="داستان این بازیکن هنوز شروع نشده"
          description="با اضافه‌شدن به اولین مچ‌میکینگ، سابقه مسابقات اینجا نمایش داده می‌شود."
        />
      )}
    </>
  );
}

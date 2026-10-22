import Link from "next/link";
import {
  Plus,
  Users,
  Trophy,
  Crown,
  Activity,
  ArrowUpLeft,
} from "lucide-react";
import { getPlayers, getTournaments, getAdminStats } from "@/lib/data";
import {
  PageHeader,
  StatCard,
  TournamentCard,
  EmptyState,
  StatusBadge,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { date, number } from "@/lib/utils";
export default async function Dashboard() {
  const [players, tournaments, stats] = await Promise.all([
    getPlayers(),
    getTournaments(),
    getAdminStats(),
  ]);
  const active = tournaments.find((t) => t.status === "active");
  const activeMatches = stats.matches.filter(
    (m) => m.tournament_id === active?.id,
  );
  const finished = activeMatches.filter((m) => m.winner_team).length;
  const currentRound =
    stats.rounds
      .filter((r) => r.tournament_id === active?.id)
      .toSorted((a, b) => a.round_number - b.round_number)
      .find((r) =>
        activeMatches.some((m) => m.round_id === r.id && !m.winner_team),
      )?.round_number ?? 7;
  return (
    <>
      <PageHeader
        title="سلام، به زمین خوش آمدید 👋"
        description="یک نگاه به باشگاه؛ بعد، وقت بازی است."
        action={
          <Button asChild>
            <Link href="/tournaments/new">
              <Plus size={18} />
              مچ‌میکینگ جدید
            </Link>
          </Button>
        }
      />
      <section className="relative mb-7 overflow-hidden rounded-3xl bg-[#23493b] p-6 text-white md:p-9">
        <div
          aria-hidden
          className="absolute -end-8 -top-5 hidden opacity-55 sm:block"
        >
          <div className="court-lines" />
          <span className="absolute start-0 top-40 size-8 rounded-full bg-primary shadow-lg" />
        </div>
        <div className="relative max-w-lg">
          {active ? (
            <>
              <StatusBadge status="active" />
              <h2 className="mb-3 mt-5 text-2xl font-extrabold md:text-3xl">
                {active.title}
              </h2>
              <p className="text-sm text-white/70">
                {date(active.date)} <span className="mx-3">•</span>دور{" "}
                {number(currentRound)} از ۷ <span className="mx-3">•</span>
                {number(finished)} بازی کامل شده از ۱۴
              </p>
              <Button className="mt-7" asChild>
                <Link href={`/tournaments/${active.id}`}>
                  مشاهده مسابقات
                  <ArrowUpLeft size={18} />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <span className="text-xs text-primary">
                بازی بعدی از اینجا شروع می‌شود
              </span>
              <h2 className="mb-3 mt-4 text-2xl font-extrabold md:text-3xl">
                هشت بازیکن، یک رقابت تازه.
              </h2>
              <p className="text-sm leading-7 text-white/70">
                مسابقه فعالی ندارید. بازیکنان را انتخاب کنید؛
                <br />
                برنامه بازی‌ها را به ما بسپارید.
              </p>
              <Button className="mt-6" asChild>
                <Link href="/tournaments/new">
                  ساخت مچ‌میکینگ
                  <ArrowUpLeft size={18} />
                </Link>
              </Button>
            </>
          )}
        </div>
      </section>
      <section className="mb-9 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          label="بازیکنان باشگاه"
          value={players.length}
          icon={<Users size={21} />}
        />
        <StatCard
          label="مچ‌میکینگ‌ها"
          value={tournaments.length}
          icon={<Trophy size={21} />}
        />
        <StatCard
          label="بازی‌های انجام‌شده"
          value={stats.matches.filter((m) => m.winner_team).length}
          icon={<Activity size={21} />}
        />
        <StatCard
          label="تاج‌های ثبت‌شده"
          value={tournaments.filter((t) => t.status === "completed").length}
          icon={<Crown size={21} />}
        />
      </section>
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">آخرین مچ‌میکینگ‌ها</h2>
          <Link
            href="/tournaments"
            className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground"
          >
            همه مسابقات
            <ArrowUpLeft size={16} />
          </Link>
        </div>
        {tournaments.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments
              .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 5)
              .map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
          </div>
        ) : (
          <EmptyState
            title="جای اولین مسابقه شما خالی است"
            description="ابتدا بازیکنان باشگاه را ثبت کنید، سپس مسابقه بسازید."
            action={
              <Button variant="outline" asChild>
                <Link href="/players">ثبت بازیکنان</Link>
              </Button>
            }
          />
        )}
      </section>
    </>
  );
}

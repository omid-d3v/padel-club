import { notFound } from "next/navigation";
import { getPublicResults } from "@/lib/data";
import { Podium, TournamentStandings, BackLink } from "@/components/shared";
import { date, fullName, number } from "@/lib/utils";
export default async function Results({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const results = await getPublicResults(id);
  if (!results.length) notFound();
  const king = results[0];
  return (
    <>
      <div className="mb-6">
        <BackLink href="/leaderboard" label="لیدربرد بازیکنان" />
      </div>
      <section className="mb-8 rounded-3xl bg-[#23493b] px-5 py-10 text-center text-white">
        <p className="text-xs text-white/60">
          {king.title} • {date(king.date)}
        </p>
        <span className="mb-4 mt-7 block text-6xl">👑</span>
        <p className="text-sm text-primary">پادشاه زمین</p>
        <h1 className="mb-3 mt-3 text-3xl font-extrabold md:text-4xl">
          {fullName(king)}
        </h1>
        <p className="text-lg text-primary">
          {number(king.total_points)} برد بازی
        </p>
        <p className="mt-5 text-xs text-white/60">
          یک رقابت تمام شد؛ داستان بعدی روی زمین شروع می‌شود.
        </p>
      </section>
      <Podium results={results} />
      <h2 className="mb-5 text-xl font-bold">جدول نهایی مسابقه</h2>
      <TournamentStandings
        standings={results}
        players={results.map((r) => ({
          id: r.player_id,
          first_name: r.first_name,
          last_name: r.last_name,
        }))}
        detailed
      />
      <p className="mt-4 text-xs leading-7 text-muted-foreground">
        ترتیب: برد بازی، برد راند، تفاضل راند و در تساوی کامل، اسلات اولیه.
      </p>
    </>
  );
}

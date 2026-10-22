import { notFound } from "next/navigation";
import { events, requireMember } from "@/lib/platform/data";
import { ActionForm } from "@/components/platform/action-form";
import { TournamentStandings } from "@/components/shared";
import { number } from "@/lib/utils";
export const metadata = {
  title: "دورها و نتایج رویداد",
  robots: { index: false },
};
export default async function Rounds({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, m, ev] = await Promise.all([
    params,
    requireMember(),
    events(),
  ]);
  const e = ev.rows.find((e) => e.slug === slug);
  if (!e?.tournament_id) notFound();
  const [
    { data: matches, error },
    { data: rounds },
    { data: sets },
    { data: standings },
    { data: roster },
  ] = await Promise.all([
    m.db.from("matches").select("*").eq("tournament_id", e.tournament_id),
    m.db
      .from("tournament_rounds")
      .select("*")
      .eq("tournament_id", e.tournament_id)
      .order("round_number"),
    m.db.from("match_sets").select("*"),
    m.db
      .from("tournament_results")
      .select("*")
      .eq("tournament_id", e.tournament_id)
      .order("rank"),
    m.db.rpc("event_roster", { p_event: e.id }),
  ]);
  if (error) throw new Error("دریافت دورها انجام نشد.");
  const names = roster ?? [];
  const canScore = m.admin || m.userId === e.organizer_id;
  return (
    <section className="public-container public-page">
      <h1>دورهای {e.title}</h1>
      <p className="intro">
        امتیازدهی فعلی باشگاه بر پایه برنده هر راند حفظ شده است.
      </p>
      {rounds?.map((round) => (
        <section key={round.id} className="my-8">
          <h2 className="mb-5 text-2xl font-bold">
            دور {number(round.round_number)}
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {matches
              ?.filter((game) => game.round_id === round.id)
              .map((game) => {
                const team = (a: string, b: string) =>
                  `${names.find((n) => n.player_id === a)?.name ?? "بازیکن"} + ${names.find((n) => n.player_id === b)?.name ?? "بازیکن"}`;
                return (
                  <div
                    key={`${game.id}-${game.version}`}
                    className="platform-card"
                  >
                    <h3 className="font-bold">
                      زمین {number(game.court_number)}
                    </h3>
                    <p className="my-4 text-sm leading-8">
                      {team(game.team1_player1_id, game.team1_player2_id)}
                      <br />
                      <span className="text-xs text-muted-foreground">
                        در برابر
                      </span>
                      <br />
                      {team(game.team2_player1_id, game.team2_player2_id)}
                    </p>
                    <ActionForm
                      operation="event-score"
                      label="ثبت برنده راندها"
                      disabled={!canScore || e.status !== "active"}
                    >
                      <input name="match_id" value={game.id} type="hidden" />
                      <input
                        name="version"
                        value={game.version}
                        type="hidden"
                      />
                      {[1, 2, 3].map((n) => (
                        <label key={n} className="field">
                          راند {number(n)}
                          <select
                            name={`set${n}`}
                            disabled={!canScore}
                            defaultValue={
                              sets?.find(
                                (s) =>
                                  s.match_id === game.id && s.set_number === n,
                              )?.winner_team ?? ""
                            }
                          >
                            <option value="">هنوز ثبت نشده</option>
                            <option value="1">تیم اول</option>
                            <option value="2">تیم دوم</option>
                          </select>
                        </label>
                      ))}
                    </ActionForm>
                  </div>
                );
              })}
          </div>
        </section>
      ))}
      <h2 className="mb-6 text-2xl font-bold">رتبه‌بندی زنده</h2>
      <TournamentStandings
        standings={standings ?? []}
        players={names.map((n, i) => ({
          id: n.player_id ?? String(i),
          first_name: n.name,
          last_name: "",
        }))}
      />
    </section>
  );
}

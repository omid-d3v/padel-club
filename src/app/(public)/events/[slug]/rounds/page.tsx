import { notFound } from "next/navigation";
import { events, requireMember } from "@/lib/platform/data";
import { EventScoreForm } from "@/components/platform/result-forms";
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
  const { slug } = await params;
  const [m, ev] = await Promise.all([
    requireMember(`/events/${slug}/rounds`),
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
        نتیجهٔ هر بازی و رتبه‌بندی بازیکنان را اینجا دنبال کنید.
      </p>
      {rounds?.map((round) => (
        <details
          key={round.id}
          className="my-5"
          open={
            round.id ===
            rounds.find((r) =>
              matches?.some((g) => g.round_id === r.id && !g.winner_team),
            )?.id
          }
        >
          <summary className="min-h-11 cursor-pointer text-2xl font-bold">
            دور {number(round.round_number)}
          </summary>
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
                    {canScore && e.status === "active" ? (
                      <EventScoreForm
                        matchId={game.id}
                        version={game.version}
                        team1={team(
                          game.team1_player1_id,
                          game.team1_player2_id,
                        )}
                        team2={team(
                          game.team2_player1_id,
                          game.team2_player2_id,
                        )}
                        winners={[1, 2, 3].map(
                          (n) =>
                            sets?.find(
                              (s) =>
                                s.match_id === game.id && s.set_number === n,
                            )?.winner_team ?? null,
                        )}
                      />
                    ) : (
                      <div className="space-y-3 text-sm">
                        {[1, 2, 3].map((n) => {
                          const winner = sets?.find(
                            (s) => s.match_id === game.id && s.set_number === n,
                          )?.winner_team;
                          return (
                            <p key={n}>
                              راند {number(n)}:{" "}
                              {winner === 1
                                ? team(
                                    game.team1_player1_id,
                                    game.team1_player2_id,
                                  )
                                : winner === 2
                                  ? team(
                                      game.team2_player1_id,
                                      game.team2_player2_id,
                                    )
                                  : "هنوز ثبت نشده"}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </details>
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

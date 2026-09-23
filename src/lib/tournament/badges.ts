import type { Match, Standing, Tournament } from "@/lib/types";
export function getBadges(
  playerId: string,
  results: Standing[],
  matches: Match[],
  tournaments: Tournament[],
  roundNumbers: Record<string, number>,
): string[] {
  const completed = new Map(
    tournaments.filter((t) => t.status === "completed").map((t) => [t.id, t]),
  );
  const own = results.filter(
    (r) => r.player_id === playerId && completed.has(r.tournament_id),
  );
  const games = matches
    .filter(
      (m) =>
        completed.has(m.tournament_id) &&
        m.winner_team !== null &&
        [
          m.team1_player1_id,
          m.team1_player2_id,
          m.team2_player1_id,
          m.team2_player2_id,
        ].includes(playerId),
    )
    .sort((a, b) => {
      const ta = completed.get(a.tournament_id)!,
        tb = completed.get(b.tournament_id)!;
      return (
        ta.date.localeCompare(tb.date) ||
        ta.created_at.localeCompare(tb.created_at) ||
        ta.id.localeCompare(tb.id) ||
        (roundNumbers[a.round_id] ?? 0) - (roundNumbers[b.round_id] ?? 0) ||
        a.court_number - b.court_number
      );
    });
  let streak = 0;
  for (const m of games) {
    const ownTeam = [m.team1_player1_id, m.team1_player2_id].includes(playerId)
      ? 1
      : 2;
    streak = m.winner_team === ownTeam ? streak + 1 : 0;
  }
  const badges: string[] = [];
  if (own.some((r) => r.rank === 1)) badges.push("👑 پادشاه زمین");
  if (streak >= 5) badges.push("🔥 روی فرم");
  if (own.length >= 10) badges.push("🏟 بازیکن ثابت");
  if (games.length >= 100) badges.push("💯 صدتایی");
  if (
    own.some(
      (r) =>
        r.point_difference ===
        Math.max(
          ...results
            .filter((x) => x.tournament_id === r.tournament_id)
            .map((x) => x.point_difference),
        ),
    )
  )
    badges.push("🎯 برنده راند");
  return badges;
}

import { getPlayers, getTournaments, getAdminStats } from "@/lib/data";
import { PageHeader } from "@/components/shared";
import { PlayerForm } from "@/components/forms";
import { PlayerList } from "@/components/player-list";
export default async function Players() {
  const [players, tournaments, stats] = await Promise.all([
    getPlayers(),
    getTournaments(),
    getAdminStats(),
  ]);
  const completed = new Set(
    tournaments.filter((t) => t.status === "completed").map((t) => t.id),
  );
  return (
    <>
      <PageHeader
        title="بازیکنان"
        description="آدم‌های پشت هر بازی خوب را اینجا پیدا کنید."
        action={<PlayerForm />}
      />
      <PlayerList
        rows={players.map((player) => ({
          player,
          tournaments: stats.members.filter((m) => m.player_id === player.id)
            .length,
          wins: stats.results
            .filter((r) => r.player_id === player.id)
            .reduce((s, r) => s + r.matches_won, 0),
          crowns: stats.results.filter(
            (r) =>
              r.player_id === player.id &&
              r.rank === 1 &&
              completed.has(r.tournament_id),
          ).length,
        }))}
      />
    </>
  );
}

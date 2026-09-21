import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient, configured } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type {
  Player,
  Tournament,
  TournamentPlayer,
  Round,
  Match,
  MatchSet,
  Standing,
  Leader,
  PublicResult,
  TournamentData,
} from "@/lib/types";
function checked<T>(result: {
  data: unknown;
  error: { message: string } | null;
}): T {
  if (result.error) {
    console.error("Database read failed:", result.error.message);
    throw new Error(
      "دریافت اطلاعات انجام نشد. اتصال و نصب دیتابیس را بررسی کنید.",
    );
  }
  return result.data as T;
}
// Read in stable pages so Supabase's default row cap cannot silently truncate totals.
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const batch = checked<T[]>(await page(from, from + 499));
    rows.push(...batch);
    if (batch.length < 500) return rows;
  }
}
export const getPlayers = cache(async () => {
  const db = await requireAdmin();
  return allRows<Player>((from, to) =>
    db
      .from("players")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
});
export const getTournaments = cache(async () => {
  const db = await requireAdmin();
  return allRows<Tournament>((from, to) =>
    db
      .from("tournaments")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to),
  );
});
export const getAdminStats = cache(async () => {
  const db = await requireAdmin();
  const [members, matches, results, rounds] = await Promise.all([
    allRows<TournamentPlayer>((a, b) =>
      db.from("tournament_players").select("*").order("id").range(a, b),
    ),
    allRows<Match>((a, b) =>
      db.from("matches").select("*").order("id").range(a, b),
    ),
    allRows<Standing>((a, b) =>
      db.from("tournament_results").select("*").order("id").range(a, b),
    ),
    allRows<Round>((a, b) =>
      db.from("tournament_rounds").select("*").order("id").range(a, b),
    ),
  ]);
  return { members, matches, results, rounds };
});
export const getTournament = cache(
  async (id: string): Promise<TournamentData> => {
    const db = await requireAdmin();
    if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
    const t = checked<Tournament | null>(
      await db.from("tournaments").select("*").eq("id", id).maybeSingle(),
    );
    if (!t) notFound();
    const [players, participants, rounds, matches, standings] =
      await Promise.all([
        getPlayers(),
        db.from("tournament_players").select("*").eq("tournament_id", id),
        db
          .from("tournament_rounds")
          .select("*")
          .eq("tournament_id", id)
          .order("round_number"),
        db
          .from("matches")
          .select("*")
          .eq("tournament_id", id)
          .order("court_number"),
        db
          .from("tournament_results")
          .select("*")
          .eq("tournament_id", id)
          .order("rank"),
      ]);
    const ms = checked<Match[]>(matches);
    const sets = checked<MatchSet[]>(
      await db
        .from("match_sets")
        .select("*")
        .in(
          "match_id",
          ms.map((m) => m.id),
        )
        .order("set_number"),
    );
    return {
      tournament: t,
      players,
      participants: checked<TournamentPlayer[]>(participants),
      rounds: checked<Round[]>(rounds),
      matches: ms,
      sets,
      standings: checked<Standing[]>(standings),
    };
  },
);
async function publicDb() {
  if (!configured()) redirect("/setup");
  return createClient();
}
export const getLeaderboard = cache(async () => {
  const db = await publicDb();
  return allRows<Leader>((from, to) =>
    db
      .from("public_leaderboard")
      .select("*")
      .order("crowns", { ascending: false })
      .order("average_rank")
      .order("win_rate", { ascending: false })
      .order("player_id")
      .range(from, to),
  );
});
export const getPublicResults = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await publicDb();
  return checked<PublicResult[]>(
    await db
      .from("public_results")
      .select("*")
      .eq("tournament_id", id)
      .order("rank"),
  );
});

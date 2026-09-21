import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { generateMatches } from "../src/lib/tournament/generateMatches";
import type { Slot } from "../src/lib/types";
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001";
const user = "00000000-0000-4000-8000-000000000002";
let players: string[];
async function query<T>(sql: string, args: unknown[] = []) {
  return (await db.query<T>(sql, args)).rows;
}
async function role(name: "authenticated" | "anon" | "postgres", id = admin) {
  await db.exec(`reset role; set role ${name};`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function tournament() {
  const rows = await query<{ id: string }>(
    "select public.create_tournament($1,$2,$3::uuid[]) id",
    ["رقابت تست", "2026-09-21", players],
  );
  return rows[0].id;
}
async function save(
  match: string,
  version: number,
  values: (number | null)[][],
) {
  return db.query("select public.save_match_scores($1,$2,$3::jsonb)", [
    match,
    version,
    JSON.stringify(
      values.map((s, i) => ({
        set_number: i + 1,
        team1_score: s[0],
        team2_score: s[1],
      })),
    ),
  ]);
}
beforeAll(async () => {
  await db.exec(
    `create schema auth; create role anon; create role authenticated; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.exec(
    readFileSync(
      new URL("../supabase/migrations/001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2)", [admin, user]);
  await db.query("insert into public.admins(user_id) values($1)", [admin]);
  players = (
    await query<{ id: string }>(
      "insert into public.players(first_name,last_name) select 'بازیکن',n::text from generate_series(1,8) n returning id",
    )
  ).map((p) => p.id);
  await role("authenticated");
});
afterAll(async () => {
  await db.close();
});
describe("database authority and scoring", () => {
  it("atomically generates the exact schedule: 8 slots, 7 rounds, 14 matches and 42 empty sets", async () => {
    const id = await tournament();
    const slots = await query<{ slot: Slot; player_id: string }>(
      "select slot,player_id from tournament_players where tournament_id=$1",
      [id],
    );
    const expected = generateMatches(
      Object.fromEntries(slots.map((p) => [p.slot, p.player_id])) as Record<
        Slot,
        string
      >,
    );
    const actual = await query(
      "select r.round_number,m.court_number,m.team1_player1_id,m.team1_player2_id,m.team2_player1_id,m.team2_player2_id from matches m join tournament_rounds r on r.id=m.round_id where m.tournament_id=$1 order by r.round_number,m.court_number",
      [id],
    );
    expect(actual).toEqual(expected);
    expect(
      (
        await query<{ count: number }>(
          "select count(*)::integer count from match_sets s join matches m on m.id=s.match_id where m.tournament_id=$1 and s.team1_score is null",
          [id],
        )
      )[0].count,
    ).toBe(42);
    expect(
      await query("select * from tournament_results where tournament_id=$1", [
        id,
      ]),
    ).toHaveLength(8);
    await expect(
      save(
        (
          await query<{ id: string }>(
            "select id from matches where tournament_id=$1 limit 1",
            [id],
          )
        )[0].id,
        0,
        [
          [6, 3],
          [4, 6],
          [6, 2],
        ],
      ),
    ).rejects.toThrow("TOURNAMENT_NOT_ACTIVE");
  });
  it("counts partial sets, waits for all three to choose winner, and recalculates corrections without double counting", async () => {
    const id = await tournament();
    await db.query("select start_tournament($1)", [id]);
    const m = (
      await query<{
        id: string;
        team1_player1_id: string;
        team2_player1_id: string;
      }>("select * from matches where tournament_id=$1 limit 1", [id])
    )[0];
    await save(m.id, 0, [
      [6, 3],
      [4, 6],
      [null, null],
    ]);
    expect(
      (
        await query<{ winner_team: number | null }>(
          "select winner_team from matches where id=$1",
          [m.id],
        )
      )[0].winner_team,
    ).toBeNull();
    await save(m.id, 1, [
      [6, 3],
      [4, 6],
      [6, 2],
    ]);
    let r = (
      await query<{
        total_points: number;
        sets_won: number;
        sets_lost: number;
        point_difference: number;
        matches_won: number;
      }>(
        "select * from tournament_results where tournament_id=$1 and player_id=$2",
        [id, m.team1_player1_id],
      )
    )[0];
    expect(r).toMatchObject({
      total_points: 16,
      sets_won: 2,
      sets_lost: 1,
      point_difference: 5,
      matches_won: 1,
    });
    expect(
      (
        await query(
          "select total_points,point_difference,matches_lost from tournament_results where tournament_id=$1 and player_id=$2",
          [id, m.team2_player1_id],
        )
      )[0],
    ).toEqual({ total_points: 11, point_difference: -5, matches_lost: 1 });
    await expect(
      save(m.id, 1, [
        [1, 6],
        [2, 6],
        [3, 6],
      ]),
    ).rejects.toThrow("SCORE_CONFLICT");
    await save(m.id, 2, [
      [1, 6],
      [2, 6],
      [3, 6],
    ]);
    r = (
      await query<typeof r>(
        "select * from tournament_results where tournament_id=$1 and player_id=$2",
        [id, m.team1_player1_id],
      )
    )[0];
    expect(r).toMatchObject({
      total_points: 6,
      sets_won: 0,
      sets_lost: 3,
      point_difference: -12,
      matches_won: 0,
    });
    await save(m.id, 3, [
      [null, null],
      [null, null],
      [null, null],
    ]);
    expect(
      (
        await query(
          "select total_points,matches_lost from tournament_results where tournament_id=$1 and player_id=$2",
          [id, m.team1_player1_id],
        )
      )[0],
    ).toEqual({ total_points: 0, matches_lost: 0 });
  });
  it("rejects invalid input and does not partially mutate", async () => {
    const id = await tournament();
    await db.query("select start_tournament($1)", [id]);
    const m = (
      await query<{ id: string }>(
        "select id from matches where tournament_id=$1 limit 1",
        [id],
      )
    )[0];
    for (const values of [
      [
        [6, 6],
        [6, 0],
        [6, 0],
      ],
      [
        [6, null],
        [6, 0],
        [6, 0],
      ],
      [
        [-1, 0],
        [6, 0],
        [6, 0],
      ],
      [
        [100, 0],
        [6, 0],
        [6, 0],
      ],
      [
        [6.5, 0],
        [6, 0],
        [6, 0],
      ],
    ])
      await expect(save(m.id, 0, values)).rejects.toThrow();
    await expect(
      db.query("select save_match_scores($1,0,$2::jsonb)", [
        m.id,
        JSON.stringify([
          { set_number: 1 },
          { set_number: 1 },
          { set_number: 3 },
        ]),
      ]),
    ).rejects.toThrow("INVALID_SETS");
    expect(
      (
        await query<{ version: number }>(
          "select version from matches where id=$1",
          [m.id],
        )
      )[0].version,
    ).toBe(0);
    await expect(
      db.query("select finish_tournament($1)", [id]),
    ).rejects.toThrow("INCOMPLETE_MATCHES");
    await expect(
      db.query("select create_tournament($1,$2,$3::uuid[])", [
        "bad",
        "2026-09-21",
        [...players.slice(0, 7), players[0]],
      ]),
    ).rejects.toThrow("EIGHT_PLAYERS_REQUIRED");
  });
  it("publishes only finalized data, freezes completed results, and exposes no phone column", async () => {
    const id = await tournament();
    await db.query("select start_tournament($1)", [id]);
    expect(
      await query("select * from public_results where tournament_id=$1", [id]),
    ).toHaveLength(0);
    const matches = await query<{ id: string }>(
      "select id from matches where tournament_id=$1",
      [id],
    );
    for (const m of matches)
      await save(m.id, 0, [
        [6, 3],
        [4, 6],
        [6, 2],
      ]);
    const results = await query<{
      total_points: number;
      point_difference: number;
      sets_won: number;
      sets_lost: number;
      matches_won: number;
      matches_lost: number;
      rank: number;
    }>(
      "select * from tournament_results where tournament_id=$1 order by rank",
      [id],
    );
    expect(results.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(results.reduce((s, r) => s + r.total_points, 0)).toBe(
      14 * 2 * (16 + 11),
    );
    expect(results.reduce((s, r) => s + r.point_difference, 0)).toBe(0);
    expect(results.reduce((s, r) => s + r.matches_won, 0)).toBe(28);
    expect(results.reduce((s, r) => s + r.matches_lost, 0)).toBe(28);
    expect(results.reduce((s, r) => s + r.sets_won, 0)).toBe(84);
    for (let i = 1; i < results.length; i++) {
      const a = results[i - 1],
        b = results[i];
      expect(
        a.total_points > b.total_points ||
          (a.total_points === b.total_points &&
            (a.sets_won > b.sets_won ||
              (a.sets_won === b.sets_won &&
                a.point_difference >= b.point_difference))),
      ).toBe(true);
    }
    await db.query("select finish_tournament($1)", [id]);
    await expect(
      save(matches[0].id, 1, [
        [1, 6],
        [1, 6],
        [1, 6],
      ]),
    ).rejects.toThrow("TOURNAMENT_NOT_ACTIVE");
    await expect(
      db.query("select recalculate_tournament_standings($1)", [id]),
    ).rejects.toThrow("TOURNAMENT_LOCKED");
    await role("anon");
    const publicRows = await query<Record<string, unknown>>(
      "select * from public_results where tournament_id=$1",
      [id],
    );
    expect(publicRows).toHaveLength(8);
    expect(publicRows[0]).not.toHaveProperty("phone");
    const leaders = await query<{ tournaments: number; crowns: number }>(
      "select * from public_leaderboard",
    );
    expect(leaders).toHaveLength(8);
    expect(leaders.reduce((s, l) => s + l.crowns, 0)).toBe(1);
    await expect(db.query("select phone from players")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("select create_tournament($1,$2,$3::uuid[])", [
        "bad",
        "2026-09-21",
        players,
      ]),
    ).rejects.toThrow("permission denied");
    await role("authenticated");
  });
  it("blocks ordinary signed-in users and direct schedule/result writes", async () => {
    await role("authenticated", user);
    expect(await query("select * from players")).toHaveLength(0);
    await expect(
      db.query("select create_tournament($1,$2,$3::uuid[])", [
        "bad",
        "2026-09-21",
        players,
      ]),
    ).rejects.toThrow("ADMIN_REQUIRED");
    await expect(
      db.query("insert into admins(user_id) values($1)", [user]),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("insert into players(first_name,last_name) values('a','b')"),
    ).rejects.toThrow("row-level security");
    await role("authenticated");
    await expect(db.query("update matches set winner_team=1")).rejects.toThrow(
      "permission denied",
    );
    await expect(
      db.query("update tournament_results set total_points=999"),
    ).rejects.toThrow("permission denied");
    await expect(
      db.query("delete from players where id=$1", [players[0]]),
    ).rejects.toThrow("foreign key");
  });
});

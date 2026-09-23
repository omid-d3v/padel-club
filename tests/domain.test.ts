import { describe, it, expect } from "vitest";
import {
  SLOTS,
  SCHEDULE,
  generateMatches,
} from "../src/lib/tournament/generateMatches";
import {
  normalizeDigits,
  playerSchema,
  roundWinnersSchema,
  tournamentSchema,
} from "../src/lib/validation";
import { getBadges } from "../src/lib/tournament/badges";
import type { Slot, Match, Standing, Tournament } from "../src/lib/types";
describe("tournament format", () => {
  it("uses all eight players exactly once each round and all seven partners exactly once", () => {
    const partners = new Map(SLOTS.map((s) => [s, new Set<Slot>()]));
    for (let r = 0; r < 7; r++) {
      expect(new Set(SCHEDULE.slice(r * 2, r * 2 + 2).flat()).size).toBe(8);
    }
    for (const [a, b, c, d] of SCHEDULE) {
      partners.get(a)!.add(b);
      partners.get(b)!.add(a);
      partners.get(c)!.add(d);
      partners.get(d)!.add(c);
    }
    for (const set of partners.values()) expect(set.size).toBe(7);
    expect(() =>
      generateMatches(
        Object.fromEntries(SLOTS.map((s) => [s, "same"])) as Record<
          Slot,
          string
        >,
      ),
    ).toThrow();
  });
  it("accepts localized phone digits and rejects invalid round winners and dates", () => {
    expect(normalizeDigits("۱۲٣")).toBe("123");
    expect(
      playerSchema.parse({
        first_name: " امید ",
        last_name: "حسینی",
        phone: "۰۹۱۲ ۱۲۳ ۴۵۶۷",
      }),
    ).toEqual({ first_name: "امید", last_name: "حسینی", phone: "09121234567" });
    expect(
      roundWinnersSchema.safeParse([
        { set_number: 1, winner_team: 3 },
        { set_number: 2, winner_team: 1 },
        { set_number: 3, winner_team: 2 },
      ]).success,
    ).toBe(false);
    expect(
      tournamentSchema.safeParse({
        title: "test",
        date: "2026-02-30",
        player_ids: [],
      }).success,
    ).toBe(false);
  });
  it("only counts completed tournaments and requires a current winning streak", () => {
    const t = {
      id: "t",
      status: "completed",
      date: "2026-01-01",
      created_at: "2026-01-01",
    } as Tournament;
    const results = [
      { player_id: "p", tournament_id: "t", rank: 1, point_difference: 20 },
    ] as Standing[];
    const matches = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      tournament_id: "t",
      round_id: String(i),
      court_number: 1,
      team1_player1_id: "p",
      team1_player2_id: "b",
      team2_player1_id: "c",
      team2_player2_id: "d",
      winner_team: 1,
    })) as Match[];
    const rounds = Object.fromEntries(matches.map((m, i) => [m.round_id, i]));
    expect(getBadges("p", results, matches, [t], rounds)).toEqual([
      "👑 پادشاه زمین",
      "🔥 روی فرم",
      "🎯 برنده راند",
    ]);
    matches[4].winner_team = 2;
    expect(getBadges("p", results, matches, [t], rounds)).not.toContain(
      "🔥 روی فرم",
    );
    expect(
      getBadges("p", results, matches, [{ ...t, status: "active" }], rounds),
    ).toEqual([]);
  });
});

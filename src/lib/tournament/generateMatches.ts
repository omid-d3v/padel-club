import type { Slot } from "@/lib/types";
export const SLOTS: Slot[] = ["A", "B", "C", "D", "E", "F", "G", "H"];
// Kept in sync with create_tournament in the migration; integration test verifies parity.
export const SCHEDULE: readonly (readonly [Slot, Slot, Slot, Slot])[] = [
  ["A", "H", "B", "G"],
  ["C", "D", "E", "F"],
  ["A", "B", "C", "F"],
  ["E", "D", "G", "H"],
  ["C", "E", "D", "F"],
  ["A", "G", "H", "B"],
  ["B", "F", "E", "G"],
  ["D", "H", "C", "A"],
  ["G", "D", "F", "A"],
  ["E", "H", "C", "B"],
  ["C", "H", "B", "E"],
  ["A", "D", "F", "G"],
  ["E", "A", "D", "B"],
  ["H", "F", "G", "C"],
];
export function generateMatches(slots: Record<Slot, string>) {
  if (new Set(Object.values(slots)).size !== 8 || SLOTS.some((s) => !slots[s]))
    throw new Error("دقیقاً هشت بازیکن متفاوت نیاز است.");
  return SCHEDULE.map((s, i) => ({
    round_number: Math.floor(i / 2) + 1,
    court_number: (i % 2) + 1,
    team1_player1_id: slots[s[0]],
    team1_player2_id: slots[s[1]],
    team2_player1_id: slots[s[2]],
    team2_player2_id: slots[s[3]],
  }));
}

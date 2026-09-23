export type Status = "draft" | "active" | "completed";
export type Slot = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H";
export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  created_at: string;
}
export interface Tournament {
  id: string;
  title: string;
  date: string;
  status: Status;
  court_count: number;
  total_rounds: number;
  created_at: string;
}
export interface TournamentPlayer {
  id: string;
  tournament_id: string;
  player_id: string;
  slot: Slot;
}
export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
}
export interface Match {
  id: string;
  tournament_id: string;
  round_id: string;
  court_number: number;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  winner_team: 1 | 2 | null;
  version: number;
}
export interface MatchSet {
  id: string;
  match_id: string;
  set_number: number;
  winner_team: 1 | 2 | null;
}
export interface Standing {
  id: string;
  tournament_id: string;
  player_id: string;
  total_points: number;
  sets_won: number;
  sets_lost: number;
  matches_won: number;
  matches_lost: number;
  point_difference: number;
  rank: number;
}
export interface PublicResult extends Standing {
  first_name: string;
  last_name: string;
  title: string;
  date: string;
}
export interface Leader {
  player_id: string;
  first_name: string;
  last_name: string;
  tournaments: number;
  total_points: number;
  matches_won: number;
  matches_lost: number;
  crowns: number;
  average_rank: number;
  win_rate: number;
}
export interface TournamentData {
  tournament: Tournament;
  players: Player[];
  participants: TournamentPlayer[];
  rounds: Round[];
  matches: Match[];
  sets: MatchSet[];
  standings: Standing[];
}
export type ActionResult =
  { success: true; id?: string } | { success: false; error: string };

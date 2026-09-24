import type {
  Player,
  Tournament,
  TournamentPlayer,
  Round,
  Match,
  MatchSet,
  Standing,
  PublicResult,
  Leader,
} from "@/lib/types";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
type Table<T> = {
  Row: { [K in keyof T]: T[K] };
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
type View<T> = { Row: { [K in keyof T]: T[K] }; Relationships: [] };
export type Database = {
  public: {
    Tables: {
      admins: Table<{ user_id: string; created_at: string }>;
      players: Table<Player>;
      tournaments: Table<Tournament>;
      tournament_players: Table<TournamentPlayer>;
      tournament_rounds: Table<Round>;
      matches: Table<Match>;
      match_sets: Table<MatchSet>;
      tournament_results: Table<Standing>;
    };
    Views: {
      public_results: View<PublicResult>;
      public_leaderboard: View<Leader>;
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      create_tournament: {
        Args: { p_title: string; p_date: string; p_player_ids: string[] };
        Returns: string;
      };
      start_tournament: {
        Args: { p_tournament_id: string };
        Returns: undefined;
      };
      finish_tournament: {
        Args: { p_tournament_id: string };
        Returns: undefined;
      };
      recalculate_tournament_standings: {
        Args: { p_tournament_id: string };
        Returns: undefined;
      };
      save_match_round_winners: {
        Args: { p_match_id: string; p_version: number; p_rounds: Json };
        Returns: undefined;
      };
      delete_match: {
        Args: { p_match_id: string };
        Returns: undefined;
      };
      delete_tournament: {
        Args: { p_tournament_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

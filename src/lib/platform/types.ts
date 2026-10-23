import type { Json } from "@/lib/supabase/database.types";
export const SKILLS = ["C−", "C", "B−", "B", "A−", "A"] as const;
export interface City {
  id: string;
  slug: string;
  name: string;
  description: string;
}
export interface Club {
  completion_cutoff_hours: number;
  id: string;
  city_id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  facilities: string[];
  photo_path: string | null;
  published: boolean;
  featured: boolean;
  booking_mode: "MANUAL_APPROVAL" | "EXTERNAL_AUTOMATED";
  provider_key: string | null;
  cancellation_policy: Json;
  created_at: string;
  updated_at: string;
}
export interface Court {
  sport: string;
  id: string;
  club_id: string;
  name: string;
  description: string;
  active: boolean;
  indoor: boolean;
  hourly_price: number;
  platform_fee: number;
  external_court_ref: string | null;
}
export interface Slot {
  id: string;
  court_id: string;
  starts_at: string;
  ends_at: string;
  court_price: number;
  published: boolean;
}
export interface AvailabilityRule {
  id: string;
  court_id: string;
  weekday: number;
  start_minute: number;
  end_minute: number;
  slot_minutes: number;
  price: number;
}
export interface Equipment {
  id: string;
  club_id: string;
  name: string;
  kind: "personal" | "shared";
  stock: number;
  price: number;
  active: boolean;
}
export interface Profile {
  user_id: string;
  player_id: string | null;
  display_name: string;
  city_id: string | null;
  skill_level: number;
  skill_verified: boolean;
  avatar_path: string | null;
  created_at: string;
}
export interface Booking {
  payment_first: boolean;
  fulfillment_state: "review" | "reserve" | "awaiting_user" | "booked";
  id: string;
  user_id: string;
  slot_id: string;
  kind: "private" | "open" | "event";
  status: string;
  mode: Club["booking_mode"];
  court_price: number;
  shared_price: number;
  platform_fee: number;
  cancellation_snapshot: Json;
  club_reference: string | null;
  hold_expires_at: string | null;
  payment_deadline: string | null;
  request_expires_at: string;
  external_reference: string | null;
  external_hold_reference: string | null;
  external_quote_id: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}
export interface Participant {
  id: string;
  booking_id: string;
  user_id: string;
  seat: number;
  court_share: number;
  shared_share: number;
  personal_price: number;
  fee: number;
  status: string;
  lock_expires_at: string | null;
  created_at: string;
}
export interface BookingItem {
  id: string;
  booking_id: string;
  participant_id: string | null;
  equipment_id: string;
  quantity: number;
  unit_price: number;
}
export interface OpenMatch {
  id: string;
  booking_id: string;
  organizer_id: string;
  title: string;
  description: string;
  min_skill: number | null;
  max_skill: number | null;
  completion_cutoff_hours: number;
  cutoff_at: string;
  published: boolean;
}
export interface MatchPreview extends OpenMatch {
  club_name: string;
  club_slug: string;
  city_name: string;
  court_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  participants: number;
  paid: number;
  hold_expires_at: string | null;
  roster: {
    name: string;
    skill: number;
    verified: boolean;
    seat: number;
    paid: boolean;
  }[];
}
export interface PlatformEvent {
  id: string;
  slug: string;
  title: string;
  kind: "americano" | "tournament";
  club_id: string;
  organizer_id: string;
  starts_at: string;
  registration_deadline: string;
  capacity: number;
  entry_fee: number;
  description: string;
  published: boolean;
  status: string;
  tournament_id: string | null;
  cancellation_policy: Json;
  created_at: string;
}
export interface Registration {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
  amount: number;
  lock_expires_at: string | null;
  created_at: string;
}
export interface Payment {
  id: string;
  user_id: string;
  participant_id: string | null;
  registration_id: string | null;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  authority: string | null;
  reference: string | null;
  request_key: string;
  expires_at: string;
  created_at: string;
  verified_at: string | null;
}
export interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  reason: string;
  status: string;
  provider_reference: string | null;
  attempts: number;
  created_at: string;
  completed_at: string | null;
}
export interface Notice {
  id: string;
  user_id: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  dedupe_key: string | null;
  created_at: string;
}
export interface ProviderAttempt {
  id: string;
  booking_id: string;
  operation: string;
  idempotency_key: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  created_at: string;
}
export interface ResultSubmission {
  id: string;
  match_id: string;
  submitted_by: string;
  team1_users: string[];
  team2_users: string[];
  team1_sets: number;
  team2_sets: number;
  competitive: boolean;
  status: string;
  version: number;
  created_at: string;
}
export interface Audit {
  id: string;
  actor_id: string | null;
  entity: string;
  entity_id: string;
  operation: string;
  before_data: Json | null;
  after_data: Json | null;
  created_at: string;
}
type Table<T> = {
  Row: { [K in keyof T]: T[K] };
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export interface CalendarConnection {
  id: string;
  source: "guilan" | "sabaland" | "respina";
  club_id: string | null;
  enabled: boolean;
  interval_minutes: number;
  horizon_days: number;
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  next_sync_at: string;
  lease_token: string | null;
  lease_until: string | null;
  last_error: string | null;
  last_slot_count: number;
  discovered_courts: Json;
  created_at: string;
}
export type PlatformTables = {
  booking_reschedules: Table<{
    id: string;
    booking_id: string;
    old_slot_id: string;
    new_slot_id: string;
    old_starts_at: string;
    old_ends_at: string;
    new_starts_at: string;
    new_ends_at: string;
    status: "pending" | "accepted" | "rejected" | "completed" | "superseded";
    prior_status: string | null;
    note: string;
    expires_at: string;
    created_by: string;
    created_at: string;
    responded_at: string | null;
  }>;
  push_devices: Table<{
    device_id: string;
    user_id: string;
    token: string;
    updated_at: string;
  }>;
  notification_deliveries: Table<{
    id: number;
    notification_id: string;
    channel: "sms" | "push";
    status: string;
    attempts: number;
    next_attempt_at: string;
    lease_token: string | null;
    lease_until: string | null;
    provider_reference: string | null;
    last_error: string | null;
    created_at: string;
    sent_at: string | null;
  }>;
  discount_codes: Table<{
    id: string;
    code: string;
    kind: "percent" | "fixed";
    value: number;
    max_uses: number;
    expires_at: string;
    active: boolean;
  }>;
  booking_benefits: Table<{
    id: string;
    participant_id: string;
    user_id: string;
    code_id: string | null;
    actor_id: string;
    reason: string;
    original: Json;
    discount: number;
    created_at: string;
  }>;
  calendar_connections: Table<CalendarConnection>;
  calendar_court_mappings: Table<{
    id: string;
    connection_id: string;
    court_id: string;
    external_ref: string;
    active: boolean;
  }>;
  calendar_sync_runs: Table<{
    id: string;
    connection_id: string;
    started_at: string;
    finished_at: string | null;
    status: string;
    slot_count: number;
    imported_count: number;
    conflict_count: number;
    message: string | null;
  }>;
  cities: Table<City>;
  clubs: Table<Club>;
  courts: Table<Court>;
  court_slots: Table<Slot>;
  availability_rules: Table<AvailabilityRule>;
  equipment: Table<Equipment>;
  user_profiles: Table<Profile>;
  bookings: Table<Booking>;
  booking_items: Table<BookingItem>;
  booking_participants: Table<Participant>;
  open_matches: Table<OpenMatch>;
  platform_events: Table<PlatformEvent>;
  event_registrations: Table<Registration>;
  payments: Table<Payment>;
  refunds: Table<Refund>;
  notifications: Table<Notice>;
  provider_attempts: Table<ProviderAttempt>;
  result_submissions: Table<ResultSubmission>;
  audit_log: Table<Audit>;
  event_courts: Table<{
    event_id: string;
    slot_id: string;
    booking_id: string;
  }>;
  rating_history: Table<{
    id: string;
    user_id: string;
    result_id: string | null;
    rating_before: number;
    rating_after: number;
    reason: string;
    actor_id: string;
    created_at: string;
  }>;
};
type RPC<A, R = string> = { Args: A; Returns: R };
export type PlatformFunctions = {
  review_booking: RPC<{ p_booking: string }, undefined>;
  expire_booking_proposals: RPC<Record<string, never>, number>;
  propose_booking_slot: RPC<{
    p_booking: string;
    p_slot: string;
    p_note: string;
  }>;
  reply_booking_slot: RPC<{ p_proposal: string; p_accept: boolean }, undefined>;
  fulfill_booking: RPC<
    { p_booking: string; p_reference: string; p_hold_until: string },
    undefined
  >;
  register_push_device: RPC<{ p_device: string; p_token: string }, undefined>;
  revoke_push_device: RPC<{ p_device: string }, undefined>;
  claim_notification_deliveries: RPC<{ p_channels: string[] }, Json>;
  finish_notification_delivery: RPC<
    {
      p_id: number;
      p_lease: string;
      p_status: string;
      p_reference?: string | null;
      p_error?: string | null;
    },
    undefined
  >;
  apply_booking_benefit: RPC<{
    p_participant: string;
    p_code?: string | null;
    p_reason?: string | null;
  }>;
  configure_calendar: RPC<
    {
      p_id: string;
      p_club: string | null;
      p_enabled: boolean;
      p_interval: number;
      p_horizon: number;
    },
    undefined
  >;
  map_calendar_court: RPC<
    { p_connection: string; p_court: string; p_ref: string },
    undefined
  >;
  unmap_calendar_court: RPC<{ p_mapping: string }, undefined>;
  request_calendar_sync: RPC<{ p_id: string }, undefined>;
  calendar_scheduler_status: RPC<
    Record<string, never>,
    { active: boolean; configured: boolean }
  >;
  my_booking_locations: RPC<
    Record<string, never>,
    {
      booking_id: string;
      club: string;
      court: string;
      address: string;
      starts_at: string;
      ends_at: string;
    }[]
  >;
  save_event_placement: RPC<
    { p_registration: string; p_rank: number; p_points: number },
    undefined
  >;
  event_result_table: RPC<
    { p_event: string },
    { name: string; rank: number; points: number }[]
  >;
  save_my_profile: RPC<{
    p_name: string;
    p_skill: number;
    p_city?: string | null;
    p_avatar?: string | null;
  }>;
  discover_slots: RPC<
    { p_court: string; p_from: string; p_to: string },
    (Omit<Slot, "court_id" | "published"> & { available: boolean })[]
  >;
  generate_court_slots: RPC<{ p_court: string; p_date: string }, number>;
  request_booking: RPC<{
    p_slot: string;
    p_kind: string;
    p_key: string;
    p_title?: string;
    p_description?: string;
    p_min_skill?: number | null;
    p_max_skill?: number | null;
    p_equipment?: Json;
  }>;
  approve_booking: RPC<
    { p_booking: string; p_reference: string; p_hold_until: string },
    undefined
  >;
  join_open_match: RPC<{ p_match: string; p_equipment?: Json }>;
  cancel_booking: RPC<{ p_booking: string; p_reason: string }, undefined>;
  withdraw_match: RPC<{ p_match: string }, undefined>;
  start_checkout: RPC<{
    p_participant?: string | null;
    p_registration?: string | null;
  }>;
  attach_payment_authority: RPC<
    { p_payment: string; p_authority: string },
    undefined
  >;
  settle_payment: RPC<
    { p_payment: string; p_reference: string; p_amount: number },
    undefined
  >;
  fail_payment: RPC<{ p_payment: string }, undefined>;
  discover_matches: RPC<
    {
      p_id?: string | null;
      p_limit?: number;
      p_offset?: number;
      p_skill?: number | null;
      p_city?: string | null;
      p_date?: string | null;
    },
    MatchPreview[]
  >;
  register_event: RPC<{ p_event: string }>;
  event_roster: RPC<
    { p_event: string },
    { name: string; paid: boolean; player_id: string | null }[]
  >;
  activate_event: RPC<{ p_event: string }, string | null>;
  secure_event_courts: RPC<
    { p_event: string; p_slots: string[]; p_reference: string },
    undefined
  >;
  claim_payment_request: RPC<{ p_payment: string }, boolean>;
  apply_external_quote: RPC<
    {
      p_booking: string;
      p_quote_id: string;
      p_price: number;
      p_valid_until: string;
      p_hold_reference?: string | null;
    },
    undefined
  >;
  change_event_state: RPC<{ p_event: string; p_status: string }, undefined>;
  run_platform_jobs: RPC<Record<string, never>, Json>;
  record_provider_result: RPC<
    {
      p_attempt: string;
      p_status: string;
      p_reference?: string | null;
      p_error?: string | null;
    },
    undefined
  >;
  claim_provider_attempt: RPC<Record<string, never>, ProviderAttempt[]>;
  record_refund: RPC<{ p_refund: string; p_reference: string }, undefined>;
  submit_match_result: RPC<{
    p_match: string;
    p_team1: string[];
    p_team2: string[];
    p_sets1: number;
    p_sets2: number;
    p_competitive?: boolean;
  }>;
  confirm_match_result: RPC<
    { p_result: string; p_decision: string; p_reason?: string },
    undefined
  >;
  resolve_match_result: RPC<
    {
      p_result: string;
      p_accept: boolean;
      p_rating_changes?: Json;
      p_reason: string;
    },
    undefined
  >;
  link_historical_player: RPC<{ p_user: string; p_player: string }, undefined>;
  mark_notifications_read: RPC<Record<string, never>, undefined>;
  match_result_context: RPC<
    { p_match: string },
    { user_id: string; name: string }[]
  >;
  retry_provider_attempt: RPC<{ p_attempt: string }, undefined>;
};

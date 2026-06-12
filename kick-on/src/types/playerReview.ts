/**
 * Coach Match Review — Phase 2 types (player self-review).
 * Mirrors supabase_player_match_events.sql.
 */

import type { CoachMatch, Position } from './coachMatch';

export type PlayerEventType =
  | 'possession'
  | 'shot'
  | 'turnover_won'
  | 'turnover_lost'
  | 'assist'
  | 'kickout';

/** Row in player_match_events (as stored). */
export interface PlayerMatchEvent {
  id: string;
  coach_match_id: string;
  player_id: string;
  event_type: PlayerEventType;
  x_position: number | null;
  y_position: number | null;
  outcome: string | null;
  assist_type: string | null;
  created_at: string;
}

/** A locally-held event (optimistic; may not be synced yet). */
export interface LocalPlayerEvent {
  /** Stable local id used for optimistic UI + the offline queue. */
  localId: string;
  eventType: PlayerEventType;
  x: number | null;
  y: number | null;
  outcome: string | null;
  assistType: string | null;
  /** Set once persisted to Supabase. */
  cloudId?: string;
}

/** A sent game from the player's perspective, with their own assignment. */
export interface PlayerGame {
  match: CoachMatch;
  position: Position;
  isStarter: boolean;
  subMinute: number | null;
  replacedPlayerId: string | null;
  replacedPlayerName: string | null;
  reviewed: boolean;
  reviewedAt: string | null;
}

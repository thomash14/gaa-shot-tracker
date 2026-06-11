/**
 * Coach Match Review — Phase 1 types.
 * Mirrors the supabase_coach_matches.sql schema.
 */

export type CoachMatchStatus = 'draft' | 'sent';

export type Position =
  | 'GK'
  | 'RCB' | 'FB' | 'LCB'
  | 'RHB' | 'CHB' | 'LHB'
  | 'MID1' | 'MID2'
  | 'RHF' | 'CHF' | 'LHF'
  | 'RCF' | 'FF' | 'LCF';

/** Row in coach_matches. */
export interface CoachMatch {
  id: string;
  team_id: string;
  created_by: string;
  competition: string;
  opposition: string;
  match_date: string;
  team_score_goals: number;
  team_score_points: number;
  opposition_score_goals: number;
  opposition_score_points: number;
  what_went_well: string | null;
  what_went_poorly: string | null;
  comments: string | null;
  status: CoachMatchStatus;
  created_at: string;
}

/** Row in coach_match_players (a starter or a substitute). */
export interface CoachMatchPlayer {
  id: string;
  coach_match_id: string;
  player_id: string;
  position: Position;
  is_starter: boolean;
  replaced_player_id: string | null;
  sub_minute: number | null;
  coach_comment: string | null;
  comment_visible_to_player: boolean;
  created_at: string;
}

/** Row in coach_match_missing_players. */
export interface CoachMatchMissingPlayer {
  id: string;
  coach_match_id: string;
  player_id: string;
  reason: string | null;
  created_at: string;
}

/** A fully-loaded coach match with its child rows. */
export interface CoachMatchDetail extends CoachMatch {
  players: CoachMatchPlayer[];
  missing: CoachMatchMissingPlayer[];
}

// ---------------------------------------------------------------------------
// Draft payloads used by the create-game wizard before they are persisted
// ---------------------------------------------------------------------------

/** A recorded substitution held in the wizard's working state. */
export interface DraftSub {
  /** Local id (not persisted). */
  id: string;
  position: Position;
  subPlayerId: string;
  replacedPlayerId: string;
  minute: number | null;
}

/** Per-player coach comment held in the wizard's working state. */
export interface DraftComment {
  playerId: string;
  comment: string;
  visibleToPlayer: boolean;
}

/** Missing-player entry held in the wizard's working state. */
export interface DraftMissing {
  playerId: string;
  reason: string;
}

/** Everything the wizard collects, handed to useCoachMatches.saveCoachMatch. */
export interface CoachMatchDraft {
  competition: string;
  opposition: string;
  matchDate: string;
  teamScoreGoals: number;
  teamScorePoints: number;
  oppositionScoreGoals: number;
  oppositionScorePoints: number;
  whatWentWell: string;
  whatWentPoorly: string;
  comments: string;
  /** position -> starter player_id */
  starters: Partial<Record<Position, string>>;
  subs: DraftSub[];
  missing: DraftMissing[];
  playerComments: DraftComment[];
  status: CoachMatchStatus;
}

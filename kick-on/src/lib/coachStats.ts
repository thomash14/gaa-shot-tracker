/**
 * Coach Match Review — Phase 3 aggregation helpers.
 * Turns raw player_match_events + coach_match_players into per-player stat rows,
 * and defines the coach map colour scheme / position groups.
 */

import type { Position, PlayerEventType, PlayerMatchEvent } from '@/types';

export type PositionGroup = 'Backs' | 'Midfield' | 'Forwards';

export const POSITION_GROUP: Record<Position, PositionGroup> = {
  GK: 'Backs',
  RCB: 'Backs', FB: 'Backs', LCB: 'Backs',
  RHB: 'Backs', CHB: 'Backs', LHB: 'Backs',
  MID1: 'Midfield', MID2: 'Midfield',
  RHF: 'Forwards', CHF: 'Forwards', LHF: 'Forwards',
  RCF: 'Forwards', FF: 'Forwards', LCF: 'Forwards',
};

/** Coach map marker colours (Phase 3 spec). Shots are split by outcome. */
export function coachEventColour(e: { event_type: PlayerEventType; outcome: string | null }): string {
  switch (e.event_type) {
    case 'possession':
      return '#1e88e5'; // blue
    case 'shot':
      return e.outcome === 'scored' ? '#4CAF50' : '#f44336'; // green / red
    case 'turnover_won':
      return '#FBC02D'; // yellow
    case 'turnover_lost':
      return '#FB8C00'; // orange
    case 'assist':
      return '#9C27B0'; // purple
    case 'kickout':
      return '#00BCD4'; // cyan
    default:
      return '#9E9E9E';
  }
}

/** Legend entries for the coach pitch map. */
export const COACH_MAP_LEGEND: { label: string; colour: string }[] = [
  { label: 'Possession', colour: '#1e88e5' },
  { label: 'Shot scored', colour: '#4CAF50' },
  { label: 'Shot missed', colour: '#f44336' },
  { label: 'Turnover won', colour: '#FBC02D' },
  { label: 'Turnover lost', colour: '#FB8C00' },
  { label: 'Assist', colour: '#9C27B0' },
  { label: 'Kickout', colour: '#00BCD4' },
];

/** A coach_match_players row needed for aggregation. */
export interface StatPlayerInput {
  id: string; // coach_match_players.id
  player_id: string;
  position: Position;
  is_starter: boolean;
  sub_minute: number | null;
  replaced_player_id: string | null;
  reviewed: boolean;
  coach_comment: string | null;
  comment_visible_to_player: boolean;
}

/** Aggregated per-player stats. */
export interface PlayerStatRow {
  cmpId: string;
  playerId: string;
  name: string;
  position: Position;
  isStarter: boolean;
  subMinute: number | null;
  reviewed: boolean;
  coachComment: string | null;
  commentVisible: boolean;
  possessions: number;
  shots: number;
  shotsScored: number;
  turnoversWon: number;
  turnoversLost: number;
  assists: number;
  assistGoals: number;
  assistPoints: number;
  kickoutsWon: number;
  kickoutsLost: number;
}

export function aggregatePlayers(
  players: StatPlayerInput[],
  events: PlayerMatchEvent[],
  nameById: Record<string, string>,
): PlayerStatRow[] {
  return players.map((p) => {
    const evs = events.filter((e) => e.player_id === p.player_id);
    const count = (t: PlayerEventType) => evs.filter((e) => e.event_type === t).length;
    return {
      cmpId: p.id,
      playerId: p.player_id,
      name: nameById[p.player_id] ?? 'Player',
      position: p.position,
      isStarter: p.is_starter,
      subMinute: p.sub_minute,
      reviewed: p.reviewed,
      coachComment: p.coach_comment,
      commentVisible: p.comment_visible_to_player,
      possessions: count('possession'),
      shots: count('shot'),
      shotsScored: evs.filter((e) => e.event_type === 'shot' && e.outcome === 'scored').length,
      turnoversWon: count('turnover_won'),
      turnoversLost: count('turnover_lost'),
      assists: count('assist'),
      assistGoals: evs.filter((e) => e.event_type === 'assist' && e.assist_type === 'goal').length,
      assistPoints: evs.filter((e) => e.event_type === 'assist' && e.assist_type === 'point').length,
      kickoutsWon: evs.filter((e) => e.event_type === 'kickout' && e.outcome === 'won').length,
      kickoutsLost: evs.filter((e) => e.event_type === 'kickout' && e.outcome === 'lost').length,
    };
  });
}

/** Sum of a numeric field across rows (for the totals row). */
export function sumField(rows: PlayerStatRow[], field: keyof PlayerStatRow): number {
  return rows.reduce((acc, r) => acc + (typeof r[field] === 'number' ? (r[field] as number) : 0), 0);
}

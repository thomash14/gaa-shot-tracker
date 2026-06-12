/**
 * Player performance history — types and helpers.
 * Aggregates a single player's events across the coach's team matches.
 */

import type { Position, CoachMatchStatus } from '@/types';
import { JERSEY_ORDER } from './coachMatch';

/** One game in a player's performance history. */
export interface PlayerGamePerf {
  matchId: string;
  date: string;
  competition: string;
  opposition: string;
  status: CoachMatchStatus;
  position: Position;
  isStarter: boolean;
  subMinute: number | null;
  reviewed: boolean;
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

/** Sum of a numeric field across games. */
export function sumPerf(games: PlayerGamePerf[], field: keyof PlayerGamePerf): number {
  return games.reduce((acc, g) => acc + (typeof g[field] === 'number' ? (g[field] as number) : 0), 0);
}

/** Average of a numeric field per game (1 dp), 0 when no games. */
export function avgPerf(games: PlayerGamePerf[], field: keyof PlayerGamePerf): number {
  if (games.length === 0) return 0;
  return Math.round((sumPerf(games, field) / games.length) * 10) / 10;
}

/** The position the player appears in most often. */
export function mostPlayedPosition(games: PlayerGamePerf[]): Position | null {
  if (games.length === 0) return null;
  const counts = new Map<Position, number>();
  games.forEach((g) => counts.set(g.position, (counts.get(g.position) ?? 0) + 1));
  let best: Position | null = null;
  let bestN = -1;
  // Tie-break by jersey order for determinism.
  for (const pos of JERSEY_ORDER) {
    const n = counts.get(pos) ?? 0;
    if (n > bestN) { bestN = n; best = pos; }
  }
  return best;
}

export type DatePreset = 'all' | 'last_month' | 'last_3_months' | 'this_season' | 'custom';

export interface PerfFilters {
  preset: DatePreset;
  from: string; // YYYY-MM-DD (used when preset === 'custom')
  to: string;
  competition: string; // 'all' or a competition label
  year: string; // 'all' or a 4-digit year
  position: string; // 'all' or a Position
}

/**
 * Resolve a preset to a [from, to] date window (inclusive, YYYY-MM-DD).
 * `todayIso` is passed in so callers control "now" (avoids hidden Date use).
 */
export function presetWindow(preset: DatePreset, todayIso: string): { from: string | null; to: string | null } {
  if (preset === 'all') return { from: null, to: null };
  const today = new Date(todayIso + 'T00:00:00');
  // Format from local parts (avoid toISOString's UTC day-shift — see CLAUDE.md).
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (preset === 'this_season') {
    return { from: `${today.getFullYear()}-01-01`, to: todayIso };
  }
  const d = new Date(today);
  if (preset === 'last_month') d.setMonth(d.getMonth() - 1);
  if (preset === 'last_3_months') d.setMonth(d.getMonth() - 3);
  return { from: iso(d), to: todayIso };
}

/** Apply the active filters to the games list. */
export function filterGames(
  games: PlayerGamePerf[],
  filters: PerfFilters,
  todayIso: string,
): PlayerGamePerf[] {
  const window =
    filters.preset === 'custom'
      ? { from: filters.from || null, to: filters.to || null }
      : presetWindow(filters.preset, todayIso);

  return games.filter((g) => {
    if (window.from && g.date < window.from) return false;
    if (window.to && g.date > window.to) return false;
    if (filters.competition !== 'all' && g.competition !== filters.competition) return false;
    if (filters.year !== 'all' && g.date.slice(0, 4) !== filters.year) return false;
    if (filters.position !== 'all' && g.position !== filters.position) return false;
    return true;
  });
}

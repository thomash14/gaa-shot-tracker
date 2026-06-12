/**
 * Coach Match Review — shared config and helpers.
 */

import type { Position } from '@/types';

/** All 15 positions in canonical order (back line first, GK last). */
export const ALL_POSITIONS: Position[] = [
  'RCB', 'FB', 'LCB',
  'RHB', 'CHB', 'LHB',
  'MID1', 'MID2',
  'RHF', 'CHF', 'LHF',
  'RCF', 'FF', 'LCF',
  'GK',
];

/** Positions in GAA jersey-number order (1 = GK … 15 = LCF). */
export const JERSEY_ORDER: Position[] = [
  'GK',
  'RCB', 'FB', 'LCB',
  'RHB', 'CHB', 'LHB',
  'MID1', 'MID2',
  'RHF', 'CHF', 'LHF',
  'RCF', 'FF', 'LCF',
];

/** Full descriptive name for each position. */
export const POSITION_NAMES: Record<Position, string> = {
  GK: 'Goalkeeper',
  RCB: 'Right Corner Back',
  FB: 'Full Back',
  LCB: 'Left Corner Back',
  RHB: 'Right Half Back',
  CHB: 'Centre Half Back',
  LHB: 'Left Half Back',
  MID1: 'Midfield',
  MID2: 'Midfield',
  RHF: 'Right Half Forward',
  CHF: 'Centre Half Forward',
  LHF: 'Left Half Forward',
  RCF: 'Right Corner Forward',
  FF: 'Full Forward',
  LCF: 'Left Corner Forward',
};

/** Short label shown inside an empty slot. MID1/MID2 both read "MID". */
export const POSITION_LABELS: Record<Position, string> = {
  GK: 'GK',
  RCB: 'RCB', FB: 'FB', LCB: 'LCB',
  RHB: 'RHB', CHB: 'CHB', LHB: 'LHB',
  MID1: 'MID', MID2: 'MID',
  RHF: 'RHF', CHF: 'CHF', LHF: 'LHF',
  RCF: 'RCF', FF: 'FF', LCF: 'LCF',
};

/**
 * Visual formation, rendered top (opposition goal) to bottom (own goal / GK).
 * Each row is one line of the pitch.
 */
export const FORMATION_ROWS: { label: string; positions: Position[] }[] = [
  { label: 'Full Forwards', positions: ['RCF', 'FF', 'LCF'] },
  { label: 'Half Forwards', positions: ['RHF', 'CHF', 'LHF'] },
  { label: 'Midfield', positions: ['MID1', 'MID2'] },
  { label: 'Half Backs', positions: ['RHB', 'CHB', 'LHB'] },
  { label: 'Full Backs', positions: ['RCB', 'FB', 'LCB'] },
  { label: 'Goalkeeper', positions: ['GK'] },
];

/** "1-12" style score. */
export function formatScore(goals: number, points: number): string {
  return `${goals}-${String(points).padStart(2, '0')}`;
}

/** Total points value of a GAA score (goal = 3 points). */
export function scoreTotal(goals: number, points: number): number {
  return goals * 3 + points;
}

/**
 * Formatted scoreline, e.g. "Desmonds 1-12 vs Dr Crokes 0-10".
 * `teamName` defaults to "Team" when not provided.
 */
export function formatScoreline(
  teamName: string,
  teamGoals: number,
  teamPoints: number,
  opposition: string,
  oppGoals: number,
  oppPoints: number,
): string {
  const team = teamName.trim() || 'Team';
  const opp = opposition.trim() || 'Opposition';
  return `${team} ${formatScore(teamGoals, teamPoints)} vs ${opp} ${formatScore(oppGoals, oppPoints)}`;
}

/** Result of the match from the team's perspective. */
export function matchResult(
  teamGoals: number,
  teamPoints: number,
  oppGoals: number,
  oppPoints: number,
): 'Win' | 'Loss' | 'Draw' {
  const us = scoreTotal(teamGoals, teamPoints);
  const them = scoreTotal(oppGoals, oppPoints);
  if (us > them) return 'Win';
  if (us < them) return 'Loss';
  return 'Draw';
}

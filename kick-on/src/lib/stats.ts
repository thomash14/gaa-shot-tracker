import type { Shot } from '@/types';

/** Conversion rate as a percentage (0-100). Returns 0 if no shots. */
export function conversionRate(shots: Shot[]): number {
  if (shots.length === 0) return 0;
  const scored = shots.filter((s) => s.result === 'scored').length;
  return Math.round((scored / shots.length) * 100);
}

/** Points-per-shot value. Goals = 3, 2-pointers = 2, else = 1. */
export function pointsPerShot(shots: Shot[]): number {
  if (shots.length === 0) return 0;
  const totalPts = shots
    .filter((s) => s.result === 'scored')
    .reduce((sum, s) => {
      if (s.shotFor === 'goal') return sum + 3;
      return sum + (s.pointValue || 1);
    }, 0);
  return totalPts / shots.length;
}

/** Format a conversion fraction: "4/7 (57%)" */
export function convCell(scored: number, total: number): string {
  if (total === 0) return '-';
  return `${scored}/${total} (${Math.round((scored / total) * 100)}%)`;
}

/** Calculate match score string: "1-05 (8pts)" */
export function matchScore(shots: Shot[]): {
  goals: number;
  points: number;
  totalPts: number;
  display: string;
} {
  const scored = shots.filter((s) => s.result === 'scored');
  const goals = scored.filter((s) => s.shotFor === 'goal').length;
  const points = scored.filter((s) => s.shotFor !== 'goal').reduce((sum, s) => sum + (s.pointValue || 1), 0);
  const totalPts = goals * 3 + points;
  const display = `${goals}-${String(points).padStart(2, '0')} (${totalPts}pts)`;
  return { goals, points, totalPts, display };
}

/** Filter shots by foot */
export function shotsByFoot(shots: Shot[], foot: 'left' | 'right'): Shot[] {
  return shots.filter((s) => (s.foot || 'right') === foot);
}

/** Filter shots by category */
export function shotsByCategory(shots: Shot[], category: string): Shot[] {
  return shots.filter((s) => s.shotCategory === category);
}

/** Count scored shots */
export function scoredCount(shots: Shot[]): number {
  return shots.filter((s) => s.result === 'scored').length;
}

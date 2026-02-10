'use client';

import type { ShotWithContext } from '@/types';

/**
 * Conversion rate stat cards for the analytics page.
 * Ported from updateConversionStats() in analytics.js.
 */

interface ConversionStatsProps {
  shots: ShotWithContext[];
  sessionCount: number;
  sessionLabel: string; // "Matches" or "Sessions"
}

function convStr(scored: number, total: number): string {
  if (total === 0) return '0/0 (0%)';
  return `${scored}/${total} (${Math.round((scored / total) * 100)}%)`;
}

export default function ConversionStats({ shots, sessionCount, sessionLabel }: ConversionStatsProps) {
  const totalShots = shots.length;
  const scored = shots.filter((s) => s.result === 'scored').length;

  const inPlay = shots.filter((s) => s.shotCategory === 'in-play');
  const inPlayScored = inPlay.filter((s) => s.result === 'scored').length;

  const deadBall = shots.filter((s) => s.shotCategory === 'free-kick' || s.shotCategory === '45');
  const deadBallScored = deadBall.filter((s) => s.result === 'scored').length;

  const onePt = shots.filter((s) => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
  const onePtScored = onePt.filter((s) => s.result === 'scored').length;

  const twoPt = shots.filter((s) => s.pointValue === 2 && s.shotFor !== 'goal');
  const twoPtScored = twoPt.filter((s) => s.result === 'scored').length;

  const goals = shots.filter((s) => s.shotFor === 'goal');
  const goalsScored = goals.filter((s) => s.result === 'scored').length;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-primary">Conversion Rates</h3>
        <span className="text-xs text-text-muted">
          {sessionCount} {sessionLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Overall" value={convStr(scored, totalShots)} highlight />
        <StatCard label="In-Play" value={convStr(inPlayScored, inPlay.length)} />
        <StatCard label="Placed" value={convStr(deadBallScored, deadBall.length)} />
        <StatCard label="1 Point" value={convStr(onePtScored, onePt.length)} />
        <StatCard label="2 Point" value={convStr(twoPtScored, twoPt.length)} />
        <StatCard label="Goal" value={convStr(goalsScored, goals.length)} />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary/10' : 'bg-grey-light'}`}>
      <p className="text-xs text-text-muted font-medium mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-text'}`}>{value}</p>
    </div>
  );
}

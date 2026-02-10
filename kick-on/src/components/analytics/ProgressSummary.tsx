'use client';

import type { TrendDataPoint } from './TrendChart';

/**
 * Progress summary text panel for trends view.
 * Ported from renderProgressSummary() in trends.js.
 */

interface ProgressSummaryProps {
  convPoints: TrendDataPoint[];
  ptsPoints?: TrendDataPoint[] | null;
  spgPoints?: TrendDataPoint[] | null;
}

export default function ProgressSummary({ convPoints, ptsPoints, spgPoints }: ProgressSummaryProps) {
  if (!convPoints || convPoints.length < 2) return null;

  const first = convPoints[0];
  const last = convPoints[convPoints.length - 1];
  const firstRate = first.rate as number;
  const lastRate = last.rate as number;
  const change = lastRate - firstRate;
  const changeStr = (change > 0 ? '+' : '') + change + '%';
  const changeColor = change > 0 ? 'text-success' : change < 0 ? 'text-danger' : '';

  const avgRate = Math.round(convPoints.reduce((a, p) => a + (p.rate as number), 0) / convPoints.length);
  const bestRate = Math.max(...convPoints.map((p) => p.rate as number));
  const worstRate = Math.min(...convPoints.map((p) => p.rate as number));

  // Last 3 vs prior average
  let recentTrend: { last3Avg: number; priorAvg: number; diff: number } | null = null;
  if (convPoints.length >= 4) {
    const last3 = convPoints.slice(-3);
    const prior = convPoints.slice(0, -3);
    const last3Avg = Math.round(last3.reduce((a, p) => a + (p.rate as number), 0) / last3.length);
    const priorAvg = Math.round(prior.reduce((a, p) => a + (p.rate as number), 0) / prior.length);
    recentTrend = { last3Avg, priorAvg, diff: last3Avg - priorAvg };
  }

  // Pts/Shot
  let ptsData: { first: number; last: number; change: number; avg: number } | null = null;
  if (ptsPoints && ptsPoints.length >= 2) {
    const ptsFirst = ptsPoints[0].ptsPerShot as number;
    const ptsLast = ptsPoints[ptsPoints.length - 1].ptsPerShot as number;
    const ptsAvg = ptsPoints.reduce((a, p) => a + (p.ptsPerShot as number), 0) / ptsPoints.length;
    ptsData = {
      first: ptsFirst,
      last: ptsLast,
      change: ptsLast - ptsFirst,
      avg: ptsAvg,
    };
  }

  // Shots per game
  let spgData: { avg: number; max: number; min: number; last5Avg?: number } | null = null;
  if (spgPoints && spgPoints.length >= 2) {
    const totals = spgPoints.map((p) => p.total as number);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    let last5Avg: number | undefined;
    if (spgPoints.length >= 6) {
      const last5 = spgPoints.slice(-5);
      last5Avg = last5.reduce((a, p) => a + (p.total as number), 0) / last5.length;
    }
    spgData = { avg, max, min, last5Avg };
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <h3 className="text-base font-semibold text-primary mb-3">Progress Summary</h3>
      <div className="space-y-2 text-sm">
        <Row
          label="Conversion (First \u2192 Last)"
          value={
            <span className={changeColor}>
              {firstRate}% \u2192 {lastRate}% ({changeStr})
            </span>
          }
        />
        <Row label="Average Conversion" value={`${avgRate}%`} />
        <Row label="Best / Worst" value={`${bestRate}% / ${worstRate}%`} />

        {recentTrend && (
          <Row
            label="Last 3 vs Prior Avg"
            value={
              <span className={recentTrend.diff > 0 ? 'text-success' : recentTrend.diff < 0 ? 'text-danger' : ''}>
                {recentTrend.last3Avg}% vs {recentTrend.priorAvg}% (
                {recentTrend.diff > 0 ? '+' : ''}
                {recentTrend.diff}%)
              </span>
            }
          />
        )}

        {ptsData && (
          <>
            <Row
              label="Pts/Shot (First \u2192 Last)"
              value={
                <span className={ptsData.change > 0 ? 'text-success' : ptsData.change < 0 ? 'text-danger' : ''}>
                  {ptsData.first.toFixed(2)} \u2192 {ptsData.last.toFixed(2)} (
                  {ptsData.change > 0 ? '+' : ''}
                  {ptsData.change.toFixed(2)})
                </span>
              }
            />
            <Row label="Avg Pts/Shot" value={ptsData.avg.toFixed(2)} />
          </>
        )}

        {spgData && (
          <>
            <Row label="Avg Shots/Game" value={spgData.avg.toFixed(1)} />
            <Row label="Most / Fewest Shots" value={`${spgData.max} / ${spgData.min}`} />
            {spgData.last5Avg != null && (
              <Row label="Last 5 Games Avg" value={`${spgData.last5Avg.toFixed(1)} shots/game`} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

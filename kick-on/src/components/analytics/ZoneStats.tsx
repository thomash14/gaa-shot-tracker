'use client';

import type { ShotWithContext } from '@/types';
import { getZone } from '@/lib/zones';

/**
 * Zone conversion rates, distance analysis, and foot analysis cards.
 * Ported from updateZoneStats() in analytics.js.
 */

interface ZoneStatsProps {
  shots: ShotWithContext[];
}

export default function ZoneStats({ shots }: ZoneStatsProps) {
  // Build zone data
  const zones: Record<
    number,
    { total: number; scored: number; name: string; color: string; zone: number }
  > = {};

  shots.forEach((shot) => {
    const zoneInfo = getZone(shot.x, shot.y);
    if (!zoneInfo || zoneInfo.zone < 1) return;
    const key = zoneInfo.zone;
    if (!zones[key]) {
      zones[key] = { total: 0, scored: 0, name: zoneInfo.name, color: zoneInfo.color, zone: key };
    }
    zones[key].total++;
    if (shot.result === 'scored') zones[key].scored++;
  });

  const sortedZones = Object.values(zones).sort((a, b) => a.zone - b.zone);
  const hasZones = sortedZones.length > 0;

  // Distance analysis
  const shotsWithDistance = shots.filter((s) => s.distance !== undefined);
  const avgDistance =
    shotsWithDistance.length > 0
      ? shotsWithDistance.reduce((sum, s) => sum + s.distance, 0) / shotsWithDistance.length
      : 0;
  const scoredShots = shotsWithDistance.filter((s) => s.result === 'scored');
  const missedShots = shotsWithDistance.filter((s) => s.result === 'missed');
  const avgScoredDist =
    scoredShots.length > 0
      ? scoredShots.reduce((sum, s) => sum + s.distance, 0) / scoredShots.length
      : 0;
  const avgMissedDist =
    missedShots.length > 0
      ? missedShots.reduce((sum, s) => sum + s.distance, 0) / missedShots.length
      : 0;

  // Foot analysis
  const shotsWithFoot = shots.filter((s) => s.foot !== undefined);
  const leftShots = shotsWithFoot.filter((s) => s.foot === 'left');
  const rightShots = shotsWithFoot.filter((s) => s.foot === 'right');
  const leftScored = leftShots.filter((s) => s.result === 'scored').length;
  const rightScored = rightShots.filter((s) => s.result === 'scored').length;
  const leftRate = leftShots.length > 0 ? Math.round((leftScored / leftShots.length) * 100) : 0;
  const rightRate = rightShots.length > 0 ? Math.round((rightScored / rightShots.length) * 100) : 0;

  if (!hasZones) {
    return (
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <p className="text-sm text-text-muted text-center py-8">
          No data yet. Start tracking shots!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
      {/* Zone conversion rates */}
      <h3 className="text-base font-semibold text-primary">Zone Conversion Rates</h3>
      <div className="grid grid-cols-3 gap-2">
        {sortedZones.map((z) => {
          const rate = Math.round((z.scored / z.total) * 100);
          const rateColor =
            rate >= 80 ? 'text-success' : rate >= 60 ? 'text-green-500' : rate >= 40 ? 'text-warning' : 'text-danger';
          return (
            <div
              key={z.zone}
              className="rounded-lg p-3 bg-grey-light text-center"
              style={{ borderLeft: `4px solid ${z.color}` }}
            >
              <div className="flex items-center justify-center gap-1 mb-1">
                <span
                  className="inline-block text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: z.color }}
                >
                  {z.zone}
                </span>
                <span className="text-xs text-text-muted">{z.name}</span>
              </div>
              <p className={`text-xl font-bold ${rateColor}`}>{rate}%</p>
              <p className="text-xs text-text-muted">
                {z.scored}/{z.total} shots
              </p>
            </div>
          );
        })}
      </div>

      {/* Distance analysis */}
      {shotsWithDistance.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-primary">Distance Analysis</h3>
          <div className="grid grid-cols-3 gap-2">
            <AnalysisCard label="Average Distance" value={`${avgDistance.toFixed(1)}m`} sub="All shots" color="text-primary" />
            <AnalysisCard
              label="Scored Distance"
              value={`${avgScoredDist.toFixed(1)}m`}
              sub={`${scoredShots.length} shots scored`}
              color="text-success"
            />
            <AnalysisCard
              label="Missed Distance"
              value={`${avgMissedDist.toFixed(1)}m`}
              sub={`${missedShots.length} shots missed`}
              color="text-danger"
            />
          </div>
        </>
      )}

      {/* Foot analysis */}
      {shotsWithFoot.length > 0 && (
        <>
          <h3 className="text-base font-semibold text-primary">Foot Analysis</h3>
          <div className="grid grid-cols-2 gap-2">
            <AnalysisCard
              label="Left Foot"
              value={`${leftRate}%`}
              sub={`${leftScored}/${leftShots.length} shots`}
              color="text-primary"
            />
            <AnalysisCard
              label="Right Foot"
              value={`${rightRate}%`}
              sub={`${rightScored}/${rightShots.length} shots`}
              color="text-primary"
            />
          </div>
        </>
      )}
    </div>
  );
}

function AnalysisCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-lg p-3 bg-grey-light text-center">
      <p className="text-xs text-text-muted font-medium mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-text-muted">{sub}</p>
    </div>
  );
}

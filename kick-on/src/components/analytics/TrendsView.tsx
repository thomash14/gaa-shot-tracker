'use client';

import { useMemo } from 'react';
import { useAnalyticsStore, type AnalyticsType } from '@/store/analyticsStore';
import { useDrillStore } from '@/store/drillStore';
import TrendChart, { type TrendDataPoint, formatTrendDate } from './TrendChart';
import ProgressSummary from './ProgressSummary';
import type { Session, ShotWithContext } from '@/types';

/**
 * Trends container — builds data points from sessions/shots and renders
 * TrendChart(s) + ProgressSummary. Ported from renderTrendsContent() in trends.js.
 */

interface TrendsViewProps {
  sessions: Session[];
  allShots: ShotWithContext[];
  analyticsType: AnalyticsType;
}

// ---------------------------------------------------------------------------
// Data point builders (ported from trends.js)
// ---------------------------------------------------------------------------

function sortSessionsChronologically(sessions: Session[]): Session[] {
  return [...sessions].sort((a, b) => {
    const da = a.date.split('-');
    const db = b.date.split('-');
    return (
      new Date(+da[0], +da[1] - 1, +da[2]).getTime() -
      new Date(+db[0], +db[1] - 1, +db[2]).getTime()
    );
  });
}

function buildMatchDataPoints(sessions: Session[], allShots: ShotWithContext[]) {
  const shotsBySession: Record<string, ShotWithContext[]> = {};
  allShots.forEach((s) => {
    const key = String(s.sessionId);
    if (!shotsBySession[key]) shotsBySession[key] = [];
    shotsBySession[key].push(s);
  });

  const conversionPoints: TrendDataPoint[] = [];
  const ptsPerShotPoints: TrendDataPoint[] = [];
  const shotsPerGamePoints: TrendDataPoint[] = [];

  const sorted = sortSessionsChronologically(sessions);
  sorted.forEach((session) => {
    const shots = shotsBySession[String(session.id)];
    if (!shots || shots.length === 0) return;

    const scored = shots.filter((s) => s.result === 'scored').length;
    const total = shots.length;
    const rate = Math.round((scored / total) * 100);

    const onePt = shots.filter(
      (s) => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal' && s.result === 'scored'
    ).length;
    const twoPt = shots.filter(
      (s) => s.pointValue === 2 && s.shotFor !== 'goal' && s.result === 'scored'
    ).length;
    const goals = shots.filter(
      (s) => s.shotFor === 'goal' && s.result === 'scored'
    ).length;
    const pps = total > 0 ? (onePt * 1 + twoPt * 2 + goals * 3) / total : 0;

    const inPlay = shots.filter((s) => s.shotCategory === 'in-play').length;
    const placed = shots.filter(
      (s) => s.shotCategory === 'free-kick' || s.shotCategory === '45'
    ).length;

    const label = session.name || session.matchType || 'Match';
    const dateStr = formatTrendDate(session.date);

    conversionPoints.push({ date: session.date, dateStr, label, scored, total, rate });
    ptsPerShotPoints.push({
      date: session.date,
      dateStr,
      label,
      ptsPerShot: parseFloat(pps.toFixed(2)),
      scored,
      total,
    });
    shotsPerGamePoints.push({ date: session.date, dateStr, label, total, inPlay, placed, scored });
  });

  return { conversionPoints, ptsPerShotPoints, shotsPerGamePoints };
}

function buildPracticeDrillDataPoints(sessions: Session[], drillKey: string) {
  const conversionPoints: TrendDataPoint[] = [];
  const sorted = sortSessionsChronologically(sessions);

  sorted.forEach((session) => {
    const matchingShots = (session.shots ?? []).filter((s) => s.drillKey === drillKey);
    if (matchingShots.length === 0) return;
    const scored = matchingShots.filter((s) => s.result === 'scored').length;
    const total = matchingShots.length;
    const rate = Math.round((scored / total) * 100);
    const dateStr = formatTrendDate(session.date);
    const label = session.name || 'Practice';
    conversionPoints.push({ date: session.date, dateStr, label, scored, total, rate });
  });

  return { conversionPoints };
}

function getUniqueDrillKeys(sessions: Session[], customDrills: { id: string; name: string }[]) {
  const keys = new Map<string, string>();
  sessions.forEach((session) => {
    (session.shots ?? []).forEach((shot) => {
      if (shot.drillKey && !keys.has(shot.drillKey)) {
        keys.set(shot.drillKey, parseDrillKeyLabel(shot.drillKey, customDrills));
      }
    });
  });
  return [...keys.entries()].map(([key, label]) => ({ key, label }));
}

function parseDrillKeyLabel(drillKey: string, customDrills: { id: string; name: string }[]): string {
  if (!drillKey) return 'Free Practice';

  if (drillKey.startsWith('custom-')) {
    const customId = drillKey.replace('custom-', '');
    const drill = customDrills.find(
      (d) => String(d.id) === customId || 'custom-' + d.id === drillKey
    );
    if (drill) return drill.name;
    return 'Custom Drill';
  }

  if (drillKey.startsWith('scoring-zones')) {
    const parts = drillKey.split('-');
    const foot = parts[parts.length - 2];
    const distance = parts[2];
    const shotTypeParts = parts.slice(3, parts.length - 2);
    const shotType = shotTypeParts.join('-');
    const totalShots = parts[parts.length - 1];

    const shotTypeLabels: Record<string, string> = {
      standing: 'Standing',
      'free-kick': 'Free-Kick',
      'on-the-run': 'On the Run',
      'on-the-turn': 'On the Turn',
      'outside-of-the-boot': 'Outside Boot',
      'off-a-dummy': 'Off a Dummy',
      fisted: 'Fisted',
      'not-defined': 'Not Defined',
    };
    const footLabels: Record<string, string> = {
      right: 'Right',
      left: 'Left',
      both: 'Both Feet',
    };

    return `Scoring Arc - ${distance}m, ${shotTypeLabels[shotType] || shotType}, ${footLabels[foot] || foot}, ${totalShots} shots`;
  }

  return drillKey;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrendsView({ sessions, allShots, analyticsType }: TrendsViewProps) {
  const selectedTrendsDrillKey = useAnalyticsStore((s) => s.selectedTrendsDrillKey);
  const setSelectedTrendsDrillKey = useAnalyticsStore((s) => s.setSelectedTrendsDrillKey);
  const customDrills = useDrillStore((s) => s.customDrills);

  const isMatch = analyticsType === 'match';

  // Match data
  const matchData = useMemo(() => {
    if (!isMatch) return null;
    return buildMatchDataPoints(sessions, allShots);
  }, [isMatch, sessions, allShots]);

  // Practice drill options
  const drillKeys = useMemo(() => {
    if (isMatch) return [];
    return getUniqueDrillKeys(sessions, customDrills);
  }, [isMatch, sessions, customDrills]);

  // Practice drill data
  const practiceData = useMemo(() => {
    if (isMatch || !selectedTrendsDrillKey) return null;
    return buildPracticeDrillDataPoints(sessions, selectedTrendsDrillKey);
  }, [isMatch, sessions, selectedTrendsDrillKey]);

  // --- Match view ---
  if (isMatch) {
    if (!matchData || matchData.conversionPoints.length < 2) {
      return (
        <div className="bg-surface rounded-2xl p-4 shadow-sm text-center text-sm text-text-muted py-8">
          Play at least 2 matches to see trends.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-primary mb-2">Conversion Rate Trend</h4>
          <TrendChart
            dataPoints={matchData.conversionPoints}
            valueKey="rate"
            suffix="%"
            label="Conversion"
            isMatch
          />
        </div>

        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-primary mb-2">Points Per Shot Trend</h4>
          <TrendChart
            dataPoints={matchData.ptsPerShotPoints}
            valueKey="ptsPerShot"
            label="Pts/Shot"
            decimals={2}
            isMatch
          />
        </div>

        <div className="bg-surface rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-primary mb-2">Shots Per Game Trend</h4>
          <TrendChart
            dataPoints={matchData.shotsPerGamePoints}
            valueKey="total"
            label="Shots"
            isMatch
          />
        </div>

        <ProgressSummary
          convPoints={matchData.conversionPoints}
          ptsPoints={matchData.ptsPerShotPoints}
          spgPoints={matchData.shotsPerGamePoints}
        />
      </div>
    );
  }

  // --- Practice view ---
  return (
    <div className="space-y-4">
      {/* Drill selector */}
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-text-muted">Drill:</label>
          <select
            value={selectedTrendsDrillKey ?? ''}
            onChange={(e) => setSelectedTrendsDrillKey(e.target.value || null)}
            className="flex-1 bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Select a drill...</option>
            {drillKeys.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedTrendsDrillKey && (
        <div className="bg-surface rounded-2xl p-4 shadow-sm text-center text-sm text-text-muted py-8">
          Select a drill above to see trends.
        </div>
      )}

      {practiceData && practiceData.conversionPoints.length < 2 && (
        <div className="bg-surface rounded-2xl p-4 shadow-sm text-center text-sm text-text-muted py-8">
          Complete this drill at least twice to see trends.
        </div>
      )}

      {practiceData && practiceData.conversionPoints.length >= 2 && (
        <>
          <div className="bg-surface rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-primary mb-2">Drill Conversion Trend</h4>
            <TrendChart
              dataPoints={practiceData.conversionPoints}
              valueKey="rate"
              suffix="%"
              label="Conversion"
            />
          </div>

          <ProgressSummary convPoints={practiceData.conversionPoints} />
        </>
      )}
    </div>
  );
}

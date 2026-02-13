'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import type { Session, Shot } from '@/types';
import { SvgPitch, ShotMarker, BatchShotMarker, ShotMapLegend } from '@/components/pitch';

// ---------------------------------------------------------------------------
// Tooltip helpers
// ---------------------------------------------------------------------------

function formatLabel(value: string): string {
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

interface SingleTooltipState {
  kind: 'single';
  shot: Shot;
  x: number;
  y: number;
}

interface BatchTooltipState {
  kind: 'batch';
  shots: Shot[];
  x: number;
  y: number;
}

type TooltipState = SingleTooltipState | BatchTooltipState | null;

/**
 * Recent-sessions carousel for the dashboard.
 * Shows one session at a time with prev/next navigation, dot indicators,
 * match/practice tabs, session score stats, and a pitch SVG with shot markers.
 *
 * Ported from dashboard.js — drawCarouselSession, initSessionCarousel, etc.
 */

const MAX_CAROUSEL = 10;

type DashboardType = 'match' | 'practice';

interface SessionCarouselProps {
  sessions: Session[];
}

// ---------------------------------------------------------------------------
// Helpers ported from dashboard.js / sessions.js
// ---------------------------------------------------------------------------

/** Determine which goal end was attacked in each half (ported from sessions.js). */
function getHalfEndInfo(shots: Shot[]): { topLabel: string; bottomLabel: string } {
  let sum1stY = 0, count1st = 0;
  let sum2ndY = 0, count2nd = 0;

  shots.forEach((shot) => {
    if (shot.half === '1st') { sum1stY += shot.y; count1st++; }
    else if (shot.half === '2nd') { sum2ndY += shot.y; count2nd++; }
  });

  const result = { topLabel: '', bottomLabel: '' };
  if (count1st === 0 && count2nd === 0) return result;

  const avg1stY = count1st > 0 ? sum1stY / count1st : -1;
  const avg2ndY = count2nd > 0 ? sum2ndY / count2nd : -1;

  if (count1st > 0 && count2nd > 0) {
    if (avg1stY < avg2ndY) {
      result.topLabel = '2nd Half';
      result.bottomLabel = '1st Half';
    } else {
      result.topLabel = '1st Half';
      result.bottomLabel = '2nd Half';
    }
  } else if (count1st > 0) {
    if (avg1stY < 50) {
      result.topLabel = '2nd Half';
      result.bottomLabel = '1st Half';
    } else {
      result.topLabel = '1st Half';
      result.bottomLabel = '2nd Half';
    }
  } else if (count2nd > 0) {
    if (avg2ndY < 50) {
      result.topLabel = '1st Half';
      result.bottomLabel = '2nd Half';
    } else {
      result.topLabel = '2nd Half';
      result.bottomLabel = '1st Half';
    }
  }
  return result;
}

/** Compute session score stats (ported from dashboard.js drawCarouselSession). */
function computeSessionStats(session: Session) {
  const shots = session.shots ?? [];
  const sessionType = session.type || 'practice';

  let goals = 0, goalsFromFree = 0;
  let points = 0, pointsFromFree = 0;
  let twoPointers = 0, twoPointersFromFree = 0;
  let rightScored = 0, rightTotal = 0;
  let leftScored = 0, leftTotal = 0;
  let totalScored = 0;
  const totalShots = shots.length;

  shots.forEach((shot) => {
    const isScored = shot.result === 'scored';
    const isFree = shot.shotCategory === 'free-kick' || shot.shotCategory === '45';
    const pointValue = shot.pointValue || 1;
    const foot = shot.foot || 'right';

    if (isScored) {
      totalScored++;
      if (pointValue === 3) {
        goals++;
        if (isFree) goalsFromFree++;
      } else if (pointValue === 2) {
        twoPointers++;
        if (isFree) twoPointersFromFree++;
      } else {
        points++;
        if (isFree) pointsFromFree++;
      }
    }
    if (foot === 'right') { rightTotal++; if (isScored) rightScored++; }
    else { leftTotal++; if (isScored) leftScored++; }
  });

  const totalPoints = points + twoPointers * 2;
  const scoreDisplay = `${goals}-${String(totalPoints).padStart(2, '0')}`;

  // Build breakdown string
  const breakdownParts: string[] = [];
  if (pointsFromFree > 0) breakdownParts.push(`${pointsFromFree}f`);
  if (twoPointers > 0) {
    const tpStr =
      twoPointersFromFree > 0 && twoPointersFromFree < twoPointers
        ? `${twoPointers} 2p (${twoPointersFromFree}f)`
        : twoPointersFromFree === twoPointers
          ? `${twoPointers} 2pf`
          : `${twoPointers} 2p`;
    breakdownParts.push(tpStr);
  }
  if (goalsFromFree > 0) breakdownParts.push(`${goalsFromFree} pen`);
  const breakdownStr = breakdownParts.length > 0 ? `(${breakdownParts.join(', ')})` : '';

  const conversionRate = totalShots > 0 ? Math.round((totalScored / totalShots) * 100) : 0;
  const rightRate = rightTotal > 0 ? Math.round((rightScored / rightTotal) * 100) : 0;
  const leftRate = leftTotal > 0 ? Math.round((leftScored / leftTotal) * 100) : 0;

  return {
    sessionType,
    totalScored,
    totalShots,
    scoreDisplay,
    breakdownStr,
    conversionRate,
    rightScored, rightTotal, rightRate,
    leftScored, leftTotal, leftRate,
  };
}

/** Group shots by rounded location for batch-style display on the dashboard pitch. */
function groupShotsByLocation(shots: Shot[]) {
  const map = new Map<string, { x: number; y: number; scored: number; total: number; shots: Shot[] }>();

  shots.forEach((shot) => {
    const key = `${Math.round(shot.x)}-${Math.round(shot.y)}`;
    if (!map.has(key)) {
      map.set(key, { x: shot.x, y: shot.y, scored: 0, total: 0, shots: [] });
    }
    const loc = map.get(key)!;
    loc.total++;
    if (shot.result === 'scored') loc.scored++;
    loc.shots.push(shot);
  });

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionCarousel({ sessions }: SessionCarouselProps) {
  const [dashboardType, setDashboardType] = useState<DashboardType>('match');
  const [index, setIndex] = useState(0);

  // Filter sessions: must have shots, match current type, sort newest first
  const filtered = useMemo(() => {
    const withShots = sessions
      .filter((s) => s.type === dashboardType && s.shots && s.shots.length > 0)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, MAX_CAROUSEL);
    return withShots;
  }, [sessions, dashboardType]);

  const session = filtered[index] ?? null;
  const numSessions = filtered.length;

  // Reset carousel index when switching tabs
  const switchType = useCallback((type: DashboardType) => {
    setDashboardType(type);
    setIndex(0);
  }, []);

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(numSessions - 1, i + 1)), [numSessions]);

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary dark:text-text m-0">Recent Sessions</h3>
        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {Array.from({ length: numSessions }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${
                i === index ? 'bg-primary' : 'bg-grey'
              }`}
              aria-label={`Go to session ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Match / Practice tabs */}
      <div className="flex gap-2 mb-4">
        <TabButton
          active={dashboardType === 'match'}
          onClick={() => switchType('match')}
          label="Match"
        />
        <TabButton
          active={dashboardType === 'practice'}
          onClick={() => switchType('practice')}
          label="Practice"
        />
      </div>

      {/* Carousel body */}
      <div className="flex items-stretch gap-2">
        {/* Prev button */}
        <button
          onClick={prev}
          disabled={index === 0 || numSessions === 0}
          className="self-center text-2xl text-text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer px-1"
          aria-label="Previous session"
        >
          &lsaquo;
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {session ? (
            <CarouselContent session={session} />
          ) : (
            <EmptyState type={dashboardType} />
          )}
        </div>

        {/* Next button */}
        <button
          onClick={next}
          disabled={index >= numSessions - 1 || numSessions === 0}
          className="self-center text-2xl text-text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer px-1"
          aria-label="Next session"
        >
          &rsaquo;
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
        active
          ? 'bg-primary text-white'
          : 'bg-grey-light text-text-muted hover:text-text'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ type }: { type: DashboardType }) {
  return (
    <div className="text-center py-8">
      <p className="text-lg font-semibold text-primary dark:text-text mb-1">
        {type === 'practice' ? 'No practice sessions yet' : 'No match sessions yet'}
      </p>
      <p className="text-sm text-text-muted">Start tracking to see your shots here!</p>
    </div>
  );
}

function CarouselContent({ session }: { session: Session }) {
  const stats = useMemo(() => computeSessionStats(session), [session]);
  const shotGroups = useMemo(() => groupShotsByLocation(session.shots ?? []), [session.shots]);
  const halfInfo = useMemo(
    () => (session.type === 'match' ? getHalfEndInfo(session.shots ?? []) : null),
    [session]
  );

  // Tooltip state
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const posFromEvent = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleMarkerEnter = useCallback((e: React.MouseEvent, shots: Shot[]) => {
    const pos = posFromEvent(e);
    if (!pos) return;
    if (shots.length === 1) {
      setTooltip({ kind: 'single', shot: shots[0], ...pos });
    } else {
      setTooltip({ kind: 'batch', shots, ...pos });
    }
  }, [posFromEvent]);

  const handleMarkerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleMarkerClick = useCallback((e: React.MouseEvent, shots: Shot[]) => {
    const pos = posFromEvent(e);
    if (!pos) return;
    // Toggle on tap (mobile)
    setTooltip((prev) => {
      if (prev && prev.kind === 'single' && shots.length === 1 && prev.shot === shots[0]) return null;
      if (prev && prev.kind === 'batch' && shots.length > 1 && prev.shots === shots) return null;
      if (shots.length === 1) return { kind: 'single', shot: shots[0], ...pos };
      return { kind: 'batch', shots, ...pos };
    });
  }, [posFromEvent]);

  // Tooltip positioning with clamping
  const tooltipStyle = tooltip
    ? (() => {
        const cw = containerRef.current?.clientWidth ?? 300;
        const ch = containerRef.current?.clientHeight ?? 400;
        const tw = 200;
        const th = 150;
        let left = tooltip.x + 12;
        let top = tooltip.y - 10;
        if (left + tw > cw) left = tooltip.x - tw - 12;
        if (top + th > ch) top = tooltip.y - th;
        if (top < 0) top = 4;
        if (left < 0) left = 4;
        return { left, top };
      })()
    : null;

  // Build title
  const matchType = session.matchType || '';
  const capitalised = matchType ? matchType.charAt(0).toUpperCase() + matchType.slice(1) : '';
  const title =
    session.type === 'match' && capitalised
      ? `${capitalised} - ${session.name || 'Match'}`
      : session.name || (session.type === 'match' ? 'Match' : 'Practice');

  const dateStr = new Date(session.date).toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <>
      {/* Stats row */}
      <div className="flex gap-3 mb-3">
        {/* Title / date card */}
        <div className="flex-1 bg-grey-light rounded-lg p-3">
          <p className="text-sm font-semibold text-primary dark:text-text truncate">{title}</p>
          <p className="text-xs text-text-muted mt-0.5">{dateStr}</p>
        </div>
        {/* Score card */}
        <div className="flex-1 bg-grey-light rounded-lg p-3">
          <div className="text-xl font-bold text-primary dark:text-text leading-tight">
            {stats.sessionType === 'practice'
              ? `${stats.totalScored}/${stats.totalShots} (${stats.conversionRate}%)`
              : `${stats.scoreDisplay} ${stats.breakdownStr}`}
          </div>
          <div className="text-xs text-text-muted mt-1 space-y-0.5">
            {stats.sessionType === 'match' && (
              <div>Conversion: {stats.totalScored}/{stats.totalShots} ({stats.conversionRate}%)</div>
            )}
            <div>
              Right {stats.rightScored}/{stats.rightTotal} ({stats.rightRate}%)
              {stats.leftTotal > 0 && (
                <> &bull; Left {stats.leftScored}/{stats.leftTotal} ({stats.leftRate}%)</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pitch with shots */}
      <ShotMapLegend />
      <div className="max-w-[500px] mx-auto relative" ref={containerRef}>
        <SvgPitch showLabels={false}>
          {/* Half-end labels for match sessions */}
          {halfInfo?.topLabel && (
            <>
              <rect x="170" y="14" width="60" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
              <text x="200" y="27" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                {halfInfo.topLabel}
              </text>
            </>
          )}
          {halfInfo?.bottomLabel && (
            <>
              <rect x="170" y="694" width="60" height="18" rx="4" fill="rgba(0,0,0,0.6)" />
              <text x="200" y="707" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
                {halfInfo.bottomLabel}
              </text>
            </>
          )}

          {/* Shot markers grouped by location */}
          {shotGroups.map((loc, i) => {
            if (loc.total > 1) {
              return (
                <BatchShotMarker
                  key={i}
                  shots={loc.shots}
                  mirror={false}
                  size={8}
                  onClick={(shots, e) => handleMarkerClick(e, shots)}
                  onMouseEnter={(shots, e) => handleMarkerEnter(e, shots)}
                  onMouseLeave={handleMarkerLeave}
                />
              );
            }

            return (
              <ShotMarker
                key={i}
                shot={loc.shots[0]}
                mirror={false}
                size={6}
                onClick={(s, e) => handleMarkerClick(e, [s])}
                onMouseEnter={(s, e) => handleMarkerEnter(e, [s])}
                onMouseLeave={handleMarkerLeave}
              />
            );
          })}
        </SvgPitch>

        {/* Tooltip */}
        {tooltip && tooltipStyle && tooltip.kind === 'single' && (() => {
          const s = tooltip.shot;
          return (
            <div
              className="absolute z-50 bg-surface border border-grey rounded-lg shadow-lg p-3 text-xs pointer-events-none min-w-[180px]"
              style={tooltipStyle}
            >
              <p className={`font-semibold mb-1.5 ${s.result === 'scored' ? 'text-success' : 'text-danger'}`}>
                {s.result === 'scored' ? 'Scored' : 'Missed'}
                {' '}
                <span className="font-normal text-text-muted">({formatLabel(s.shotFor)})</span>
              </p>
              <div className="space-y-0.5 text-text-muted">
                <p><span className="text-text font-medium">Foot:</span> {formatLabel(s.foot)}</p>
                <p><span className="text-text font-medium">Category:</span> {formatLabel(s.shotCategory)}</p>
                {s.shotType && (
                  <p><span className="text-text font-medium">Type:</span> {formatLabel(s.shotType)}</p>
                )}
                {s.distance != null && (
                  <p><span className="text-text font-medium">Distance:</span> {s.distance.toFixed(1)}m</p>
                )}
                {s.result === 'missed' && s.missResult && (
                  <p><span className="text-text font-medium">Miss:</span> {formatLabel(s.missResult)}</p>
                )}
                {s.result === 'missed' && s.missReason && (
                  <p><span className="text-text font-medium">Reason:</span> {formatLabel(s.missReason)}</p>
                )}
                {s.comment && (
                  <p><span className="text-text font-medium">Comment:</span> {s.comment}</p>
                )}
              </div>
            </div>
          );
        })()}

        {tooltip && tooltipStyle && tooltip.kind === 'batch' && (() => {
          const shots = tooltip.shots;
          const batchScored = shots.filter((s) => s.result === 'scored').length;
          const batchTotal = shots.length;
          const first = shots[0];
          const rightShots = shots.filter((s) => s.foot === 'right');
          const leftShots = shots.filter((s) => s.foot !== 'right');
          const rightScoredCount = rightShots.filter((s) => s.result === 'scored').length;
          const leftScoredCount = leftShots.filter((s) => s.result === 'scored').length;
          const footParts: string[] = [];
          if (rightShots.length > 0) footParts.push(`${rightScoredCount}/${rightShots.length} Right`);
          if (leftShots.length > 0) footParts.push(`${leftScoredCount}/${leftShots.length} Left`);
          const footLabel = footParts.join(' \u00b7 ');

          return (
            <div
              className="absolute z-50 bg-surface border border-grey rounded-lg shadow-lg p-3 text-xs pointer-events-none min-w-[180px]"
              style={tooltipStyle}
            >
              <p className="font-semibold mb-1.5 text-text">
                {batchScored}/{batchTotal} scored
              </p>
              <div className="space-y-0.5 text-text-muted">
                <p><span className="text-text font-medium">Shot:</span> {formatLabel(first.shotFor)}</p>
                <p><span className="text-text font-medium">Foot:</span> {footLabel}</p>
                <p><span className="text-text font-medium">Category:</span> {formatLabel(first.shotCategory)}</p>
                {first.distance != null && (
                  <p><span className="text-text font-medium">Distance:</span> {first.distance.toFixed(1)}m</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>

    </>
  );
}

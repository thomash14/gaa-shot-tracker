'use client';

import { useState, useMemo, useCallback } from 'react';
import type { Session, Shot } from '@/types';
import { SvgPitch } from '@/components/pitch';

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
  const map = new Map<string, { x: number; y: number; scored: number; total: number }>();

  shots.forEach((shot) => {
    const key = `${Math.round(shot.x)}-${Math.round(shot.y)}`;
    if (!map.has(key)) {
      map.set(key, { x: shot.x, y: shot.y, scored: 0, total: 0 });
    }
    const loc = map.get(key)!;
    loc.total++;
    if (shot.result === 'scored') loc.scored++;
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
        <h3 className="text-lg font-semibold text-primary m-0">Recent Sessions</h3>
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
      <p className="text-lg font-semibold text-primary mb-1">
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
          <p className="text-sm font-semibold text-primary truncate">{title}</p>
          <p className="text-xs text-text-muted mt-0.5">{dateStr}</p>
        </div>
        {/* Score card */}
        <div className="flex-1 bg-grey-light rounded-lg p-3">
          <div className="text-xl font-bold text-primary leading-tight">
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
      <div className="max-w-[500px] mx-auto">
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
            const cx = (loc.x / 100) * 500;
            const cy = (loc.y / 100) * 725;

            if (loc.total > 1) {
              // Batch marker — colour based on scored/missed mix
              const fill =
                loc.scored === loc.total ? 'white'
                  : loc.scored === 0 ? '#dc3545'
                    : '#ffc107';
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="8" fill={fill} stroke="#333" strokeWidth="2" />
                  <rect x={cx - 12} y={cy + 12} width="24" height="14" fill="rgba(0,0,0,0.7)" rx="3" />
                  <text x={cx} y={cy + 23} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                    {loc.scored}/{loc.total}
                  </text>
                </g>
              );
            }

            // Single shot marker
            const fill = loc.scored === 1 ? 'white' : '#dc3545';
            return (
              <circle key={i} cx={cx} cy={cy} r="6" fill={fill} stroke="#333" strokeWidth="2" />
            );
          })}
        </SvgPitch>
      </div>

      {/* Legend */}
      <div className="text-center mt-3 text-sm text-text-muted">
        <span className="mr-5 inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-white border border-grey"></span> Scored
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full bg-danger"></span> Missed
        </span>
      </div>
    </>
  );
}

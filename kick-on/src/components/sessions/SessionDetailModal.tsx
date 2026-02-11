'use client';

import { useMemo } from 'react';
import type { Session, Shot, PracticeDrill } from '@/types';
import { SvgPitch, ShotMarker, BatchShotMarker } from '@/components/pitch';

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const STANCE_LABELS: Record<string, string> = {
  'free-kick': 'Free-Kick',
  standing: 'Standing',
  'on-the-run': 'On the Run',
  'on-the-turn': 'On the Turn',
  'off-a-dummy': 'After a Dummy',
};

const FOOT_LABELS: Record<string, string> = {
  right: 'Right',
  left: 'Left',
  both: 'Both',
};

const WIND_DIRECTION_LABELS: Record<string, string> = {
  'no-wind': 'No Wind',
  'straight-with': 'Straight with',
  'diag-lr-with': 'Diagonal L-R with',
  'diag-rl-with': 'Diagonal R-L with',
  'straight-against': 'Straight against',
  'diag-lr-against': 'Diagonal L-R against',
  'diag-rl-against': 'Diagonal R-L against',
  'cross-lr': 'Cross L-R',
  'cross-rl': 'Cross R-L',
};

const WIND_STRENGTH_LABELS: Record<string, string> = {
  light: 'Light',
  moderate: 'Moderate',
  strong: 'Strong',
  'very-strong': 'Very Strong',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (isNaN(ms) || ms <= 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionDetailModalProps {
  session: Session;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Drill card (read-only)
// ---------------------------------------------------------------------------

function DrillCard({ drill }: { drill: PracticeDrill }) {
  const pct = drill.shotCount > 0
    ? Math.round((drill.scoredCount / drill.shotCount) * 100)
    : 0;

  return (
    <div className="bg-grey-light rounded-xl p-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-text">
          Drill #{drill.drillOrder}: {drill.drillType === 'scoring-arc' ? 'Scoring Arc' : 'Free-Form'}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">
          {drill.distance ? `${drill.distance}m · ` : ''}
          {FOOT_LABELS[drill.foot] || drill.foot} · {STANCE_LABELS[drill.stance] || drill.stance}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-bold ${pct >= 80 ? 'text-[#4CAF50]' : pct >= 50 ? 'text-[#FF9800]' : 'text-[#f44336]'}`}>
          {drill.scoredCount}/{drill.shotCount}
        </div>
        <div className="text-[10px] text-text-muted">{pct}%</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionDetailModal({ session, onClose }: SessionDetailModalProps) {
  const shots = useMemo(() => Array.isArray(session.shots) ? session.shots : [], [session.shots]);
  const scored = useMemo(() => shots.filter((s) => s?.result === 'scored').length, [shots]);
  const total = shots.length;
  const percentage = total > 0 ? Math.round((scored / total) * 100) : 0;
  const duration = formatDuration(session.startTime, session.endTime);

  const sessionType = session.type || 'practice';
  const matchType = session.matchType || '';
  let typeLabel = sessionType === 'match' ? 'Match' : 'Practice';
  if (sessionType === 'match' && matchType) {
    typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
  }

  const drills = session.drills ?? [];
  const hasDrills = drills.length > 0;

  // Group batch shots by position for rendering
  const { singleShots, batchGroups } = useMemo(() => {
    const singles: Shot[] = [];
    const batchMap = new Map<string, Shot[]>();

    for (const shot of shots) {
      if (shot.batch) {
        const key = `${shot.x.toFixed(2)}-${shot.y.toFixed(2)}`;
        if (!batchMap.has(key)) batchMap.set(key, []);
        batchMap.get(key)!.push(shot);
      } else {
        singles.push(shot);
      }
    }

    return { singleShots: singles, batchGroups: Array.from(batchMap.values()) };
  }, [shots]);

  // Wind info
  const hasWind = session.windDirection && session.windDirection !== 'no-wind';
  const windLabel = hasWind
    ? `${WIND_DIRECTION_LABELS[session.windDirection!] || session.windDirection} · ${WIND_STRENGTH_LABELS[session.windStrength!] || session.windStrength || ''}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg my-4 overflow-hidden">
        {/* Header */}
        <div className="bg-primary text-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-bold text-base truncate">{session.name || 'Unnamed Session'}</div>
              <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="bg-white/20 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                  {typeLabel}
                </span>
                <span>{formatDate(session.date)}</span>
                {duration && <span>· {duration}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-bold"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-grey-light rounded-xl p-3">
              <div className="text-lg font-bold text-text">{total}</div>
              <div className="text-[10px] text-text-muted">Total Shots</div>
            </div>
            <div className="bg-grey-light rounded-xl p-3">
              <div className="text-lg font-bold text-[#4CAF50]">{scored}</div>
              <div className="text-[10px] text-text-muted">Scored</div>
            </div>
            <div className="bg-grey-light rounded-xl p-3">
              <div className={`text-lg font-bold ${percentage >= 80 ? 'text-[#4CAF50]' : percentage >= 50 ? 'text-[#FF9800]' : 'text-[#f44336]'}`}>
                {percentage}%
              </div>
              <div className="text-[10px] text-text-muted">Success</div>
            </div>
          </div>

          {/* Shot map */}
          {total > 0 && (
            <div>
              <div className="text-xs font-medium text-text-muted mb-1.5">Shot Map</div>
              <SvgPitch>
                {singleShots.map((shot, i) => (
                  <ShotMarker key={`s-${i}`} shot={shot} mirror={false} size={5} />
                ))}
                {batchGroups.map((group, i) => (
                  <BatchShotMarker key={`b-${i}`} shots={group} size={7} />
                ))}
              </SvgPitch>
            </div>
          )}

          {/* Drills breakdown */}
          {hasDrills && (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-text-muted">
                {drills.length} drill{drills.length !== 1 ? 's' : ''}
              </div>
              {drills.map((drill) => (
                <DrillCard key={drill.id} drill={drill} />
              ))}
            </div>
          )}

          {/* Notes section */}
          {(windLabel || session.notes || session.didWell || session.toImprove) && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-text-muted">Notes</div>

              {windLabel && (
                <div className="text-xs text-text-muted">
                  <span className="font-medium">Wind:</span> {windLabel}
                </div>
              )}

              {session.notes && (
                <div className="bg-grey-light rounded-lg p-2.5 text-xs text-text">
                  {session.notes}
                </div>
              )}

              {session.didWell && (
                <div className="bg-[#4CAF50]/10 rounded-lg p-2.5 text-xs text-text">
                  <span className="font-medium text-[#4CAF50]">Went well:</span> {session.didWell}
                </div>
              )}

              {session.toImprove && (
                <div className="bg-[#FF9800]/10 rounded-lg p-2.5 text-xs text-text">
                  <span className="font-medium text-[#FF9800]">To improve:</span> {session.toImprove}
                </div>
              )}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import type { Session, Shot, PracticeDrill } from '@/types';
import { SvgPitch, ShotMarker, BatchShotMarker, ShotMapLegend, TooltipConnector } from '@/components/pitch';
import { groupShotsByPosition } from '@/lib/shotMap';

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

/** Capitalise hyphenated labels: "free-kick" -> "Free Kick" */
function formatLabel(value: string): string {
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionDetailModalProps {
  session: Session;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Tooltip types
// ---------------------------------------------------------------------------

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

type TooltipState = SingleTooltipState | BatchTooltipState;

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

  const drills = useMemo(() => session.drills ?? [], [session.drills]);
  const hasDrills = drills.length > 0;

  // -------------------------------------------------------------------------
  // Drill filter state
  // -------------------------------------------------------------------------

  const allDrillIds = useMemo(
    () => new Set(drills.map((d) => d.id)),
    [drills],
  );

  const [visibleDrillIds, setVisibleDrillIds] = useState<Set<number>>(() => new Set(allDrillIds));

  // Keep visibleDrillIds in sync if drills change (e.g. different session rendered)
  useEffect(() => {
    setVisibleDrillIds(new Set(allDrillIds));
  }, [allDrillIds]);

  const allDrillsVisible = hasDrills && visibleDrillIds.size === allDrillIds.size;

  const toggleAllDrills = useCallback(() => {
    setVisibleDrillIds((prev) => {
      if (prev.size === allDrillIds.size) return new Set<number>();
      return new Set(allDrillIds);
    });
  }, [allDrillIds]);

  const toggleDrill = useCallback((drillId: number) => {
    setVisibleDrillIds((prev) => {
      const next = new Set(prev);
      if (next.has(drillId)) {
        next.delete(drillId);
      } else {
        next.add(drillId);
      }
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Filter + group shots
  // -------------------------------------------------------------------------

  const filteredShots = useMemo(() => {
    if (!hasDrills) return shots;
    return shots.filter((s) => {
      if (s.drillId == null) return visibleDrillIds.size === allDrillIds.size;
      return visibleDrillIds.has(s.drillId);
    });
  }, [shots, hasDrills, visibleDrillIds, allDrillIds]);

  const { singleShots, batchGroups } = useMemo(
    () => groupShotsByPosition(filteredShots),
    [filteredShots],
  );

  // -------------------------------------------------------------------------
  // Tooltip state + handlers
  // -------------------------------------------------------------------------

  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const posFromEvent = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // Single shot hover
  const handleMarkerEnter = useCallback(
    (shot: Shot, e: React.MouseEvent<SVGElement>) => {
      const pos = posFromEvent(e as unknown as React.MouseEvent);
      if (pos) setTooltip({ kind: 'single', shot, ...pos });
    },
    [posFromEvent],
  );

  // Batch shot hover
  const handleBatchEnter = useCallback(
    (batchShots: Shot[], e: React.MouseEvent<SVGElement>) => {
      const pos = posFromEvent(e as unknown as React.MouseEvent);
      if (pos) setTooltip({ kind: 'batch', shots: batchShots, ...pos });
    },
    [posFromEvent],
  );

  const handleMarkerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Mobile tap toggle for single shots
  const handleMarkerClick = useCallback(
    (shot: Shot, e: React.MouseEvent) => {
      const pos = posFromEvent(e);
      if (!pos) return;
      setTooltip((prev) => {
        if (prev && prev.kind === 'single' && prev.shot.timestamp === shot.timestamp) {
          return null;
        }
        return { kind: 'single', shot, ...pos };
      });
    },
    [posFromEvent],
  );

  // Mobile tap toggle for batch shots
  const handleBatchClick = useCallback(
    (batchShots: Shot[], e: React.MouseEvent) => {
      const pos = posFromEvent(e);
      if (!pos) return;
      setTooltip((prev) => {
        if (prev && prev.kind === 'batch' && prev.shots === batchShots) {
          return null;
        }
        return { kind: 'batch', shots: batchShots, ...pos };
      });
    },
    [posFromEvent],
  );

  // Dismiss tooltip when tapping pitch background
  const handlePitchClick = useCallback(() => {
    setTooltip(null);
  }, []);

  // Dismiss tooltip when clicking outside the container
  useEffect(() => {
    if (!tooltip) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltip(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [tooltip]);

  // Clamp tooltip position within the container
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

  // -------------------------------------------------------------------------
  // Drill name lookup for tooltip
  // -------------------------------------------------------------------------

  const drillById = useMemo(() => {
    const map = new Map<number, PracticeDrill>();
    for (const d of drills) map.set(d.id, d);
    return map;
  }, [drills]);

  function drillLabel(drillId: number | undefined): string | null {
    if (drillId == null) return null;
    const d = drillById.get(drillId);
    if (!d) return null;
    const type = d.drillType === 'scoring-arc' ? 'Scoring Arc' : 'Free-Form';
    return `Drill #${d.drillOrder}: ${type}${d.distance ? ` - ${d.distance}m` : ''}`;
  }

  // Wind info
  const hasWind = session.windDirection && session.windDirection !== 'no-wind';
  const windLabel = hasWind
    ? `${WIND_DIRECTION_LABELS[session.windDirection!] || session.windDirection} · ${WIND_STRENGTH_LABELS[session.windStrength!] || session.windStrength || ''}`
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg md:max-w-4xl my-4 overflow-hidden">
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

              {/* Drill filter checkboxes */}
              {hasDrills && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <label className="inline-flex items-center gap-1 text-[11px] text-text bg-grey-light rounded-full px-2.5 py-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allDrillsVisible}
                      onChange={toggleAllDrills}
                      className="accent-primary w-3 h-3"
                    />
                    All Drills
                  </label>
                  {drills.map((drill) => (
                    <label
                      key={drill.id}
                      className="inline-flex items-center gap-1 text-[11px] text-text bg-grey-light rounded-full px-2.5 py-1 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleDrillIds.has(drill.id)}
                        onChange={() => toggleDrill(drill.id)}
                        className="accent-primary w-3 h-3"
                      />
                      Drill #{drill.drillOrder}: {drill.drillType === 'scoring-arc' ? 'Scoring Arc' : 'Free-Form'}
                      {drill.distance ? ` - ${drill.distance}m` : ''}
                    </label>
                  ))}
                </div>
              )}

              <ShotMapLegend />
              <div className="relative" ref={containerRef}>
                <SvgPitch onPitchClick={handlePitchClick}>
                  {singleShots.map((shot, i) => (
                    <ShotMarker
                      key={`s-${i}`}
                      shot={shot}
                      mirror={false}
                      size={4}
                      onClick={handleMarkerClick}
                      onMouseEnter={handleMarkerEnter}
                      onMouseLeave={handleMarkerLeave}
                    />
                  ))}
                  {batchGroups.map((group, i) => (
                    <BatchShotMarker
                      key={`b-${i}`}
                      shots={group}
                      size={5}
                      onClick={handleBatchClick}
                      onMouseEnter={handleBatchEnter}
                      onMouseLeave={handleMarkerLeave}
                    />
                  ))}
                </SvgPitch>

                {/* Tooltip connector line */}
                {tooltip && tooltipStyle && (
                  <TooltipConnector
                    shotX={tooltip.x}
                    shotY={tooltip.y}
                    tooltipLeft={tooltipStyle.left}
                    tooltipTop={tooltipStyle.top}
                  />
                )}

                {/* Single shot tooltip */}
                {tooltip && tooltip.kind === 'single' && tooltipStyle && (() => {
                  const s = tooltip.shot;
                  const dl = drillLabel(s.drillId);
                  return (
                    <div
                      className="absolute z-50 bg-surface border border-grey rounded-lg shadow-lg p-2 sm:p-3 text-xs pointer-events-none min-w-[160px] sm:min-w-[180px]"
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
                        <p><span className="text-text font-medium">Type:</span> {formatLabel(s.shotType)}</p>
                        {s.distance != null && (
                          <p><span className="text-text font-medium">Distance:</span> {s.distance.toFixed(1)}m</p>
                        )}
                        {dl && (
                          <p><span className="text-text font-medium">Drill:</span> {dl}</p>
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

                {/* Batch shot tooltip */}
                {tooltip && tooltip.kind === 'batch' && tooltipStyle && (() => {
                  const batchShots = tooltip.shots;
                  const first = batchShots[0];
                  const batchTotal = batchShots.length;
                  const batchScored = batchShots.filter((s) => s.result === 'scored').length;
                  const dl = drillLabel(first.drillId);
                  const feet = new Set(batchShots.map((s) => s.foot));
                  const hasMixedFeet = feet.size > 1;
                  let footLabel: string;
                  if (hasMixedFeet) {
                    const rShots = batchShots.filter((s) => s.foot === 'right');
                    const lShots = batchShots.filter((s) => s.foot === 'left');
                    const rScored = rShots.filter((s) => s.result === 'scored').length;
                    const lScored = lShots.filter((s) => s.result === 'scored').length;
                    footLabel = `${rScored}/${rShots.length} Right · ${lScored}/${lShots.length} Left`;
                  } else {
                    footLabel = formatLabel(first.foot);
                  }
                  return (
                    <div
                      className="absolute z-50 bg-surface border border-grey rounded-lg shadow-lg p-2 sm:p-3 text-xs pointer-events-none min-w-[160px] sm:min-w-[180px]"
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
                          <p><span className="text-text font-medium">Distance:</span> {first.distance}m</p>
                        )}
                        {dl && (
                          <p><span className="text-text font-medium">Drill:</span> {dl}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
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

'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { SvgPitch, ShotMarker, BatchShotMarker, ZoneOverlay, ShotMapLegend } from '@/components/pitch';
import { groupShotsByPosition } from '@/lib/shotMap';
import type { Shot, ShotWithContext } from '@/types';

/** Capitalise hyphenated labels: "free-kick" → "Free Kick" */
function formatLabel(value: string): string {
  return value
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Tooltip types (discriminated union for single vs batch)
// ---------------------------------------------------------------------------

interface SingleTooltipState {
  kind: 'single';
  shot: ShotWithContext;
  x: number;
  y: number;
}

interface BatchTooltipState {
  kind: 'batch';
  shots: ShotWithContext[];
  x: number;
  y: number;
}

type TooltipState = SingleTooltipState | BatchTooltipState;

interface AnalyticsShotMapProps {
  shots: ShotWithContext[];
}

export default function AnalyticsShotMap({ shots }: AnalyticsShotMapProps) {
  const showZoneOverlay = useAnalyticsStore((s) => s.showZoneOverlay);
  const setShowZoneOverlay = useAnalyticsStore((s) => s.setShowZoneOverlay);

  // Split shots into singles and batch groups using shared position-based logic.
  const { singleShots, batchGroups } = useMemo(
    () => groupShotsByPosition(shots, (s) => String(s.sessionId)),
    [shots],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Compute position relative to the container
  const posFromEvent = useCallback((e: React.MouseEvent): { x: number; y: number } | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // Desktop: show tooltip on hover (single shot)
  const handleMarkerEnter = useCallback(
    (shot: Shot, e: React.MouseEvent<SVGElement>) => {
      const pos = posFromEvent(e as unknown as React.MouseEvent);
      if (pos) setTooltip({ kind: 'single', shot: shot as ShotWithContext, ...pos });
    },
    [posFromEvent],
  );

  // Desktop: show tooltip on hover (batch)
  const handleBatchEnter = useCallback(
    (batchShots: Shot[], e: React.MouseEvent<SVGElement>) => {
      const pos = posFromEvent(e as unknown as React.MouseEvent);
      if (pos) setTooltip({ kind: 'batch', shots: batchShots as ShotWithContext[], ...pos });
    },
    [posFromEvent],
  );

  const handleMarkerLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  // Mobile: toggle tooltip on tap (single shot)
  const handleMarkerClick = useCallback(
    (shot: Shot, e: React.MouseEvent) => {
      const pos = posFromEvent(e);
      if (!pos) return;
      const ctx = shot as ShotWithContext;
      setTooltip((prev) => {
        if (prev && prev.kind === 'single' && prev.shot.timestamp === ctx.timestamp && prev.shot.sessionId === ctx.sessionId) {
          return null;
        }
        return { kind: 'single', shot: ctx, ...pos };
      });
    },
    [posFromEvent],
  );

  // Mobile: toggle tooltip on tap (batch)
  const handleBatchClick = useCallback(
    (batchShots: Shot[], e: React.MouseEvent) => {
      const pos = posFromEvent(e);
      if (!pos) return;
      setTooltip((prev) => {
        if (prev && prev.kind === 'batch' && prev.shots === batchShots) {
          return null;
        }
        return { kind: 'batch', shots: batchShots as ShotWithContext[], ...pos };
      });
    },
    [posFromEvent],
  );

  // Dismiss tooltip when tapping the pitch background
  const handlePitchClick = useCallback(() => {
    setTooltip(null);
  }, []);

  // Dismiss tooltip when clicking outside the container entirely
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
        // Flip left if overflowing right
        if (left + tw > cw) left = tooltip.x - tw - 12;
        // Flip up if overflowing bottom
        if (top + th > ch) top = tooltip.y - th;
        if (top < 0) top = 4;
        if (left < 0) left = 4;
        return { left, top };
      })()
    : null;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-primary dark:text-text">Shot Map</h3>
        <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={showZoneOverlay}
            onChange={(e) => setShowZoneOverlay(e.target.checked)}
            className="accent-primary"
          />
          Show Zones
        </label>
      </div>

      <ShotMapLegend />
      <div className="relative" ref={containerRef}>
        <SvgPitch attackingHalfOnly onPitchClick={handlePitchClick}>
          <ZoneOverlay visible={showZoneOverlay} />
          {singleShots.map((shot, i) => (
            <ShotMarker
              key={`${shot.sessionId}-${shot.timestamp}-${i}`}
              shot={shot}
              mirror
              onClick={handleMarkerClick}
              onMouseEnter={handleMarkerEnter}
              onMouseLeave={handleMarkerLeave}
            />
          ))}
          {batchGroups.map((group, i) => (
            <BatchShotMarker
              key={`batch-${i}`}
              shots={group}
              mirror
              onClick={handleBatchClick}
              onMouseEnter={handleBatchEnter}
              onMouseLeave={handleMarkerLeave}
            />
          ))}
        </SvgPitch>

        {/* Single shot tooltip */}
        {tooltip && tooltip.kind === 'single' && tooltipStyle && (() => {
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
                <p><span className="text-text font-medium">Type:</span> {formatLabel(s.shotType)}</p>
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

        {/* Batch shot tooltip */}
        {tooltip && tooltip.kind === 'batch' && tooltipStyle && (() => {
          const batchShots = tooltip.shots;
          const first = batchShots[0];
          const batchTotal = batchShots.length;
          const batchScored = batchShots.filter((s) => s.result === 'scored').length;
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
                  <p><span className="text-text font-medium">Distance:</span> {first.distance}m</p>
                )}
                {first.sessionName && (
                  <p><span className="text-text font-medium">Session:</span> {first.sessionName}</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

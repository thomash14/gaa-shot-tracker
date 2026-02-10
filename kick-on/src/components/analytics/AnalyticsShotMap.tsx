'use client';

import { useAnalyticsStore } from '@/store/analyticsStore';
import { SvgPitch, ShotMarker, ZoneOverlay } from '@/components/pitch';
import type { ShotWithContext } from '@/types';

/**
 * Analytics shot map — the pitch with filtered shot markers overlaid.
 * Ported from renderShotMapFromShots() in analytics.js.
 * Uses the attacking-half-only view with all shots mirrored.
 */

interface AnalyticsShotMapProps {
  shots: ShotWithContext[];
}

export default function AnalyticsShotMap({ shots }: AnalyticsShotMapProps) {
  const showZoneOverlay = useAnalyticsStore((s) => s.showZoneOverlay);
  const setShowZoneOverlay = useAnalyticsStore((s) => s.setShowZoneOverlay);

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-primary">Shot Map</h3>
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

      <div className="relative">
        <SvgPitch attackingHalfOnly>
          <ZoneOverlay visible={showZoneOverlay} />
          {shots.map((shot, i) => (
            <ShotMarker
              key={`${shot.sessionId}-${shot.timestamp}-${i}`}
              shot={shot}
              mirror
            />
          ))}
        </SvgPitch>
      </div>
    </div>
  );
}

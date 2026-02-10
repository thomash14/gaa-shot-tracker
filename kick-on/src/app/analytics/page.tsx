'use client';

import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  FilterBar,
  ConversionStats,
  AnalyticsShotMap,
  ZoneStats,
  StatsTable,
  TrendsView,
} from '@/components/analytics';

export default function AnalyticsPage() {
  const trendsViewActive = useAnalyticsStore((s) => s.trendsViewActive);
  const setTrendsViewActive = useAnalyticsStore((s) => s.setTrendsViewActive);

  const {
    analyticsType,
    filteredSessions,
    allShots,
    checkedShots,
    checkedSessionCount,
    matchTypeOptions,
    drillOptions,
  } = useAnalytics();

  const isMatch = analyticsType === 'match';

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Stats</h2>

      {/* Filter bar */}
      <FilterBar matchTypeOptions={matchTypeOptions} drillOptions={drillOptions} />

      {/* Stats / Trends toggle */}
      <div className="flex gap-1 bg-grey-light rounded-lg p-1 max-w-xs">
        <button
          onClick={() => setTrendsViewActive(false)}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
            !trendsViewActive ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setTrendsViewActive(true)}
          className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
            trendsViewActive ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Trends
        </button>
      </div>

      {/* Trends view */}
      {trendsViewActive && (
        <TrendsView
          sessions={filteredSessions}
          allShots={allShots}
          analyticsType={analyticsType}
        />
      )}

      {/* Stats view */}
      {!trendsViewActive && (
        <>
          {/* Conversion stats (uses checked shots — reflects table checkbox state) */}
          <ConversionStats
            shots={checkedShots}
            sessionCount={checkedSessionCount}
            sessionLabel={isMatch ? 'Matches' : 'Sessions'}
          />

          {/* Shot map (uses checked shots) */}
          <AnalyticsShotMap shots={checkedShots} />

          {/* Stats table (full sessions — has its own per-row filtering + checkboxes) */}
          <StatsTable sessions={filteredSessions} analyticsType={analyticsType} />

          {/* Zone stats (uses checked shots) */}
          <ZoneStats shots={checkedShots} />
        </>
      )}
    </div>
  );
}

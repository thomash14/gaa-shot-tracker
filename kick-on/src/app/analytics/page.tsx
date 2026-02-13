'use client';

import { useState } from 'react';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  FilterBar,
  AnalyticsShotMap,
  ZoneStats,
  StatsTable,
  TrendsView,
} from '@/components/analytics';
import { ReportModal } from '@/components/report';

export default function AnalyticsPage() {
  const trendsViewActive = useAnalyticsStore((s) => s.trendsViewActive);
  const setTrendsViewActive = useAnalyticsStore((s) => s.setTrendsViewActive);
  const [reportOpen, setReportOpen] = useState(false);

  const {
    analyticsType,
    filteredSessions,
    allShots,
    checkedShots,
    matchTypeOptions,
    drillOptions,
  } = useAnalytics();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-primary dark:text-text">Stats</h2>
        <button
          onClick={() => setReportOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Monthly Report
        </button>
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />

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
          {/* Match/session breakdown table (has its own per-row filtering + checkboxes) */}
          <StatsTable sessions={filteredSessions} analyticsType={analyticsType} />

          {/* Shot map (uses checked shots) */}
          <AnalyticsShotMap shots={checkedShots} />

          {/* Zone stats (uses checked shots) */}
          <ZoneStats shots={checkedShots} />
        </>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnalyticsStore, type AnalyticsType } from '@/store/analyticsStore';
import {
  FilterBar,
  ConversionStats,
  AnalyticsShotMap,
  ZoneStats,
  StatsTable,
  TrendsView,
} from '@/components/analytics';
import { useSessionStore } from '@/store/sessionStore';
import type { Session, Shot, ShotWithContext } from '@/types';

interface PlayerDataModalProps {
  open: boolean;
  playerName: string;
  playerUserId: string;
  onLoadData: (userId: string) => Promise<PlayerDataResponse>;
  onClose: () => void;
}

interface PlayerDataResponse {
  share_practice: boolean;
  share_match: boolean;
  sessions: RawSession[];
}

interface RawSession {
  id: string | number;
  name: string;
  date: string;
  type: string;
  match_type?: string;
  session_notes?: string;
  did_well?: string;
  to_improve?: string;
  wind_direction?: string;
  wind_strength?: string;
  shots: RawShot[];
}

interface RawShot {
  x: number;
  y: number;
  distance: number;
  foot: string;
  half: string | null;
  shot_for: string;
  shot_category: string;
  shot_type: string;
  point_value: number;
  result: string;
  timestamp: string;
  comment: string;
  miss_result?: string;
  miss_reason?: string;
}

/**
 * PlayerDataModal — Full coach view of a player's analytics.
 *
 * Reuses the existing analytics components (FilterBar, ConversionStats,
 * StatsTable, AnalyticsShotMap, ZoneStats, TrendsView) instead of
 * duplicating the ~400 lines of analytics rendering from team.js.
 *
 * Strategy: temporarily inject the player's sessions into the session store,
 * then render the analytics components which read from the same store/hook.
 * On close, restore the original sessions.
 */
export default function PlayerDataModal({ open, playerName, playerUserId, onLoadData, onClose }: PlayerDataModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playerSessions, setPlayerSessions] = useState<Session[]>([]);
  const [hasPractice, setHasPractice] = useState(false);
  const [hasMatch, setHasMatch] = useState(false);

  // Store references for injection
  const setSessions = useSessionStore((s) => s.setSessions);
  const originalSessions = useSessionStore((s) => s.sessions);
  const analyticsType = useAnalyticsStore((s) => s.analyticsType);
  const setAnalyticsType = useAnalyticsStore((s) => s.setAnalyticsType);
  const resetFilters = useAnalyticsStore((s) => s.resetFilters);
  const trendsViewActive = useAnalyticsStore((s) => s.trendsViewActive);
  const setTrendsViewActive = useAnalyticsStore((s) => s.setTrendsViewActive);

  // Keep a ref to the original sessions before we inject
  const [savedSessions, setSavedSessions] = useState<Session[]>([]);
  const [injected, setInjected] = useState(false);

  // Load player data when modal opens
  useEffect(() => {
    if (!open || !playerUserId) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    onLoadData(playerUserId).then((data) => {
      if (cancelled) return;

      // Convert raw sessions to Session type
      const sessions: Session[] = (data.sessions || []).map((s) => ({
        id: s.id,
        name: s.name,
        date: s.date,
        type: s.type as 'practice' | 'match',
        sport: 'football' as const,
        matchType: (s.match_type ?? null) as Session['matchType'],
        notes: s.session_notes,
        didWell: s.did_well,
        toImprove: s.to_improve,
        windDirection: s.wind_direction,
        windStrength: s.wind_strength,
        startTime: '',
        shots: (s.shots || []).map((sh) => ({
          x: sh.x,
          y: sh.y,
          distance: sh.distance,
          foot: sh.foot as Shot['foot'],
          half: sh.half as Shot['half'],
          shotFor: sh.shot_for as Shot['shotFor'],
          shotCategory: sh.shot_category,
          shotType: sh.shot_type,
          pointValue: sh.point_value,
          result: sh.result as Shot['result'],
          timestamp: sh.timestamp,
          comment: sh.comment ?? '',
          batch: false,
          missResult: sh.miss_result,
          missReason: sh.miss_reason,
        })),
      }));

      const practiceExists = data.share_practice && sessions.some((s) => s.type === 'practice');
      const matchExists = data.share_match && sessions.some((s) => s.type === 'match');

      setPlayerSessions(sessions);
      setHasPractice(practiceExists);
      setHasMatch(matchExists);

      // Inject into session store
      setSavedSessions(originalSessions);
      setSessions(sessions);
      setInjected(true);

      // Reset analytics filters and set type
      resetFilters();
      if (matchExists) {
        setAnalyticsType('match');
      } else {
        setAnalyticsType('practice');
      }

      setLoading(false);
    }).catch((err) => {
      if (cancelled) return;
      setError('Failed to load player data: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playerUserId]);

  // Restore original sessions on close
  const handleClose = useCallback(() => {
    if (injected) {
      setSessions(savedSessions);
      setInjected(false);
    }
    resetFilters();
    setPlayerSessions([]);
    onClose();
  }, [injected, savedSessions, setSessions, resetFilters, onClose]);

  // Compute filtered data using the same pipeline as analytics page
  // (the components read from analyticsStore + sessionStore internally)
  const filteredSessions = useMemo(() => {
    return playerSessions.filter((s) => s.type === analyticsType);
  }, [playerSessions, analyticsType]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-primary text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button onClick={handleClose} className="text-white text-lg font-bold">&larr;</button>
        <h2 className="text-base font-semibold truncate">{playerName}&apos;s Data</h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-text-muted">Loading player data...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-[#f44336]/10 text-[#f44336] rounded-xl p-4 text-sm font-semibold">
            {error}
          </div>
        )}

        {/* Data loaded */}
        {!loading && !error && injected && (
          <>
            {/* Practice/Match tabs */}
            {hasPractice && hasMatch && (
              <div className="flex gap-1 bg-grey-light rounded-lg p-1 max-w-xs">
                <button
                  onClick={() => { resetFilters(); setAnalyticsType('practice'); }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
                    analyticsType === 'practice' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => { resetFilters(); setAnalyticsType('match'); }}
                  className={`flex-1 py-1.5 px-3 rounded-md text-xs font-semibold transition-colors ${
                    analyticsType === 'match' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
                  }`}
                >
                  Match
                </button>
              </div>
            )}

            {/* Filter bar */}
            <FilterBar matchTypeOptions={[]} drillOptions={[]} />

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

            {/* Analytics content — reuses same components as analytics page */}
            {trendsViewActive ? (
              <TrendsView
                sessions={filteredSessions}
                allShots={[]}
                analyticsType={analyticsType}
              />
            ) : (
              <>
                <ConversionStats
                  shots={[]}
                  sessionCount={filteredSessions.length}
                  sessionLabel={analyticsType === 'match' ? 'Matches' : 'Sessions'}
                />
                <AnalyticsShotMap shots={[]} />
                <StatsTable sessions={filteredSessions} analyticsType={analyticsType} />
                <ZoneStats shots={[]} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

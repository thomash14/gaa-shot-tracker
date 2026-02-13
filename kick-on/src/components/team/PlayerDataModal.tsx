'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAnalyticsStore, type AnalyticsType } from '@/store/analyticsStore';
import { useAnalytics } from '@/hooks/useAnalytics';
import {
  FilterBar,
  ConversionStats,
  AnalyticsShotMap,
  ZoneStats,
  StatsTable,
  TrendsView,
} from '@/components/analytics';
import { createClient } from '@/lib/supabase/client';
import type { Session, Shot, PracticeDrill } from '@/types';

interface PlayerDataModalProps {
  open: boolean;
  playerName: string;
  playerUserId: string;
  sharePractice: boolean;
  shareMatch: boolean;
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
  drill_id?: string;
}

/**
 * PlayerDataModal — Full coach view of a player's analytics.
 *
 * Reuses the existing analytics components (FilterBar, ConversionStats,
 * StatsTable, AnalyticsShotMap, ZoneStats, TrendsView) via the useAnalytics
 * hook.
 *
 * Strategy: load the player's sessions into local state and pass them to
 * useAnalytics via the overrideSessions parameter. This avoids injecting
 * into the global session store (which would trigger auto-sync side-effects
 * and interfere with checkbox state).
 */
export default function PlayerDataModal({ open, playerName, playerUserId, sharePractice, shareMatch, onLoadData, onClose }: PlayerDataModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasPractice, setHasPractice] = useState(false);
  const [hasMatch, setHasMatch] = useState(false);

  // Player sessions stored in local state — NOT injected into the global store
  const [playerSessions, setPlayerSessions] = useState<Session[]>([]);

  const analyticsType = useAnalyticsStore((s) => s.analyticsType);
  const setAnalyticsType = useAnalyticsStore((s) => s.setAnalyticsType);
  const resetFilters = useAnalyticsStore((s) => s.resetFilters);
  const trendsViewActive = useAnalyticsStore((s) => s.trendsViewActive);
  const setTrendsViewActive = useAnalyticsStore((s) => s.setTrendsViewActive);

  // Pass player sessions directly — avoids global store injection
  const analytics = useAnalytics(playerSessions.length > 0 ? playerSessions : undefined);

  // Load player data when modal opens
  useEffect(() => {
    if (!open || !playerUserId) return;

    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const data = await onLoadData(playerUserId);
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
            drillCloudId: sh.drill_id || undefined,
          })),
        }));

        // Load practice_drills for practice sessions so StatsTable shows per-drill rows
        const practiceSessionIds = sessions
          .filter((s) => s.type === 'practice')
          .map((s) => String(s.id))
          .filter(Boolean);

        if (practiceSessionIds.length > 0) {
          try {
            const supabase = createClient();
            const { data: drillsData } = await supabase
              .from('practice_drills')
              .select('*')
              .in('session_id', practiceSessionIds)
              .order('drill_order', { ascending: true });

            if (cancelled) return;

            if (Array.isArray(drillsData) && drillsData.length > 0) {
              // Group drills by session_id
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const drillsBySession: Record<string, PracticeDrill[]> = {};
              for (const d of drillsData as any[]) {
                const sid = d.session_id;
                if (!sid) continue;
                if (!drillsBySession[sid]) drillsBySession[sid] = [];
                drillsBySession[sid].push({
                  id: d.drill_order || (drillsBySession[sid].length + 1),
                  cloudId: d.id,
                  drillOrder: d.drill_order || 1,
                  drillType: d.drill_type || 'free-form',
                  distance: d.distance ? parseFloat(d.distance) : null,
                  foot: d.foot || 'right',
                  stance: d.stance || 'standing',
                  shotCategory: d.shot_category || 'in-play',
                  shotCount: d.shot_count || 0,
                  scoredCount: d.scored_count || 0,
                  assignedDrillId: d.assigned_drill_id || null,
                  templateId: d.template_id || null,
                  shots: [],
                  startTime: d.start_time || null,
                  endTime: d.end_time || null,
                });
              }

              // Attach drills to sessions and map shots to drills
              for (const session of sessions) {
                const sid = String(session.id);
                if (!drillsBySession[sid]) continue;

                session.drills = drillsBySession[sid];

                // Primary matching: by drillCloudId (shot.drill_id === practice_drill.id)
                for (const drill of session.drills) {
                  drill.shots = (session.shots ?? []).filter(
                    (s) => s.drillCloudId === drill.cloudId,
                  );
                  for (const shot of drill.shots) {
                    shot.drillId = drill.id;
                  }
                }

                // Fallback: if no shots matched any drill via drillCloudId (e.g. RPC
                // didn't include drill_id on shots), assign shots to drills using
                // each drill's shotCount and timestamp ordering.
                const anyMatched = session.drills.some((d) => d.shots.length > 0);
                if (!anyMatched && (session.shots ?? []).length > 0) {
                  const sorted = [...(session.shots ?? [])].sort((a, b) =>
                    (a.timestamp || '').localeCompare(b.timestamp || ''),
                  );
                  let offset = 0;
                  for (const drill of session.drills) {
                    const count = drill.shotCount || 0;
                    if (count <= 0) continue;
                    drill.shots = sorted.slice(offset, offset + count);
                    for (const shot of drill.shots) {
                      shot.drillId = drill.id;
                    }
                    offset += count;
                  }
                }
              }
            }

            // Secondary fallback: if practice_drills query returned nothing
            // (e.g. RLS blocked coach access) but shots DO have drill_id,
            // create synthetic drill entries from shot grouping.
            if (!drillsData || drillsData.length === 0) {
              for (const session of sessions) {
                if (session.type !== 'practice' || session.drills) continue;
                const shots = session.shots ?? [];
                const groups = new Map<string, Shot[]>();
                for (const shot of shots) {
                  if (!shot.drillCloudId) continue;
                  if (!groups.has(shot.drillCloudId)) groups.set(shot.drillCloudId, []);
                  groups.get(shot.drillCloudId)!.push(shot);
                }
                if (groups.size > 0) {
                  session.drills = [];
                  let idx = 1;
                  for (const [cloudId, drillShots] of groups) {
                    const drill: PracticeDrill = {
                      id: idx,
                      cloudId,
                      drillOrder: idx,
                      drillType: 'free-form',
                      distance: null,
                      foot: 'right',
                      stance: 'standing',
                      shotCategory: 'in-play',
                      shotCount: drillShots.length,
                      scoredCount: drillShots.filter((s) => s.result === 'scored').length,
                      assignedDrillId: null,
                      templateId: null,
                      shots: drillShots,
                      startTime: null,
                      endTime: null,
                    };
                    for (const shot of drillShots) {
                      shot.drillId = idx;
                    }
                    session.drills.push(drill);
                    idx++;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to load practice_drills for player:', e);
          }
        }

        // Use permission props from team_members table (not RPC response)
        // Only include sessions the player has granted permission for
        const allowedSessions = sessions.filter((s) => {
          if (s.type === 'practice') return sharePractice;
          if (s.type === 'match') return shareMatch;
          return false;
        });

        const practiceExists = sharePractice && allowedSessions.some((s) => s.type === 'practice');
        const matchExists = shareMatch && allowedSessions.some((s) => s.type === 'match');

        setHasPractice(practiceExists);
        setHasMatch(matchExists);

        // Store sessions locally — no global store injection
        setPlayerSessions(allowedSessions);

        // Reset analytics filters — always default to match view
        resetFilters();
        if (matchExists) {
          setAnalyticsType('match');
        } else if (practiceExists) {
          setAnalyticsType('practice');
        }

        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError('Failed to load player data: ' + (err instanceof Error ? err.message : String(err)));
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, playerUserId]);

  // Clean up on close — no session store restoration needed
  const handleClose = useCallback(() => {
    setPlayerSessions([]);
    resetFilters();
    onClose();
  }, [resetFilters, onClose]);

  if (!open) return null;

  const isMatch = analyticsType === 'match';
  const dataReady = !loading && !error && playerSessions.length > 0;

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
        {dataReady && (
          <>
            {/* Filter bar — hide type toggle unless both practice and match data exist */}
            <FilterBar
              matchTypeOptions={analytics.matchTypeOptions}
              drillOptions={analytics.drillOptions}
              hideTypeToggle={!(hasPractice && hasMatch)}
            />

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

            {/* Analytics content — same order as Stats page */}
            {trendsViewActive ? (
              <TrendsView
                sessions={analytics.filteredSessions}
                allShots={analytics.allShots}
                analyticsType={analyticsType}
              />
            ) : (
              <>
                <StatsTable sessions={analytics.filteredSessions} analyticsType={analyticsType} />
                <AnalyticsShotMap shots={analytics.checkedShots} />
                <ConversionStats
                  shots={analytics.checkedShots}
                  sessionCount={analytics.checkedSessionCount}
                  sessionLabel={isMatch ? 'Matches' : 'Sessions'}
                />
                <ZoneStats shots={analytics.checkedShots} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

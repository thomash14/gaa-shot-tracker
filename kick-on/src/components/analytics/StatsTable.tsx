'use client';

import { useMemo, useCallback } from 'react';
import type { Session, ShotWithContext } from '@/types';
import { useAnalyticsStore, type AnalyticsType } from '@/store/analyticsStore';
import { useDrillStore } from '@/store/drillStore';
import { FILTER_IDS, SHOT_TYPE_LABELS, MISS_RESULT_LABELS, MISS_REASON_LABELS } from '@/lib/filterOptions';

/**
 * Session/match breakdown table with per-row checkboxes.
 * Ported from renderStatsTable() + checkbox handlers in analytics.js.
 *
 * Key behaviour: each row has a checkbox. Unchecking a row removes that
 * session's shots from the stats/shot map/zones (via uncheckedSessionIds).
 * The summary row updates to reflect only checked rows.
 */

interface StatsTableProps {
  sessions: Session[];
  analyticsType: AnalyticsType;
}

// ---------------------------------------------------------------------------
// Per-session shot filtering (same pipeline as the global filter, but scoped
// to a single session — ported from renderStatsTable's inner filterShots())
// ---------------------------------------------------------------------------

interface SessionRowData {
  session: Session;
  shots: ShotWithContext[];
  scored: number;
  total: number;
  inPlayScored: number;
  inPlayTotal: number;
  deadBallScored: number;
  deadBallTotal: number;
  onePtScored: number;
  onePtTotal: number;
  twoPtScored: number;
  twoPtTotal: number;
  goalsScored: number;
  goalsTotal: number;
  shotTypeCounts: Record<string, { scored: number; total: number }>;
  missResultCounts: Record<string, number>;
  missReasonCounts: Record<string, number>;
  comments: string[];
  drillType: string;
}

function convCell(scored: number, total: number): string {
  if (total === 0) return '\u2014';
  return `${scored}/${total} (${Math.round((scored / total) * 100)}%)`;
}

function ptsPerShot(onePtScored: number, twoPtScored: number, goalsScored: number, total: number): string {
  if (total === 0) return '0.00';
  return ((onePtScored * 1 + twoPtScored * 2 + goalsScored * 3) / total).toFixed(2);
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: '2-digit' });
}

export default function StatsTable({ sessions, analyticsType }: StatsTableProps) {
  const multiSelectValues = useAnalyticsStore((s) => s.multiSelectValues);
  const uncheckedSessionIds = useAnalyticsStore((s) => s.uncheckedSessionIds);
  const toggleSessionChecked = useAnalyticsStore((s) => s.toggleSessionChecked);
  const setAllSessionsUnchecked = useAnalyticsStore((s) => s.setAllSessionsUnchecked);
  const clearUncheckedSessions = useAnalyticsStore((s) => s.clearUncheckedSessions);
  const customDrills = useDrillStore((s) => s.customDrills);

  const isMatch = analyticsType === 'match';

  // Apply per-session shot filtering (same multi-select pipeline)
  const filterSessionShots = useCallback(
    (session: Session): ShotWithContext[] => {
      let shots: ShotWithContext[] = (session.shots ?? []).map((s) => ({
        ...s,
        sessionId: session.id,
        sessionType: session.type,
        sessionDate: session.date,
        sessionName: session.name,
        matchType: session.matchType,
        windDirection: session.windDirection ?? null,
        windStrength: session.windStrength ?? null,
      }));

      // Apply same multi-select filters as the global pipeline
      function ms(filterId: string, accessor: (s: ShotWithContext) => string | null | undefined, allCount: number) {
        const vals = multiSelectValues[filterId];
        if (!vals || vals.length === 0 || vals.length === allCount) return;
        const set = new Set(vals);
        shots = shots.filter((s) => {
          const v = accessor(s);
          return v != null && set.has(v);
        });
      }

      if (isMatch) {
        ms(FILTER_IDS.MATCH_TYPE, (s) => s.matchType ?? undefined, 3); // base 3 default match types
      }

      if (!isMatch) {
        // Drill filter
        const drillVals = multiSelectValues[FILTER_IDS.DRILL];
        const drillCount = 2 + customDrills.length;
        if (drillVals && drillVals.length > 0 && drillVals.length < drillCount) {
          const vals = new Set(drillVals);
          shots = shots.filter((s) => {
            for (const v of vals) {
              if (v === 'free' && !s.drillKey) return true;
              if (v === 'scoring-zones' && s.drillKey?.startsWith('scoring-zones')) return true;
              if (v !== 'free' && v !== 'scoring-zones' && s.drillKey === v) return true;
            }
            return false;
          });
        }

        // Skillset filter
        const skillVals = multiSelectValues[FILTER_IDS.SKILLSET];
        if (skillVals && skillVals.length > 0 && skillVals.length < 7) {
          const vals = new Set(skillVals);
          shots = shots.filter((s) => {
            let skillset: string;
            if (!s.drillKey || s.drillKey.startsWith('scoring-zones')) {
              skillset = 'kicking-at-goal';
            } else if (s.drillKey.startsWith('custom-')) {
              const drill = customDrills.find((d) => 'custom-' + d.id === s.drillKey);
              skillset = drill?.skillset || 'kicking-at-goal';
            } else {
              skillset = 'kicking-at-goal';
            }
            return vals.has(skillset);
          });
        }
      }

      ms(FILTER_IDS.SHOT_CATEGORY, (s) => s.shotCategory, 3);
      ms(FILTER_IDS.SHOT_TYPE, (s) => s.shotType, 8);
      ms(FILTER_IDS.FOOT, (s) => s.foot, 2);
      ms(FILTER_IDS.RESULT, (s) => s.result, 2);
      ms(FILTER_IDS.HALF, (s) => s.half, 2);
      ms(FILTER_IDS.WIND_DIRECTION, (s) => s.windDirection, 9);
      ms(FILTER_IDS.WIND_STRENGTH, (s) => s.windStrength, 4);

      return shots;
    },
    [multiSelectValues, isMatch, customDrills]
  );

  // Build row data
  const { sessionRows, allShotTypes, allMissResults, allMissReasons } = useMemo(() => {
    const rows: SessionRowData[] = [];
    const shotTypes = new Set<string>();
    const missResults = new Set<string>();
    const missReasons = new Set<string>();

    sessions.forEach((session) => {
      const shots = filterSessionShots(session);
      if (shots.length === 0) return;

      const scored = shots.filter((s) => s.result === 'scored').length;
      const total = shots.length;
      const inPlay = shots.filter((s) => s.shotCategory === 'in-play');
      const deadBall = shots.filter((s) => s.shotCategory === 'free-kick' || s.shotCategory === '45');
      const onePt = shots.filter((s) => (s.pointValue === 1 || !s.pointValue) && s.shotFor !== 'goal');
      const twoPt = shots.filter((s) => s.pointValue === 2 && s.shotFor !== 'goal');
      const goals = shots.filter((s) => s.shotFor === 'goal');

      const shotTypeCounts: Record<string, { scored: number; total: number }> = {};
      const missResultCounts: Record<string, number> = {};
      const missReasonCounts: Record<string, number> = {};
      const comments: string[] = [];

      shots.forEach((s) => {
        const st = s.shotType || 'not-defined';
        shotTypes.add(st);
        if (!shotTypeCounts[st]) shotTypeCounts[st] = { scored: 0, total: 0 };
        shotTypeCounts[st].total++;
        if (s.result === 'scored') shotTypeCounts[st].scored++;

        if (s.result === 'missed') {
          if (s.missResult) {
            missResults.add(s.missResult);
            missResultCounts[s.missResult] = (missResultCounts[s.missResult] || 0) + 1;
          }
          if (s.missReason) {
            missReasons.add(s.missReason);
            missReasonCounts[s.missReason] = (missReasonCounts[s.missReason] || 0) + 1;
          }
        }
        if (s.comment) comments.push(s.comment);
      });

      let drillType = 'Free Practice';
      if (!isMatch) {
        const drillShots = shots.filter((s) => s.drillKey);
        if (drillShots.length > 0) {
          const key = drillShots[0].drillKey!;
          if (key.startsWith('scoring-zones')) drillType = 'Scoring Arc';
          else if (key.startsWith('custom-')) drillType = 'Custom Drill';
          else drillType = key;
        }
      }

      rows.push({
        session,
        shots,
        scored,
        total,
        inPlayScored: inPlay.filter((s) => s.result === 'scored').length,
        inPlayTotal: inPlay.length,
        deadBallScored: deadBall.filter((s) => s.result === 'scored').length,
        deadBallTotal: deadBall.length,
        onePtScored: onePt.filter((s) => s.result === 'scored').length,
        onePtTotal: onePt.length,
        twoPtScored: twoPt.filter((s) => s.result === 'scored').length,
        twoPtTotal: twoPt.length,
        goalsScored: goals.filter((s) => s.result === 'scored').length,
        goalsTotal: goals.length,
        shotTypeCounts,
        missResultCounts,
        missReasonCounts,
        comments,
        drillType,
      });
    });

    return {
      sessionRows: rows,
      allShotTypes: [...shotTypes].sort(),
      allMissResults: [...missResults].sort(),
      allMissReasons: [...missReasons].sort(),
    };
  }, [sessions, filterSessionShots, isMatch]);

  // Column visibility
  const showInPlay = sessionRows.some((r) => r.inPlayTotal > 0);
  const showPlaced = sessionRows.some((r) => r.deadBallTotal > 0);
  const showOnePt = sessionRows.some((r) => r.onePtTotal > 0);
  const showTwoPt = sessionRows.some((r) => r.twoPtTotal > 0);
  const showGoals = sessionRows.some((r) => r.goalsTotal > 0);
  const showComments = sessionRows.some((r) => r.comments.length > 0);

  // Checked rows for summary
  const checkedRows = sessionRows.filter(
    (r) => !uncheckedSessionIds.has(String(r.session.id))
  );

  // Select-all state
  const allChecked = uncheckedSessionIds.size === 0;
  const someChecked = checkedRows.length > 0 && checkedRows.length < sessionRows.length;

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        clearUncheckedSessions();
      } else {
        setAllSessionsUnchecked(sessionRows.map((r) => String(r.session.id)));
      }
    },
    [clearUncheckedSessions, setAllSessionsUnchecked, sessionRows]
  );

  if (sessionRows.length === 0) {
    return (
      <div className="bg-surface rounded-2xl p-4 shadow-sm">
        <h3 className="text-base font-semibold text-primary mb-3">
          {isMatch ? 'Match Breakdown' : 'Session Breakdown'}
        </h3>
        <p className="text-sm text-text-muted text-center py-4">
          No shots match the current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <h3 className="text-base font-semibold text-primary mb-3">
        {isMatch ? 'Match Breakdown' : 'Session Breakdown'}
      </h3>

      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full text-xs border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b border-grey">
              <Th>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = someChecked;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="accent-primary"
                />
              </Th>
              <Th>Date</Th>
              {isMatch ? (
                <>
                  <Th>Competition</Th>
                  <Th>Opponent</Th>
                </>
              ) : (
                <Th>Drill Type</Th>
              )}
              <Th>Conv.</Th>
              <Th title="Points Per Shot: (1xPts + 2x2Pts + 3xGoals) / Total Shots">Pts/Shot</Th>
              {showInPlay && <Th>In-Play</Th>}
              {showPlaced && <Th>Placed</Th>}
              {showOnePt && <Th>1 Pt</Th>}
              {showTwoPt && <Th>2 Pt</Th>}
              {showGoals && <Th>Goal</Th>}
              {allShotTypes.map((st) => (
                <Th key={st}>{SHOT_TYPE_LABELS[st] || st}</Th>
              ))}
              {allMissResults.map((mr) => (
                <Th key={mr}>{MISS_RESULT_LABELS[mr] || mr}</Th>
              ))}
              {allMissReasons.map((mr) => (
                <Th key={mr}>{MISS_REASON_LABELS[mr] || mr}</Th>
              ))}
              {showComments && <Th>Comments</Th>}
            </tr>
          </thead>
          <tbody>
            {sessionRows.map((row) => {
              const sid = String(row.session.id);
              const checked = !uncheckedSessionIds.has(sid);
              return (
                <tr
                  key={sid}
                  className={`border-b border-grey-light ${
                    !checked ? 'opacity-40' : ''
                  }`}
                >
                  <Td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSessionChecked(sid)}
                      className="accent-primary"
                    />
                  </Td>
                  <Td>{formatDate(row.session.date)}</Td>
                  {isMatch ? (
                    <>
                      <Td>
                        {row.session.matchType
                          ? row.session.matchType.charAt(0).toUpperCase() + row.session.matchType.slice(1)
                          : '\u2014'}
                      </Td>
                      <Td>{row.session.name || '\u2014'}</Td>
                    </>
                  ) : (
                    <Td>{row.drillType}</Td>
                  )}
                  <Td>{convCell(row.scored, row.total)}</Td>
                  <Td>{ptsPerShot(row.onePtScored, row.twoPtScored, row.goalsScored, row.total)}</Td>
                  {showInPlay && <Td>{convCell(row.inPlayScored, row.inPlayTotal)}</Td>}
                  {showPlaced && <Td>{convCell(row.deadBallScored, row.deadBallTotal)}</Td>}
                  {showOnePt && <Td>{convCell(row.onePtScored, row.onePtTotal)}</Td>}
                  {showTwoPt && <Td>{convCell(row.twoPtScored, row.twoPtTotal)}</Td>}
                  {showGoals && <Td>{convCell(row.goalsScored, row.goalsTotal)}</Td>}
                  {allShotTypes.map((st) => {
                    const c = row.shotTypeCounts[st];
                    return <Td key={st}>{c ? convCell(c.scored, c.total) : '\u2014'}</Td>;
                  })}
                  {allMissResults.map((mr) => (
                    <Td key={mr}>{row.missResultCounts[mr] || '\u2014'}</Td>
                  ))}
                  {allMissReasons.map((mr) => (
                    <Td key={mr}>{row.missReasonCounts[mr] || '\u2014'}</Td>
                  ))}
                  {showComments && (
                    <Td className="max-w-[150px] truncate">
                      {row.comments.length > 0 ? row.comments.join('; ') : '\u2014'}
                    </Td>
                  )}
                </tr>
              );
            })}

            {/* Summary row (only if 2+ checked sessions) */}
            {checkedRows.length >= 2 && (
              <tr className="border-t-2 border-primary font-semibold bg-grey-light">
                <Td />
                <Td>Totals</Td>
                {isMatch ? (
                  <>
                    <Td />
                    <Td />
                  </>
                ) : (
                  <Td />
                )}
                <Td>{convCell(sum(checkedRows, 'scored'), sum(checkedRows, 'total'))}</Td>
                <Td>
                  {ptsPerShot(
                    sum(checkedRows, 'onePtScored'),
                    sum(checkedRows, 'twoPtScored'),
                    sum(checkedRows, 'goalsScored'),
                    sum(checkedRows, 'total')
                  )}
                </Td>
                {showInPlay && (
                  <Td>{convCell(sum(checkedRows, 'inPlayScored'), sum(checkedRows, 'inPlayTotal'))}</Td>
                )}
                {showPlaced && (
                  <Td>{convCell(sum(checkedRows, 'deadBallScored'), sum(checkedRows, 'deadBallTotal'))}</Td>
                )}
                {showOnePt && (
                  <Td>{convCell(sum(checkedRows, 'onePtScored'), sum(checkedRows, 'onePtTotal'))}</Td>
                )}
                {showTwoPt && (
                  <Td>{convCell(sum(checkedRows, 'twoPtScored'), sum(checkedRows, 'twoPtTotal'))}</Td>
                )}
                {showGoals && (
                  <Td>{convCell(sum(checkedRows, 'goalsScored'), sum(checkedRows, 'goalsTotal'))}</Td>
                )}
                {allShotTypes.map((st) => {
                  const s = checkedRows.reduce((a, r) => a + (r.shotTypeCounts[st]?.scored ?? 0), 0);
                  const t = checkedRows.reduce((a, r) => a + (r.shotTypeCounts[st]?.total ?? 0), 0);
                  return <Td key={st}>{t > 0 ? convCell(s, t) : '\u2014'}</Td>;
                })}
                {allMissResults.map((mr) => {
                  const count = checkedRows.reduce((a, r) => a + (r.missResultCounts[mr] || 0), 0);
                  return <Td key={mr}>{count || '\u2014'}</Td>;
                })}
                {allMissReasons.map((mr) => {
                  const count = checkedRows.reduce((a, r) => a + (r.missReasonCounts[mr] || 0), 0);
                  return <Td key={mr}>{count || '\u2014'}</Td>;
                })}
                {showComments && <Td />}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tiny cell helpers
// ---------------------------------------------------------------------------

function Th({ children, title, className }: { children?: React.ReactNode; title?: string; className?: string }) {
  return (
    <th
      title={title}
      className={`px-2 py-2 text-left text-text-muted font-medium whitespace-nowrap ${className ?? ''}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={`px-2 py-2 whitespace-nowrap ${className ?? ''}`}>{children}</td>
  );
}

function sum(rows: SessionRowData[], key: keyof SessionRowData): number {
  return rows.reduce((a, r) => a + (r[key] as number), 0);
}

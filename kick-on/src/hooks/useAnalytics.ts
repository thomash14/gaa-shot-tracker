'use client';

import { useMemo } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useAnalyticsStore } from '@/store/analyticsStore';
import { useDrillStore } from '@/store/drillStore';
import type { Session, ShotWithContext } from '@/types';
import {
  FILTER_IDS,
  type FilterOption,
  shotCategoryOptions,
  shotTypeOptions,
  footOptions,
  halfOptions,
  resultOptions,
  windDirectionOptions,
  windStrengthOptions,
  defaultMatchTypeOptions,
  defaultDrillOptions,
  skillsetOptions,
} from '@/lib/filterOptions';

// ---------------------------------------------------------------------------
// Date range helpers
// ---------------------------------------------------------------------------

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  sessionLimit?: number;
}

function getDateRange(
  preset: string,
  dateFrom: string | null,
  dateTo: string | null,
  sessionCount: number
): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let startDate: Date | null = null;
  let endDate: Date | null = new Date();
  endDate.setHours(23, 59, 59, 999);

  if (preset === 'customSessions') {
    return { startDate: null, endDate: null, sessionLimit: sessionCount };
  }

  switch (preset) {
    case 'all':
      return { startDate: null, endDate: null };
    case 'today':
      startDate = new Date(today);
      break;
    case 'last7':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      break;
    case 'last30':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 29);
      break;
    case 'thisMonth':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      break;
    case 'lastMonth':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'thisYear':
      startDate = new Date(today.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (dateFrom) {
        startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
      }
      if (dateTo) {
        endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
      }
      break;
  }

  return { startDate, endDate };
}

/** Parse a YYYY-MM-DD string to a local Date, avoiding timezone bugs. */
function parseSessionDate(dateStr: string): Date {
  const parts = dateStr.split('-');
  return new Date(
    parseInt(parts[0]),
    parseInt(parts[1]) - 1,
    parseInt(parts[2]),
    12, 0, 0, 0
  );
}

// ---------------------------------------------------------------------------
// Multi-select filter helper
// ---------------------------------------------------------------------------

/**
 * Filter shots by a multi-select: if all options are selected (or the filter
 * hasn't been touched), pass through. Otherwise keep only shots whose
 * accessor value is in the selected set.
 *
 * This implements the "OR within same filter, AND between different filters"
 * pattern from the original multiselect.js.
 */
function msFilter(
  shots: ShotWithContext[],
  selectedValues: string[] | undefined,
  allOptionCount: number,
  accessor: (shot: ShotWithContext) => string | null | undefined
): ShotWithContext[] {
  // Not set or all selected → pass-through (no filter)
  if (!selectedValues || selectedValues.length === 0 || selectedValues.length === allOptionCount) {
    return shots;
  }
  const vals = new Set(selectedValues);
  return shots.filter((s) => {
    const v = accessor(s);
    return v != null && vals.has(v);
  });
}

// ---------------------------------------------------------------------------
// Stable option value arrays (avoid re-creating in useMemo)
// ---------------------------------------------------------------------------

const SHOT_CAT_VALUES = shotCategoryOptions().map((o) => o.value);
const SHOT_TYPE_VALUES = shotTypeOptions().map((o) => o.value);
const FOOT_VALUES = footOptions().map((o) => o.value);
const HALF_VALUES = halfOptions().map((o) => o.value);
const RESULT_VALUES = resultOptions().map((o) => o.value);
const WIND_DIR_VALUES = windDirectionOptions().map((o) => o.value);
const WIND_STR_VALUES = windStrengthOptions().map((o) => o.value);
const SKILLSET_VALUES = skillsetOptions().map((o) => o.value);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// Stable empty array to avoid unnecessary re-renders when using overrideSessions
const EMPTY_SESSIONS: Session[] = [];

/**
 * @param overrideSessions – When provided, uses these sessions instead of the
 *   global session store. Used by the coach's PlayerDataModal to avoid
 *   injecting player data into the shared store (which would trigger
 *   auto-sync side-effects and interfere with checkbox state).
 */
export function useAnalytics(overrideSessions?: Session[]) {
  // When overrideSessions is provided, return a stable empty array from the
  // store selector so changes to the global session store don't cause
  // unnecessary re-renders in the coach modal.
  const storeSessions = useSessionStore(
    overrideSessions ? () => EMPTY_SESSIONS : (s) => s.sessions,
  );
  const sessions = overrideSessions ?? storeSessions;

  const analyticsType = useAnalyticsStore((s) => s.analyticsType);
  const dateRangePreset = useAnalyticsStore((s) => s.dateRangePreset);
  const dateFrom = useAnalyticsStore((s) => s.dateFrom);
  const dateTo = useAnalyticsStore((s) => s.dateTo);
  const sessionCount = useAnalyticsStore((s) => s.sessionCount);
  const multiSelectValues = useAnalyticsStore((s) => s.multiSelectValues);
  const uncheckedSessionIds = useAnalyticsStore((s) => s.uncheckedSessionIds);
  const trendsViewActive = useAnalyticsStore((s) => s.trendsViewActive);
  const selectedTrendsDrillKey = useAnalyticsStore((s) => s.selectedTrendsDrillKey);

  const customDrills = useDrillStore((s) => s.customDrills);

  // 1. Filter sessions by type (match / practice)
  const typedSessions = useMemo(
    () => sessions.filter((s) => s.type === analyticsType),
    [sessions, analyticsType]
  );

  // 2. Apply date range / session limit
  const filteredSessions = useMemo(() => {
    const { startDate, endDate, sessionLimit } = getDateRange(
      dateRangePreset,
      dateFrom,
      dateTo,
      sessionCount
    );

    if (sessionLimit) {
      return typedSessions.slice(0, sessionLimit);
    }
    if (!startDate && !endDate) return typedSessions;

    return typedSessions.filter((s) => {
      const sessionDate = parseSessionDate(s.date);
      if (startDate && sessionDate < startDate) return false;
      if (endDate && sessionDate > endDate) return false;
      return true;
    });
  }, [typedSessions, dateRangePreset, dateFrom, dateTo, sessionCount]);

  // 3. Dynamic match type options (includes custom types from data)
  const matchTypeOptions = useMemo((): FilterOption[] => {
    if (analyticsType !== 'match') return [];
    const customTypes = [
      ...new Set(
        filteredSessions
          .map((s) => s.matchType as string | null)
          .filter(
            (t): t is string =>
              !!t && !['league', 'championship', 'challenge'].includes(t)
          )
      ),
    ];
    return [
      ...defaultMatchTypeOptions(),
      ...customTypes.map((t) => ({ value: t, label: t })),
    ];
  }, [filteredSessions, analyticsType]);

  // 4. Dynamic drill options (includes custom drills)
  const drillOptions = useMemo((): FilterOption[] => {
    if (analyticsType !== 'practice') return [];
    const opts: FilterOption[] = [...defaultDrillOptions()];
    customDrills.forEach((d) => {
      opts.push({ value: 'custom-' + d.id, label: d.name });
    });
    return opts;
  }, [customDrills, analyticsType]);

  // 5. Enrich shots with session context + apply full filter pipeline
  const allShots = useMemo(() => {
    let shots: ShotWithContext[] = filteredSessions.flatMap((session) =>
      (session.shots ?? []).map((shot) => ({
        ...shot,
        sessionId: session.id,
        sessionType: session.type,
        sessionDate: session.date,
        sessionName: session.name,
        matchType: session.matchType,
        windDirection: session.windDirection ?? null,
        windStrength: session.windStrength ?? null,
      }))
    );

    // --- Match-only filters ---
    if (analyticsType === 'match') {
      shots = msFilter(
        shots,
        multiSelectValues[FILTER_IDS.MATCH_TYPE],
        matchTypeOptions.length,
        (s) => s.matchType ?? undefined
      );
    }

    // --- Practice-only filters ---
    if (analyticsType === 'practice') {
      // Drill filter (special logic — not a simple accessor)
      const drillVals = multiSelectValues[FILTER_IDS.DRILL];
      if (drillVals && drillVals.length > 0 && drillVals.length < drillOptions.length) {
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

      // Skillset filter (special logic — derives skillset from drillKey)
      const skillVals = multiSelectValues[FILTER_IDS.SKILLSET];
      if (skillVals && skillVals.length > 0 && skillVals.length < SKILLSET_VALUES.length) {
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

    // --- Generic multi-select filters (both match and practice) ---
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.SHOT_CATEGORY], SHOT_CAT_VALUES.length, (s) => s.shotCategory);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.SHOT_TYPE], SHOT_TYPE_VALUES.length, (s) => s.shotType);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.FOOT], FOOT_VALUES.length, (s) => s.foot);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.RESULT], RESULT_VALUES.length, (s) => s.result);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.HALF], HALF_VALUES.length, (s) => s.half);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.WIND_DIRECTION], WIND_DIR_VALUES.length, (s) => s.windDirection);
    shots = msFilter(shots, multiSelectValues[FILTER_IDS.WIND_STRENGTH], WIND_STR_VALUES.length, (s) => s.windStrength);

    return shots;
  }, [filteredSessions, analyticsType, multiSelectValues, matchTypeOptions, drillOptions, customDrills]);

  // 6. Apply row-level checkbox exclusion (for stats table checkboxes).
  //    Row keys match StatsTable format: "sid-drill-N" for drill rows,
  //    "sid-unassigned" for unassigned shots in multi-drill sessions,
  //    "sid" for single-session rows (matches, non-drill practice).
  const sessionsWithDrills = useMemo(() => {
    if (analyticsType !== 'practice') return new Set<string>();
    const set = new Set<string>();
    for (const s of filteredSessions) {
      if (s.drills && s.drills.length > 0) set.add(String(s.id));
    }
    return set;
  }, [filteredSessions, analyticsType]);

  const checkedShots = useMemo(() => {
    if (uncheckedSessionIds.size === 0) return allShots;
    return allShots.filter((s) => {
      const sid = String(s.sessionId);
      let rowKey: string;
      if (sessionsWithDrills.has(sid) && s.drillId != null) {
        rowKey = `${sid}-drill-${s.drillId}`;
      } else if (sessionsWithDrills.has(sid)) {
        rowKey = `${sid}-unassigned`;
      } else {
        rowKey = sid;
      }
      return !uncheckedSessionIds.has(rowKey);
    });
  }, [allShots, uncheckedSessionIds, sessionsWithDrills]);

  const checkedSessionCount = useMemo(() => {
    if (uncheckedSessionIds.size === 0) return filteredSessions.length;
    // A session counts if at least one of its shots is checked
    const checkedSessionIdSet = new Set(checkedShots.map((s) => String(s.sessionId)));
    return filteredSessions.filter((s) => checkedSessionIdSet.has(String(s.id))).length;
  }, [filteredSessions, uncheckedSessionIds, checkedShots]);

  return {
    analyticsType,
    filteredSessions,
    allShots,
    checkedShots,
    checkedSessionCount,
    matchTypeOptions,
    drillOptions,
    trendsViewActive,
    selectedTrendsDrillKey,
  };
}

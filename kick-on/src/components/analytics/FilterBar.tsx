'use client';

import { useAnalyticsStore, type DateRangePreset } from '@/store/analyticsStore';
import MultiSelect from './MultiSelect';
import {
  FILTER_IDS,
  shotCategoryOptions,
  shotTypeOptions,
  footOptions,
  halfOptions,
  resultOptions,
  skillsetOptions,
  windDirectionOptions,
  windStrengthOptions,
  type FilterOption,
} from '@/lib/filterOptions';

/**
 * Analytics filter bar — date range, match/practice type toggle, and all
 * multi-select dropdowns. Ported from the analytics filter UI in index.html.
 */

interface FilterBarProps {
  matchTypeOptions: FilterOption[];
  drillOptions: FilterOption[];
}

const DATE_RANGE_OPTIONS: { value: DateRangePreset; label: string; matchLabel?: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 Days' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Date Range...' },
  { value: 'customSessions', label: 'Custom Practice Range...', matchLabel: 'Custom Game Range...' },
];

export default function FilterBar({ matchTypeOptions, drillOptions }: FilterBarProps) {
  const {
    analyticsType,
    dateRangePreset,
    dateFrom,
    dateTo,
    sessionCount,
    multiSelectValues,
    setAnalyticsType,
    setDateRangePreset,
    setDateFrom,
    setDateTo,
    setSessionCount,
    setMultiSelectValues,
  } = useAnalyticsStore();

  const isMatch = analyticsType === 'match';

  function msValue(filterId: string, allOptions: FilterOption[]): string[] {
    const vals = multiSelectValues[filterId];
    // If not set, treat as all-selected
    if (!vals || vals.length === 0) return allOptions.map((o) => o.value);
    return vals;
  }

  return (
    <div className="space-y-3">
      {/* Type toggle */}
      <div className="flex gap-1 bg-grey-light rounded-lg p-1">
        <button
          onClick={() => setAnalyticsType('practice')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${
            !isMatch ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Practice
        </button>
        <button
          onClick={() => setAnalyticsType('match')}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-colors ${
            isMatch ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Match
        </button>
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-text-muted font-medium">
          {isMatch ? 'Date/Game Range:' : 'Date/Practice Range:'}
        </label>
        <select
          value={dateRangePreset}
          onChange={(e) => setDateRangePreset(e.target.value as DateRangePreset)}
          className="bg-surface border border-grey rounded-lg px-3 py-1.5 text-xs text-text"
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {isMatch && opt.matchLabel ? opt.matchLabel : opt.label}
            </option>
          ))}
        </select>

        {/* Custom date inputs */}
        {dateRangePreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom ?? ''}
              onChange={(e) => setDateFrom(e.target.value || null)}
              className="bg-surface border border-grey rounded-lg px-2 py-1 text-xs"
            />
            <span className="text-xs text-text-muted">to</span>
            <input
              type="date"
              value={dateTo ?? ''}
              onChange={(e) => setDateTo(e.target.value || null)}
              className="bg-surface border border-grey rounded-lg px-2 py-1 text-xs"
            />
          </div>
        )}

        {/* Custom session count */}
        {dateRangePreset === 'customSessions' && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">
              {isMatch ? 'Games:' : 'Practices:'}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={sessionCount}
              onChange={(e) => setSessionCount(parseInt(e.target.value) || 5)}
              className="bg-surface border border-grey rounded-lg px-2 py-1 text-xs w-16"
            />
          </div>
        )}
      </div>

      {/* Multi-select filters */}
      <div className="flex flex-wrap gap-2">
        {/* Match type (match only) */}
        {isMatch && matchTypeOptions.length > 0 && (
          <MultiSelect
            label="Competition"
            options={matchTypeOptions}
            selected={msValue(FILTER_IDS.MATCH_TYPE, matchTypeOptions)}
            onChange={(vals) => setMultiSelectValues(FILTER_IDS.MATCH_TYPE, vals)}
          />
        )}

        {/* Drill filter (practice only) */}
        {!isMatch && drillOptions.length > 0 && (
          <MultiSelect
            label="Drill"
            options={drillOptions}
            selected={msValue(FILTER_IDS.DRILL, drillOptions)}
            onChange={(vals) => setMultiSelectValues(FILTER_IDS.DRILL, vals)}
          />
        )}

        {/* Skillset filter (practice only) */}
        {!isMatch && (
          <MultiSelect
            label="Skillset"
            options={skillsetOptions()}
            selected={msValue(FILTER_IDS.SKILLSET, skillsetOptions())}
            onChange={(vals) => setMultiSelectValues(FILTER_IDS.SKILLSET, vals)}
          />
        )}

        <MultiSelect
          label="Category"
          options={shotCategoryOptions()}
          selected={msValue(FILTER_IDS.SHOT_CATEGORY, shotCategoryOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.SHOT_CATEGORY, vals)}
        />

        <MultiSelect
          label="Shot Type"
          options={shotTypeOptions()}
          selected={msValue(FILTER_IDS.SHOT_TYPE, shotTypeOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.SHOT_TYPE, vals)}
        />

        <MultiSelect
          label="Foot"
          options={footOptions()}
          selected={msValue(FILTER_IDS.FOOT, footOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.FOOT, vals)}
        />

        <MultiSelect
          label="Result"
          options={resultOptions()}
          selected={msValue(FILTER_IDS.RESULT, resultOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.RESULT, vals)}
        />

        {/* Half filter (match only) */}
        {isMatch && (
          <MultiSelect
            label="Half"
            options={halfOptions()}
            selected={msValue(FILTER_IDS.HALF, halfOptions())}
            onChange={(vals) => setMultiSelectValues(FILTER_IDS.HALF, vals)}
          />
        )}

        <MultiSelect
          label="Wind Dir."
          options={windDirectionOptions()}
          selected={msValue(FILTER_IDS.WIND_DIRECTION, windDirectionOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.WIND_DIRECTION, vals)}
        />

        <MultiSelect
          label="Wind Str."
          options={windStrengthOptions()}
          selected={msValue(FILTER_IDS.WIND_STRENGTH, windStrengthOptions())}
          onChange={(vals) => setMultiSelectValues(FILTER_IDS.WIND_STRENGTH, vals)}
        />
      </div>
    </div>
  );
}

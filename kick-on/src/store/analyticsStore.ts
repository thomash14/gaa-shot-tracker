import { create } from 'zustand';

export type AnalyticsType = 'match' | 'practice';
export type DateRangePreset =
  | 'all'
  | 'today'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'custom'
  | 'customSessions';

interface AnalyticsState {
  analyticsType: AnalyticsType;
  dateRangePreset: DateRangePreset;
  dateFrom: string | null;
  dateTo: string | null;
  sessionCount: number;
  showZoneOverlay: boolean;
  multiSelectValues: Record<string, string[]>;
  uncheckedSessionIds: Set<string>;
  trendsViewActive: boolean;
  selectedTrendsDrillKey: string | null;

  // Actions
  setAnalyticsType: (type: AnalyticsType) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setSessionCount: (count: number) => void;
  setShowZoneOverlay: (show: boolean) => void;
  setMultiSelectValues: (filterId: string, values: string[]) => void;
  clearUncheckedSessions: () => void;
  toggleSessionChecked: (id: string) => void;
  setAllSessionsUnchecked: (ids: string[]) => void;
  setTrendsViewActive: (active: boolean) => void;
  setSelectedTrendsDrillKey: (key: string | null) => void;
  resetFilters: () => void;
}

const initialState = {
  analyticsType: 'match' as AnalyticsType,
  dateRangePreset: 'all' as DateRangePreset,
  dateFrom: null as string | null,
  dateTo: null as string | null,
  sessionCount: 5,
  showZoneOverlay: false,
  multiSelectValues: {} as Record<string, string[]>,
  uncheckedSessionIds: new Set<string>(),
  trendsViewActive: false,
  selectedTrendsDrillKey: null as string | null,
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  ...initialState,

  setAnalyticsType: (type) =>
    set({
      analyticsType: type,
      multiSelectValues: {},
      uncheckedSessionIds: new Set(),
      trendsViewActive: false,
      selectedTrendsDrillKey: null,
    }),

  setDateRangePreset: (preset) =>
    set({ dateRangePreset: preset, uncheckedSessionIds: new Set() }),

  setDateFrom: (date) =>
    set({ dateFrom: date, uncheckedSessionIds: new Set() }),

  setDateTo: (date) =>
    set({ dateTo: date, uncheckedSessionIds: new Set() }),

  setSessionCount: (count) =>
    set({ sessionCount: count, uncheckedSessionIds: new Set() }),

  setShowZoneOverlay: (show) => set({ showZoneOverlay: show }),

  setMultiSelectValues: (filterId, values) =>
    set((state) => ({
      multiSelectValues: { ...state.multiSelectValues, [filterId]: values },
      uncheckedSessionIds: new Set(),
    })),

  clearUncheckedSessions: () => set({ uncheckedSessionIds: new Set() }),

  toggleSessionChecked: (id) =>
    set((state) => {
      const next = new Set(state.uncheckedSessionIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { uncheckedSessionIds: next };
    }),

  setAllSessionsUnchecked: (ids) =>
    set({ uncheckedSessionIds: new Set(ids) }),

  setTrendsViewActive: (active) => set({ trendsViewActive: active }),

  setSelectedTrendsDrillKey: (key) =>
    set({ selectedTrendsDrillKey: key }),

  resetFilters: () => set({ ...initialState, uncheckedSessionIds: new Set() }),
}));

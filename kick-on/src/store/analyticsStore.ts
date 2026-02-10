import { create } from 'zustand';

type AnalyticsType = 'match' | 'practice';
type DateRangePreset = 'all' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'custom' | 'sessions';

interface MultiSelectValues {
  [containerId: string]: string[];
}

interface AnalyticsState {
  analyticsType: AnalyticsType;
  dateRangePreset: DateRangePreset;
  dateFrom: string | null;
  dateTo: string | null;
  sessionCount: number;
  showZoneOverlay: boolean;
  multiSelectValues: MultiSelectValues;
  checkedSessionIds: Set<string | number>;
  trendsViewActive: boolean;
  selectedTrendsDrillKey: string | null;

  // Actions
  setAnalyticsType: (type: AnalyticsType) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setDateFrom: (date: string | null) => void;
  setDateTo: (date: string | null) => void;
  setSessionCount: (count: number) => void;
  setShowZoneOverlay: (show: boolean) => void;
  setMultiSelectValues: (containerId: string, values: string[]) => void;
  setCheckedSessionIds: (ids: Set<string | number>) => void;
  toggleSessionId: (id: string | number) => void;
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
  multiSelectValues: {} as MultiSelectValues,
  checkedSessionIds: new Set<string | number>(),
  trendsViewActive: false,
  selectedTrendsDrillKey: null as string | null,
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  ...initialState,

  setAnalyticsType: (type) => set({ analyticsType: type }),
  setDateRangePreset: (preset) => set({ dateRangePreset: preset }),
  setDateFrom: (date) => set({ dateFrom: date }),
  setDateTo: (date) => set({ dateTo: date }),
  setSessionCount: (count) => set({ sessionCount: count }),
  setShowZoneOverlay: (show) => set({ showZoneOverlay: show }),
  setMultiSelectValues: (containerId, values) =>
    set((state) => ({
      multiSelectValues: { ...state.multiSelectValues, [containerId]: values },
    })),
  setCheckedSessionIds: (ids) => set({ checkedSessionIds: ids }),
  toggleSessionId: (id) =>
    set((state) => {
      const next = new Set(state.checkedSessionIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { checkedSessionIds: next };
    }),
  setTrendsViewActive: (active) => set({ trendsViewActive: active }),
  setSelectedTrendsDrillKey: (key) => set({ selectedTrendsDrillKey: key }),
  resetFilters: () => set(initialState),
}));

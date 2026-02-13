import { create } from 'zustand';
import type { Sport } from '@/types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface UiState {
  loading: boolean;
  loadingText: string;
  offlineMode: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  calendarMonth: number;
  calendarYear: number;
  calendarSelectedDate: string | null;
  calendarView: 'monthly' | 'weekly';
  activeSport: Sport;

  // Actions
  setLoading: (loading: boolean, text?: string) => void;
  setOfflineMode: (offline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setPendingSyncCount: (count: number) => void;
  setCalendarMonth: (month: number) => void;
  setCalendarYear: (year: number) => void;
  setCalendarSelectedDate: (date: string | null) => void;
  setCalendarView: (view: 'monthly' | 'weekly') => void;
  setActiveSport: (sport: Sport) => void;
}

const now = new Date();

export const useUiStore = create<UiState>((set) => ({
  loading: false,
  loadingText: 'Loading...',
  offlineMode: false,
  syncStatus: 'idle',
  pendingSyncCount: 0,
  calendarMonth: now.getMonth(),
  calendarYear: now.getFullYear(),
  calendarSelectedDate: null,
  calendarView: 'monthly',
  activeSport: 'football',

  setLoading: (loading, text) =>
    set({ loading, loadingText: text ?? 'Loading...' }),
  setOfflineMode: (offline) => set({ offlineMode: offline }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setPendingSyncCount: (count) => set({ pendingSyncCount: count }),
  setCalendarMonth: (month) => set({ calendarMonth: month }),
  setCalendarYear: (year) => set({ calendarYear: year }),
  setCalendarSelectedDate: (date) => set({ calendarSelectedDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),
  setActiveSport: (sport) => set({ activeSport: sport }),
}));

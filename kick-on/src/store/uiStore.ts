import { create } from 'zustand';
import type { Sport } from '@/types';

interface UiState {
  loading: boolean;
  loadingText: string;
  offlineMode: boolean;
  calendarMonth: number;
  calendarYear: number;
  calendarSelectedDate: string | null;
  calendarView: 'monthly' | 'weekly';
  activeSport: Sport;

  // Actions
  setLoading: (loading: boolean, text?: string) => void;
  setOfflineMode: (offline: boolean) => void;
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
  calendarMonth: now.getMonth(),
  calendarYear: now.getFullYear(),
  calendarSelectedDate: null,
  calendarView: 'monthly',
  activeSport: 'football',

  setLoading: (loading, text) =>
    set({ loading, loadingText: text ?? 'Loading...' }),
  setOfflineMode: (offline) => set({ offlineMode: offline }),
  setCalendarMonth: (month) => set({ calendarMonth: month }),
  setCalendarYear: (year) => set({ calendarYear: year }),
  setCalendarSelectedDate: (date) => set({ calendarSelectedDate: date }),
  setCalendarView: (view) => set({ calendarView: view }),
  setActiveSport: (sport) => set({ activeSport: sport }),
}));

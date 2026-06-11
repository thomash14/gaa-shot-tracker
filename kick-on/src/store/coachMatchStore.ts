import { create } from 'zustand';
import type { CoachMatch } from '@/types';

interface CoachMatchState {
  coachMatches: CoachMatch[];
  coachMatchesLoaded: boolean;

  setCoachMatches: (matches: CoachMatch[]) => void;
  setCoachMatchesLoaded: (value: boolean) => void;
  upsertCoachMatch: (match: CoachMatch) => void;
  removeCoachMatch: (id: string) => void;
  clearCoachMatches: () => void;
}

export const useCoachMatchStore = create<CoachMatchState>((set) => ({
  coachMatches: [],
  coachMatchesLoaded: false,

  setCoachMatches: (matches) => set({ coachMatches: matches }),
  setCoachMatchesLoaded: (value) => set({ coachMatchesLoaded: value }),

  upsertCoachMatch: (match) =>
    set((state) => {
      const exists = state.coachMatches.some((m) => m.id === match.id);
      const coachMatches = exists
        ? state.coachMatches.map((m) => (m.id === match.id ? match : m))
        : [match, ...state.coachMatches];
      return { coachMatches };
    }),

  removeCoachMatch: (id) =>
    set((state) => ({
      coachMatches: state.coachMatches.filter((m) => m.id !== id),
    })),

  clearCoachMatches: () =>
    set({ coachMatches: [], coachMatchesLoaded: false }),
}));

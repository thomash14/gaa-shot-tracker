import { create } from 'zustand';
import type { Shot } from '@/types';

type TrackingMode = 'single' | 'batch';
type ShotFor = 'point' | 'goal';

interface TrackingState {
  // Shot placement
  pendingShot: Partial<Shot> | null;
  editingShot: Shot | null;
  shotCount: number;

  // Tracking controls
  trackingMode: TrackingMode;
  kickingFoot: 'left' | 'right';
  shotCategory: string;
  shotType: string;
  shotFor: ShotFor;
  matchHalf: '1st' | '2nd' | null;

  // Actions
  setPendingShot: (shot: Partial<Shot> | null) => void;
  setEditingShot: (shot: Shot | null) => void;
  incrementShotCount: () => void;
  resetShotCount: () => void;
  setTrackingMode: (mode: TrackingMode) => void;
  setKickingFoot: (foot: 'left' | 'right') => void;
  setShotCategory: (category: string) => void;
  setShotType: (type: string) => void;
  setShotFor: (shotFor: ShotFor) => void;
  setMatchHalf: (half: '1st' | '2nd' | null) => void;
  resetTracking: () => void;
}

const initialState = {
  pendingShot: null,
  editingShot: null,
  shotCount: 0,
  trackingMode: 'single' as TrackingMode,
  kickingFoot: 'right' as const,
  shotCategory: 'in-play',
  shotType: 'standing',
  shotFor: 'point' as ShotFor,
  matchHalf: null as '1st' | '2nd' | null,
};

export const useTrackingStore = create<TrackingState>((set) => ({
  ...initialState,

  setPendingShot: (shot) => set({ pendingShot: shot }),
  setEditingShot: (shot) => set({ editingShot: shot }),
  incrementShotCount: () =>
    set((state) => ({ shotCount: state.shotCount + 1 })),
  resetShotCount: () => set({ shotCount: 0 }),
  setTrackingMode: (mode) => set({ trackingMode: mode }),
  setKickingFoot: (foot) => set({ kickingFoot: foot }),
  setShotCategory: (category) => set({ shotCategory: category }),
  setShotType: (type) => set({ shotType: type }),
  setShotFor: (shotFor) => set({ shotFor }),
  setMatchHalf: (half) => set({ matchHalf: half }),
  resetTracking: () => set(initialState),
}));

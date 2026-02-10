import { create } from 'zustand';
import type { Session, TrainingLog } from '@/types';

interface SessionState {
  sessions: Session[];
  currentSession: Session | null;
  viewingPastSession: boolean;
  trainingLogs: TrainingLog[];

  // Actions
  setSessions: (sessions: Session[]) => void;
  addSession: (session: Session) => void;
  updateSession: (id: string | number, updates: Partial<Session>) => void;
  removeSession: (id: string | number) => void;
  setCurrentSession: (session: Session | null) => void;
  setViewingPastSession: (viewing: boolean) => void;
  setTrainingLogs: (logs: TrainingLog[]) => void;
  addTrainingLog: (log: TrainingLog) => void;
  removeTrainingLog: (id: string | number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  currentSession: null,
  viewingPastSession: false,
  trainingLogs: [],

  setSessions: (sessions) => set({ sessions }),

  addSession: (session) =>
    set((state) => ({ sessions: [...state.sessions, session] })),

  updateSession: (id, updates) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      // Also update currentSession if it matches
      currentSession:
        state.currentSession?.id === id
          ? { ...state.currentSession, ...updates }
          : state.currentSession,
    })),

  removeSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSession:
        state.currentSession?.id === id ? null : state.currentSession,
    })),

  setCurrentSession: (session) => set({ currentSession: session }),

  setViewingPastSession: (viewing) => set({ viewingPastSession: viewing }),

  setTrainingLogs: (logs) => set({ trainingLogs: logs }),

  addTrainingLog: (log) =>
    set((state) => ({ trainingLogs: [...state.trainingLogs, log] })),

  removeTrainingLog: (id) =>
    set((state) => ({
      trainingLogs: state.trainingLogs.filter((l) => l.id !== id),
    })),
}));

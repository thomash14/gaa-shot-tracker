import { create } from 'zustand';
import type { Team, TeamMembership, TeamMember, TeamDrill, DrillCompletion, TeamEvent } from '@/types';

interface TeamState {
  currentTeam: Team | null;
  currentMembership: TeamMembership | null;
  hasPlayerMembership: boolean;
  teamDataLoaded: boolean;
  teamMembers: TeamMember[];
  teamDrills: TeamDrill[];
  drillCompletions: DrillCompletion[];
  teamEvents: TeamEvent[];

  // Actions
  setCurrentTeam: (team: Team | null) => void;
  setCurrentMembership: (membership: TeamMembership | null) => void;
  setHasPlayerMembership: (value: boolean) => void;
  setTeamDataLoaded: (value: boolean) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setTeamDrills: (drills: TeamDrill[]) => void;
  addTeamDrill: (drill: TeamDrill) => void;
  removeTeamDrill: (id: string) => void;
  setDrillCompletions: (completions: DrillCompletion[]) => void;
  setTeamEvents: (events: TeamEvent[]) => void;
  addTeamEvent: (event: TeamEvent) => void;
  updateTeamEvent: (id: string, updates: Partial<TeamEvent>) => void;
  removeTeamEvent: (id: string) => void;
  updateMembership: (updates: Partial<TeamMembership>) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  currentMembership: null,
  hasPlayerMembership: false,
  teamDataLoaded: false,
  teamMembers: [],
  teamDrills: [],
  drillCompletions: [],
  teamEvents: [],

  setCurrentTeam: (team) => set({ currentTeam: team }),
  setCurrentMembership: (membership) =>
    set({ currentMembership: membership }),
  setHasPlayerMembership: (value) => set({ hasPlayerMembership: value }),
  setTeamDataLoaded: (value) => set({ teamDataLoaded: value }),
  setTeamMembers: (members) => set({ teamMembers: members }),
  setTeamDrills: (drills) => set({ teamDrills: drills }),

  addTeamDrill: (drill) =>
    set((state) => ({ teamDrills: [...state.teamDrills, drill] })),

  removeTeamDrill: (id) =>
    set((state) => ({
      teamDrills: state.teamDrills.filter((d) => d.id !== id),
    })),

  setDrillCompletions: (completions) => set({ drillCompletions: completions }),

  setTeamEvents: (events) => set({ teamEvents: events }),

  addTeamEvent: (event) =>
    set((state) => ({ teamEvents: [...state.teamEvents, event] })),

  updateTeamEvent: (id, updates) =>
    set((state) => ({
      teamEvents: state.teamEvents.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })),

  removeTeamEvent: (id) =>
    set((state) => ({
      teamEvents: state.teamEvents.filter((e) => e.id !== id),
    })),

  updateMembership: (updates) =>
    set((state) => ({
      currentMembership: state.currentMembership
        ? { ...state.currentMembership, ...updates }
        : null,
    })),

  clearTeam: () =>
    set({
      currentTeam: null,
      currentMembership: null,
      hasPlayerMembership: false,
      teamDataLoaded: false,
      teamMembers: [],
      teamDrills: [],
      drillCompletions: [],
      teamEvents: [],
    }),
}));

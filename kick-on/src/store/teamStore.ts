import { create } from 'zustand';
import type { Team, TeamMembership, TeamMember, TeamDrill, DrillCompletion } from '@/types';

interface TeamState {
  currentTeam: Team | null;
  currentMembership: TeamMembership | null;
  teamMembers: TeamMember[];
  teamDrills: TeamDrill[];
  drillCompletions: DrillCompletion[];

  // Actions
  setCurrentTeam: (team: Team | null) => void;
  setCurrentMembership: (membership: TeamMembership | null) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setTeamDrills: (drills: TeamDrill[]) => void;
  addTeamDrill: (drill: TeamDrill) => void;
  removeTeamDrill: (id: string) => void;
  setDrillCompletions: (completions: DrillCompletion[]) => void;
  updateMembership: (updates: Partial<TeamMembership>) => void;
  clearTeam: () => void;
}

export const useTeamStore = create<TeamState>((set) => ({
  currentTeam: null,
  currentMembership: null,
  teamMembers: [],
  teamDrills: [],
  drillCompletions: [],

  setCurrentTeam: (team) => set({ currentTeam: team }),
  setCurrentMembership: (membership) =>
    set({ currentMembership: membership }),
  setTeamMembers: (members) => set({ teamMembers: members }),
  setTeamDrills: (drills) => set({ teamDrills: drills }),

  addTeamDrill: (drill) =>
    set((state) => ({ teamDrills: [...state.teamDrills, drill] })),

  removeTeamDrill: (id) =>
    set((state) => ({
      teamDrills: state.teamDrills.filter((d) => d.id !== id),
    })),

  setDrillCompletions: (completions) => set({ drillCompletions: completions }),

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
      teamMembers: [],
      teamDrills: [],
      drillCompletions: [],
    }),
}));

import { create } from 'zustand';
import type { DrillTemplate, DrillProgress, DrillSettings } from '@/types';

interface DrillState {
  customDrills: DrillTemplate[];
  activeTemplate: DrillTemplate | null;
  previewingTemplateId: string | null;
  drillProgress: DrillProgress;
  drillSettings: DrillSettings;
  expandedDrillId: string | null;
  currentSkillsetFilter: string;
  currentAssignedDrillId: string | null;

  // Actions
  setCustomDrills: (drills: DrillTemplate[]) => void;
  addCustomDrill: (drill: DrillTemplate) => void;
  removeCustomDrill: (id: string) => void;
  setActiveTemplate: (template: DrillTemplate | null) => void;
  setPreviewingTemplateId: (id: string | null) => void;
  setDrillProgress: (progress: DrillProgress) => void;
  updateSpotProgress: (progressKey: string, spotId: string | number, score: DrillProgress[string][string | number]) => void;
  clearSpotProgress: (progressKey: string, spotId: string | number) => void;
  resetProgressForKey: (progressKey: string) => void;
  setDrillSettings: (settings: Partial<DrillSettings>) => void;
  setExpandedDrillId: (id: string | null) => void;
  setCurrentSkillsetFilter: (skillset: string) => void;
  setCurrentAssignedDrillId: (id: string | null) => void;
  resetDrill: () => void;
}

const defaultSettings: DrillSettings = {
  distance: 20,
  shotType: 'free-kick',
  footOption: 'right',
  totalShots: 20,
};

export const useDrillStore = create<DrillState>((set) => ({
  customDrills: [],
  activeTemplate: null,
  previewingTemplateId: null,
  drillProgress: {},
  drillSettings: { ...defaultSettings },
  expandedDrillId: null,
  currentSkillsetFilter: 'all',
  currentAssignedDrillId: null,

  setCustomDrills: (drills) => set({ customDrills: drills }),

  addCustomDrill: (drill) =>
    set((state) => ({ customDrills: [...state.customDrills, drill] })),

  removeCustomDrill: (id) =>
    set((state) => ({
      customDrills: state.customDrills.filter((d) => d.id !== id),
    })),

  setActiveTemplate: (template) => set({ activeTemplate: template }),
  setPreviewingTemplateId: (id) => set({ previewingTemplateId: id }),
  setDrillProgress: (progress) => set({ drillProgress: progress }),

  updateSpotProgress: (progressKey, spotId, score) =>
    set((state) => {
      const progress = { ...state.drillProgress };
      if (!progress[progressKey]) progress[progressKey] = {};
      progress[progressKey] = { ...progress[progressKey], [spotId]: score };
      return { drillProgress: progress };
    }),

  clearSpotProgress: (progressKey, spotId) =>
    set((state) => {
      const progress = { ...state.drillProgress };
      if (progress[progressKey]) {
        const spots = { ...progress[progressKey] };
        delete spots[spotId];
        progress[progressKey] = spots;
      }
      return { drillProgress: progress };
    }),

  resetProgressForKey: (progressKey) =>
    set((state) => {
      const progress = { ...state.drillProgress };
      progress[progressKey] = {};
      return { drillProgress: progress };
    }),

  setDrillSettings: (settings) =>
    set((state) => ({
      drillSettings: { ...state.drillSettings, ...settings },
    })),

  setExpandedDrillId: (id) => set({ expandedDrillId: id }),
  setCurrentSkillsetFilter: (skillset) =>
    set({ currentSkillsetFilter: skillset }),
  setCurrentAssignedDrillId: (id) => set({ currentAssignedDrillId: id }),

  resetDrill: () =>
    set({
      activeTemplate: null,
      previewingTemplateId: null,
      expandedDrillId: null,
      currentAssignedDrillId: null,
    }),
}));

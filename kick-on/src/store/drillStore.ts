import { create } from 'zustand';
import type { DrillTemplate, DrillProgress, DrillSettings } from '@/types';

interface DrillState {
  customDrills: DrillTemplate[];
  activeTemplate: DrillTemplate | null;
  previewingTemplate: boolean;
  drillProgress: DrillProgress | null;
  drillSettings: DrillSettings;
  expandedDrillId: string | null;
  currentSkillsetFilter: string | null;
  currentAssignedDrillId: string | null;

  // Actions
  setCustomDrills: (drills: DrillTemplate[]) => void;
  addCustomDrill: (drill: DrillTemplate) => void;
  removeCustomDrill: (id: string) => void;
  setActiveTemplate: (template: DrillTemplate | null) => void;
  setPreviewingTemplate: (previewing: boolean) => void;
  setDrillProgress: (progress: DrillProgress | null) => void;
  setDrillSettings: (settings: Partial<DrillSettings>) => void;
  setExpandedDrillId: (id: string | null) => void;
  setCurrentSkillsetFilter: (skillset: string | null) => void;
  setCurrentAssignedDrillId: (id: string | null) => void;
  resetDrill: () => void;
}

const defaultSettings: DrillSettings = {
  distance: '20m',
  shotType: 'standing',
  foot: 'both',
  totalShots: 10,
};

export const useDrillStore = create<DrillState>((set) => ({
  customDrills: [],
  activeTemplate: null,
  previewingTemplate: false,
  drillProgress: null,
  drillSettings: { ...defaultSettings },
  expandedDrillId: null,
  currentSkillsetFilter: null,
  currentAssignedDrillId: null,

  setCustomDrills: (drills) => set({ customDrills: drills }),

  addCustomDrill: (drill) =>
    set((state) => ({ customDrills: [...state.customDrills, drill] })),

  removeCustomDrill: (id) =>
    set((state) => ({
      customDrills: state.customDrills.filter((d) => d.id !== id),
    })),

  setActiveTemplate: (template) => set({ activeTemplate: template }),
  setPreviewingTemplate: (previewing) =>
    set({ previewingTemplate: previewing }),
  setDrillProgress: (progress) => set({ drillProgress: progress }),

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
      previewingTemplate: false,
      drillProgress: null,
      drillSettings: { ...defaultSettings },
      expandedDrillId: null,
      currentAssignedDrillId: null,
    }),
}));

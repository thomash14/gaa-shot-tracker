import type { Sport } from './sport';

export interface DrillSpot {
  x: number;
  y: number;
  label?: string;
}

export interface DrillTemplate {
  id: string;
  name: string;
  description: string;
  sport: Sport;
  skillset: string;
  spots: DrillSpot[];
  shotsPerSpot: number;
  distance?: string;
  shotType?: string;
  foot?: 'left' | 'right' | 'both';
  videoUrl?: string;
  isCustom: boolean;
  userId?: string;
  cloudId?: string;
}

export interface DrillProgress {
  templateId: string;
  spots: DrillSpotProgress[];
  startedAt: string;
  completedAt?: string;
}

export interface DrillSpotProgress {
  spotIndex: number;
  scored: number;
  missed: number;
  total: number;
  foot?: 'left' | 'right';
}

export interface DrillSettings {
  distance: string;
  shotType: string;
  foot: 'left' | 'right' | 'both';
  totalShots: number;
}

export interface TeamDrill {
  id: string;
  teamId: string;
  drillType: string;
  distance?: string;
  shotType?: string;
  foot?: string;
  totalShots?: number;
  skillset?: string;
  startDate?: string;
  availableFor?: number;
  targetPct?: number;
  notes?: string;
  assignedBy: string;
  assignedAt: string;
  sport: Sport;
}

export interface DrillCompletion {
  id: string;
  drillId: string;
  userId: string;
  scored: number;
  total: number;
  completedAt: string;
  sport: Sport;
}

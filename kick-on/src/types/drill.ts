import type { Sport } from './sport';

export interface DrillSpot {
  id: number | string;
  name?: string;
  description?: string;
  x: number;
  y: number;
  shots: number;
  foot?: string;
  shotCategory?: string;
  shotType?: string;
}

export interface DrillTemplate {
  id: string;
  name: string;
  description: string;
  author?: string;
  sport?: Sport;
  skillset: string;
  spots?: DrillSpot[];
  isDynamic: boolean;
  isCustom: boolean;
  customDrillId?: string | number;
  detailedInstructions?: string;
  videoUrl?: string | null;
  userId?: string;
  cloudId?: string;
}

/**
 * Drill progress — flat Record matching original localStorage shape.
 *
 * Outer key is the progress key (e.g. "scoring-zones-20-standing-right-20" or "custom-123").
 * Inner key is the spot ID (number).
 * Value is either single-foot { scored, total } or both-feet { right, left }.
 */
export interface SpotScoreSingle {
  scored: number;
  total: number;
}

export interface SpotScoreBothFeet {
  right: SpotScoreSingle;
  left: SpotScoreSingle;
}

export type SpotScore = SpotScoreSingle | SpotScoreBothFeet;

export type DrillProgress = Record<string, Record<string | number, SpotScore>>;

export interface DrillSpotProgress {
  spotIndex: number;
  scored: number;
  missed: number;
  total: number;
  foot?: 'left' | 'right';
}

export interface DrillSettings {
  distance: number;
  shotType: string;
  footOption: 'left' | 'right' | 'both';
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

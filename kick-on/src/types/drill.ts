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

export interface TeamDrillSettings {
  distance: number;
  shotType: string;
  foot: string;
  totalShots: number;
}

export interface TeamDrill {
  id: string;
  team_id: string;
  created_by: string;
  created_at: string;
  drill_type: string;
  settings: TeamDrillSettings;
  start_date: string;
  due_date: string;
  target_percentage: number | null;
  notes: string | null;
  status: string;
}

export interface DrillCompletion {
  id: string;
  drill_id: string;
  user_id: string;
  scored: number;
  total: number;
  score_percentage: number;
  completed_at: string;
  profiles?: { display_name?: string; email?: string };
}

// ---------------------------------------------------------------------------
// Multi-drill practice session types
// ---------------------------------------------------------------------------

export type PracticeFlowState = 'add-drill' | 'tracking' | 'drill-summary' | 'session-summary' | null;

export type PracticeDrillType = 'free-form' | 'scoring-arc';

export interface PracticeDrill {
  id: number;
  cloudId?: string;
  drillOrder: number;
  drillType: PracticeDrillType;
  distance: number | null;
  foot: 'left' | 'right' | 'both';
  stance: string;
  shotCategory: string;
  shotCount: number;
  scoredCount: number;
  assignedDrillId?: string | null;
  templateId?: string | null;
  shots: import('./shot').Shot[];
  startTime: string | null;
  endTime: string | null;
}

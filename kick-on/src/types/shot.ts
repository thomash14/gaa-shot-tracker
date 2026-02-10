import type { Sport } from './sport';

export interface Shot {
  x: number;
  y: number;
  distance: number;
  foot: 'left' | 'right';
  half: '1st' | '2nd' | null;
  shotFor: 'point' | 'goal';
  shotCategory: string;    // sport-specific: 'in-play', 'free-kick', '45', 'sideline', etc.
  shotType: string;        // sport-specific: 'standing', 'from-hand', etc.
  pointValue: number;
  result: 'scored' | 'missed';
  timestamp: string;
  comment: string;
  batch: boolean;
  cloudId?: string;
  // Miss details
  missResult?: string;
  missReason?: string;
  customMissReason?: string;
}

export interface ShotWithContext extends Shot {
  sessionId: number | string;
  sessionType: 'practice' | 'match';
  sessionDate: string;
  sessionName: string;
  sport?: Sport;
}

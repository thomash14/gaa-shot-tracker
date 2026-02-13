import type { Shot } from './shot';
import type { Sport } from './sport';
import type { PracticeDrill } from './drill';

export type SessionType = 'practice' | 'match';
export type MatchType = 'league' | 'championship' | 'friendly' | 'custom' | null;

export interface Session {
  id: number | string;
  name: string;
  date: string;
  type: SessionType;
  sport: Sport;
  matchType: MatchType;
  shots: Shot[];
  startTime: string;
  endTime?: string;
  cloudId?: string;
  // Session notes
  notes?: string;
  didWell?: string;
  toImprove?: string;
  windDirection?: string;
  windStrength?: string;
  // Match-specific fields
  minutesPlayed?: string;
  positionPlayed?: string;
  // Drill reference (if session started from a drill)
  drillId?: string;
  drillName?: string;
  // Multi-drill practice sessions
  drills?: PracticeDrill[];
}

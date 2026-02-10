import type { Sport } from './sport';

export interface UserProfile {
  userId: string;
  email: string;
  displayName: string;
  dob?: string;
  county?: string;
  club?: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  preferredFoot?: 'left' | 'right';
  primarySport: Sport;
  secondarySport?: Sport;  // for dual players
  avatarUrl?: string;
}

import type { Sport, SportConfig } from '@/types';

const footballConfig: SportConfig = {
  sport: 'football',
  label: 'GAA Football',
  shotCategories: [
    { value: 'in-play', label: 'In-Play' },
    { value: 'free-kick', label: 'Free Kick' },
    { value: '45', label: '45' },
    { value: 'sideline', label: 'Sideline' },
  ],
  shotTypes: [
    { value: 'standing', label: 'Standing' },
    { value: 'off-the-ground', label: 'Off The Ground' },
    { value: 'running', label: 'Running' },
    { value: 'outside-boot', label: 'Outside Of The Boot' },
    { value: 'fisted', label: 'Fisted' },
    { value: 'solo-and-kick', label: 'Solo & Kick' },
    { value: 'catch-and-kick', label: 'Catch & Kick' },
  ],
  skillsets: [
    'Kicking at Goal',
    'Kick Passing',
    'Hand Passing',
    'High Catch',
    'Soloing',
    'Pick-Up',
    'Fun Challenges',
  ],
  terminology: {
    kick: 'kick',
    kicking: 'kicking',
    freeKick: 'free kick',
    longRange: '45',
    sideline: 'sideline',
  },
};

const hurlingConfig: SportConfig = {
  sport: 'hurling',
  label: 'Hurling',
  shotCategories: [
    { value: 'in-play', label: 'In-Play' },
    { value: 'free', label: 'Free' },
    { value: '65', label: '65' },
    { value: 'sideline-cut', label: 'Sideline Cut' },
  ],
  shotTypes: [
    { value: 'from-hand', label: 'From Hand' },
    { value: 'ground-strike', label: 'Ground Strike' },
    { value: 'standing', label: 'Standing' },
    { value: 'overhead', label: 'Overhead' },
    { value: 'doubling', label: 'Doubling' },
    { value: 'running', label: 'Running' },
  ],
  skillsets: [
    'Striking at Goal',
    'Free Taking',
    'Sideline Cuts',
    'Ground Striking',
    'Doubling',
    'Fun Challenges',
  ],
  terminology: {
    kick: 'strike',
    kicking: 'striking',
    freeKick: 'free',
    longRange: '65',
    sideline: 'sideline cut',
  },
};

const sportConfigs: Record<Sport, SportConfig> = {
  football: footballConfig,
  hurling: hurlingConfig,
};

export function getSportConfig(sport: Sport): SportConfig {
  return sportConfigs[sport];
}

export function getDefaultSport(): Sport {
  return 'football';
}

export { footballConfig, hurlingConfig, sportConfigs };

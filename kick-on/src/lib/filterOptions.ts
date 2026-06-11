/**
 * Multi-select filter option definitions for analytics.
 * Ported from multiselect.js option functions.
 */

export interface FilterOption {
  value: string;
  label: string;
  group?: string;
}

/** Stable filter IDs used as keys in multiSelectValues store. */
export const FILTER_IDS = {
  MATCH_TYPE: 'matchType',
  DRILL: 'drill',
  SKILLSET: 'skillset',
  SHOT_CATEGORY: 'shotCategory',
  SHOT_TYPE: 'shotType',
  FOOT: 'foot',
  RESULT: 'result',
  HALF: 'half',
  WIND_DIRECTION: 'windDirection',
  WIND_STRENGTH: 'windStrength',
} as const;

export type FilterId = (typeof FILTER_IDS)[keyof typeof FILTER_IDS];

// ---------------------------------------------------------------------------
// Option lists — labels for UI, values for filtering
// ---------------------------------------------------------------------------

export function shotCategoryOptions(): FilterOption[] {
  return [
    { value: 'in-play', label: 'In-Play' },
    { value: 'free-kick', label: 'Free-Kick' },
    { value: '45', label: '45' },
  ];
}

export function shotTypeOptions(): FilterOption[] {
  return [
    { value: 'not-defined', label: 'Not Defined' },
    { value: 'outside-of-the-boot', label: 'Outside Of The Boot' },
    { value: 'on-the-run', label: 'On the Run' },
    { value: 'on-the-turn', label: 'On the Turn' },
    { value: 'standing', label: 'Standing' },
    { value: 'off-a-dummy', label: 'Off a Dummy' },
    { value: 'off-the-hands', label: 'Off The Hands' },
    { value: 'off-the-ground', label: 'Off The Ground' },
  ];
}

export function footOptions(): FilterOption[] {
  return [
    { value: 'right', label: 'Right' },
    { value: 'left', label: 'Left' },
  ];
}

export function halfOptions(): FilterOption[] {
  return [
    { value: '1st', label: '1st Half' },
    { value: '2nd', label: '2nd Half' },
  ];
}

export function resultOptions(): FilterOption[] {
  return [
    { value: 'scored', label: 'Scored' },
    { value: 'missed', label: 'Missed' },
  ];
}

export function skillsetOptions(): FilterOption[] {
  return [
    { value: 'kicking-at-goal', label: 'Kicking at Goal' },
    { value: 'kick-passing', label: 'Kick Passing' },
    { value: 'hand-passing', label: 'Hand Passing' },
    { value: 'high-catch', label: 'High Catch' },
    { value: 'soloing', label: 'Soloing' },
    { value: 'pick-up', label: 'Pick-Up' },
    { value: 'fun-challenges', label: 'Fun Challenges' },
  ];
}

export function windDirectionOptions(): FilterOption[] {
  return [
    { value: 'no-wind', label: 'No wind' },
    { value: 'straight-with', label: 'Straight with', group: 'With' },
    { value: 'diag-lr-with', label: 'Diag L-R with', group: 'With' },
    { value: 'diag-rl-with', label: 'Diag R-L with', group: 'With' },
    { value: 'straight-against', label: 'Straight against', group: 'Against' },
    { value: 'diag-lr-against', label: 'Diag L-R against', group: 'Against' },
    { value: 'diag-rl-against', label: 'Diag R-L against', group: 'Against' },
    { value: 'cross-lr', label: 'Cross L-R', group: 'Cross' },
    { value: 'cross-rl', label: 'Cross R-L', group: 'Cross' },
  ];
}

export function windStrengthOptions(): FilterOption[] {
  return [
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'strong', label: 'Strong' },
    { value: 'very-strong', label: 'Very Strong' },
  ];
}

export function defaultMatchTypeOptions(): FilterOption[] {
  return [
    { value: 'league', label: 'League' },
    { value: 'championship', label: 'Club Championship' },
    { value: 'challenge', label: 'Challenge' },
  ];
}

/** Set of default match type values — used by SessionControls and analytics. */
export const DEFAULT_MATCH_TYPE_VALUES = new Set(
  defaultMatchTypeOptions().map((o) => o.value),
);

export function defaultDrillOptions(): FilterOption[] {
  return [
    { value: 'free', label: 'Free Practice' },
    { value: 'scoring-zones', label: 'Scoring Arc' },
  ];
}

// ---------------------------------------------------------------------------
// Label maps (used by StatsTable and other display components)
// ---------------------------------------------------------------------------

export const SHOT_TYPE_LABELS: Record<string, string> = {
  'not-defined': 'Not Defined',
  'outside-of-the-boot': 'Outside Boot',
  'on-the-run': 'On the Run',
  'on-the-turn': 'On the Turn',
  'standing': 'Standing',
  'off-a-dummy': 'Off a Dummy',
  'fisted': 'Fisted',
  'off-the-hands': 'Off Hands',
  'off-the-ground': 'Off Ground',
};

export const MISS_RESULT_LABELS: Record<string, string> = {
  'short': 'Short',
  'blocked': 'Blocked',
  'wide-left': 'Wide L',
  'wide-right': 'Wide R',
  'post': 'Post',
};

export const MISS_REASON_LABELS: Record<string, string> = {
  'pulled': 'Pulled',
  'rushed': 'Rushed',
  'bad-connection': 'Bad Conn.',
  'outside-range': 'Out of Range',
  'at-limits': 'At Limits',
};

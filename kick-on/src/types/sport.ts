export type Sport = 'football' | 'hurling';

export interface SportConfig {
  sport: Sport;
  label: string;
  shotCategories: { value: string; label: string }[];
  shotTypes: { value: string; label: string }[];
  skillsets: string[];
  terminology: {
    kick: string;       // "kick" | "strike"
    kicking: string;    // "kicking" | "striking"
    freeKick: string;   // "free kick" | "free"
    longRange: string;  // "45" | "65"
    sideline: string;   // "sideline" | "sideline cut"
  };
}

/**
 * Coach Match Review — Phase 2 shared config and helpers.
 */

import type { PlayerEventType, LocalPlayerEvent } from '@/types';

export interface OutcomeOption {
  value: string;
  label: string;
}

export interface EventTypeConfig {
  key: PlayerEventType;
  label: string;
  short: string;
  /** Outcome choices shown after marking on the map (empty = location only). */
  outcomes: OutcomeOption[];
  /** When true, the chosen value is stored as assist_type rather than outcome. */
  usesAssistType?: boolean;
  /** Only available to goalkeepers. */
  gkOnly?: boolean;
}

export const EVENT_TYPES: EventTypeConfig[] = [
  {
    key: 'possession',
    label: 'Possessions',
    short: 'Poss',
    outcomes: [
      { value: 'scored_point', label: 'Scored Point' },
      { value: 'scored_goal', label: 'Scored Goal' },
      { value: 'turned_over', label: 'Turned Over' },
      { value: 'fouled', label: 'Fouled' },
      { value: 'passed_off', label: 'Passed Off' },
    ],
  },
  {
    key: 'shot',
    label: 'Shots',
    short: 'Shots',
    outcomes: [
      { value: 'scored', label: 'Scored' },
      { value: 'missed', label: 'Missed' },
      { value: 'blocked', label: 'Blocked' },
      { value: 'wide', label: 'Wide' },
    ],
  },
  { key: 'turnover_won', label: 'Turnovers Won', short: 'TO Won', outcomes: [] },
  { key: 'turnover_lost', label: 'Turnovers Lost', short: 'TO Lost', outcomes: [] },
  {
    key: 'assist',
    label: 'Assists',
    short: 'Assists',
    usesAssistType: true,
    outcomes: [
      { value: 'goal', label: 'Goal Assist' },
      { value: 'point', label: 'Point Assist' },
    ],
  },
  {
    key: 'kickout',
    label: 'Kickouts',
    short: 'KO',
    gkOnly: true,
    outcomes: [
      { value: 'won', label: 'Won' },
      { value: 'lost', label: 'Lost' },
    ],
  },
];

export const EVENT_TYPE_BY_KEY: Record<PlayerEventType, EventTypeConfig> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.key, e]),
) as Record<PlayerEventType, EventTypeConfig>;

/** Human label for any stored outcome / assist value. */
export const OUTCOME_LABELS: Record<string, string> = {
  scored_point: 'Scored Point',
  scored_goal: 'Scored Goal',
  turned_over: 'Turned Over',
  fouled: 'Fouled',
  passed_off: 'Passed Off',
  scored: 'Scored',
  missed: 'Missed',
  blocked: 'Blocked',
  wide: 'Wide',
  won: 'Won',
  lost: 'Lost',
  goal: 'Goal Assist',
  point: 'Point Assist',
};

/** Outcomes that represent a positive result (green markers). */
const POSITIVE = new Set(['scored_point', 'scored_goal', 'scored', 'won', 'goal', 'point']);
/** Outcomes that represent a negative result (red markers). */
const NEGATIVE = new Set(['turned_over', 'missed', 'blocked', 'wide', 'lost']);

/** Marker colour for an event, based on type + outcome. */
export function eventColour(e: { eventType: PlayerEventType; outcome: string | null; assistType: string | null }): string {
  if (e.eventType === 'turnover_won') return '#2a5298'; // primary blue
  if (e.eventType === 'turnover_lost') return '#f44336'; // danger
  if (e.eventType === 'assist') return '#4CAF50'; // success
  const v = e.outcome;
  if (v && POSITIVE.has(v)) return '#4CAF50';
  if (v && NEGATIVE.has(v)) return '#f44336';
  return '#9E9E9E'; // neutral (quick-added, no outcome)
}

function countOf(events: LocalPlayerEvent[], type: PlayerEventType): number {
  return events.filter((e) => e.eventType === type).length;
}

/** Running totals per event type. */
export function totals(events: LocalPlayerEvent[]): Record<PlayerEventType, number> {
  return {
    possession: countOf(events, 'possession'),
    shot: countOf(events, 'shot'),
    turnover_won: countOf(events, 'turnover_won'),
    turnover_lost: countOf(events, 'turnover_lost'),
    assist: countOf(events, 'assist'),
    kickout: countOf(events, 'kickout'),
  };
}

/** Plain-English summary, e.g. "8 possessions, 3 shots (2 scored), 1 turnover won, 1 assist". */
export function buildSummary(events: LocalPlayerEvent[]): string {
  const t = totals(events);
  const shotsScored = events.filter((e) => e.eventType === 'shot' && e.outcome === 'scored').length;
  const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;

  const parts: string[] = [];
  parts.push(plural(t.possession, 'possession'));
  parts.push(`${plural(t.shot, 'shot')}${t.shot ? ` (${shotsScored} scored)` : ''}`);
  if (t.turnover_won) parts.push(`${t.turnover_won} turnover${t.turnover_won !== 1 ? 's' : ''} won`);
  if (t.turnover_lost) parts.push(`${t.turnover_lost} turnover${t.turnover_lost !== 1 ? 's' : ''} lost`);
  if (t.assist) parts.push(plural(t.assist, 'assist'));
  if (t.kickout) parts.push(plural(t.kickout, 'kickout'));
  return parts.join(', ');
}

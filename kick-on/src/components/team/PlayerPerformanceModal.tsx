'use client';

import { useMemo, useState } from 'react';
import { SvgPitch } from '@/components/pitch';
import { usePlayerPerformance } from '@/hooks/usePlayerPerformance';
import { mirrorToAttackingHalf } from '@/lib/shotMap';
import { JERSEY_ORDER, POSITION_NAMES } from '@/lib/coachMatch';
import { coachEventColour, COACH_MAP_LEGEND } from '@/lib/coachStats';
import { EVENT_TYPE_BY_KEY, OUTCOME_LABELS } from '@/lib/playerReview';
import {
  avgPerf,
  filterGames,
  mostPlayedPosition,
  type DatePreset,
  type PerfFilters,
} from '@/lib/playerPerformance';
import PlayerPerformanceTable from './PlayerPerformanceTable';
import type { PlayerEventType } from '@/types';

interface PlayerPerformanceModalProps {
  open: boolean;
  playerName: string;
  playerUserId: string;
  teamId: string;
  onClose: () => void;
}

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'this_season', label: 'This season' },
  { value: 'custom', label: 'Custom' },
];

const EVENT_TYPE_KEYS: PlayerEventType[] = [
  'possession', 'shot', 'turnover_won', 'turnover_lost', 'assist', 'kickout',
];

export default function PlayerPerformanceModal({
  open,
  playerName,
  playerUserId,
  teamId,
  onClose,
}: PlayerPerformanceModalProps) {
  const { games, events, loading } = usePlayerPerformance(open ? playerUserId : null, open ? teamId : null);
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [filters, setFilters] = useState<PerfFilters>({
    preset: 'all', from: '', to: '', competition: 'all', year: 'all', position: 'all',
  });
  const [showMap, setShowMap] = useState(false);
  const [typeOn, setTypeOn] = useState<Record<PlayerEventType, boolean>>({
    possession: true, shot: true, turnover_won: true, turnover_lost: true, assist: true, kickout: true,
  });

  const patch = (p: Partial<PerfFilters>) => setFilters((f) => ({ ...f, ...p }));

  const filtered = useMemo(() => filterGames(games, filters, todayIso), [games, filters, todayIso]);

  // Filter option lists (from all games so they stay stable).
  const competitions = useMemo(
    () => Array.from(new Set(games.map((g) => g.competition))).sort(),
    [games],
  );
  const years = useMemo(
    () => Array.from(new Set(games.map((g) => g.date.slice(0, 4)))).sort().reverse(),
    [games],
  );
  const positions = useMemo(
    () =>
      Array.from(new Set(games.map((g) => g.position))).sort(
        (a, b) => JERSEY_ORDER.indexOf(a) - JERSEY_ORDER.indexOf(b),
      ),
    [games],
  );

  const mostPlayed = mostPlayedPosition(games);

  // Events for the map: filtered games, with coords, type toggled on.
  const filteredMatchIds = useMemo(() => new Set(filtered.map((g) => g.matchId)), [filtered]);
  const mapEvents = useMemo(
    () =>
      events.filter(
        (e) =>
          e.x_position != null &&
          e.y_position != null &&
          filteredMatchIds.has(e.coach_match_id) &&
          typeOn[e.event_type],
      ),
    [events, filteredMatchIds, typeOn],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-primary dark:text-text">{playerName}</h3>
              <p className="text-xs text-text-muted">
                {mostPlayed ? `Most played: ${POSITION_NAMES[mostPlayed]}` : 'No games yet'}
                {' · '}
                {games.length} game{games.length !== 1 ? 's' : ''}
              </p>
              {filtered.length > 0 && (
                <p className="mt-0.5 text-xs text-text-muted">
                  Showing {filtered.length} — avg {avgPerf(filtered, 'possessions')} poss,{' '}
                  {avgPerf(filtered, 'shots')} shots, {avgPerf(filtered, 'assists')} assists per game
                </p>
              )}
            </div>
            <button onClick={onClose} className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted hover:bg-grey-light">
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {/* Filters */}
          <div className="space-y-2 rounded-xl bg-surface p-3 shadow-sm">
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => patch({ preset: p.value })}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    filters.preset === p.value ? 'bg-primary text-white' : 'bg-grey-light text-text-muted hover:bg-grey'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {filters.preset === 'custom' && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-text-muted">From</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => patch({ from: e.target.value })}
                  className="rounded-lg border border-grey bg-surface px-2 py-1 text-xs"
                />
                <label className="text-xs text-text-muted">To</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => patch({ to: e.target.value })}
                  className="rounded-lg border border-grey bg-surface px-2 py-1 text-xs"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <select
                value={filters.competition}
                onChange={(e) => patch({ competition: e.target.value })}
                className="rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
              >
                <option value="all">All competitions</option>
                {competitions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>

              <select
                value={filters.year}
                onChange={(e) => patch({ year: e.target.value })}
                className="rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
              >
                <option value="all">All years</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>

              <select
                value={filters.position}
                onChange={(e) => patch({ position: e.target.value })}
                className="rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
              >
                <option value="all">All positions</option>
                {positions.map((p) => <option key={p} value={p}>{POSITION_NAMES[p]}</option>)}
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading performance…</p>
          ) : (
            <div className="rounded-xl bg-surface p-2 shadow-sm">
              <PlayerPerformanceTable games={filtered} />
            </div>
          )}

          {/* Optional pitch map */}
          <div className="rounded-xl bg-surface p-3 shadow-sm">
            <button
              onClick={() => setShowMap((v) => !v)}
              className="flex w-full items-center justify-between text-sm font-bold text-text"
            >
              Pitch Map
              <span className="text-text-muted">{showMap ? '▲' : '▼'}</span>
            </button>

            {showMap && (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_TYPE_KEYS.map((k) => {
                    const on = typeOn[k];
                    const colour = coachEventColour({ event_type: k, outcome: k === 'shot' ? 'scored' : null });
                    return (
                      <button
                        key={k}
                        onClick={() => setTypeOn((prev) => ({ ...prev, [k]: !prev[k] }))}
                        className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-opacity ${
                          on ? 'border-grey text-text' : 'border-grey-light text-text-muted opacity-40'
                        }`}
                      >
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
                        {EVENT_TYPE_BY_KEY[k].label}
                      </button>
                    );
                  })}
                </div>

                <p className="text-center text-xs text-text-muted">
                  {mapEvents.length} event{mapEvents.length !== 1 ? 's' : ''} across {filtered.length} game
                  {filtered.length !== 1 ? 's' : ''}
                </p>

                <div className="mx-auto max-w-sm">
                  <SvgPitch attackingHalfOnly showLabels={false}>
                    {mapEvents.map((e) => {
                      const m = mirrorToAttackingHalf(e.x_position!, e.y_position!);
                      return (
                        <circle
                          key={e.id}
                          cx={(m.x / 100) * 500}
                          cy={(m.y / 100) * 725}
                          r={6}
                          fill={coachEventColour(e)}
                          stroke="#fff"
                          strokeWidth={1.5}
                          opacity={0.9}
                        >
                          <title>
                            {`${EVENT_TYPE_BY_KEY[e.event_type].label}${
                              e.outcome ? ` · ${OUTCOME_LABELS[e.outcome] ?? e.outcome}` : ''
                            }${e.assist_type ? ` · ${OUTCOME_LABELS[e.assist_type] ?? e.assist_type}` : ''}`}
                          </title>
                        </circle>
                      );
                    })}
                  </SvgPitch>
                </div>

                <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
                  {COACH_MAP_LEGEND.map((l) => (
                    <span key={l.label} className="flex items-center gap-1 text-[11px] text-text-muted">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.colour }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

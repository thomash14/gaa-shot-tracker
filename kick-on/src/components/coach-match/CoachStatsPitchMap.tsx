'use client';

import { useMemo, useState } from 'react';
import { SvgPitch } from '@/components/pitch';
import { mirrorToAttackingHalf } from '@/lib/shotMap';
import { OUTCOME_LABELS, EVENT_TYPE_BY_KEY } from '@/lib/playerReview';
import { coachEventColour, COACH_MAP_LEGEND, POSITION_GROUP, type PositionGroup, type PlayerStatRow } from '@/lib/coachStats';
import type { PlayerEventType, PlayerMatchEvent, Position } from '@/types';

interface CoachStatsPitchMapProps {
  events: PlayerMatchEvent[];
  rows: PlayerStatRow[];
  nameById: Record<string, string>;
}

const EVENT_TYPE_KEYS: PlayerEventType[] = [
  'possession', 'shot', 'turnover_won', 'turnover_lost', 'assist', 'kickout',
];

const GROUPS: (PositionGroup | 'All')[] = ['All', 'Backs', 'Midfield', 'Forwards'];

export default function CoachStatsPitchMap({ events, rows, nameById }: CoachStatsPitchMapProps) {
  const [playerFilter, setPlayerFilter] = useState<string>('all');
  const [group, setGroup] = useState<PositionGroup | 'All'>('All');
  const [typeOn, setTypeOn] = useState<Record<PlayerEventType, boolean>>({
    possession: true, shot: true, turnover_won: true, turnover_lost: true, assist: true, kickout: true,
  });
  const [selected, setSelected] = useState<PlayerMatchEvent | null>(null);

  const posById = useMemo(() => {
    const m: Record<string, Position> = {};
    rows.forEach((r) => { m[r.playerId] = r.position; });
    return m;
  }, [rows]);

  // Players that actually have mappable events, for the dropdown.
  const playerOptions = useMemo(() => {
    const ids = Array.from(new Set(events.filter((e) => e.x_position != null).map((e) => e.player_id)));
    return ids.map((id) => ({ id, name: nameById[id] ?? 'Player' })).sort((a, b) => a.name.localeCompare(b.name));
  }, [events, nameById]);

  const visible = useMemo(() => {
    return events.filter((e) => {
      if (e.x_position == null || e.y_position == null) return false;
      if (!typeOn[e.event_type]) return false;
      if (playerFilter !== 'all' && e.player_id !== playerFilter) return false;
      if (group !== 'All') {
        const pos = posById[e.player_id];
        if (!pos || POSITION_GROUP[pos] !== group) return false;
      }
      return true;
    });
  }, [events, typeOn, playerFilter, group, posById]);

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
          >
            <option value="all">All players</option>
            {playerOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="flex gap-1">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  group === g ? 'bg-primary text-white' : 'bg-grey-light text-text-muted hover:bg-grey'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Event-type toggles */}
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
      </div>

      {/* Selected marker info */}
      <div className="min-h-[1.25rem] text-center text-xs">
        {selected ? (
          <span className="font-medium text-text">
            {nameById[selected.player_id] ?? 'Player'} · {EVENT_TYPE_BY_KEY[selected.event_type].label}
            {selected.outcome ? ` · ${OUTCOME_LABELS[selected.outcome] ?? selected.outcome}` : ''}
            {selected.assist_type ? ` · ${OUTCOME_LABELS[selected.assist_type] ?? selected.assist_type}` : ''}
          </span>
        ) : (
          <span className="text-text-muted">Tap a marker for details · {visible.length} event{visible.length !== 1 ? 's' : ''} shown</span>
        )}
      </div>

      {/* Pitch (top half, mirrored — same convention as the analytics shot map) */}
      <div className="mx-auto max-w-sm">
        <SvgPitch attackingHalfOnly showLabels={false}>
          {visible.map((e) => {
            const m = mirrorToAttackingHalf(e.x_position!, e.y_position!);
            const cx = (m.x / 100) * 500;
            const cy = (m.y / 100) * 725;
            const isSel = selected?.id === e.id;
            return (
              <circle
                key={e.id}
                cx={cx}
                cy={cy}
                r={isSel ? 9 : 6}
                fill={coachEventColour(e)}
                stroke={isSel ? '#FFD700' : '#fff'}
                strokeWidth={isSel ? 3 : 1.5}
                opacity={0.9}
                style={{ cursor: 'pointer' }}
                onClick={(ev) => { ev.stopPropagation(); setSelected(e); }}
              >
                <title>
                  {`${nameById[e.player_id] ?? 'Player'} · ${EVENT_TYPE_BY_KEY[e.event_type].label}${
                    e.outcome ? ` · ${OUTCOME_LABELS[e.outcome] ?? e.outcome}` : ''
                  }${e.assist_type ? ` · ${OUTCOME_LABELS[e.assist_type] ?? e.assist_type}` : ''}`}
                </title>
              </circle>
            );
          })}
        </SvgPitch>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {COACH_MAP_LEGEND.map((l) => (
          <span key={l.label} className="flex items-center gap-1 text-[11px] text-text-muted">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.colour }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

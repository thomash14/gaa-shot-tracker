'use client';

import { useMemo, useState } from 'react';
import { SvgPitch } from '@/components/pitch';
import { mirrorToAttackingHalf } from '@/lib/shotMap';
import { POSITION_NAMES } from '@/lib/coachMatch';
import { coachEventColour, type PlayerStatRow } from '@/lib/coachStats';
import { OUTCOME_LABELS } from '@/lib/playerReview';
import type { PlayerMatchEvent } from '@/types';

interface PlayerStatDetailProps {
  row: PlayerStatRow;
  events: PlayerMatchEvent[];
  onBack: () => void;
  onSaveComment: (cmpId: string, comment: string, visible: boolean) => Promise<void>;
  onEditStats: () => void;
}

export default function PlayerStatDetail({ row, events, onBack, onSaveComment, onEditStats }: PlayerStatDetailProps) {
  const mine = useMemo(() => events.filter((e) => e.player_id === row.playerId), [events, row.playerId]);
  const coordEvents = mine.filter((e) => e.x_position != null && e.y_position != null);

  const [comment, setComment] = useState(row.coachComment ?? '');
  const [visible, setVisible] = useState(row.commentVisible);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Outcome breakdown per event type.
  const breakdown = useMemo(() => {
    const tally = (type: string, field: 'outcome' | 'assist_type') => {
      const map: Record<string, number> = {};
      mine.filter((e) => e.event_type === type).forEach((e) => {
        const v = e[field];
        const key = v ?? 'unspecified';
        map[key] = (map[key] ?? 0) + 1;
      });
      return map;
    };
    return {
      possession: tally('possession', 'outcome'),
      shot: tally('shot', 'outcome'),
      turnover_won: mine.filter((e) => e.event_type === 'turnover_won').length,
      turnover_lost: mine.filter((e) => e.event_type === 'turnover_lost').length,
      assist: tally('assist', 'assist_type'),
      kickout: tally('kickout', 'outcome'),
    };
  }, [mine]);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      await onSaveComment(row.cmpId, comment, visible);
      setSavedMsg('Saved');
    } catch {
      setSavedMsg('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const renderTally = (label: string, map: Record<string, number>) => {
    const entries = Object.entries(map);
    if (entries.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-semibold text-text">{label}:</span>
        {entries.map(([k, n]) => (
          <span key={k} className="rounded-full bg-grey-light px-2 py-0.5 text-text-muted">
            {OUTCOME_LABELS[k] ?? (k === 'unspecified' ? 'No outcome' : k)} × {n}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="text-xs font-semibold text-primary hover:underline">
        &lsaquo; Back to all players
      </button>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-base font-bold text-text">{row.name}</h4>
          <p className="text-xs text-text-muted">
            {POSITION_NAMES[row.position]}
            {!row.isStarter && row.subMinute != null ? ` · came on at ${row.subMinute}'` : ''}
            {' · '}
            <span className={row.reviewed ? 'text-success' : 'text-text-muted'}>
              {row.reviewed ? 'Reviewed' : 'Not reviewed'}
            </span>
          </p>
        </div>
        <button
          onClick={onEditStats}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
        >
          Edit Stats
        </button>
      </div>

      {/* Their map */}
      {coordEvents.length > 0 ? (
        <div className="mx-auto max-w-sm">
          <SvgPitch attackingHalfOnly showLabels={false}>
            {coordEvents.map((e) => {
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
                  <title>{e.outcome ? OUTCOME_LABELS[e.outcome] ?? e.outcome : e.event_type}</title>
                </circle>
              );
            })}
          </SvgPitch>
        </div>
      ) : (
        <p className="text-center text-xs text-text-muted">
          {row.reviewed ? 'No map-marked events.' : 'Player hasn’t submitted a review yet.'}
        </p>
      )}

      {/* Breakdown */}
      <div className="space-y-1.5 rounded-xl bg-grey-light/40 p-3">
        <h5 className="text-xs font-bold uppercase tracking-wide text-text-muted">Breakdown</h5>
        <p className="text-xs text-text">
          {row.possessions} possessions · {row.shotsScored}/{row.shots} shots · {row.turnoversWon} TO won ·{' '}
          {row.turnoversLost} TO lost · {row.assists} assists
          {row.position === 'GK' && ` · ${row.kickoutsWon}/${row.kickoutsLost} kickouts`}
        </p>
        {renderTally('Possessions', breakdown.possession)}
        {renderTally('Shots', breakdown.shot)}
        {renderTally('Assists', breakdown.assist)}
        {row.position === 'GK' && renderTally('Kickouts', breakdown.kickout)}
      </div>

      {/* Coach comment (Phase 1) */}
      <div className="space-y-2 rounded-xl border border-grey-light p-3">
        <h5 className="text-xs font-bold uppercase tracking-wide text-text-muted">Coach Comment</h5>
        <textarea
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSavedMsg(''); }}
          rows={2}
          placeholder={`Comment about ${row.name}`}
          className="w-full resize-none rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={visible}
              onChange={(e) => { setVisible(e.target.checked); setSavedMsg(''); }}
            />
            Visible to player
          </label>
          <div className="flex items-center gap-2">
            {savedMsg && <span className="text-[11px] text-text-muted">{savedMsg}</span>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

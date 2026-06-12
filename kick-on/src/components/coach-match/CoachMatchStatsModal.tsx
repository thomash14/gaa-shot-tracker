'use client';

import { useState } from 'react';
import { useCoachMatchStats } from '@/hooks/useCoachMatchStats';
import { formatScoreline, matchResult } from '@/lib/coachMatch';
import type { PlayerStatRow } from '@/lib/coachStats';
import CoachStatsTable from './CoachStatsTable';
import CoachStatsPitchMap from './CoachStatsPitchMap';
import PlayerStatDetail from './PlayerStatDetail';
import type { CoachMatch } from '@/types';

interface CoachMatchStatsModalProps {
  match: CoachMatch;
  teamName: string;
  onClose: () => void;
  onEdit: () => void;
}

const RESULT_COLOUR: Record<string, string> = {
  Win: 'text-success',
  Loss: 'text-danger',
  Draw: 'text-warning',
};

export default function CoachMatchStatsModal({ match, teamName, onClose, onEdit }: CoachMatchStatsModalProps) {
  const { statRows, events, nameById, loading, updateComment } = useCoachMatchStats(match.id);
  const [tab, setTab] = useState<'table' | 'map'>('table');
  const [selected, setSelected] = useState<PlayerStatRow | null>(null);

  const reviewedCount = statRows.filter((r) => r.reviewed).length;
  const result = matchResult(
    match.team_score_goals,
    match.team_score_points,
    match.opposition_score_goals,
    match.opposition_score_points,
  );

  // Keep the selected row in sync with refreshed data (e.g. after saving a comment).
  const selectedRow = selected ? statRows.find((r) => r.cmpId === selected.cmpId) ?? selected : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background sm:items-center sm:justify-center sm:bg-black/50 sm:p-4">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="shrink-0 border-b border-border p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-primary dark:text-text">vs {match.opposition}</h3>
              <p className="truncate text-xs text-text-muted">
                {match.competition} · {match.match_date}
              </p>
              <p className="mt-0.5 text-sm font-bold text-text">
                {formatScoreline(
                  teamName,
                  match.team_score_goals,
                  match.team_score_points,
                  match.opposition,
                  match.opposition_score_goals,
                  match.opposition_score_points,
                )}
                <span className={`ml-1.5 text-xs ${RESULT_COLOUR[result]}`}>{result}</span>
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                onClick={onEdit}
                className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted hover:bg-grey-light"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        {/* Tabs (hidden while viewing a single player) */}
        {!selectedRow && (
          <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
            <button
              onClick={() => setTab('table')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                tab === 'table' ? 'bg-primary text-white' : 'bg-grey-light text-text-muted'
              }`}
            >
              Player Stats
            </button>
            <button
              onClick={() => setTab('map')}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                tab === 'map' ? 'bg-primary text-white' : 'bg-grey-light text-text-muted'
              }`}
            >
              Pitch Map
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <p className="py-8 text-center text-sm text-text-muted">Loading stats…</p>
          ) : selectedRow ? (
            <PlayerStatDetail
              row={selectedRow}
              events={events}
              onBack={() => setSelected(null)}
              onSaveComment={updateComment}
            />
          ) : (
            <>
              <p className="mb-2 text-xs text-text-muted">
                {reviewedCount} of {statRows.length} player{statRows.length !== 1 ? 's' : ''} reviewed
              </p>
              {tab === 'table' ? (
                <CoachStatsTable rows={statRows} onRowClick={setSelected} />
              ) : (
                <CoachStatsPitchMap events={events} rows={statRows} nameById={nameById} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

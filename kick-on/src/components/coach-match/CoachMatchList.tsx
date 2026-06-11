'use client';

import { formatScore, matchResult } from '@/lib/coachMatch';
import type { CoachMatch } from '@/types';

interface CoachMatchListProps {
  matches: CoachMatch[];
  loading: boolean;
  onSelect: (match: CoachMatch) => void;
  onDelete: (id: string) => void;
}

const RESULT_DOT: Record<string, string> = {
  Win: 'bg-success',
  Loss: 'bg-danger',
  Draw: 'bg-warning',
};

export default function CoachMatchList({ matches, loading, onSelect, onDelete }: CoachMatchListProps) {
  if (loading) {
    return <p className="py-4 text-center text-xs text-text-muted">Loading games…</p>;
  }
  if (matches.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-text-muted">
        No games yet. Create one to assign players and send a review.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {matches.map((m) => {
        const result = matchResult(
          m.team_score_goals,
          m.team_score_points,
          m.opposition_score_goals,
          m.opposition_score_points,
        );
        return (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-grey-light bg-surface p-3"
          >
            <button onClick={() => onSelect(m)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${RESULT_DOT[result]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-text">
                  vs {m.opposition}
                </span>
                <span className="block truncate text-xs text-text-muted">
                  {m.competition} · {m.match_date}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-bold text-text">
                  {formatScore(m.team_score_goals, m.team_score_points)}
                  {' v '}
                  {formatScore(m.opposition_score_goals, m.opposition_score_points)}
                </span>
                <span
                  className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    m.status === 'sent'
                      ? 'bg-success/15 text-success'
                      : 'bg-grey-light text-text-muted'
                  }`}
                >
                  {m.status === 'sent' ? 'Sent' : 'Draft'}
                </span>
              </span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Delete this game?')) onDelete(m.id);
              }}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
              aria-label="Delete game"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}

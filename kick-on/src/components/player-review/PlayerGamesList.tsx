'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerReviews } from '@/hooks/usePlayerReviews';
import { POSITION_NAMES, formatScore } from '@/lib/coachMatch';
import PlayerReviewScreen from './PlayerReviewScreen';
import type { PlayerGame } from '@/types';

interface PlayerGamesListProps {
  heading: string;
  teamName: string;
  teamId?: string;
  /** 'unreviewed' shows only games still to review; 'all' shows everything. */
  filter: 'unreviewed' | 'all';
  /** What to do when there are no games to show. */
  emptyMode: 'hide' | 'message';
}

export default function PlayerGamesList({
  heading,
  teamName,
  teamId,
  filter,
  emptyMode,
}: PlayerGamesListProps) {
  const { user } = useAuth();
  const { games, loaded, loadGames, markReviewedLocally } = usePlayerReviews();
  const [openGame, setOpenGame] = useState<PlayerGame | null>(null);

  useEffect(() => {
    loadGames(teamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const visible = filter === 'unreviewed' ? games.filter((g) => !g.reviewed) : games;

  // While loading, hide variants render nothing (avoids dashboard flash).
  if (!loaded) {
    if (emptyMode === 'hide') return null;
    return (
      <div>
        <h3 className="mb-2 text-lg font-semibold text-primary dark:text-text">{heading}</h3>
        <p className="text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  if (visible.length === 0 && emptyMode === 'hide') return null;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold text-primary dark:text-text">{heading}</h3>

      {visible.length === 0 ? (
        <div className="rounded-2xl bg-surface p-4 text-center text-sm text-text-muted shadow-sm">
          No games to review yet.
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((g) => (
            <GameCard key={g.match.id} game={g} onReview={() => setOpenGame(g)} />
          ))}
        </div>
      )}

      {openGame && user && (
        <PlayerReviewScreen
          game={openGame}
          playerId={user.id}
          teamName={teamName}
          onClose={() => setOpenGame(null)}
          onReviewed={(id) => markReviewedLocally(id)}
        />
      )}
    </div>
  );
}

function GameCard({ game, onReview }: { game: PlayerGame; onReview: () => void }) {
  const m = game.match;
  return (
    <div className="rounded-2xl bg-surface p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-text">vs {m.opposition}</h4>
          <p className="truncate text-xs text-text-muted">
            {m.competition} · {m.match_date}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            game.reviewed ? 'bg-success/15 text-success' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          }`}
        >
          {game.reviewed ? 'Reviewed' : 'Not reviewed'}
        </span>
      </div>

      <p className="mt-1 text-sm font-bold text-primary dark:text-text">
        {formatScore(m.team_score_goals, m.team_score_points)} v{' '}
        {formatScore(m.opposition_score_goals, m.opposition_score_points)}
      </p>

      <p className="mt-0.5 text-xs text-text-muted">
        {POSITION_NAMES[game.position]}
        {!game.isStarter && game.replacedPlayerName && (
          <span className="text-success">
            {' · '}Sub — came on{game.subMinute != null ? ` at ${game.subMinute}'` : ''} for{' '}
            {game.replacedPlayerName}
          </span>
        )}
      </p>

      <button
        onClick={onReview}
        className="mt-2 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        {game.reviewed ? 'View / Edit Review' : 'Review Game'}
      </button>
    </div>
  );
}

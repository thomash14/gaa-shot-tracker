'use client';

import { useDrag } from './DragProvider';
import type { TeamMember } from '@/types';

interface BenchProps {
  players: TeamMember[];
  title: string;
  emptyText: string;
  selectedPlayerId?: string | null;
  onPlayerClick?: (id: string) => void;
}

/**
 * Droppable panel of available players. Each chip is draggable (pointer) and
 * tappable (select). Dropping a player here unassigns them (handled by parent
 * via the `bench` droppable id).
 */
export default function Bench({
  players,
  title,
  emptyText,
  selectedPlayerId,
  onPlayerClick,
}: BenchProps) {
  const { overId, startDrag } = useDrag();
  const isOver = overId === 'bench';

  return (
    <div
      data-droppable-id="bench"
      className={`flex min-h-[120px] flex-col rounded-xl border p-2 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-grey-light bg-grey-light/40'
      }`}
    >
      <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-text-muted">
        {title} ({players.length})
      </div>
      {players.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-2 py-4 text-center text-xs text-text-muted">
          {emptyText}
        </div>
      ) : (
        <div className="flex flex-wrap content-start gap-1.5">
          {players.map((p) => {
            const selected = p.user_id === selectedPlayerId;
            return (
              <button
                key={p.user_id}
                type="button"
                onPointerDown={(e) =>
                  startDrag({ playerId: p.user_id, name: p.displayName, source: 'bench' }, e)
                }
                onClick={() => onPlayerClick?.(p.user_id)}
                style={{ touchAction: 'none' }}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey bg-surface text-text hover:border-primary'
                }`}
              >
                {p.displayName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useDrag } from './DragProvider';
import { FORMATION_ROWS, POSITION_LABELS, POSITION_NAMES } from '@/lib/coachMatch';
import type { Position, DraftSub } from '@/types';

interface FormationPitchProps {
  starters: Partial<Record<Position, string>>;
  subs: DraftSub[];
  nameOf: (id: string) => string;
  /** Highlighted player from tap-to-select mode. */
  selectedPlayerId?: string | null;
  /** Tap handler for a slot (used by tap-to-place and the subs popup). */
  onSlotClick?: (pos: Position) => void;
  /** Whether occupants can be dragged out of their slot. */
  draggableOccupants?: boolean;
}

export default function FormationPitch({
  starters,
  subs,
  nameOf,
  selectedPlayerId,
  onSlotClick,
  draggableOccupants = true,
}: FormationPitchProps) {
  const { overId, startDrag } = useDrag();

  return (
    <div className="rounded-2xl bg-gradient-to-b from-pitch-green to-[#4a8d5f] p-3 shadow-inner select-none">
      <div className="space-y-2.5">
        {FORMATION_ROWS.map((row) => (
          <div key={row.label} className="flex justify-center gap-2 sm:gap-3">
            {row.positions.map((pos) => {
              const sub = subs.find((s) => s.position === pos);
              const starterId = starters[pos];
              const filled = !!starterId;
              const isOver = overId === pos;
              const isSelectedHere = !!starterId && starterId === selectedPlayerId;
              // Shrink both names slightly when a sub line shares the box.
              const compact = !!sub;

              return (
                <div
                  key={pos}
                  data-droppable-id={pos}
                  onClick={() => onSlotClick?.(pos)}
                  title={POSITION_NAMES[pos]}
                  className={`relative flex h-16 w-[5.5rem] flex-col items-center justify-center rounded-lg border text-center transition-colors sm:w-24 ${
                    filled
                      ? 'border-white/70 bg-white text-text shadow-sm dark:bg-surface'
                      : 'border-dashed border-white/60 bg-white/10 text-white'
                  } ${isOver ? 'ring-2 ring-yellow-300 ring-offset-1 ring-offset-pitch-green' : ''} ${
                    isSelectedHere ? 'ring-2 ring-primary' : ''
                  } ${onSlotClick ? 'cursor-pointer' : ''}`}
                >
                  <span
                    className={`absolute left-1 top-1 text-[9px] font-bold uppercase tracking-wide ${
                      filled ? 'text-text-muted' : 'text-white/80'
                    }`}
                  >
                    {POSITION_LABELS[pos]}
                  </span>

                  {filled ? (
                    <div className="mt-3 flex w-full flex-col items-center px-1 leading-tight">
                      {/* Starter — the main name, draggable */}
                      <span
                        onPointerDown={(e) => {
                          if (!draggableOccupants) return;
                          startDrag(
                            { playerId: starterId, name: nameOf(starterId), source: 'slot', position: pos },
                            e,
                          );
                        }}
                        style={{ touchAction: 'none' }}
                        className={`line-clamp-2 font-semibold ${compact ? 'text-[10px]' : 'text-[11px]'}`}
                      >
                        {nameOf(starterId)}
                      </span>

                      {/* Sub who came on — smaller green line beneath the starter */}
                      {sub && (
                        <span
                          className={`mt-0.5 line-clamp-2 font-semibold text-success ${
                            compact ? 'text-[9px]' : 'text-[10px]'
                          }`}
                        >
                          ↑ {nameOf(sub.subPlayerId)}
                          {sub.minute != null ? ` ${sub.minute}'` : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="mt-1 text-[10px] font-medium text-white/70">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

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
              const occupantId = sub ? sub.subPlayerId : starterId;
              const isOver = overId === pos;
              const isSelectedHere = !!occupantId && occupantId === selectedPlayerId;

              return (
                <div
                  key={pos}
                  data-droppable-id={pos}
                  onClick={() => onSlotClick?.(pos)}
                  title={POSITION_NAMES[pos]}
                  className={`relative flex h-14 w-[5.5rem] flex-col items-center justify-center rounded-lg border text-center transition-colors sm:w-24 ${
                    occupantId
                      ? 'border-white/70 bg-white text-text shadow-sm dark:bg-surface'
                      : 'border-dashed border-white/60 bg-white/10 text-white'
                  } ${isOver ? 'ring-2 ring-yellow-300 ring-offset-1 ring-offset-pitch-green' : ''} ${
                    isSelectedHere ? 'ring-2 ring-primary' : ''
                  } ${onSlotClick ? 'cursor-pointer' : ''}`}
                >
                  <span
                    className={`absolute left-1 top-1 text-[9px] font-bold uppercase tracking-wide ${
                      occupantId ? 'text-text-muted' : 'text-white/80'
                    }`}
                  >
                    {POSITION_LABELS[pos]}
                  </span>

                  {occupantId ? (
                    <span
                      onPointerDown={(e) => {
                        if (!draggableOccupants) return;
                        startDrag(
                          { playerId: occupantId, name: nameOf(occupantId), source: 'slot', position: pos },
                          e,
                        );
                      }}
                      style={{ touchAction: 'none' }}
                      className="mt-1 line-clamp-2 px-1 text-[11px] font-semibold leading-tight"
                    >
                      {nameOf(occupantId)}
                    </span>
                  ) : (
                    <span className="mt-1 text-[10px] font-medium text-white/70">Empty</span>
                  )}

                  {sub && starterId && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-medium text-success">
                      ↑{sub.minute != null ? `${sub.minute}'` : 'sub'}
                    </span>
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

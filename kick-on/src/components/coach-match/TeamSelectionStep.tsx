'use client';

import { useState } from 'react';
import DragProvider, { type DragItem } from './DragProvider';
import FormationPitch from './FormationPitch';
import Bench from './Bench';
import { ALL_POSITIONS } from '@/lib/coachMatch';
import type { Position, DraftSub, TeamMember } from '@/types';

interface Selected {
  playerId: string;
  source: 'bench' | 'slot';
  position?: Position;
}

interface TeamSelectionStepProps {
  starters: Partial<Record<Position, string>>;
  subs: DraftSub[];
  available: TeamMember[];
  nameOf: (id: string) => string;
  starterCount: number;
  onAssign: (playerId: string, pos: Position) => void;
  onMove: (fromPos: Position, toPos: Position) => void;
  onUnassign: (pos: Position) => void;
}

function isPosition(id: string | null): id is Position {
  return !!id && (ALL_POSITIONS as string[]).includes(id);
}

export default function TeamSelectionStep({
  starters,
  subs,
  available,
  nameOf,
  starterCount,
  onAssign,
  onMove,
  onUnassign,
}: TeamSelectionStepProps) {
  const [selected, setSelected] = useState<Selected | null>(null);

  const handleDrop = (item: DragItem, targetId: string | null) => {
    setSelected(null);
    if (isPosition(targetId)) {
      if (item.source === 'bench') onAssign(item.playerId, targetId);
      else if (item.position) onMove(item.position, targetId);
    } else if (targetId === 'bench' || targetId === null) {
      // dropped on bench / outside → unassign
      if (item.source === 'slot' && item.position) onUnassign(item.position);
    }
  };

  const handleSlotClick = (pos: Position) => {
    if (selected) {
      if (selected.source === 'bench') onAssign(selected.playerId, pos);
      else if (selected.position) onMove(selected.position, pos);
      setSelected(null);
      return;
    }
    // Nothing selected: pick up the occupant (if any) to move it
    const sub = subs.find((s) => s.position === pos);
    const occupant = sub ? sub.subPlayerId : starters[pos];
    if (occupant) setSelected({ playerId: occupant, source: 'slot', position: pos });
  };

  const handleBenchClick = (id: string) => {
    setSelected((cur) =>
      cur && cur.source === 'bench' && cur.playerId === id ? null : { playerId: id, source: 'bench' },
    );
  };

  return (
    <DragProvider onDrop={handleDrop}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-text-muted">
            Drag a player onto a position — or tap a player, then tap a slot. Drag a placed player
            to the bench to remove.
          </p>
          <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary">
            {starterCount}/15
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-[210px_1fr]">
          <Bench
            players={available}
            title="Available"
            emptyText="All players assigned"
            selectedPlayerId={selected?.source === 'bench' ? selected.playerId : null}
            onPlayerClick={handleBenchClick}
          />
          <FormationPitch
            starters={starters}
            subs={subs}
            nameOf={nameOf}
            selectedPlayerId={selected?.source === 'slot' ? selected.playerId : null}
            onSlotClick={handleSlotClick}
            draggableOccupants
          />
        </div>
      </div>
    </DragProvider>
  );
}

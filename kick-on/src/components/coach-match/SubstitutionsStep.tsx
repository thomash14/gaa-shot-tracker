'use client';

import { useState } from 'react';
import DragProvider, { type DragItem } from './DragProvider';
import FormationPitch from './FormationPitch';
import Bench from './Bench';
import { ALL_POSITIONS, POSITION_NAMES } from '@/lib/coachMatch';
import type { Position, DraftSub, TeamMember } from '@/types';

interface SubstitutionsStepProps {
  starters: Partial<Record<Position, string>>;
  subs: DraftSub[];
  available: TeamMember[];
  nameOf: (id: string) => string;
  onAddSub: (sub: DraftSub) => void;
  onRemoveSub: (id: string) => void;
}

function isPosition(id: string | null): id is Position {
  return !!id && (ALL_POSITIONS as string[]).includes(id);
}

interface PendingSub {
  subPlayerId: string;
  position: Position;
  replacedPlayerId: string;
}

export default function SubstitutionsStep({
  starters,
  subs,
  available,
  nameOf,
  onAddSub,
  onRemoveSub,
}: SubstitutionsStepProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingSub | null>(null);
  const [minute, setMinute] = useState('');
  const [note, setNote] = useState('');

  const beginSub = (subPlayerId: string, pos: Position) => {
    const starterId = starters[pos];
    if (!starterId) {
      setNote('That position has no starter to replace.');
      return;
    }
    if (subs.some((s) => s.position === pos)) {
      setNote('That position already has a substitution.');
      return;
    }
    setNote('');
    setSelected(null);
    setPending({ subPlayerId, position: pos, replacedPlayerId: starterId });
    setMinute('');
  };

  const handleDrop = (item: DragItem, targetId: string | null) => {
    if (item.source !== 'bench') return; // occupants are not draggable in this step
    if (isPosition(targetId)) beginSub(item.playerId, targetId);
  };

  const handleSlotClick = (pos: Position) => {
    if (!selected) return;
    beginSub(selected, pos);
  };

  const confirmSub = () => {
    if (!pending) return;
    onAddSub({
      id: crypto.randomUUID(),
      position: pending.position,
      subPlayerId: pending.subPlayerId,
      replacedPlayerId: pending.replacedPlayerId,
      minute: minute.trim() ? Math.max(0, parseInt(minute, 10) || 0) : null,
    });
    setPending(null);
  };

  return (
    <DragProvider onDrop={handleDrop}>
      <div className="space-y-3">
        <p className="text-xs text-text-muted">
          Drag a bench player onto an occupied position to record a substitution — or tap a player,
          then tap the position they came on for.
        </p>
        {note && <p className="text-xs font-semibold text-warning">{note}</p>}

        <div className="grid gap-3 sm:grid-cols-[210px_1fr]">
          <Bench
            players={available}
            title="Bench"
            emptyText="No players on the bench"
            selectedPlayerId={selected}
            onPlayerClick={(id) => setSelected((cur) => (cur === id ? null : id))}
          />
          <FormationPitch
            starters={starters}
            subs={subs}
            nameOf={nameOf}
            onSlotClick={handleSlotClick}
            draggableOccupants={false}
          />
        </div>

        {/* Recorded subs */}
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Substitutions ({subs.length})
          </h4>
          {subs.length === 0 ? (
            <p className="text-xs text-text-muted">No substitutions recorded.</p>
          ) : (
            <ul className="space-y-1.5">
              {subs.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-grey-light bg-surface px-3 py-2 text-xs"
                >
                  <span className="min-w-0">
                    <span className="font-semibold text-success">{nameOf(s.subPlayerId)}</span>
                    {' for '}
                    <span className="font-semibold text-text">{nameOf(s.replacedPlayerId)}</span>
                    <span className="text-text-muted">
                      {' · '}
                      {POSITION_NAMES[s.position]}
                      {s.minute != null ? ` · ${s.minute}'` : ''}
                    </span>
                  </span>
                  <button
                    onClick={() => onRemoveSub(s.id)}
                    className="shrink-0 rounded-md px-2 py-1 font-semibold text-danger hover:bg-danger/10"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Confirm popup */}
      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPending(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-surface p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-bold text-primary dark:text-text">Substitution</h4>
            <p className="mt-2 text-sm text-text">
              <span className="font-semibold text-success">{nameOf(pending.subPlayerId)}</span>
              {' replacing '}
              <span className="font-semibold">{nameOf(pending.replacedPlayerId)}</span>
            </p>
            <p className="text-xs text-text-muted">{POSITION_NAMES[pending.position]}</p>

            <label className="mt-3 block text-xs font-semibold text-text">Minute (optional)</label>
            <input
              type="number"
              min={0}
              value={minute}
              autoFocus
              onChange={(e) => setMinute(e.target.value)}
              placeholder="e.g. 52"
              className="mt-1 w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setPending(null)}
                className="flex-1 rounded-lg bg-grey-light py-2 text-sm font-semibold text-text-muted hover:bg-grey"
              >
                Cancel
              </button>
              <button
                onClick={confirmSub}
                className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </DragProvider>
  );
}

'use client';

import { useState } from 'react';
import type { CoachMatchDraft, DraftComment, TeamMember } from '@/types';

interface NotesStepProps {
  draft: CoachMatchDraft;
  members: TeamMember[];
  /** Player ids currently in the match (starters + subs). */
  usedIds: Set<string>;
  nameOf: (id: string) => string;
  patch: (p: Partial<CoachMatchDraft>) => void;
}

export default function NotesStep({ draft, members, usedIds, nameOf, patch }: NotesStepProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const missingIds = new Set(draft.missing.map((m) => m.playerId));
  const missingCandidates = members.filter(
    (m) => !usedIds.has(m.user_id) && !missingIds.has(m.user_id),
  );
  const inMatch = members.filter((m) => usedIds.has(m.user_id));

  // ----- missing players -----
  const addMissing = (playerId: string) => {
    if (!playerId) return;
    patch({ missing: [...draft.missing, { playerId, reason: '' }] });
  };
  const updateMissingReason = (playerId: string, reason: string) => {
    patch({ missing: draft.missing.map((m) => (m.playerId === playerId ? { ...m, reason } : m)) });
  };
  const removeMissing = (playerId: string) => {
    patch({ missing: draft.missing.filter((m) => m.playerId !== playerId) });
  };

  // ----- per-player comments -----
  const commentFor = (playerId: string): DraftComment | undefined =>
    draft.playerComments.find((c) => c.playerId === playerId);

  const setComment = (playerId: string, updates: Partial<DraftComment>) => {
    const existing = commentFor(playerId);
    let next: DraftComment[];
    if (existing) {
      next = draft.playerComments.map((c) =>
        c.playerId === playerId ? { ...c, ...updates } : c,
      );
    } else {
      next = [
        ...draft.playerComments,
        { playerId, comment: '', visibleToPlayer: false, ...updates },
      ];
    }
    patch({ playerComments: next });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <label className="mb-1 block text-xs font-semibold text-text">What went well?</label>
        <textarea
          value={draft.whatWentWell}
          onChange={(e) => patch({ whatWentWell: e.target.value })}
          rows={3}
          placeholder="Optional"
          className="w-full resize-none rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-text">What went poorly?</label>
        <textarea
          value={draft.whatWentPoorly}
          onChange={(e) => patch({ whatWentPoorly: e.target.value })}
          rows={3}
          placeholder="Optional"
          className="w-full resize-none rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-text">General comments</label>
        <textarea
          value={draft.comments}
          onChange={(e) => patch({ comments: e.target.value })}
          rows={2}
          placeholder="Weather, opposition notes, etc. (optional)"
          className="w-full resize-none rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
        />
      </div>

      {/* Missing players */}
      <div className="rounded-xl border border-grey-light p-3">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
          Missing Players
        </h4>
        {draft.missing.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {draft.missing.map((m) => (
              <li key={m.playerId} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-xs font-semibold text-text">
                  {nameOf(m.playerId)}
                </span>
                <input
                  type="text"
                  value={m.reason}
                  onChange={(e) => updateMissingReason(m.playerId, e.target.value)}
                  placeholder="Reason (e.g. injured)"
                  className="min-w-0 flex-1 rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
                />
                <button
                  onClick={() => removeMissing(m.playerId)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {missingCandidates.length > 0 ? (
          <select
            value=""
            onChange={(e) => addMissing(e.target.value)}
            className="w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
          >
            <option value="">+ Add missing player…</option>
            {missingCandidates.map((m) => (
              <option key={m.user_id} value={m.user_id}>{m.displayName}</option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-text-muted">No more players to add.</p>
        )}
      </div>

      {/* Per-player comments */}
      <div className="rounded-xl border border-grey-light p-3">
        <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-text-muted">
          Player Comments
        </h4>
        {inMatch.length === 0 ? (
          <p className="text-xs text-text-muted">Assign players first to comment on them.</p>
        ) : (
          <ul className="space-y-1.5">
            {inMatch.map((m) => {
              const c = commentFor(m.user_id);
              const isOpen = expanded === m.user_id;
              const hasComment = !!c?.comment.trim();
              return (
                <li key={m.user_id} className="rounded-lg border border-grey-light">
                  <button
                    onClick={() => setExpanded(isOpen ? null : m.user_id)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-text"
                  >
                    <span className="truncate">
                      {m.displayName}
                      {hasComment && <span className="ml-1.5 text-[10px] text-primary">• noted</span>}
                      {hasComment && c?.visibleToPlayer && (
                        <span className="ml-1 text-[10px] text-success">visible</span>
                      )}
                    </span>
                    <span className="shrink-0 text-text-muted">{isOpen ? '▲' : '▼'}</span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t border-grey-light p-2">
                      <textarea
                        value={c?.comment ?? ''}
                        onChange={(e) => setComment(m.user_id, { comment: e.target.value })}
                        rows={2}
                        placeholder={`Comment about ${m.displayName}`}
                        className="w-full resize-none rounded-lg border border-grey bg-surface px-2 py-1.5 text-xs"
                      />
                      <label className="flex items-center gap-2 text-xs text-text">
                        <input
                          type="checkbox"
                          checked={c?.visibleToPlayer ?? false}
                          onChange={(e) =>
                            setComment(m.user_id, { visibleToPlayer: e.target.checked })
                          }
                        />
                        Visible to player
                      </label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

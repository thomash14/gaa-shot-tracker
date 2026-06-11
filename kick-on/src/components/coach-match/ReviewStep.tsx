'use client';

import DragProvider from './DragProvider';
import FormationPitch from './FormationPitch';
import { formatScoreline, matchResult, POSITION_NAMES } from '@/lib/coachMatch';
import type { CoachMatchDraft, TeamMember } from '@/types';

interface ReviewStepProps {
  draft: CoachMatchDraft;
  teamName: string;
  members: TeamMember[];
  nameOf: (id: string) => string;
}

const RESULT_COLOUR: Record<string, string> = {
  Win: 'text-success',
  Loss: 'text-danger',
  Draw: 'text-warning',
};

export default function ReviewStep({ draft, teamName, nameOf }: ReviewStepProps) {
  const result = matchResult(
    draft.teamScoreGoals,
    draft.teamScorePoints,
    draft.oppositionScoreGoals,
    draft.oppositionScorePoints,
  );
  const starterCount = Object.values(draft.starters).filter(Boolean).length;
  const comments = draft.playerComments.filter((c) => c.comment.trim());

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Match header */}
      <div className="rounded-xl bg-surface p-3 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {draft.competition} · {draft.matchDate}
        </div>
        <div className="mt-1 text-base font-bold text-primary dark:text-text">
          {formatScoreline(
            teamName,
            draft.teamScoreGoals,
            draft.teamScorePoints,
            draft.opposition,
            draft.oppositionScoreGoals,
            draft.oppositionScorePoints,
          )}
        </div>
        <div className={`mt-0.5 text-xs font-bold ${RESULT_COLOUR[result]}`}>{result}</div>
      </div>

      {/* Formation */}
      <div>
        <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
          Formation ({starterCount}/15)
        </h4>
        <DragProvider onDrop={() => {}}>
          <FormationPitch
            starters={draft.starters}
            subs={draft.subs}
            nameOf={nameOf}
            draggableOccupants={false}
          />
        </DragProvider>
      </div>

      {/* Subs */}
      {draft.subs.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Substitutions
          </h4>
          <ul className="space-y-1 text-xs">
            {draft.subs.map((s) => (
              <li key={s.id} className="rounded-lg bg-surface px-3 py-2 shadow-sm">
                <span className="font-semibold text-success">{nameOf(s.subPlayerId)}</span>
                {' for '}
                <span className="font-semibold text-text">{nameOf(s.replacedPlayerId)}</span>
                <span className="text-text-muted">
                  {' · '}
                  {POSITION_NAMES[s.position]}
                  {s.minute != null ? ` · ${s.minute}'` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {(draft.whatWentWell.trim() || draft.whatWentPoorly.trim() || draft.comments.trim()) && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-muted">Notes</h4>
          {draft.whatWentWell.trim() && (
            <NoteBlock label="What went well" text={draft.whatWentWell} accent="text-success" />
          )}
          {draft.whatWentPoorly.trim() && (
            <NoteBlock label="What went poorly" text={draft.whatWentPoorly} accent="text-danger" />
          )}
          {draft.comments.trim() && (
            <NoteBlock label="Comments" text={draft.comments} accent="text-text-muted" />
          )}
        </div>
      )}

      {/* Missing */}
      {draft.missing.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Missing Players
          </h4>
          <ul className="space-y-1 text-xs">
            {draft.missing.map((m) => (
              <li key={m.playerId} className="rounded-lg bg-surface px-3 py-2 shadow-sm">
                <span className="font-semibold text-text">{nameOf(m.playerId)}</span>
                {m.reason.trim() && <span className="text-text-muted"> · {m.reason}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Player comments */}
      {comments.length > 0 && (
        <div>
          <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
            Player Comments
          </h4>
          <ul className="space-y-1 text-xs">
            {comments.map((c) => (
              <li key={c.playerId} className="rounded-lg bg-surface px-3 py-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-text">{nameOf(c.playerId)}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      c.visibleToPlayer ? 'text-success' : 'text-text-muted'
                    }`}
                  >
                    {c.visibleToPlayer ? 'Visible to player' : 'Coach only'}
                  </span>
                </div>
                <p className="mt-0.5 text-text-muted">{c.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="pt-1 text-center text-[11px] text-text-muted">
        “Save as Draft” keeps this private. “Send to Players” makes it visible to the players
        involved.
      </p>
    </div>
  );
}

function NoteBlock({ label, text, accent }: { label: string; text: string; accent: string }) {
  return (
    <div className="rounded-lg bg-surface px-3 py-2 shadow-sm">
      <div className={`text-[10px] font-bold uppercase ${accent}`}>{label}</div>
      <p className="mt-0.5 whitespace-pre-wrap text-xs text-text">{text}</p>
    </div>
  );
}

'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { defaultMatchTypeOptions } from '@/lib/filterOptions';
import { ALL_POSITIONS } from '@/lib/coachMatch';
import type {
  TeamMember,
  Position,
  CoachMatchDraft,
  CoachMatchStatus,
  CoachMatchDetail,
  DraftSub,
} from '@/types';
import TeamSelectionStep from './TeamSelectionStep';
import SubstitutionsStep from './SubstitutionsStep';
import NotesStep from './NotesStep';
import ReviewStep from './ReviewStep';

const CUSTOM_SENTINEL = '__custom__';

const STEPS = ['Details', 'Team', 'Subs', 'Notes', 'Review'] as const;

interface CreateGameModalProps {
  open: boolean;
  teamName: string;
  members: TeamMember[];
  /** When set, the wizard edits an existing match instead of creating one. */
  editing?: CoachMatchDetail | null;
  onSave: (draft: CoachMatchDraft, existingId?: string) => Promise<void>;
  onClose: () => void;
}

function emptyDraft(): CoachMatchDraft {
  return {
    competition: 'League',
    opposition: '',
    matchDate: new Date().toISOString().split('T')[0],
    teamScoreGoals: 0,
    teamScorePoints: 0,
    oppositionScoreGoals: 0,
    oppositionScorePoints: 0,
    whatWentWell: '',
    whatWentPoorly: '',
    comments: '',
    starters: {},
    subs: [],
    missing: [],
    playerComments: [],
    status: 'draft',
  };
}

/** Rehydrate a draft from a loaded match (for editing). */
function draftFromDetail(detail: CoachMatchDetail): CoachMatchDraft {
  const starters: Partial<Record<Position, string>> = {};
  const subs: DraftSub[] = [];
  const playerComments: CoachMatchDraft['playerComments'] = [];

  detail.players.forEach((p, i) => {
    if (p.is_starter) {
      starters[p.position] = p.player_id;
    } else {
      subs.push({
        id: `sub_${i}`,
        position: p.position,
        subPlayerId: p.player_id,
        replacedPlayerId: p.replaced_player_id ?? '',
        minute: p.sub_minute,
      });
    }
    if (p.coach_comment) {
      playerComments.push({
        playerId: p.player_id,
        comment: p.coach_comment,
        visibleToPlayer: p.comment_visible_to_player,
      });
    }
  });

  return {
    competition: detail.competition,
    opposition: detail.opposition,
    matchDate: detail.match_date,
    teamScoreGoals: detail.team_score_goals,
    teamScorePoints: detail.team_score_points,
    oppositionScoreGoals: detail.opposition_score_goals,
    oppositionScorePoints: detail.opposition_score_points,
    whatWentWell: detail.what_went_well ?? '',
    whatWentPoorly: detail.what_went_poorly ?? '',
    comments: detail.comments ?? '',
    starters,
    subs,
    missing: detail.missing.map((m) => ({ playerId: m.player_id, reason: m.reason ?? '' })),
    playerComments,
    status: detail.status,
  };
}

export default function CreateGameModal({
  open,
  teamName,
  members,
  editing,
  onSave,
  onClose,
}: CreateGameModalProps) {
  const customCompetitions = useSessionStore((s) => s.customCompetitions);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CoachMatchDraft>(emptyDraft);
  const [customComp, setCustomComp] = useState('');
  const [compMode, setCompMode] = useState<string>('League');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [initialised, setInitialised] = useState(false);

  // Initialise / reset whenever the modal opens
  if (open && !initialised) {
    if (editing) {
      const d = draftFromDetail(editing);
      const known = [
        ...defaultMatchTypeOptions().map((o) => o.label),
        ...customCompetitions,
      ];
      const isKnown = known.includes(d.competition);
      setDraft(d);
      setCompMode(isKnown ? d.competition : CUSTOM_SENTINEL);
      setCustomComp(isKnown ? '' : d.competition);
    } else {
      setDraft(emptyDraft());
      setCompMode('League');
      setCustomComp('');
    }
    setStep(0);
    setError('');
    setInitialised(true);
  }
  if (!open && initialised) setInitialised(false);

  const nameOf = useCallback(
    (id: string) => members.find((m) => m.user_id === id)?.displayName ?? 'Unknown',
    [members],
  );

  // Players already used (starters or subs) are off the bench
  const usedIds = useMemo(() => {
    const ids = new Set<string>(Object.values(draft.starters).filter(Boolean) as string[]);
    draft.subs.forEach((s) => ids.add(s.subPlayerId));
    return ids;
  }, [draft.starters, draft.subs]);

  const available = useMemo(
    () => members.filter((m) => !usedIds.has(m.user_id)),
    [members, usedIds],
  );

  // -------------------------------------------------------------------------
  // Draft mutators
  // -------------------------------------------------------------------------
  const patch = useCallback((p: Partial<CoachMatchDraft>) => setDraft((d) => ({ ...d, ...p })), []);

  /** Drop any sub whose replaced starter no longer occupies its position. */
  const pruneSubs = useCallback(
    (starters: Partial<Record<Position, string>>, subs: DraftSub[]) =>
      subs.filter((s) => starters[s.position] === s.replacedPlayerId),
    [],
  );

  const assignStarter = useCallback((playerId: string, pos: Position) => {
    setDraft((d) => {
      const starters = { ...d.starters };
      // Remove the player from any other slot they might occupy
      for (const p of ALL_POSITIONS) {
        if (starters[p] === playerId) delete starters[p];
      }
      starters[pos] = playerId;
      return { ...d, starters, subs: pruneSubs(starters, d.subs) };
    });
  }, [pruneSubs]);

  const moveStarter = useCallback((fromPos: Position, toPos: Position) => {
    if (fromPos === toPos) return;
    setDraft((d) => {
      const starters = { ...d.starters };
      const moving = starters[fromPos];
      const target = starters[toPos];
      if (!moving) return d;
      starters[toPos] = moving;
      if (target) starters[fromPos] = target;
      else delete starters[fromPos];
      return { ...d, starters, subs: pruneSubs(starters, d.subs) };
    });
  }, [pruneSubs]);

  const unassignStarter = useCallback((pos: Position) => {
    setDraft((d) => {
      const starters = { ...d.starters };
      delete starters[pos];
      return { ...d, starters, subs: pruneSubs(starters, d.subs) };
    });
  }, [pruneSubs]);

  const addSub = useCallback((sub: DraftSub) => {
    setDraft((d) => ({ ...d, subs: [...d.subs.filter((s) => s.position !== sub.position), sub] }));
  }, []);

  const removeSub = useCallback((id: string) => {
    setDraft((d) => ({ ...d, subs: d.subs.filter((s) => s.id !== id) }));
  }, []);

  // -------------------------------------------------------------------------
  // Competition select
  // -------------------------------------------------------------------------
  const defaultComps = defaultMatchTypeOptions().map((o) => o.label); // League, Club Championship, Challenge

  function handleCompChange(value: string) {
    setCompMode(value);
    if (value === CUSTOM_SENTINEL) {
      patch({ competition: customComp.trim() });
    } else {
      patch({ competition: value });
    }
  }

  const starterCount = Object.values(draft.starters).filter(Boolean).length;

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------
  const doSave = useCallback(
    async (status: CoachMatchStatus) => {
      setError('');
      if (!draft.opposition.trim()) {
        setError('Opposition is required.');
        setStep(0);
        return;
      }
      if (!draft.competition.trim()) {
        setError('Competition is required.');
        setStep(0);
        return;
      }
      setSaving(true);
      try {
        await onSave({ ...draft, status }, editing?.id);
        onClose();
      } catch (err) {
        setError('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setSaving(false);
      }
    },
    [draft, editing?.id, onSave, onClose],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl sm:shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-primary dark:text-text">
              {editing ? 'Edit Game' : 'Create Game'}
            </h3>
            <p className="truncate text-xs text-text-muted">{teamName}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold text-text-muted hover:bg-grey-light"
          >
            Close
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold transition-colors ${
                i === step
                  ? 'bg-primary text-white'
                  : i < step
                    ? 'bg-primary/15 text-primary'
                    : 'bg-grey-light text-text-muted'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* STEP 1 — Match details */}
          {step === 0 && (
            <div className="mx-auto max-w-md space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text">Competition</label>
                <select
                  value={compMode}
                  onChange={(e) => handleCompChange(e.target.value)}
                  className="w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
                >
                  {defaultComps.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  {customCompetitions.length > 0 && (
                    <optgroup label="Saved">
                      {customCompetitions.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </optgroup>
                  )}
                  <option value={CUSTOM_SENTINEL}>Custom...</option>
                </select>
                {compMode === CUSTOM_SENTINEL && (
                  <input
                    type="text"
                    value={customComp}
                    onChange={(e) => {
                      setCustomComp(e.target.value);
                      patch({ competition: e.target.value.trim() });
                    }}
                    placeholder="e.g. North Kerry League"
                    className="mt-2 w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-text">Opposition</label>
                <input
                  type="text"
                  value={draft.opposition}
                  onChange={(e) => patch({ opposition: e.target.value })}
                  placeholder="e.g. Dr Crokes"
                  className="w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-text">Match Date</label>
                <input
                  type="date"
                  value={draft.matchDate}
                  onChange={(e) => patch({ matchDate: e.target.value })}
                  className="w-full rounded-lg border border-grey bg-surface px-3 py-2 text-sm"
                />
              </div>

              {/* Scores */}
              <div className="rounded-xl border border-grey-light p-3">
                <ScoreRow
                  label={teamName || 'Team'}
                  goals={draft.teamScoreGoals}
                  points={draft.teamScorePoints}
                  onGoals={(v) => patch({ teamScoreGoals: v })}
                  onPoints={(v) => patch({ teamScorePoints: v })}
                />
                <div className="my-2 border-t border-grey-light" />
                <ScoreRow
                  label={draft.opposition.trim() || 'Opposition'}
                  goals={draft.oppositionScoreGoals}
                  points={draft.oppositionScorePoints}
                  onGoals={(v) => patch({ oppositionScoreGoals: v })}
                  onPoints={(v) => patch({ oppositionScorePoints: v })}
                />
                <div className="mt-3 text-center text-sm font-bold text-primary dark:text-text">
                  {(teamName || 'Team')} {draft.teamScoreGoals}-{String(draft.teamScorePoints).padStart(2, '0')}
                  {'  vs  '}
                  {(draft.opposition.trim() || 'Opposition')} {draft.oppositionScoreGoals}-{String(draft.oppositionScorePoints).padStart(2, '0')}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — Team selection */}
          {step === 1 && (
            <TeamSelectionStep
              starters={draft.starters}
              subs={draft.subs}
              available={available}
              nameOf={nameOf}
              starterCount={starterCount}
              onAssign={assignStarter}
              onMove={moveStarter}
              onUnassign={unassignStarter}
            />
          )}

          {/* STEP 3 — Substitutions */}
          {step === 2 && (
            <SubstitutionsStep
              starters={draft.starters}
              subs={draft.subs}
              available={available}
              nameOf={nameOf}
              onAddSub={addSub}
              onRemoveSub={removeSub}
            />
          )}

          {/* STEP 4 — Notes & comments */}
          {step === 3 && (
            <NotesStep
              draft={draft}
              members={members}
              usedIds={usedIds}
              nameOf={nameOf}
              patch={patch}
            />
          )}

          {/* STEP 5 — Review */}
          {step === 4 && (
            <ReviewStep draft={draft} teamName={teamName} members={members} nameOf={nameOf} />
          )}

          {error && <p className="mt-3 text-center text-xs font-semibold text-danger">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-text-muted hover:bg-grey-light disabled:opacity-40"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Next
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => doSave('draft')}
                disabled={saving}
                className="rounded-lg border-2 border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
              <button
                onClick={() => doSave('sent')}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Send to Players'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score row
// ---------------------------------------------------------------------------
function ScoreRow({
  label,
  goals,
  points,
  onGoals,
  onPoints,
}: {
  label: string;
  goals: number;
  points: number;
  onGoals: (v: number) => void;
  onPoints: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{label}</span>
      <NumberInput label="Goals" value={goals} onChange={onGoals} />
      <span className="text-text-muted">-</span>
      <NumberInput label="Points" value={points} onChange={onPoints} />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col items-center">
      <span className="mb-0.5 text-[9px] font-semibold uppercase text-text-muted">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value, 10) || 0))}
        className="w-14 rounded-lg border border-grey bg-surface px-2 py-1.5 text-center text-sm"
      />
    </label>
  );
}

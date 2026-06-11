'use client';

import { useEffect, useState } from 'react';
import { useCoachMatches } from '@/hooks/useCoachMatches';
import CoachMatchList from './CoachMatchList';
import CreateGameModal from './CreateGameModal';
import type { CoachMatch, CoachMatchDetail, CoachMatchDraft, TeamMember } from '@/types';

interface CoachMatchSectionProps {
  teamName: string;
  members: TeamMember[];
}

/**
 * Coach-only "Match Reviews" card for the Team page. Lists created games and
 * hosts the create / edit wizard.
 */
export default function CoachMatchSection({ teamName, members }: CoachMatchSectionProps) {
  const {
    coachMatches,
    coachMatchesLoaded,
    loadCoachMatches,
    loadCoachMatchDetail,
    saveCoachMatch,
    deleteCoachMatch,
  } = useCoachMatches();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoachMatchDetail | null>(null);

  useEffect(() => {
    loadCoachMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleSelect = async (match: CoachMatch) => {
    const detail = await loadCoachMatchDetail(match.id);
    if (!detail) {
      alert('Could not load this game.');
      return;
    }
    setEditing(detail);
    setModalOpen(true);
  };

  const handleSave = async (draft: CoachMatchDraft, existingId?: string) => {
    await saveCoachMatch(draft, existingId);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoachMatch(id);
    } catch {
      alert('Failed to delete game.');
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-text">Match Reviews</h3>
          <p className="text-xs text-text-muted">Create a game and send stats to players</p>
        </div>
        <button
          onClick={handleCreate}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
        >
          + Create Game
        </button>
      </div>

      <CoachMatchList
        matches={coachMatches}
        loading={!coachMatchesLoaded}
        onSelect={handleSelect}
        onDelete={handleDelete}
      />

      <CreateGameModal
        open={modalOpen}
        teamName={teamName}
        members={members}
        editing={editing}
        onSave={handleSave}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import type { Team } from '@/types';

const AGE_GROUPS = [
  'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Minor', 'Junior', 'Intermediate', 'Senior',
];

const CATEGORIES = ['Boys', 'Girls', "Men's", "Women's", 'Mixed'];

interface EditTeamModalProps {
  open: boolean;
  team: Team;
  onSave: (data: { ageGroup: string; teamName: string; seasonYear: number }) => Promise<void>;
  onClose: () => void;
}

export default function EditTeamModal({ open, team, onSave, onClose }: EditTeamModalProps) {
  const [ageGroup, setAgeGroup] = useState(team.age_group);
  const [teamName, setTeamName] = useState(team.team_name ?? '');
  const [seasonYear, setSeasonYear] = useState(team.season_year);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setAgeGroup(team.age_group);
      setTeamName(team.team_name ?? '');
      setSeasonYear(team.season_year);
      setError('');
    }
  }, [open, team]);

  if (!open) return null;

  const handleSave = async () => {
    if (!ageGroup) {
      setError('Age group is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({ ageGroup, teamName: teamName.trim(), seasonYear });
      onClose();
    } catch (err) {
      setError('Failed to update team: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Edit Team</h3>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Club</label>
            <p className="text-sm text-text-muted bg-grey-light rounded-lg px-3 py-2">
              {team.clubs?.name ?? 'Unknown Club'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Age Group *</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select age group...</option>
              {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Category (optional)</label>
            <select
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Season</label>
            <select
              value={seasonYear}
              onChange={(e) => setSeasonYear(Number(e.target.value))}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y} Season</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-[#f44336] font-semibold">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

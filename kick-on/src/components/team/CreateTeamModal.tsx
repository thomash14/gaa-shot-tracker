'use client';

import { useState, useEffect } from 'react';

// Age group options matching the old app
const AGE_GROUPS = [
  'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19', 'U20', 'U21', 'Minor', 'Junior', 'Intermediate', 'Senior',
];

interface CreateTeamModalProps {
  open: boolean;
  clubsByCounty: Record<string, string[]>;
  onCreateTeam: (county: string, clubName: string, ageGroup: string, teamName: string) => Promise<string>;
  onClose: () => void;
}

export default function CreateTeamModal({ open, clubsByCounty, onCreateTeam, onClose }: CreateTeamModalProps) {
  const [county, setCounty] = useState('');
  const [clubName, setClubName] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const counties = Object.keys(clubsByCounty).sort();
  const clubs = county ? (clubsByCounty[county] ?? []) : [];

  useEffect(() => {
    if (open) {
      setCounty('');
      setClubName('');
      setAgeGroup('');
      setTeamName('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = async () => {
    if (!county || !clubName || !ageGroup) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const inviteCode = await onCreateTeam(county, clubName, ageGroup, teamName);
      onClose();
      alert(`Team created! Your invite code is: ${inviteCode}`);
    } catch (err) {
      setError('Failed to create team: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary">Create Team</h3>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">County *</label>
            <select
              value={county}
              onChange={(e) => { setCounty(e.target.value); setClubName(''); }}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select county...</option>
              {counties.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Club *</label>
            <select
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              disabled={!county}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">{county ? 'Select club...' : 'Select county first...'}</option>
              {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
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
            <label className="block text-xs font-semibold text-text mb-1">Team Name (optional)</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g., A Team"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-xs text-[#f44336] font-semibold">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  );
}

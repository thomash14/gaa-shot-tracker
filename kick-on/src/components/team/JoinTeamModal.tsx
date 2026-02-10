'use client';

import { useState, useEffect, useCallback } from 'react';

interface JoinTeamModalProps {
  open: boolean;
  onLookup: (code: string) => Promise<{ club_name: string; age_group: string; team_name?: string } | null>;
  onJoin: (code: string) => Promise<void>;
  onClose: () => void;
}

export default function JoinTeamModal({ open, onLookup, onJoin, onClose }: JoinTeamModalProps) {
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<{ club_name: string; age_group: string; team_name?: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCode('');
      setPreview(null);
      setError('');
    }
  }, [open]);

  const handleCodeChange = useCallback(async (value: string) => {
    const upper = value.toUpperCase();
    setCode(upper);
    setPreview(null);
    setError('');

    if (upper.length === 6) {
      try {
        const result = await onLookup(upper);
        if (result) {
          setPreview(result);
        } else {
          setError('No team found with this code');
        }
      } catch {
        // ignore lookup errors
      }
    }
  }, [onLookup]);

  if (!open) return null;

  const handleJoin = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-character code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onJoin(code);
      onClose();
      alert('Successfully joined the team!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary">Join Team</h3>
          <p className="text-xs text-text-muted mt-1">Enter the 6-character invite code from your coach</p>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Invite Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value.slice(0, 6))}
              placeholder="e.g., ABC123"
              maxLength={6}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-lg font-mono text-center tracking-widest uppercase"
              autoFocus
            />
          </div>

          {/* Team preview */}
          {preview && (
            <div className="bg-[#4CAF50]/10 rounded-lg p-3 text-center">
              <p className="text-sm font-semibold text-text">{preview.club_name}</p>
              <p className="text-xs text-text-muted mt-0.5">
                {preview.age_group}{preview.team_name ? ` \u00b7 ${preview.team_name}` : ''}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-[#f44336] font-semibold text-center">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={!preview || loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {loading ? 'Joining...' : 'Join Team'}
          </button>
        </div>
      </div>
    </div>
  );
}

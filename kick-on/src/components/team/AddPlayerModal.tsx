'use client';

import { useState, useEffect } from 'react';

interface AddPlayerModalProps {
  open: boolean;
  onAdd: (name: string, email?: string) => Promise<void>;
  onClose: () => void;
}

export default function AddPlayerModal({ open, onAdd, onClose }: AddPlayerModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) {
      setError('Player name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onAdd(name.trim(), email.trim() || undefined);
      onClose();
    } catch (err) {
      setError('Failed to add player: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-surface rounded-2xl shadow-xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Add Player</h3>
          <p className="text-xs text-text-muted mt-1">
            Add a player directly to your team. They&apos;ll appear in the roster and can be
            assigned to matches and drills — no sign-up needed.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Player Name</label>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="e.g. Seán Ó Briain"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              placeholder="e.g. sean@example.com"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-text-muted mt-1">
              Leave blank if unknown — a placeholder will be used until they sign up.
            </p>
          </div>

          {error && <p className="text-xs text-[#f44336] font-semibold">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Adding…' : 'Add Player'}
          </button>
        </div>
      </div>
    </div>
  );
}

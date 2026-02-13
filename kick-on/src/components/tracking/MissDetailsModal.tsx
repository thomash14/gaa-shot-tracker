'use client';

import { useState, useEffect } from 'react';

const MISS_RESULTS = [
  { value: '', label: 'Select...' },
  { value: 'wide-left', label: 'Wide Left' },
  { value: 'wide-right', label: 'Wide Right' },
  { value: 'short', label: 'Short' },
  { value: 'over', label: 'Over' },
  { value: 'hit-post', label: 'Hit Post' },
  { value: 'saved', label: 'Saved' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'dropped-short', label: 'Dropped Short' },
];

const MISS_REASONS = [
  { value: '', label: 'Select...' },
  { value: 'pulled', label: 'Pulled' },
  { value: 'rushed', label: 'Rushed' },
  { value: 'bad-connection', label: 'Bad Connection' },
  { value: 'outside-range', label: 'Outside Range' },
  { value: 'at-limits', label: 'At Limits' },
  { value: 'other', label: 'Other' },
];

interface MissDetailsModalProps {
  open: boolean;
  isNewShot: boolean;
  initialMissResult?: string;
  initialMissReason?: string;
  initialComment?: string;
  onSave: (missResult: string | null, missReason: string | null, comment: string) => void;
  onClose: () => void;
}

export default function MissDetailsModal({
  open,
  isNewShot,
  initialMissResult,
  initialMissReason,
  initialComment,
  onSave,
  onClose,
}: MissDetailsModalProps) {
  const [missResult, setMissResult] = useState('');
  const [missReason, setMissReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [comment, setComment] = useState('');

  // Reset form on open
  useEffect(() => {
    if (open) {
      if (isNewShot) {
        setMissResult('');
        setMissReason('');
        setCustomReason('');
        setComment('');
      } else {
        setMissResult(initialMissResult || '');
        // Check if the reason is a known value or custom
        const knownReasons = MISS_REASONS.map((r) => r.value);
        if (initialMissReason && !knownReasons.includes(initialMissReason)) {
          setMissReason('other');
          setCustomReason(initialMissReason);
        } else {
          setMissReason(initialMissReason || '');
          setCustomReason('');
        }
        setComment(initialComment || '');
      }
    }
  }, [open, isNewShot, initialMissResult, initialMissReason, initialComment]);

  if (!open) return null;

  const handleSave = () => {
    const finalResult = missResult || null;
    const finalReason = missReason === 'other' ? (customReason.trim() || 'other') : (missReason || null);
    onSave(finalResult, finalReason, comment.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Miss Details</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Result</label>
            <select value={missResult} onChange={(e) => setMissResult(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
              {MISS_RESULTS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Reason</label>
            <select value={missReason} onChange={(e) => setMissReason(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
              {MISS_REASONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {missReason === 'other' && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Specify reason..."
                className="w-full mt-2 bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              placeholder="Optional notes..."
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
}

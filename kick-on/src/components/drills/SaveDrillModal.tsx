'use client';

import { useState } from 'react';
import { SKILLSET_CATEGORIES } from '@/hooks/useDrills';
import type { Shot, DrillSpot } from '@/types';

interface SaveDrillModalProps {
  open: boolean;
  shots: Shot[];
  onSave: (data: { name: string; description: string; skillset: string; spots: DrillSpot[] }) => void;
  onClose: () => void;
}

/** Extracts unique positions from shots (rounded to 1 decimal). */
function getUniquePositions(shots: Shot[]): { x: number; y: number }[] {
  const seen = new Set<string>();
  const positions: { x: number; y: number }[] = [];
  for (const shot of shots) {
    if (typeof shot.x !== 'number' || typeof shot.y !== 'number' || isNaN(shot.x) || isNaN(shot.y)) continue;
    const key = `${shot.x.toFixed(1)},${shot.y.toFixed(1)}`;
    if (!seen.has(key)) {
      seen.add(key);
      positions.push({ x: parseFloat(shot.x.toFixed(1)), y: parseFloat(shot.y.toFixed(1)) });
    }
  }
  return positions;
}

export default function SaveDrillModal({ open, shots, onSave, onClose }: SaveDrillModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [skillset, setSkillset] = useState('kicking-at-goal');
  const [shotsPerSpot, setShotsPerSpot] = useState(4);
  const [error, setError] = useState('');

  if (!open) return null;

  const positions = getUniquePositions(shots);

  const handleSave = () => {
    if (!name.trim()) {
      setError('Please enter a drill name.');
      return;
    }
    if (positions.length === 0) {
      setError('No shot positions found to save.');
      return;
    }
    const spots: DrillSpot[] = positions.map((pos, i) => ({
      id: `spot-${i + 1}`,
      x: pos.x,
      y: pos.y,
      shots: shotsPerSpot,
    }));
    onSave({ name: name.trim(), description: description.trim(), skillset, spots });
    // Reset
    setName('');
    setDescription('');
    setSkillset('kicking-at-goal');
    setShotsPerSpot(4);
    setError('');
  };

  // Filter out 'all' from skillset options
  const skillsetOptions = SKILLSET_CATEGORIES.filter((c) => c.value !== 'all');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Save as Custom Drill</h3>
          <p className="text-xs text-text-muted mt-1">{positions.length} shooting spots will be saved</p>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Drill Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              placeholder="e.g. My Scoring Arc"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Skillset</label>
            <select
              value={skillset}
              onChange={(e) => setSkillset(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              {skillsetOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Shots per Spot</label>
            <select
              value={shotsPerSpot}
              onChange={(e) => setShotsPerSpot(parseInt(e.target.value))}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-[#f44336] font-semibold">{error}</p>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            Save Drill
          </button>
        </div>
      </div>
    </div>
  );
}

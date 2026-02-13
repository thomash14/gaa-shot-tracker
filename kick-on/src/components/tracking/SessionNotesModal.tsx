'use client';

import { useState } from 'react';

const WIND_DIRECTIONS = [
  { value: 'no-wind', label: 'No Wind' },
  { value: 'straight-with', label: 'Straight with' },
  { value: 'diag-lr-with', label: 'Diagonal L-R with' },
  { value: 'diag-rl-with', label: 'Diagonal R-L with' },
  { value: 'straight-against', label: 'Straight against' },
  { value: 'diag-lr-against', label: 'Diagonal L-R against' },
  { value: 'diag-rl-against', label: 'Diagonal R-L against' },
  { value: 'cross-lr', label: 'Cross L-R' },
  { value: 'cross-rl', label: 'Cross R-L' },
];

const WIND_STRENGTHS = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
  { value: 'very-strong', label: 'Very Strong' },
];

const MINUTES_PLAYED_OPTIONS = [
  { value: 'full-game', label: 'Full Game' },
  { value: '60', label: '60 mins' },
  { value: '55', label: '55 mins' },
  { value: '50', label: '50 mins' },
  { value: '45', label: '45 mins' },
  { value: '40', label: '40 mins' },
  { value: '35', label: '35 mins' },
  { value: '30', label: '30 mins' },
  { value: '25', label: '25 mins' },
  { value: '20', label: '20 mins' },
  { value: '15', label: '15 mins' },
  { value: '10', label: '10 mins' },
  { value: '5', label: '5 mins' },
];

export interface SessionNotesData {
  notes: string;
  didWell: string;
  toImprove: string;
  windDirection: string;
  windStrength: string;
  minutesPlayed: string;
  positionPlayed: string;
}

interface SessionNotesModalProps {
  open: boolean;
  onSave: (data: SessionNotesData) => void;
  onSkip: () => void;
  onClose: () => void;
}

export default function SessionNotesModal({ open, onSave, onSkip, onClose }: SessionNotesModalProps) {
  const [minutesPlayed, setMinutesPlayed] = useState('full-game');
  const [positionPlayed, setPositionPlayed] = useState('');
  const [notes, setNotes] = useState('');
  const [didWell, setDidWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [windDirection, setWindDirection] = useState('no-wind');
  const [windStrength, setWindStrength] = useState('light');

  if (!open) return null;

  const showWindStrength = windDirection !== 'no-wind';

  const handleSave = () => {
    onSave({
      notes: notes.trim(),
      didWell: didWell.trim(),
      toImprove: toImprove.trim(),
      windDirection,
      windStrength: showWindStrength ? windStrength : '',
      minutesPlayed,
      positionPlayed: positionPlayed.trim(),
    });
    // Reset form
    setMinutesPlayed('full-game');
    setPositionPlayed('');
    setNotes('');
    setDidWell('');
    setToImprove('');
    setWindDirection('no-wind');
    setWindStrength('light');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Match Notes</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">✕</button>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Minutes Played</label>
              <select value={minutesPlayed} onChange={(e) => setMinutesPlayed(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                {MINUTES_PLAYED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Position Played</label>
              <input type="text" value={positionPlayed} onChange={(e) => setPositionPlayed(e.target.value)} placeholder="e.g., Corner Forward" className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="General notes about the match..." className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#4CAF50] mb-1">What went well?</label>
            <textarea value={didWell} onChange={(e) => setDidWell(e.target.value)} rows={2} placeholder="e.g., Accuracy from the left..." className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#FF9800] mb-1">To improve</label>
            <textarea value={toImprove} onChange={(e) => setToImprove(e.target.value)} rows={2} placeholder="e.g., Work on long-range frees..." className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Wind Direction (relative to 1st half shooting direction)</label>
            <select value={windDirection} onChange={(e) => setWindDirection(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
              {WIND_DIRECTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {showWindStrength && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Wind Strength</label>
              <select value={windStrength} onChange={(e) => setWindStrength(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                {WIND_STRENGTHS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onSkip} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">Skip</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">Save &amp; End</button>
        </div>
      </div>
    </div>
  );
}

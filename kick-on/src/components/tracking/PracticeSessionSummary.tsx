'use client';

import { useState } from 'react';
import type { PracticeDrill, Session } from '@/types';

// ---------------------------------------------------------------------------
// Constants (match SessionNotesModal)
// ---------------------------------------------------------------------------

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

const STANCE_LABELS: Record<string, string> = {
  'free-kick': 'Free-Kick',
  standing: 'Standing',
  'on-the-run': 'On the Run',
  'on-the-turn': 'On the Turn',
  'off-a-dummy': 'After a Dummy',
};

const FOOT_LABELS: Record<string, string> = {
  right: 'Right',
  left: 'Left',
  both: 'Both',
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PracticeSessionSummaryProps {
  session: Session;
  drills: PracticeDrill[];
  totalShots: number;
  totalScored: number;
  percentage: number;
  onSave: (data: {
    name: string;
    notes?: string;
    didWell?: string;
    toImprove?: string;
    windDirection?: string;
    windStrength?: string;
  }) => void;
  onDiscard: () => void;
}

// ---------------------------------------------------------------------------
// Drill card (within the summary)
// ---------------------------------------------------------------------------

function DrillCard({ drill }: { drill: PracticeDrill }) {
  const pct = drill.shotCount > 0
    ? Math.round((drill.scoredCount / drill.shotCount) * 100)
    : 0;

  return (
    <div className="bg-grey-light rounded-xl p-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-text">
          Drill #{drill.drillOrder}: {drill.drillType === 'scoring-arc' ? 'Scoring Arc' : 'Free-Form'}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5">
          {drill.distance ? `${drill.distance}m · ` : ''}
          {FOOT_LABELS[drill.foot] || drill.foot} · {STANCE_LABELS[drill.stance] || drill.stance}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-sm font-bold ${pct >= 80 ? 'text-[#4CAF50]' : pct >= 50 ? 'text-[#FF9800]' : 'text-[#f44336]'}`}>
          {drill.scoredCount}/{drill.shotCount}
        </div>
        <div className="text-[10px] text-text-muted">{pct}%</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PracticeSessionSummary({
  session,
  drills,
  totalShots,
  totalScored,
  percentage,
  onSave,
  onDiscard,
}: PracticeSessionSummaryProps) {
  const [name, setName] = useState(session.name || '');
  const [notes, setNotes] = useState('');
  const [didWell, setDidWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [windDirection, setWindDirection] = useState('no-wind');
  const [windStrength, setWindStrength] = useState('light');

  const showWindStrength = windDirection !== 'no-wind';

  const handleSave = () => {
    onSave({
      name: name.trim() || session.name,
      notes: notes.trim() || undefined,
      didWell: didWell.trim() || undefined,
      toImprove: toImprove.trim() || undefined,
      windDirection,
      windStrength: showWindStrength ? windStrength : undefined,
    });
  };

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4 max-h-[85vh] overflow-y-auto">
      <h3 className="text-sm font-bold text-text">Session Summary</h3>

      {/* Session name */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Session Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Training – Monday"
          className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
        />
      </div>

      {/* Session totals */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-grey-light rounded-xl p-3">
          <div className="text-lg font-bold text-text">{totalShots}</div>
          <div className="text-[10px] text-text-muted">Total Shots</div>
        </div>
        <div className="bg-grey-light rounded-xl p-3">
          <div className="text-lg font-bold text-[#4CAF50]">{totalScored}</div>
          <div className="text-[10px] text-text-muted">Scored</div>
        </div>
        <div className="bg-grey-light rounded-xl p-3">
          <div className={`text-lg font-bold ${percentage >= 80 ? 'text-[#4CAF50]' : percentage >= 50 ? 'text-[#FF9800]' : 'text-[#f44336]'}`}>
            {percentage}%
          </div>
          <div className="text-[10px] text-text-muted">Success</div>
        </div>
      </div>

      {/* Drills list */}
      {drills.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-text-muted">
            {drills.length} drill{drills.length !== 1 ? 's' : ''}
          </div>
          {drills.map((drill) => (
            <DrillCard key={drill.id} drill={drill} />
          ))}
        </div>
      )}

      {/* Wind */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-text-muted mb-1">Wind Direction</label>
          <select
            value={windDirection}
            onChange={(e) => setWindDirection(e.target.value)}
            className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
          >
            {WIND_DIRECTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {showWindStrength && (
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Wind Strength</label>
            <select
              value={windStrength}
              onChange={(e) => setWindStrength(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              {WIND_STRENGTHS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-text-muted mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="General notes about the session..."
          className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#4CAF50] mb-1">What went well?</label>
        <textarea
          value={didWell}
          onChange={(e) => setDidWell(e.target.value)}
          rows={2}
          placeholder="e.g., Accuracy from the left..."
          className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-[#FF9800] mb-1">To improve</label>
        <textarea
          value={toImprove}
          onChange={(e) => setToImprove(e.target.value)}
          rows={2}
          placeholder="e.g., Work on long-range frees..."
          className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onDiscard}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors"
        >
          Discard
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          Save Session
        </button>
      </div>
    </div>
  );
}

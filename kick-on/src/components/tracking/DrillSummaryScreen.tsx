'use client';

import type { PracticeDrill } from '@/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DrillSummaryScreenProps {
  drill: PracticeDrill;
  onAddAnother: () => void;
  onEndSession: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STANCE_LABELS: Record<string, string> = {
  'free-kick': 'Free-Kick',
  standing: 'Standing',
  'on-the-run': 'On the Run',
  'on-the-turn': 'On the Turn',
  'off-a-dummy': 'After a Dummy',
};

const FOOT_LABELS: Record<string, string> = {
  right: 'Right foot',
  left: 'Left foot',
  both: 'Both feet',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DrillSummaryScreen({ drill, onAddAnother, onEndSession }: DrillSummaryScreenProps) {
  const percentage = drill.shotCount > 0
    ? Math.round((drill.scoredCount / drill.shotCount) * 100)
    : 0;

  // Per-foot breakdown
  const rightShots = drill.shots.filter((s) => s.foot === 'right');
  const leftShots = drill.shots.filter((s) => s.foot === 'left');
  const rightScored = rightShots.filter((s) => s.result === 'scored').length;
  const leftScored = leftShots.filter((s) => s.result === 'scored').length;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-text">
        Drill #{drill.drillOrder} Complete
      </h3>

      {/* Drill info */}
      <div className="bg-grey-light rounded-xl p-3 space-y-1">
        <div className="text-xs text-text-muted">
          <span className="font-semibold text-text">
            {drill.drillType === 'scoring-arc' ? 'Scoring Arc' : 'Free-Form'}
          </span>
          {drill.distance && <span> · {drill.distance}m</span>}
          <span> · {FOOT_LABELS[drill.foot] || drill.foot}</span>
          <span> · {STANCE_LABELS[drill.stance] || drill.stance}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-grey-light rounded-xl p-3">
          <div className="text-lg font-bold text-text">{drill.shotCount}</div>
          <div className="text-[10px] text-text-muted">Shots</div>
        </div>
        <div className="bg-grey-light rounded-xl p-3">
          <div className="text-lg font-bold text-[#4CAF50]">{drill.scoredCount}</div>
          <div className="text-[10px] text-text-muted">Scored</div>
        </div>
        <div className="bg-grey-light rounded-xl p-3">
          <div className={`text-lg font-bold ${percentage >= 80 ? 'text-[#4CAF50]' : percentage >= 50 ? 'text-[#FF9800]' : 'text-[#f44336]'}`}>
            {percentage}%
          </div>
          <div className="text-[10px] text-text-muted">Success</div>
        </div>
      </div>

      {/* Per-foot breakdown (if both feet) */}
      {drill.foot === 'both' && (rightShots.length > 0 || leftShots.length > 0) && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-text-muted">Per-foot breakdown</div>
          <div className="grid grid-cols-2 gap-2">
            {rightShots.length > 0 && (
              <div className="bg-grey-light rounded-lg p-2 text-center">
                <div className="text-xs font-semibold text-text">Right</div>
                <div className="text-sm font-bold text-text">
                  {rightScored}/{rightShots.length}
                  <span className="text-text-muted font-normal ml-1">
                    ({rightShots.length > 0 ? Math.round((rightScored / rightShots.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            )}
            {leftShots.length > 0 && (
              <div className="bg-grey-light rounded-lg p-2 text-center">
                <div className="text-xs font-semibold text-text">Left</div>
                <div className="text-sm font-bold text-text">
                  {leftScored}/{leftShots.length}
                  <span className="text-text-muted font-normal ml-1">
                    ({leftShots.length > 0 ? Math.round((leftScored / leftShots.length) * 100) : 0}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAddAnother}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          Add Another Drill
        </button>
        <button
          onClick={onEndSession}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
        >
          End Session
        </button>
      </div>
    </div>
  );
}

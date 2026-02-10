'use client';

import { useState, useEffect } from 'react';
import type { DrillSpot, DrillSettings, SpotScore, SpotScoreSingle, SpotScoreBothFeet } from '@/types';

interface SpotScoreModalProps {
  open: boolean;
  spot: DrillSpot | null;
  settings: DrillSettings;
  existingScore?: SpotScore;
  onSave: (spotId: number | string, score: SpotScore) => void;
  onClear: (spotId: number | string) => void;
  onClose: () => void;
}

function isBothFeet(score: SpotScore | undefined): score is SpotScoreBothFeet {
  return !!score && 'right' in score && 'left' in score;
}

export default function SpotScoreModal({
  open,
  spot,
  settings,
  existingScore,
  onSave,
  onClear,
  onClose,
}: SpotScoreModalProps) {
  const isBoth = settings.footOption === 'both';
  const shotsPerSpot = settings.totalShots / 5;
  const shotsPerFoot = isBoth ? shotsPerSpot / 2 : shotsPerSpot;

  const [scoredRight, setScoredRight] = useState(0);
  const [scoredLeft, setScoredLeft] = useState(0);
  const [scoredSingle, setScoredSingle] = useState(0);

  // Reset on open
  useEffect(() => {
    if (open && spot) {
      if (isBoth && isBothFeet(existingScore)) {
        setScoredRight(existingScore.right.scored);
        setScoredLeft(existingScore.left.scored);
      } else if (!isBoth && existingScore && 'scored' in existingScore) {
        setScoredSingle((existingScore as SpotScoreSingle).scored);
      } else {
        setScoredRight(0);
        setScoredLeft(0);
        setScoredSingle(0);
      }
    }
  }, [open, spot, isBoth, existingScore]);

  if (!open || !spot) return null;

  const hasExisting = !!existingScore && (
    isBothFeet(existingScore) ? (existingScore.right || existingScore.left) : (existingScore as SpotScoreSingle).total > 0
  );

  const handleSave = () => {
    if (isBoth) {
      const score: SpotScoreBothFeet = {
        right: { scored: Math.min(scoredRight, shotsPerFoot), total: shotsPerFoot },
        left: { scored: Math.min(scoredLeft, shotsPerFoot), total: shotsPerFoot },
      };
      onSave(spot.id, score);
    } else {
      const score: SpotScoreSingle = {
        scored: Math.min(scoredSingle, shotsPerSpot),
        total: shotsPerSpot,
      };
      onSave(spot.id, score);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary">
            {spot.name || `Spot ${spot.id}`} – {settings.distance}m
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {settings.shotType} · {isBoth ? `${shotsPerFoot} kicks each foot` : `${settings.footOption} foot · ${shotsPerSpot} kicks`}
          </p>
        </div>

        <div className="p-4">
          {isBoth ? (
            <div className="flex gap-4">
              <div className="flex-1 text-center space-y-2">
                <div className="text-xs font-semibold text-primary">Right Foot</div>
                <label className="block text-[10px] text-text-muted">Scored / {shotsPerFoot}</label>
                <input
                  type="number"
                  min={0}
                  max={shotsPerFoot}
                  value={scoredRight}
                  onChange={(e) => setScoredRight(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-xl text-center"
                  autoFocus
                />
              </div>
              <div className="flex-1 text-center space-y-2">
                <div className="text-xs font-semibold text-primary">Left Foot</div>
                <label className="block text-[10px] text-text-muted">Scored / {shotsPerFoot}</label>
                <input
                  type="number"
                  min={0}
                  max={shotsPerFoot}
                  value={scoredLeft}
                  onChange={(e) => setScoredLeft(parseInt(e.target.value) || 0)}
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-xl text-center"
                />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <label className="block text-xs text-text-muted">Scored out of {shotsPerSpot}</label>
              <input
                type="number"
                min={0}
                max={shotsPerSpot}
                value={scoredSingle}
                onChange={(e) => setScoredSingle(parseInt(e.target.value) || 0)}
                className="w-24 mx-auto bg-surface border border-grey rounded-lg px-3 py-2 text-xl text-center block"
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors">
            Save
          </button>
          {hasExisting && (
            <button onClick={() => onClear(spot.id)} className="py-2 px-3 rounded-lg text-sm font-semibold text-white bg-[#f44336] hover:bg-[#d32f2f] transition-colors">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

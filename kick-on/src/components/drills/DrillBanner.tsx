'use client';

import type { DrillTemplate, DrillSettings } from '@/types';

interface DrillBannerProps {
  template: DrillTemplate;
  settings: DrillSettings;
  completedSpots: number;
  totalSpots: number;
  totalScored: number;
  totalAttempted: number;
  percentage: number;
  isComplete: boolean;
  targetMet: boolean;
  nextDistance: number;
  onFinish: () => void;
  onReset: () => void;
  onClose: () => void;
}

export default function DrillBanner({
  template,
  settings,
  completedSpots,
  totalSpots,
  totalScored,
  totalAttempted,
  percentage,
  isComplete,
  targetMet,
  nextDistance,
  onFinish,
  onReset,
  onClose,
}: DrillBannerProps) {
  return (
    <div className="bg-primary text-white rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div className="min-w-0">
          <h4 className="font-semibold text-sm">
            {template.name} – {settings.distance}m
          </h4>
          <p className="text-xs opacity-80 mt-0.5">
            {settings.shotType} · {settings.footOption === 'both' ? 'Both feet' : `${settings.footOption} foot`}
          </p>
          <p className="text-xs mt-1">
            Progress: <strong>{completedSpots}/{totalSpots} spots</strong> ·{' '}
            Score:{' '}
            <strong className={targetMet ? 'text-green-200' : 'text-orange-200'}>
              {totalScored}/{totalAttempted}
            </strong>{' '}
            ({percentage}%) {targetMet ? '🎯' : ''}
          </p>
          {isComplete && targetMet && (
            <p className="text-xs text-green-200 font-bold mt-0.5">
              Great session! Consider moving to {nextDistance}m
            </p>
          )}
          {isComplete && !targetMet && (
            <p className="text-xs text-orange-200 mt-0.5">
              Keep practicing at {settings.distance}m until you hit 80%+
            </p>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap">
          <button
            onClick={onFinish}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4CAF50] hover:bg-[#388E3C] transition-colors"
          >
            Finish
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#f44336] hover:bg-[#d32f2f] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

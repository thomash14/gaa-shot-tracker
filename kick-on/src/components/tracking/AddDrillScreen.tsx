'use client';

import { useState } from 'react';
import type { PracticeDrillType } from '@/types';
import { DISTANCE_OPTIONS, DRILL_SHOT_TYPES, TOTAL_SHOTS_OPTIONS } from '@/hooks/useDrills';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddDrillScreenProps {
  drillNumber: number;
  onStartDrill: (config: {
    drillType: PracticeDrillType;
    distance: number | null;
    foot: 'left' | 'right' | 'both';
    stance: string;
    shotCategory: string;
    totalShots?: number;
  }) => void;
  onEndSession: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AddDrillScreen({ drillNumber, onStartDrill, onEndSession }: AddDrillScreenProps) {
  const [drillType, setDrillType] = useState<PracticeDrillType>('free-form');
  const [distance, setDistance] = useState(20);
  const [foot, setFoot] = useState<'left' | 'right' | 'both'>('right');
  const [shotCategory, setShotCategory] = useState('in-play');
  const [stance, setStance] = useState('standing');
  const [totalShots, setTotalShots] = useState(20);

  const handleStart = () => {
    onStartDrill({
      drillType,
      distance: drillType === 'free-form' ? distance : distance,
      foot,
      stance,
      shotCategory: drillType === 'scoring-arc'
        ? (stance === 'free-kick' ? 'free-kick' : 'in-play')
        : shotCategory,
      totalShots: drillType === 'scoring-arc' ? totalShots : undefined,
    });
  };

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">
          Add Drill <span className="text-primary">#{drillNumber}</span>
        </h3>
        {drillNumber > 1 && (
          <button
            onClick={onEndSession}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            End Session
          </button>
        )}
      </div>

      {/* Drill type choice */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDrillType('free-form')}
          className={`p-3 rounded-xl border-2 text-center transition-all ${
            drillType === 'free-form'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-grey bg-surface text-text-muted hover:border-primary/50'
          }`}
        >
          <div className="text-lg mb-1">🎯</div>
          <div className="text-xs font-semibold">Free-Form</div>
          <div className="text-[10px] opacity-70 mt-0.5">Tap shots on pitch</div>
        </button>
        <button
          onClick={() => setDrillType('scoring-arc')}
          className={`p-3 rounded-xl border-2 text-center transition-all ${
            drillType === 'scoring-arc'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-grey bg-surface text-text-muted hover:border-primary/50'
          }`}
        >
          <div className="text-lg mb-1">🏟️</div>
          <div className="text-xs font-semibold">Scoring Arc</div>
          <div className="text-[10px] opacity-70 mt-0.5">5 fixed spots</div>
        </button>
      </div>

      {/* Configuration */}
      <div className="space-y-3">
        {/* Shot Category - free-form only */}
        {drillType === 'free-form' && (
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Shot Category</label>
            <select
              value={shotCategory}
              onChange={(e) => setShotCategory(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="in-play">In-Play</option>
              <option value="free-kick">Free-Kick</option>
              <option value="45">45</option>
              <option value="sideline">Sideline</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {/* Distance */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Distance</label>
            <select
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              {DISTANCE_OPTIONS.map((d) => (
                <option key={d} value={d}>{d}m</option>
              ))}
            </select>
          </div>

          {/* Foot */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Foot</label>
            <select
              value={foot}
              onChange={(e) => setFoot(e.target.value as 'left' | 'right' | 'both')}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
              <option value="both">Both</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Shot Type / Stance */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Shot Type</label>
            <select
              value={stance}
              onChange={(e) => setStance(e.target.value)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
            >
              {DRILL_SHOT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Total Shots - scoring-arc only */}
          {drillType === 'scoring-arc' && (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Total Shots</label>
              <select
                value={totalShots}
                onChange={(e) => setTotalShots(Number(e.target.value))}
                className="w-full bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
              >
                {TOTAL_SHOTS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={handleStart}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
      >
        Start Drill
      </button>
    </div>
  );
}

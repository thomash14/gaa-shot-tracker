'use client';

import { useState } from 'react';
import type { PracticeDrillType } from '@/types';
import { BUILT_IN_TEMPLATES, DISTANCE_OPTIONS, DRILL_SHOT_TYPES, TOTAL_SHOTS_OPTIONS } from '@/hooks/useDrills';

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
    templateId?: string;
  }) => void;
  onEndSession: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type SelectionTier = 'type' | 'template';

export default function AddDrillScreen({ drillNumber, onStartDrill, onEndSession }: AddDrillScreenProps) {
  const [selectionTier, setSelectionTier] = useState<SelectionTier>('type');
  const [drillType, setDrillType] = useState<PracticeDrillType | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [distance, setDistance] = useState(20);
  const [foot, setFoot] = useState<'left' | 'right' | 'both'>('right');
  const [stance, setStance] = useState('standing');
  const [totalShots, setTotalShots] = useState(20);

  const handleSelectFreeForm = () => {
    setDrillType('free-form');
    setSelectedTemplateId(null);
    setSelectionTier('type');
  };

  const handleSelectStructured = () => {
    setSelectionTier('template');
  };

  const handleSelectTemplate = (templateId: string) => {
    // For now only scoring-arc maps from 'scoring-zones' template
    setDrillType('scoring-arc');
    setSelectedTemplateId(templateId);
    setSelectionTier('type');
  };

  const handleBackToType = () => {
    setSelectionTier('type');
  };

  const handleStart = () => {
    if (drillType === 'free-form') {
      onStartDrill({
        drillType: 'free-form',
        distance: null,
        foot: 'right',
        stance: 'standing',
        shotCategory: 'in-play',
      });
    } else if (drillType === 'scoring-arc') {
      onStartDrill({
        drillType: 'scoring-arc',
        distance,
        foot,
        stance,
        shotCategory: stance === 'free-kick' ? 'free-kick' : 'in-play',
        totalShots,
        templateId: selectedTemplateId || 'scoring-zones',
      });
    }
  };

  const isStructuredSelected = drillType === 'scoring-arc';

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

      {/* Template selection tier */}
      {selectionTier === 'template' && (
        <>
          <button
            onClick={handleBackToType}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
          >
            <span>&larr;</span> Back
          </button>

          <div className="space-y-2">
            <div className="text-xs font-medium text-text-muted">Choose a drill template</div>
            <div className="grid grid-cols-1 gap-2">
              {BUILT_IN_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template.id)}
                  className="p-3 rounded-xl border-2 border-grey bg-surface text-left hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="text-lg">🏟️</div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-text">{template.name}</div>
                      <div className="text-[10px] text-text-muted mt-0.5">{template.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Type selection tier */}
      {selectionTier === 'type' && (
        <>
          {/* Drill type choice */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSelectFreeForm}
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
              onClick={handleSelectStructured}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                isStructuredSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-grey bg-surface text-text-muted hover:border-primary/50'
              }`}
            >
              <div className="text-lg mb-1">📋</div>
              <div className="text-xs font-semibold">Structured Drills</div>
              <div className="text-[10px] opacity-70 mt-0.5">
                {isStructuredSelected
                  ? BUILT_IN_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || 'Drill selected'
                  : 'Choose a template'}
              </div>
            </button>
          </div>

          {/* Configuration — only for structured drills */}
          {isStructuredSelected && (
            <div className="space-y-3">
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

                {/* Total Shots */}
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
              </div>
            </div>
          )}

          {/* Start button — only when a type is selected */}
          {drillType && (
            <button
              onClick={handleStart}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
            >
              Start Drill
            </button>
          )}
        </>
      )}
    </div>
  );
}

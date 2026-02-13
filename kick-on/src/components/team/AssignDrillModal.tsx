'use client';

import { useState, useEffect } from 'react';
import { DISTANCE_OPTIONS, DRILL_SHOT_TYPES, TOTAL_SHOTS_OPTIONS } from '@/hooks/useDrills';

interface AssignDrillModalProps {
  open: boolean;
  onAssign: (data: {
    drillType: string;
    settings: { distance: number; shotType: string; foot: string; totalShots: number };
    startDate: string;
    dueDate: string;
    targetPercentage: number | null;
    notes: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function AssignDrillModal({ open, onAssign, onClose }: AssignDrillModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [distance, setDistance] = useState(20);
  const [shotType, setShotType] = useState('free-kick');
  const [foot, setFoot] = useState('right');
  const [totalShots, setTotalShots] = useState(20);
  const [startDate, setStartDate] = useState(today);
  const [availableFor, setAvailableFor] = useState(14);
  const [target, setTarget] = useState(80);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setDistance(20);
      setShotType('free-kick');
      setFoot('right');
      setTotalShots(20);
      setStartDate(today);
      setAvailableFor(14);
      setTarget(80);
      setNotes('');
      setError('');
    }
  }, [open, today]);

  if (!open) return null;

  const handleAssign = async () => {
    setLoading(true);
    setError('');
    try {
      // Calculate due date
      let dueDate = '2099-12-31';
      if (availableFor > 0) {
        const parts = startDate.split('-');
        const expiry = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        expiry.setDate(expiry.getDate() + availableFor);
        dueDate = expiry.toISOString().split('T')[0];
      }

      await onAssign({
        drillType: 'scoring-zones',
        settings: { distance, shotType, foot, totalShots },
        startDate,
        dueDate,
        targetPercentage: target || null,
        notes: notes.trim() || null,
      });
      onClose();
      alert('Drill assigned successfully!');
    } catch (err) {
      setError('Failed to assign drill: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">Assign Drill</h3>
          <p className="text-xs text-text-muted mt-1">Scoring Arc drill configuration</p>
        </div>

        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Distance</label>
              <select value={distance} onChange={(e) => setDistance(parseInt(e.target.value))} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                {DISTANCE_OPTIONS.map((d) => <option key={d} value={d}>{d}m</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Shot Type</label>
              <select value={shotType} onChange={(e) => setShotType(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                {DRILL_SHOT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Foot</label>
              <select value={foot} onChange={(e) => setFoot(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                <option value="right">Right Only</option>
                <option value="left">Left Only</option>
                <option value="both">Both (split)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Total Shots</label>
              <select value={totalShots} onChange={(e) => setTotalShots(parseInt(e.target.value))} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                {TOTAL_SHOTS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Start Date</label>
              <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Available For</label>
              <select value={availableFor} onChange={(e) => setAvailableFor(parseInt(e.target.value))} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm">
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={0}>No limit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Target %</label>
            <input type="number" value={target} min={0} max={100} onChange={(e) => setTarget(parseInt(e.target.value) || 0)} className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g., Focus on technique under pressure" className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none" />
          </div>

          {error && <p className="text-xs text-[#f44336] font-semibold">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors">
            Cancel
          </button>
          <button onClick={handleAssign} disabled={loading} className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {loading ? 'Assigning...' : 'Assign Drill'}
          </button>
        </div>
      </div>
    </div>
  );
}

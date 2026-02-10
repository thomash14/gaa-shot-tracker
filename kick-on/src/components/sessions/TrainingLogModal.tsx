'use client';

import type { TrainingFormData } from '@/hooks/useTrainingLogs';
import type { TrainingSessionType } from '@/types';

// ---------------------------------------------------------------------------
// Option lists
// ---------------------------------------------------------------------------

const GYM_FOCUS_OPTIONS = [
  { value: 'full-body', label: 'Full Body' },
  { value: 'upper-body', label: 'Upper Body' },
  { value: 'lower-body', label: 'Lower Body' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'mixed', label: 'Mixed' },
];

const RECOVERY_TYPE_OPTIONS = [
  { value: 'ice-bath', label: 'Ice Bath' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'foam-rolling', label: 'Foam Rolling' },
  { value: 'pool', label: 'Pool' },
  { value: 'physio', label: 'Physio' },
  { value: 'rest-day', label: 'Rest Day' },
  { value: 'other', label: 'Other' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TrainingLogModalProps {
  open: boolean;
  dateStr: string | null;
  form: TrainingFormData;
  onUpdate: <K extends keyof TrainingFormData>(field: K, value: TrainingFormData[K]) => void;
  onSave: () => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TrainingLogModal({
  open,
  dateStr,
  form,
  onUpdate,
  onSave,
  onClose,
}: TrainingLogModalProps) {
  if (!open || !dateStr) return null;

  const formattedDate = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary">Log Training Session</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text text-lg">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Date (read-only) */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Date</label>
            <input
              type="text"
              readOnly
              value={formattedDate}
              className="w-full bg-grey-light rounded-lg px-3 py-2 text-sm text-text"
            />
          </div>

          {/* Session type */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
            <select
              value={form.sessionType}
              onChange={(e) => onUpdate('sessionType', e.target.value as TrainingSessionType)}
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            >
              <option value="training">Team Training</option>
              <option value="gym">Gym Session</option>
              <option value="recovery">Recovery</option>
            </select>
          </div>

          {/* Training-specific fields */}
          {form.sessionType === 'training' && (
            <div className="space-y-3">
              {/* Kicking before */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.kickingBefore}
                  onChange={(e) => onUpdate('kickingBefore', e.target.checked)}
                  className="accent-primary"
                />
                Kicking before training
              </label>
              {form.kickingBefore && (
                <div className="ml-6">
                  <label className="block text-xs text-text-muted mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.beforeDuration}
                    onChange={(e) => onUpdate('beforeDuration', parseInt(e.target.value) || 20)}
                    className="w-24 bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              )}

              {/* Kicking after */}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.kickingAfter}
                  onChange={(e) => onUpdate('kickingAfter', e.target.checked)}
                  className="accent-primary"
                />
                Kicking after training
              </label>
              {form.kickingAfter && (
                <div className="ml-6">
                  <label className="block text-xs text-text-muted mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.afterDuration}
                    onChange={(e) => onUpdate('afterDuration', parseInt(e.target.value) || 20)}
                    className="w-24 bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          )}

          {/* Gym-specific fields */}
          {form.sessionType === 'gym' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={1}
                  value={form.gymDuration}
                  onChange={(e) => onUpdate('gymDuration', parseInt(e.target.value) || 60)}
                  className="w-24 bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Focus</label>
                <select
                  value={form.gymFocus}
                  onChange={(e) => onUpdate('gymFocus', e.target.value)}
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
                >
                  {GYM_FOCUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Recovery-specific fields */}
          {form.sessionType === 'recovery' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Duration (mins)</label>
                <input
                  type="number"
                  min={1}
                  value={form.recoveryDuration}
                  onChange={(e) => onUpdate('recoveryDuration', parseInt(e.target.value) || 30)}
                  className="w-24 bg-surface border border-grey rounded-lg px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Type</label>
                <select
                  value={form.recoveryType}
                  onChange={(e) => onUpdate('recoveryType', e.target.value)}
                  className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
                >
                  {RECOVERY_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1">Comments</label>
            <textarea
              value={form.comments}
              onChange={(e) => onUpdate('comments', e.target.value)}
              rows={3}
              placeholder="Optional notes..."
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

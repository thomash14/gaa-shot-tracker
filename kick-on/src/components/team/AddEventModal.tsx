'use client';

import { useState, useEffect } from 'react';
import type { TeamEvent, TeamEventType } from '@/types';

interface AddEventModalProps {
  open: boolean;
  teamName: string;
  editingEvent?: TeamEvent;
  onSave: (data: {
    title: string;
    event_type: TeamEventType;
    event_date: string;
    start_time: string;
    end_time: string | null;
    location: string | null;
    opponent: string | null;
    notes: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

const EVENT_TYPES: { value: TeamEventType; label: string }[] = [
  { value: 'training', label: 'Training' },
  { value: 'match', label: 'Match' },
  { value: 'other', label: 'Other' },
];

function typeLabel(type: TeamEventType): string {
  return type === 'training' ? 'Training' : type === 'match' ? 'Match' : 'Event';
}

export default function AddEventModal({ open, teamName, editingEvent, onSave, onClose }: AddEventModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [eventType, setEventType] = useState<TeamEventType>('training');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState(today);
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [opponent, setOpponent] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingEvent) {
        setEventType(editingEvent.event_type as TeamEventType);
        setTitle(editingEvent.title);
        setEventDate(editingEvent.event_date);
        setStartTime(editingEvent.start_time.slice(0, 5));
        setEndTime(editingEvent.end_time?.slice(0, 5) || '');
        setLocation(editingEvent.location || '');
        setOpponent(editingEvent.opponent || '');
        setNotes(editingEvent.notes || '');
      } else {
        setEventType('training');
        setTitle(`${teamName} Training`);
        setEventDate(today);
        setStartTime('19:00');
        setEndTime('');
        setLocation('');
        setOpponent('');
        setNotes('');
      }
      setError('');
    }
  }, [open, editingEvent, teamName, today]);

  if (!open) return null;

  function handleTypeChange(type: TeamEventType) {
    setEventType(type);
    if (!editingEvent) {
      setTitle(`${teamName} ${typeLabel(type)}`);
    }
  }

  async function handleSave() {
    if (!title.trim() || !eventDate || !startTime) {
      setError('Title, date and start time are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        event_type: eventType,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime || null,
        location: location.trim() || null,
        opponent: eventType === 'match' ? (opponent.trim() || null) : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError('Failed to save event: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-surface rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-grey-light">
          <h3 className="text-base font-semibold text-primary dark:text-text">
            {editingEvent ? 'Edit Event' : 'Add Event'}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {editingEvent ? 'Update event details' : 'Schedule a team event'}
          </p>
        </div>

        <div className="p-4 space-y-3">
          {/* Event type selector */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Event Type</label>
            <div className="flex gap-1">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTypeChange(t.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    eventType === t.value
                      ? 'bg-primary text-white'
                      : 'bg-grey-light text-text-muted hover:bg-grey'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. U-12 Training"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Date and times */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full bg-surface border border-grey rounded-lg px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-surface border border-grey rounded-lg px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text mb-1">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-surface border border-grey rounded-lg px-2 py-2 text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Location (optional)</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Club grounds"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Opponent (match only) */}
          {eventType === 'match' && (
            <div>
              <label className="block text-xs font-semibold text-text mb-1">Opponent (optional)</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="e.g. St. Mary's"
                className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Bring gumshield"
              className="w-full bg-surface border border-grey rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>

          {error && <p className="text-xs text-[#f44336] font-semibold">{error}</p>}
        </div>

        <div className="flex gap-2 p-4 border-t border-grey-light">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-text-muted bg-grey-light hover:bg-grey transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-dark disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Saving...' : editingEvent ? 'Update Event' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import type { TeamEvent } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatEventDate(dateStr: string) {
  const parts = dateStr.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function typeBadge(type: string) {
  const styles: Record<string, string> = {
    training: 'bg-primary/15 text-primary',
    match: 'bg-accent/15 text-accent',
    other: 'bg-grey text-text-muted',
  };
  const labels: Record<string, string> = {
    training: 'Training',
    match: 'Match',
    other: 'Other',
  };
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${styles[type] || styles.other}`}>
      {labels[type] || 'Event'}
    </span>
  );
}

function borderColor(type: string) {
  if (type === 'training') return 'border-primary';
  if (type === 'match') return 'border-accent';
  return 'border-grey';
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// Event card (shared between coach and player)
// ---------------------------------------------------------------------------

function EventCard({
  event,
  onEdit,
  onDelete,
}: {
  event: TeamEvent;
  onEdit?: (event: TeamEvent) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className={`bg-surface rounded-xl border-l-4 ${borderColor(event.event_type)} p-3 shadow-sm`}>
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text">
            {event.event_type === 'training' ? 'Training' : event.event_type === 'match' ? 'Match' : 'Event'}
          </p>
          <p className="text-[11px] text-primary font-medium">{event.title}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {formatEventDate(event.event_date)} &middot; {formatTime(event.start_time)}
            {event.end_time && ` \u2013 ${formatTime(event.end_time)}`}
          </p>
          {event.location && (
            <p className="text-[11px] text-text-muted mt-0.5">{event.location}</p>
          )}
          {event.event_type === 'match' && event.opponent && (
            <p className="text-[11px] text-text-muted mt-0.5">vs {event.opponent}</p>
          )}
          {event.notes && (
            <p className="text-[11px] text-text-muted italic mt-1">{event.notes}</p>
          )}
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="flex gap-3 mt-2">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { if (window.confirm('Delete this event?')) onDelete(event.id); }}
              className="text-[10px] font-semibold text-[#f44336] hover:underline cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coach view
// ---------------------------------------------------------------------------

interface CoachEventsProps {
  events: TeamEvent[];
  teamName: string;
  onAdd: () => void;
  onEdit: (event: TeamEvent) => void;
  onDelete: (id: string) => void;
}

export function CoachEvents({ events, teamName, onAdd, onEdit, onDelete }: CoachEventsProps) {
  const [showPast, setShowPast] = useState(false);
  const today = todayStr();

  const upcoming = events.filter((e) => e.event_date >= today);
  const past = events.filter((e) => e.event_date < today);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text">Events</h3>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-primary hover:bg-primary-dark transition-colors cursor-pointer"
        >
          Add Event
        </button>
      </div>

      {events.length === 0 && (
        <p className="text-sm text-text-muted italic py-4">
          No events scheduled yet. Click &quot;Add Event&quot; to get started!
        </p>
      )}

      {upcoming.map((event) => (
        <EventCard key={event.id} event={event} onEdit={onEdit} onDelete={onDelete} />
      ))}

      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(!showPast)}
            className="text-xs font-semibold text-text-muted hover:text-primary transition-colors cursor-pointer"
          >
            {showPast ? 'Hide' : 'Show'} past events ({past.length})
          </button>
          {showPast && (
            <div className="mt-2 space-y-3 opacity-60">
              {past.map((event) => (
                <EventCard key={event.id} event={event} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player view
// ---------------------------------------------------------------------------

interface PlayerEventsProps {
  events: TeamEvent[];
}

export function PlayerEvents({ events }: PlayerEventsProps) {
  const today = todayStr();
  const upcoming = events.filter((e) => e.event_date >= today);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-text">Upcoming Events</h3>

      {upcoming.length === 0 && (
        <p className="text-sm text-text-muted italic py-4">No upcoming events.</p>
      )}

      {upcoming.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

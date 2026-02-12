'use client';

import Link from 'next/link';
import type { TeamEvent } from '@/types';

interface UpcomingEventsProps {
  events: TeamEvent[];
}

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

const MAX_EVENTS = 5;

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  const today = new Date().toISOString().split('T')[0];
  const upcoming = events
    .filter((e) => e.event_date >= today)
    .sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date);
      return a.start_time.localeCompare(b.start_time);
    });

  if (upcoming.length === 0) return null;

  const shown = upcoming.slice(0, MAX_EVENTS);
  const hasMore = upcoming.length > MAX_EVENTS;

  return (
    <div className="bg-surface rounded-2xl shadow-card p-4 space-y-3">
      <h3 className="text-sm font-bold text-text">Upcoming</h3>

      {shown.map((event) => (
        <div key={event.id} className="flex items-start gap-3 py-1.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-text">{event.title}</span>
              {typeBadge(event.event_type)}
            </div>
            <p className="text-[11px] text-text-muted mt-0.5">
              {formatEventDate(event.event_date)} &middot; {formatTime(event.start_time)}
              {event.end_time && ` \u2013 ${formatTime(event.end_time)}`}
            </p>
            {event.location && (
              <p className="text-[11px] text-text-muted">{event.location}</p>
            )}
            {event.event_type === 'match' && event.opponent && (
              <p className="text-[11px] text-text-muted">vs {event.opponent}</p>
            )}
          </div>
        </div>
      ))}

      {hasMore && (
        <Link
          href="/team"
          className="block text-xs font-semibold text-primary hover:underline"
        >
          View all on Team page
        </Link>
      )}
    </div>
  );
}

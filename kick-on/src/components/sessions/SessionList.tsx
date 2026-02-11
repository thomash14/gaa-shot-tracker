'use client';

import { Component, type ReactNode } from 'react';
import type { SessionFilter, SessionListItem } from '@/hooks/useSessions';
import type { Session } from '@/types';
import SessionCard from './SessionCard';

// ---------------------------------------------------------------------------
// Per-card error boundary so one bad card doesn't crash the whole list
// ---------------------------------------------------------------------------

interface CardErrorBoundaryProps {
  children: ReactNode;
}

interface CardErrorBoundaryState {
  hasError: boolean;
}

class CardErrorBoundary extends Component<CardErrorBoundaryProps, CardErrorBoundaryState> {
  constructor(props: CardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('SessionCard rendering error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-surface rounded-xl p-3 shadow-sm text-xs text-text-muted italic">
          Unable to display this session.
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const FILTER_TABS: { value: SessionFilter; label: string }[] = [
  { value: 'match', label: 'Match' },
  { value: 'practice', label: 'Practice' },
  { value: 'training', label: 'Training' },
  { value: 'all', label: 'All' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionListProps {
  items: SessionListItem[];
  filter: SessionFilter;
  selectedDate: string | null;
  onFilterChange: (type: SessionFilter) => void;
  onViewSession: (session: Session) => void;
  onDeleteSession: (id: string | number) => void;
  onDeleteTrainingLog: (id: string | number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SessionList({
  items,
  filter,
  selectedDate,
  onFilterChange,
  onViewSession,
  onDeleteSession,
  onDeleteTrainingLog,
}: SessionListProps) {
  // Empty state message
  const filterLabel = filter === 'all' ? '' : filter;
  const dateNote = selectedDate
    ? ' on ' +
      new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IE', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-3">
      {/* Filter tabs */}
      <div className="flex gap-1 bg-grey-light rounded-lg p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-colors ${
              filter === tab.value
                ? 'bg-primary text-white'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div className="bg-surface rounded-2xl p-6 shadow-sm text-center text-sm text-text-muted">
          No {filterLabel} sessions{dateNote}.{' '}
          {!selectedDate && 'Start tracking your shots!'}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const key =
              item.type === 'shot'
                ? `shot-${(item.data as Session).id}`
                : `training-${item.data.id}`;
            return (
              <CardErrorBoundary key={key}>
                <SessionCard
                  item={item}
                  onViewSession={onViewSession}
                  onDeleteSession={onDeleteSession}
                  onDeleteTrainingLog={onDeleteTrainingLog}
                />
              </CardErrorBoundary>
            );
          })}
        </div>
      )}
    </div>
  );
}

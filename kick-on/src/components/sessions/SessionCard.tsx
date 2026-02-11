'use client';

import type { Session, TrainingLog } from '@/types';
import type { SessionListItem } from '@/hooks/useSessions';

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

const TRAINING_TYPE_ICONS: Record<string, string> = {
  training: '🏃',
  gym: '💪',
  recovery: '🧊',
};

const TRAINING_TYPE_LABELS: Record<string, string> = {
  training: 'Team Training',
  gym: 'Gym Session',
  recovery: 'Recovery',
};

const GYM_FOCUS_LABELS: Record<string, string> = {
  'full-body': 'Full Body',
  'upper-body': 'Upper Body',
  'lower-body': 'Lower Body',
  core: 'Core',
  cardio: 'Cardio',
  mobility: 'Mobility',
  mixed: 'Mixed',
};

const RECOVERY_TYPE_LABELS: Record<string, string> = {
  'ice-bath': 'Ice Bath',
  stretching: 'Stretching',
  'foam-rolling': 'Foam Rolling',
  pool: 'Pool',
  physio: 'Physio',
  'rest-day': 'Rest Day',
  other: 'Other',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function buildTrainingLogSummary(log: TrainingLog): string {
  const parts: string[] = [];
  if (log.sessionType === 'training') {
    if (log.kickingBefore) parts.push(`Kicked before (${log.beforeDuration || '?'}m)`);
    if (log.kickingAfter) parts.push(`Kicked after (${log.afterDuration || '?'}m)`);
  } else if (log.sessionType === 'gym') {
    if (log.gymDuration) parts.push(`${log.gymDuration} mins`);
    if (log.gymFocus) parts.push(GYM_FOCUS_LABELS[log.gymFocus] || log.gymFocus);
  } else if (log.sessionType === 'recovery') {
    if (log.recoveryDuration) parts.push(`${log.recoveryDuration} mins`);
    if (log.recoveryType) parts.push(RECOVERY_TYPE_LABELS[log.recoveryType] || log.recoveryType);
  }
  return parts.join(' · ');
}

// ---------------------------------------------------------------------------
// Shot session card
// ---------------------------------------------------------------------------

function ShotSessionCard({
  session,
  onView,
  onDelete,
}: {
  session: Session;
  onView: () => void;
  onDelete: () => void;
}) {
  const scored = (session.shots ?? []).filter((s) => s.result === 'scored').length;
  const total = (session.shots ?? []).length;
  const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
  const sessionType = session.type || 'practice';
  const matchType = session.matchType || '';
  const typeIcon = sessionType === 'match' ? '⚽' : '🏋️';

  let typeLabel = sessionType === 'match' ? 'Match' : 'Practice';
  if (sessionType === 'match' && matchType) {
    typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
  }

  return (
    <div className="bg-surface rounded-xl p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-text-muted">
            {typeIcon} {typeLabel}
          </div>
          <div className="text-sm font-medium text-text truncate">
            {session.name || 'Unnamed Session'}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {formatDate(session.date)}
            {session.drills && session.drills.length > 0 && (
              <> · {session.drills.length} drill{session.drills.length !== 1 ? 's' : ''}</>
            )}
            {' '}· {total} shots · {rate}% success
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={onView}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
          >
            View
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Training log card
// ---------------------------------------------------------------------------

function TrainingLogCard({
  log,
  onDelete,
}: {
  log: TrainingLog;
  onDelete: () => void;
}) {
  const icon = TRAINING_TYPE_ICONS[log.sessionType] || '📋';
  const label = TRAINING_TYPE_LABELS[log.sessionType] || log.sessionType;
  const summary = buildTrainingLogSummary(log);

  const borderColor: Record<string, string> = {
    training: 'border-l-[#FF9800]',
    gym: 'border-l-[#9C27B0]',
    recovery: 'border-l-[#FFC107]',
  };

  return (
    <div className={`bg-surface rounded-xl p-3 shadow-sm border-l-4 ${borderColor[log.sessionType] || ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-text-muted">
            {icon} {label}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {formatDate(log.date)}{summary ? ` · ${summary}` : ''}
          </div>

          {/* Kicking sub-items for training */}
          {log.sessionType === 'training' && log.kickingBefore && (
            <div className="text-xs mt-1" style={{ color: '#4CAF50' }}>
              🏋️ Pre-Training Kicking — {log.beforeDuration || '?'} mins
            </div>
          )}
          {log.sessionType === 'training' && log.kickingAfter && (
            <div className="text-xs mt-0.5" style={{ color: '#4CAF50' }}>
              🏋️ Post-Training Kicking — {log.afterDuration || '?'} mins
            </div>
          )}

          {log.comments && (
            <div className="text-xs text-text-muted mt-1 italic">{log.comments}</div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-500/10 text-red-600 hover:bg-red-500/20 transition-colors shrink-0"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported dispatcher
// ---------------------------------------------------------------------------

interface SessionCardProps {
  item: SessionListItem;
  onViewSession: (session: Session) => void;
  onDeleteSession: (id: string | number) => void;
  onDeleteTrainingLog: (id: string | number) => void;
}

export default function SessionCard({
  item,
  onViewSession,
  onDeleteSession,
  onDeleteTrainingLog,
}: SessionCardProps) {
  if (item.type === 'shot') {
    const session = item.data as Session;
    return (
      <ShotSessionCard
        session={session}
        onView={() => onViewSession(session)}
        onDelete={() => onDeleteSession(session.id)}
      />
    );
  }

  const log = item.data as TrainingLog;
  return (
    <TrainingLogCard
      log={log}
      onDelete={() => onDeleteTrainingLog(log.id)}
    />
  );
}

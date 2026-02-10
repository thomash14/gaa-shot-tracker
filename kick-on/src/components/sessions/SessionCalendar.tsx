'use client';

import { useMemo } from 'react';
import type {
  CalendarView,
  DateMap,
  SessionMap,
  TrainingMap,
} from '@/hooks/useSessions';
import type { Session } from '@/types';

// ---------------------------------------------------------------------------
// Dot colours
// ---------------------------------------------------------------------------

const DOT_COLOURS: Record<string, string> = {
  match: '#2196F3',
  practice: '#4CAF50',
  training: '#FF9800',
  gym: '#9C27B0',
  recovery: '#FFC107',
};

const DOT_KEYS = ['match', 'practice', 'training', 'gym', 'recovery'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMonthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-IE', {
    month: 'long',
    year: 'numeric',
  });
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('en-IE', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} – ${endLabel}`;
}

function formatSummary(counts: Record<string, number>): string {
  const parts: string[] = [];
  if (counts.practice > 0) parts.push(`${counts.practice} practice${counts.practice !== 1 ? 's' : ''}`);
  if (counts.match > 0) parts.push(`${counts.match} match${counts.match !== 1 ? 'es' : ''}`);
  if (counts.training > 0) parts.push(`${counts.training} training`);
  if (counts.gym > 0) parts.push(`${counts.gym} gym`);
  if (counts.recovery > 0) parts.push(`${counts.recovery} recovery`);
  return parts.length > 0 ? parts.join(', ') : 'No sessions';
}

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SessionCalendarProps {
  viewMode: CalendarView;
  calendarYear: number;
  calendarMonth: number;
  weekStart: Date;
  selectedDate: string | null;
  todayStr: string;
  dateMap: DateMap;
  sessionMap: SessionMap;
  trainingMap: TrainingMap;
  monthlyCounts: Record<string, number>;
  weeklyCounts: Record<string, number>;
  onChangeMonth: (delta: number) => void;
  onChangeWeek: (delta: number) => void;
  onSelectDate: (dateStr: string) => void;
  onSwitchView: (mode: CalendarView) => void;
  onClearDate: () => void;
  onDateMenu: (dateStr: string, anchorEl: HTMLElement) => void;
  onViewSession?: (session: Session) => void;
}

// ---------------------------------------------------------------------------
// Calendar dots
// ---------------------------------------------------------------------------

function CalendarDots({ info }: { info: { match: boolean; practice: boolean; training: boolean; gym: boolean; recovery: boolean } }) {
  return (
    <div className="flex justify-center gap-0.5 mt-0.5">
      {DOT_KEYS.map(
        (key) =>
          info[key] && (
            <span
              key={key}
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: DOT_COLOURS[key] }}
            />
          ),
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly calendar
// ---------------------------------------------------------------------------

function MonthlyView({
  calendarYear,
  calendarMonth,
  todayStr,
  selectedDate,
  dateMap,
  monthlyCounts,
  onChangeMonth,
  onClearDate,
  onDateMenu,
}: Pick<
  SessionCalendarProps,
  | 'calendarYear'
  | 'calendarMonth'
  | 'todayStr'
  | 'selectedDate'
  | 'dateMap'
  | 'monthlyCounts'
  | 'onChangeMonth'
  | 'onClearDate'
  | 'onDateMenu'
>) {
  const { daysInMonth, startDow, prevMonthLastDay } = useMemo(() => {
    const first = new Date(calendarYear, calendarMonth, 1);
    const last = new Date(calendarYear, calendarMonth + 1, 0);
    let dow = first.getDay() - 1; // Mon=0 .. Sun=6
    if (dow < 0) dow = 6;
    return {
      daysInMonth: last.getDate(),
      startDow: dow,
      prevMonthLastDay: new Date(calendarYear, calendarMonth, 0).getDate(),
    };
  }, [calendarYear, calendarMonth]);

  const monthLabel = formatMonthLabel(calendarYear, calendarMonth);
  const trailingBlanks = (7 - ((startDow + daysInMonth) % 7)) % 7;

  return (
    <>
      {/* Nav header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onChangeMonth(-1)} className="text-lg px-2 py-1 text-text-muted hover:text-text">
          &#9664;
        </button>
        <h3 className="text-sm font-semibold text-text">{monthLabel}</h3>
        <button onClick={() => onChangeMonth(1)} className="text-lg px-2 py-1 text-text-muted hover:text-text">
          &#9654;
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px text-center text-xs">
        {DOW_LABELS.map((d) => (
          <div key={d} className="py-1 font-semibold text-text-muted text-[10px]">
            {d}
          </div>
        ))}

        {/* Previous month trailing days */}
        {Array.from({ length: startDow }, (_, i) => (
          <div key={`prev-${i}`} className="py-1.5 text-text-muted/40">
            {prevMonthLastDay - startDow + 1 + i}
          </div>
        ))}

        {/* Current month days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info = dateMap[dateStr];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={day}
              onClick={(e) => onDateMenu(dateStr, e.currentTarget)}
              className={`py-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white'
                  : isToday
                    ? 'bg-primary/10 font-bold text-primary'
                    : info
                      ? 'hover:bg-grey-light'
                      : 'text-text-muted hover:bg-grey-light/50'
              }`}
            >
              <span>{day}</span>
              {info && <CalendarDots info={info} />}
            </button>
          );
        })}

        {/* Next month leading days */}
        {Array.from({ length: trailingBlanks }, (_, i) => (
          <div key={`next-${i}`} className="py-1.5 text-text-muted/40">
            {i + 1}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-text-muted text-center">
        {monthLabel}: {formatSummary(monthlyCounts)}
        {selectedDate && (
          <button onClick={onClearDate} className="ml-2 text-primary underline">
            Show all
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-3 mt-2 flex-wrap">
        {DOT_KEYS.map((key) => (
          <div key={key} className="flex items-center gap-1 text-[10px] text-text-muted">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: DOT_COLOURS[key] }} />
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Weekly calendar
// ---------------------------------------------------------------------------

function WeeklyView({
  weekStart,
  todayStr,
  selectedDate,
  dateMap,
  sessionMap,
  trainingMap,
  weeklyCounts,
  onChangeWeek,
  onSelectDate,
  onClearDate,
  onDateMenu,
  onViewSession,
}: Pick<
  SessionCalendarProps,
  | 'weekStart'
  | 'todayStr'
  | 'selectedDate'
  | 'dateMap'
  | 'sessionMap'
  | 'trainingMap'
  | 'weeklyCounts'
  | 'onChangeWeek'
  | 'onSelectDate'
  | 'onClearDate'
  | 'onDateMenu'
  | 'onViewSession'
>) {
  const weekLabel = formatWeekRange(weekStart);

  const days = useMemo(() => {
    const arr: { dateStr: string; dayDate: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      arr.push({ dateStr, dayDate: d });
    }
    return arr;
  }, [weekStart]);

  return (
    <>
      {/* Nav header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onChangeWeek(-1)} className="text-lg px-2 py-1 text-text-muted hover:text-text">
          &#9664;
        </button>
        <h3 className="text-sm font-semibold text-text">{weekLabel}</h3>
        <button onClick={() => onChangeWeek(1)} className="text-lg px-2 py-1 text-text-muted hover:text-text">
          &#9654;
        </button>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ dateStr, dayDate }, i) => {
          const daySessions = sessionMap[dateStr] || [];
          const dayTraining = trainingMap[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const hasContent = daySessions.length > 0 || dayTraining.length > 0;

          return (
            <div
              key={dateStr}
              onClick={hasContent ? () => onSelectDate(dateStr) : undefined}
              className={`rounded-lg p-1 min-h-[80px] text-[10px] transition-colors ${
                isSelected
                  ? 'bg-primary/10 ring-1 ring-primary'
                  : isToday
                    ? 'bg-primary/5'
                    : 'bg-grey-light/30'
              } ${hasContent ? 'cursor-pointer hover:bg-primary/5' : ''}`}
            >
              {/* Day header */}
              <div className="flex justify-between items-center mb-0.5">
                <span className={`font-semibold ${isToday ? 'text-primary' : 'text-text-muted'}`}>
                  {DOW_LABELS[i]}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateMenu(dateStr, e.currentTarget);
                  }}
                  className="text-text-muted hover:text-text text-sm leading-none"
                >
                  +
                </button>
              </div>
              <div className={`text-center text-sm font-bold mb-1 ${isToday ? 'text-primary' : ''}`}>
                {dayDate.getDate()}
              </div>

              {/* Session cards */}
              <div className="space-y-0.5">
                {daySessions.map((s) => {
                  const sessionType = s.type || 'practice';
                  const scored = (s.shots ?? []).filter((sh) => sh.result === 'scored').length;
                  const total = (s.shots ?? []).length;
                  const rate = total > 0 ? Math.round((scored / total) * 100) : 0;
                  const matchType = s.matchType || '';
                  let nameDisplay = s.name || 'Unnamed';
                  if (sessionType === 'match' && matchType) {
                    const typeLabel = matchType.charAt(0).toUpperCase() + matchType.slice(1);
                    nameDisplay = `${typeLabel} vs ${s.name || '?'}`;
                  }
                  const bgColor = sessionType === 'match' ? 'bg-[#2196F3]/15' : 'bg-[#4CAF50]/15';

                  return (
                    <div
                      key={String(s.id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewSession?.(s);
                      }}
                      className={`rounded px-1 py-0.5 ${bgColor} cursor-pointer hover:opacity-80`}
                    >
                      <div className="truncate font-medium">{nameDisplay}</div>
                      <div className="text-text-muted">
                        {scored}/{total} – {rate}%
                      </div>
                    </div>
                  );
                })}

                {dayTraining.map((t) => {
                  const cards: { label: string; detail?: string; bgClass: string }[] = [];

                  // Pre-training kicking
                  if (t.sessionType === 'training' && t.kickingBefore) {
                    cards.push({
                      label: 'Pre-Training Kicking',
                      detail: `${t.beforeDuration || '?'} mins`,
                      bgClass: 'bg-[#4CAF50]/15',
                    });
                  }

                  // Main training card
                  const typeLabels: Record<string, string> = { training: 'Training', gym: 'Gym', recovery: 'Recovery' };
                  const typeIcons: Record<string, string> = { training: '🏃', gym: '💪', recovery: '🧊' };
                  const bgClasses: Record<string, string> = {
                    training: 'bg-[#FF9800]/15',
                    gym: 'bg-[#9C27B0]/15',
                    recovery: 'bg-[#FFC107]/15',
                  };
                  cards.push({
                    label: `${typeIcons[t.sessionType] || ''} ${typeLabels[t.sessionType] || t.sessionType}`,
                    detail: t.comments ? t.comments.substring(0, 30) : undefined,
                    bgClass: bgClasses[t.sessionType] || 'bg-grey-light',
                  });

                  // Post-training kicking
                  if (t.sessionType === 'training' && t.kickingAfter) {
                    cards.push({
                      label: 'Post-Training Kicking',
                      detail: `${t.afterDuration || '?'} mins`,
                      bgClass: 'bg-[#4CAF50]/15',
                    });
                  }

                  return cards.map((card, ci) => (
                    <div
                      key={`${t.id}-${ci}`}
                      className={`rounded px-1 py-0.5 ${card.bgClass}`}
                    >
                      <div className="truncate font-medium">{card.label}</div>
                      {card.detail && (
                        <div className="text-text-muted truncate">{card.detail}</div>
                      )}
                    </div>
                  ));
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-text-muted text-center">
        This week: {formatSummary(weeklyCounts)}
        {selectedDate && (
          <button onClick={onClearDate} className="ml-2 text-primary underline">
            Show all
          </button>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SessionCalendar(props: SessionCalendarProps) {
  const {
    viewMode,
    onSwitchView,
    ...rest
  } = props;

  return (
    <div className="bg-surface rounded-2xl p-4 shadow-sm">
      {/* View toggle */}
      <div className="flex gap-1 bg-grey-light rounded-lg p-1 mb-3 max-w-[200px] mx-auto">
        <button
          onClick={() => onSwitchView('monthly')}
          className={`flex-1 py-1 px-3 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'monthly' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onSwitchView('weekly')}
          className={`flex-1 py-1 px-3 rounded-md text-xs font-semibold transition-colors ${
            viewMode === 'weekly' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
          }`}
        >
          Weekly
        </button>
      </div>

      {viewMode === 'monthly' ? (
        <MonthlyView
          calendarYear={rest.calendarYear}
          calendarMonth={rest.calendarMonth}
          todayStr={rest.todayStr}
          selectedDate={rest.selectedDate}
          dateMap={rest.dateMap}
          monthlyCounts={rest.monthlyCounts}
          onChangeMonth={rest.onChangeMonth}
          onClearDate={rest.onClearDate}
          onDateMenu={rest.onDateMenu}
        />
      ) : (
        <WeeklyView
          weekStart={rest.weekStart}
          todayStr={rest.todayStr}
          selectedDate={rest.selectedDate}
          dateMap={rest.dateMap}
          sessionMap={rest.sessionMap}
          trainingMap={rest.trainingMap}
          weeklyCounts={rest.weeklyCounts}
          onChangeWeek={rest.onChangeWeek}
          onSelectDate={rest.onSelectDate}
          onClearDate={rest.onClearDate}
          onDateMenu={rest.onDateMenu}
          onViewSession={rest.onViewSession}
        />
      )}
    </div>
  );
}

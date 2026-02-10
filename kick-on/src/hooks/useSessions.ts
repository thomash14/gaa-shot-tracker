'use client';

import { useState, useMemo, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import type { Session, TrainingLog } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CalendarView = 'monthly' | 'weekly';
export type SessionFilter = 'all' | 'match' | 'practice' | 'training';

export interface DateInfo {
  practice: boolean;
  match: boolean;
  training: boolean;
  gym: boolean;
  recovery: boolean;
}

export type DateMap = Record<string, DateInfo>;
export type SessionMap = Record<string, Session[]>;
export type TrainingMap = Record<string, TrainingLog[]>;

export interface SessionListItem {
  type: 'shot' | 'training';
  date: string;
  data: Session | TrainingLog;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get Monday of the given date's week (ISO week: Mon=1). */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Today as YYYY-MM-DD, using local timezone. */
function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSessions() {
  const sessions = useSessionStore((s) => s.sessions);
  const trainingLogs = useSessionStore((s) => s.trainingLogs);

  // Calendar navigation state
  const now = new Date();
  const [viewMode, setViewMode] = useState<CalendarView>('monthly');
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(now));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<SessionFilter>('match');

  const todayStr = getTodayStr();

  // -----------------------------------------------------------------------
  // Build date maps (used by calendar for dots and weekly session cards)
  // -----------------------------------------------------------------------
  const { dateMap, sessionMap, trainingMap } = useMemo(() => {
    const dm: DateMap = {};
    const sm: SessionMap = {};
    const tm: TrainingMap = {};

    sessions.forEach((s) => {
      if (!s.shots || s.shots.length === 0) return;
      if (!dm[s.date])
        dm[s.date] = { practice: false, match: false, training: false, gym: false, recovery: false };
      if (!sm[s.date]) sm[s.date] = [];
      const t = s.type || 'practice';
      if (t === 'match') dm[s.date].match = true;
      else dm[s.date].practice = true;
      sm[s.date].push(s);
    });

    trainingLogs.forEach((log) => {
      if (!dm[log.date])
        dm[log.date] = { practice: false, match: false, training: false, gym: false, recovery: false };
      if (!tm[log.date]) tm[log.date] = [];
      dm[log.date][log.sessionType] = true;
      // Kicking before/after counts as practice activity (green dot)
      if (log.kickingBefore || log.kickingAfter) dm[log.date].practice = true;
      tm[log.date].push(log);
    });

    return { dateMap: dm, sessionMap: sm, trainingMap: tm };
  }, [sessions, trainingLogs]);

  // -----------------------------------------------------------------------
  // Filtered + sorted list items (interleaves shot sessions and training)
  // -----------------------------------------------------------------------
  const listItems = useMemo((): SessionListItem[] => {
    const items: SessionListItem[] = [];
    const showShotSessions = filter !== 'training';
    const showTrainingLogs = filter === 'all' || filter === 'training';

    if (showShotSessions) {
      let filtered = sessions.filter((s) => s.shots && s.shots.length > 0);
      if (filter !== 'all') {
        filtered = filtered.filter((s) => (s.type || 'practice') === filter);
      }
      if (selectedDate) {
        filtered = filtered.filter((s) => s.date === selectedDate);
      }
      filtered.forEach((s) => items.push({ type: 'shot', date: s.date, data: s }));
    }

    if (showTrainingLogs) {
      let logs = [...trainingLogs];
      if (selectedDate) {
        logs = logs.filter((l) => l.date === selectedDate);
      }
      logs.forEach((l) => items.push({ type: 'training', date: l.date, data: l }));
    }

    items.sort((a, b) => b.date.localeCompare(a.date));
    return items;
  }, [sessions, trainingLogs, filter, selectedDate]);

  // -----------------------------------------------------------------------
  // Monthly counts (for calendar summary)
  // -----------------------------------------------------------------------
  const monthlyCounts = useMemo(() => {
    let practice = 0,
      match = 0,
      training = 0,
      gym = 0,
      recovery = 0;

    sessions.forEach((s) => {
      if (!s.shots || s.shots.length === 0) return;
      const parts = s.date.split('-');
      if (parseInt(parts[0]) === calendarYear && parseInt(parts[1]) - 1 === calendarMonth) {
        if ((s.type || 'practice') === 'match') match++;
        else practice++;
      }
    });

    trainingLogs.forEach((log) => {
      const parts = log.date.split('-');
      if (parseInt(parts[0]) === calendarYear && parseInt(parts[1]) - 1 === calendarMonth) {
        if (log.sessionType === 'training') training++;
        else if (log.sessionType === 'gym') gym++;
        else if (log.sessionType === 'recovery') recovery++;
        if (log.kickingBefore) practice++;
        if (log.kickingAfter) practice++;
      }
    });

    return { practice, match, training, gym, recovery };
  }, [sessions, trainingLogs, calendarYear, calendarMonth]);

  // -----------------------------------------------------------------------
  // Weekly counts (for calendar summary)
  // -----------------------------------------------------------------------
  const weeklyCounts = useMemo(() => {
    let practice = 0,
      match = 0,
      training = 0,
      gym = 0,
      recovery = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

      const daySessions = sessionMap[dateStr] || [];
      daySessions.forEach((s) => {
        if ((s.type || 'practice') === 'match') match++;
        else practice++;
      });

      const dayTraining = trainingMap[dateStr] || [];
      dayTraining.forEach((t) => {
        if (t.sessionType === 'training') training++;
        else if (t.sessionType === 'gym') gym++;
        else if (t.sessionType === 'recovery') recovery++;
        if (t.kickingBefore) practice++;
        if (t.kickingAfter) practice++;
      });
    }

    return { practice, match, training, gym, recovery };
  }, [weekStart, sessionMap, trainingMap]);

  // -----------------------------------------------------------------------
  // Navigation actions
  // -----------------------------------------------------------------------

  const changeMonth = useCallback((delta: number) => {
    setCalendarYear((y) => {
      const newMonth = calendarMonth + delta;
      if (newMonth > 11) return y + 1;
      if (newMonth < 0) return y - 1;
      return y;
    });
    setCalendarMonth((m) => {
      const newMonth = m + delta;
      if (newMonth > 11) return 0;
      if (newMonth < 0) return 11;
      return newMonth;
    });
    setSelectedDate(null);
  }, [calendarMonth]);

  const changeWeek = useCallback((delta: number) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta * 7);
      return next;
    });
    setSelectedDate(null);
  }, []);

  const selectDate = useCallback(
    (dateStr: string) => {
      if (viewMode === 'monthly') {
        // Drill down: switch to weekly view for the clicked date's week
        setViewMode('weekly');
        setWeekStart(getMonday(new Date(dateStr + 'T12:00:00')));
        setSelectedDate(dateStr);
        return;
      }
      // Weekly view: toggle selection
      setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
    },
    [viewMode]
  );

  const switchView = useCallback(
    (mode: CalendarView) => {
      if (mode === 'weekly') {
        if (selectedDate) {
          setWeekStart(getMonday(new Date(selectedDate + 'T12:00:00')));
        }
      } else if (mode === 'monthly') {
        setCalendarMonth(weekStart.getMonth());
        setCalendarYear(weekStart.getFullYear());
      }
      setViewMode(mode);
    },
    [selectedDate, weekStart]
  );

  const clearDate = useCallback(() => setSelectedDate(null), []);

  const setFilterType = useCallback((type: SessionFilter) => {
    setSelectedDate(null);
    setFilter(type);
  }, []);

  return {
    // State
    viewMode,
    calendarYear,
    calendarMonth,
    weekStart,
    selectedDate,
    filter,
    todayStr,

    // Data
    dateMap,
    sessionMap,
    trainingMap,
    listItems,
    monthlyCounts,
    weeklyCounts,

    // Actions
    changeMonth,
    changeWeek,
    selectDate,
    switchView,
    clearDate,
    setFilterType,
  };
}

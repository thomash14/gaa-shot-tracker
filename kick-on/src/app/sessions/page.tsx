'use client';

import { useState, useCallback } from 'react';
import { useSessions } from '@/hooks/useSessions';
import { useTrainingLogs } from '@/hooks/useTrainingLogs';
import { useSessionStore } from '@/store/sessionStore';
import { createClient } from '@/lib/supabase/client';
import {
  SessionCalendar,
  CalendarDateMenu,
  TrainingLogModal,
  SessionList,
  SessionDetailModal,
} from '@/components/sessions';
import type { Session } from '@/types';

export default function SessionsPage() {
  const {
    viewMode,
    calendarYear,
    calendarMonth,
    weekStart,
    selectedDate,
    filter,
    todayStr,
    dateMap,
    sessionMap,
    trainingMap,
    listItems,
    monthlyCounts,
    weeklyCounts,
    changeMonth,
    changeWeek,
    selectDate,
    switchView,
    clearDate,
    setFilterType,
  } = useSessions();

  const {
    modalOpen,
    modalDate,
    form,
    openModal: openTrainingModal,
    closeModal: closeTrainingModal,
    updateForm,
    saveLog,
    deleteLog,
  } = useTrainingLogs();

  const sessions = useSessionStore((s) => s.sessions);
  const removeSession = useSessionStore((s) => s.removeSession);

  // --- Session detail modal state ---
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  // --- Date menu state ---
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [dateMenuDate, setDateMenuDate] = useState<string | null>(null);
  const [dateMenuAnchor, setDateMenuAnchor] = useState<HTMLElement | null>(null);

  const handleDateMenu = useCallback((dateStr: string, anchorEl: HTMLElement) => {
    setDateMenuDate(dateStr);
    setDateMenuAnchor(anchorEl);
    setDateMenuOpen(true);
  }, []);

  const closeDateMenu = useCallback(() => {
    setDateMenuOpen(false);
    setDateMenuDate(null);
    setDateMenuAnchor(null);
  }, []);

  // Check if date has shot sessions (for menu option)
  const dateHasShotSessions = dateMenuDate ? !!(sessionMap[dateMenuDate]?.length) : false;

  // --- Session actions ---
  const handleViewSession = useCallback((session: Session) => {
    setViewingSession(session);
  }, []);

  const handleDeleteSession = useCallback(
    async (id: string | number) => {
      if (!window.confirm('Delete this session? This cannot be undone.')) return;

      // Find session to check for cloudId
      const session = sessions.find((s) => s.id === id);
      if (session?.cloudId) {
        try {
          const supabase = createClient();
          await supabase.from('sessions').delete().eq('id', session.cloudId);
        } catch (err) {
          console.error('Failed to delete session from cloud:', err);
        }
      }

      removeSession(id);
    },
    [sessions, removeSession],
  );

  const handleDeleteTrainingLog = useCallback(
    (id: string | number) => {
      if (window.confirm('Delete this training log?')) {
        deleteLog(id);
      }
    },
    [deleteLog],
  );

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-primary">Sessions</h2>

      {/* Calendar */}
      <SessionCalendar
        viewMode={viewMode}
        calendarYear={calendarYear}
        calendarMonth={calendarMonth}
        weekStart={weekStart}
        selectedDate={selectedDate}
        todayStr={todayStr}
        dateMap={dateMap}
        sessionMap={sessionMap}
        trainingMap={trainingMap}
        monthlyCounts={monthlyCounts}
        weeklyCounts={weeklyCounts}
        onChangeMonth={changeMonth}
        onChangeWeek={changeWeek}
        onSelectDate={selectDate}
        onSwitchView={switchView}
        onClearDate={clearDate}
        onDateMenu={handleDateMenu}
        onViewSession={handleViewSession}
      />

      {/* Session list */}
      <SessionList
        items={listItems}
        filter={filter}
        selectedDate={selectedDate}
        onFilterChange={setFilterType}
        onViewSession={handleViewSession}
        onDeleteSession={handleDeleteSession}
        onDeleteTrainingLog={handleDeleteTrainingLog}
      />

      {/* Calendar date menu popup */}
      {dateMenuOpen && dateMenuDate && (
        <CalendarDateMenu
          dateStr={dateMenuDate}
          anchorEl={dateMenuAnchor}
          hasShotSessions={dateHasShotSessions}
          onViewSessions={() => selectDate(dateMenuDate)}
          onLogTraining={() => openTrainingModal(dateMenuDate)}
          onClose={closeDateMenu}
        />
      )}

      {/* Training log modal */}
      <TrainingLogModal
        open={modalOpen}
        dateStr={modalDate}
        form={form}
        onUpdate={updateForm}
        onSave={saveLog}
        onClose={closeTrainingModal}
      />

      {/* Session detail modal */}
      {viewingSession && (
        <SessionDetailModal
          session={viewingSession}
          onClose={() => setViewingSession(null)}
        />
      )}
    </div>
  );
}

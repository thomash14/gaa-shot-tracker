'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useUiStore } from '@/store/uiStore';
import { createClient } from '@/lib/supabase/client';
import type { Session, TrainingLog } from '@/types';

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_SESSIONS = 'kickon_sessions';
const LS_TRAINING_LOGS = 'kickon_training_logs';

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadFromLocalStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCloudSync() {
  const sessions = useSessionStore((s) => s.sessions);
  const trainingLogs = useSessionStore((s) => s.trainingLogs);
  const setSessions = useSessionStore((s) => s.setSessions);
  const setTrainingLogs = useSessionStore((s) => s.setTrainingLogs);
  const setLoading = useUiStore((s) => s.setLoading);
  const setOfflineMode = useUiStore((s) => s.setOfflineMode);

  const initialised = useRef(false);
  const lastSyncRef = useRef<string | null>(null);

  // -----------------------------------------------------------------------
  // Load data from Supabase (or localStorage fallback)
  // -----------------------------------------------------------------------
  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true, 'Loading your data...');

    try {
      // Attempt cloud load
      const [sessionsRes, logsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
        supabase
          .from('training_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (logsRes.error) throw logsRes.error;

      const cloudSessions: Session[] = (sessionsRes.data ?? []).map(row => ({
        id: row.id,
        name: row.name || '',
        date: row.date,
        type: row.session_type || row.type || 'practice',
        sport: row.sport || 'football',
        matchType: row.match_type || null,
        shots: row.shots || [],
        startTime: row.start_time || row.created_at,
        endTime: row.end_time || undefined,
        cloudId: row.id,
        notes: row.notes || undefined,
        didWell: row.did_well || undefined,
        toImprove: row.to_improve || undefined,
        windDirection: row.wind_direction || undefined,
        windStrength: row.wind_strength || undefined,
      }));

      const cloudLogs: TrainingLog[] = (logsRes.data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        date: row.date,
        sessionType: row.session_type || 'training',
        kickingBefore: row.kicking_before || false,
        kickingAfter: row.kicking_after || false,
        beforeDuration: row.before_duration || undefined,
        afterDuration: row.after_duration || undefined,
        gymDuration: row.gym_duration || undefined,
        gymFocus: row.gym_focus || undefined,
        recoveryDuration: row.recovery_duration || undefined,
        recoveryType: row.recovery_type || undefined,
        comments: row.comments || undefined,
        cloudId: row.id,
      }));

      // Merge with any local-only data (sessions without cloudId)
      const localSessions = loadFromLocalStorage<Session[]>(LS_SESSIONS) ?? [];
      const localOnlySessions = localSessions.filter(s => !s.cloudId);
      const merged = [...cloudSessions, ...localOnlySessions];

      const localLogs = loadFromLocalStorage<TrainingLog[]>(LS_TRAINING_LOGS) ?? [];
      const localOnlyLogs = localLogs.filter(l => !l.cloudId);
      const mergedLogs = [...cloudLogs, ...localOnlyLogs];

      setSessions(merged);
      setTrainingLogs(mergedLogs);
      setOfflineMode(false);

      // Cache to localStorage
      saveToLocalStorage(LS_SESSIONS, merged);
      saveToLocalStorage(LS_TRAINING_LOGS, mergedLogs);
    } catch (err) {
      console.warn('Cloud sync failed, using local data:', err);
      setOfflineMode(true);

      // Fallback: load from localStorage
      const localSessions = loadFromLocalStorage<Session[]>(LS_SESSIONS);
      const localLogs = loadFromLocalStorage<TrainingLog[]>(LS_TRAINING_LOGS);
      if (localSessions) setSessions(localSessions);
      if (localLogs) setTrainingLogs(localLogs);
    } finally {
      setLoading(false);
    }
  }, [setSessions, setTrainingLogs, setLoading, setOfflineMode]);

  // -----------------------------------------------------------------------
  // Persist to localStorage whenever store changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!initialised.current) return;
    saveToLocalStorage(LS_SESSIONS, sessions);
  }, [sessions]);

  useEffect(() => {
    if (!initialised.current) return;
    saveToLocalStorage(LS_TRAINING_LOGS, trainingLogs);
  }, [trainingLogs]);

  // -----------------------------------------------------------------------
  // Initial load on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;
    loadData();
  }, [loadData]);

  // -----------------------------------------------------------------------
  // Online/offline detection
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleOnline() {
      setOfflineMode(false);
      // Re-sync from cloud when coming back online
      loadData();
    }

    function handleOffline() {
      setOfflineMode(true);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial state
    if (!navigator.onLine) {
      setOfflineMode(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOfflineMode, loadData]);

  return { loadData };
}

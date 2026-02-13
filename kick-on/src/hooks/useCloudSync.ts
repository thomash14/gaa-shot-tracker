'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useUiStore } from '@/store/uiStore';
import { createClient } from '@/lib/supabase/client';
import {
  syncSessionToCloud,
  deleteSessionFromCloud,
  syncTrainingLogToCloud,
  deleteTrainingLogFromCloud,
  syncBacklog,
} from '@/lib/supabase/cloudWrite';
import type { Session, TrainingLog, PracticeDrill } from '@/types';

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
  const clearTeam = useTeamStore((s) => s.clearTeam);
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
      // Attempt cloud load — join shots via foreign key (shots table is separate)
      const [sessionsRes, logsRes] = await Promise.all([
        supabase
          .from('sessions')
          .select('*, shots(*)')
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cloudSessions: Session[] = (sessionsRes.data ?? []).map((row: any) => ({
        id: row.id,
        name: row.name || '',
        date: row.date,
        type: row.type || 'practice',
        sport: row.sport || 'football',
        matchType: row.match_type || null,
        shots: (row.shots || []).map((shot: any) => ({
          x: parseFloat(shot.x),
          y: parseFloat(shot.y),
          result: shot.result,
          distance: shot.distance ? parseFloat(shot.distance) : 0,
          foot: shot.foot || 'right',
          shotCategory: shot.shot_category || 'in-play',
          shotType: shot.shot_type || 'standing',
          shotFor: shot.shot_for || 'point',
          pointValue: shot.point_value || 1,
          half: shot.half || null,
          comment: shot.comment || '',
          timestamp: shot.timestamp || '',
          batch: false,
          cloudId: shot.id,
          missResult: shot.miss_result || undefined,
          missReason: shot.miss_reason || undefined,
          drillCloudId: shot.drill_id || undefined,
        })),
        startTime: row.start_time || row.created_at,
        endTime: row.end_time || undefined,
        cloudId: row.id,
        notes: row.session_notes || undefined,
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

      // Load practice_drills for practice sessions
      const practiceSessionIds = cloudSessions
        .filter((s) => s.type === 'practice')
        .map((s) => s.cloudId)
        .filter(Boolean) as string[];

      if (practiceSessionIds.length > 0) {
        try {
          const { data: drillsData, error: drillsError } = await supabase
            .from('practice_drills')
            .select('*')
            .in('session_id', practiceSessionIds)
            .order('drill_order', { ascending: true });

          if (drillsError) {
            console.warn('practice_drills query error:', drillsError.message);
          } else if (Array.isArray(drillsData) && drillsData.length > 0) {
            // Group drills by session_id
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const drillsBySession: Record<string, PracticeDrill[]> = {};
            for (const d of drillsData as any[]) {
              const sid = d.session_id;
              if (!sid) continue;
              if (!drillsBySession[sid]) drillsBySession[sid] = [];
              drillsBySession[sid].push({
                id: d.drill_order || (drillsBySession[sid].length + 1),
                cloudId: d.id,
                drillOrder: d.drill_order || 1,
                drillType: d.drill_type || 'free-form',
                distance: d.distance ? parseFloat(d.distance) : null,
                foot: d.foot || 'right',
                stance: d.stance || 'standing',
                shotCategory: d.shot_category || 'in-play',
                shotCount: d.shot_count || 0,
                scoredCount: d.scored_count || 0,
                assignedDrillId: d.assigned_drill_id || null,
                templateId: d.template_id || null,
                shots: [],
                startTime: d.start_time || null,
                endTime: d.end_time || null,
              });
            }

            // Attach drills to sessions and map shots to drills
            for (const session of cloudSessions) {
              if (session.cloudId && drillsBySession[session.cloudId]) {
                session.drills = drillsBySession[session.cloudId];
                // Map shots to their drill's shot array and set local drillId
                for (const drill of session.drills) {
                  drill.shots = (session.shots ?? []).filter(
                    (s) => s.drillCloudId === drill.cloudId,
                  );
                  for (const shot of drill.shots) {
                    shot.drillId = drill.id;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('practice_drills table not available:', e);
        }
      }

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

      // Sync any local-only data up to Supabase
      syncBacklog();
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
  // Re-load when auth state changes (e.g. user logs in)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        loadData();
      }
      if (event === 'SIGNED_OUT') {
        setSessions([]);
        setTrainingLogs([]);
        clearTeam();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData, setSessions, setTrainingLogs, clearTeam]);

  // -----------------------------------------------------------------------
  // Auto-sync: subscribe to Zustand store for session/log changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    let prevSessions: Session[] = useSessionStore.getState().sessions;
    let prevLogs: TrainingLog[] = useSessionStore.getState().trainingLogs;

    const unsub = useSessionStore.subscribe((state) => {
      const nextSessions = state.sessions;
      const nextLogs = state.trainingLogs;

      // --- Detect added sessions (new item without cloudId) ---
      if (nextSessions.length > prevSessions.length) {
        const prevIds = new Set(prevSessions.map((s) => s.id));
        for (const s of nextSessions) {
          if (!prevIds.has(s.id) && !s.cloudId) {
            syncSessionToCloud(s);
          }
        }
      }

      // --- Detect removed sessions (item with cloudId disappeared) ---
      if (nextSessions.length < prevSessions.length) {
        const nextIds = new Set(nextSessions.map((s) => s.id));
        for (const s of prevSessions) {
          if (!nextIds.has(s.id) && s.cloudId) {
            deleteSessionFromCloud(s.cloudId);
          }
        }
      }

      // --- Detect added training logs ---
      if (nextLogs.length > prevLogs.length) {
        const prevLogIds = new Set(prevLogs.map((l) => l.id));
        for (const l of nextLogs) {
          if (!prevLogIds.has(l.id) && !l.cloudId) {
            syncTrainingLogToCloud(l);
          }
        }
      }

      // --- Detect removed training logs ---
      if (nextLogs.length < prevLogs.length) {
        const nextLogIds = new Set(nextLogs.map((l) => l.id));
        for (const l of prevLogs) {
          if (!nextLogIds.has(l.id) && l.cloudId) {
            deleteTrainingLogFromCloud(l.cloudId);
          }
        }
      }

      prevSessions = nextSessions;
      prevLogs = nextLogs;
    });

    return () => unsub();
  }, []);

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

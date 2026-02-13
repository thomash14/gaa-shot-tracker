import { createClient } from './client';
import { useSessionStore } from '@/store/sessionStore';
import type { Session, TrainingLog, PracticeDrill, Shot } from '@/types';

// ---------------------------------------------------------------------------
// Serialised sync queue — prevents race conditions (same pattern as vanilla
// app.js). Every write is chained so a rapid sequence of saves cannot
// interleave and create duplicates.
// ---------------------------------------------------------------------------

let syncQueue = Promise.resolve();

function enqueue(fn: () => Promise<void>): void {
  syncQueue = syncQueue.then(fn).catch((err) => {
    console.error('[cloudWrite] sync error:', err);
  });
}

// ---------------------------------------------------------------------------
// Offline helpers — pending delete queue
// ---------------------------------------------------------------------------

const LS_PENDING_DELETES = 'kickon_pending_deletes';

interface PendingDeletes {
  sessions: string[];
  trainingLogs: string[];
}

function loadPendingDeletes(): PendingDeletes {
  try {
    const raw = localStorage.getItem(LS_PENDING_DELETES);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sessions: [], trainingLogs: [] };
}

function addPendingDelete(type: 'sessions' | 'trainingLogs', cloudId: string) {
  const pending = loadPendingDeletes();
  if (!pending[type].includes(cloudId)) {
    pending[type].push(cloudId);
    localStorage.setItem(LS_PENDING_DELETES, JSON.stringify(pending));
  }
}

function clearPendingDeletes() {
  localStorage.removeItem(LS_PENDING_DELETES);
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ---------------------------------------------------------------------------
// syncSessionToCloud — insert or update session + drills + shots
// ---------------------------------------------------------------------------

async function _syncSessionToCloud(session: Session): Promise<void> {
  if (isOffline()) return; // skip when offline — syncBacklog picks up on reconnect

  const user = await getUser();
  if (!user) return;

  const supabase = createClient();

  // 1. Upsert session
  // Note: 'sport' is NOT a column in the sessions table — do not include it
  const sessionPayload = {
    user_id: user.id,
    name: session.name || '',
    date: session.date,
    type: session.type || 'practice',
    match_type: session.matchType || null,
    start_time: session.startTime || new Date().toISOString(),
    end_time: session.endTime || null,
    session_notes: session.notes || null,
    did_well: session.didWell || null,
    to_improve: session.toImprove || null,
    wind_direction: session.windDirection || null,
    wind_strength: session.windStrength || null,
  };

  let sessionCloudId = session.cloudId;

  if (sessionCloudId) {
    // Update existing
    console.log('[cloudWrite] updating session', sessionCloudId, sessionPayload);
    const { error, status, statusText } = await supabase
      .from('sessions')
      .update(sessionPayload)
      .eq('id', sessionCloudId);
    if (error) {
      console.error('[cloudWrite] session update error:', { message: error.message, code: error.code, details: error.details, hint: error.hint, status, statusText });
      return;
    }
  } else {
    // Insert new
    console.log('[cloudWrite] inserting session', sessionPayload);
    const { data, error, status, statusText } = await supabase
      .from('sessions')
      .insert(sessionPayload)
      .select('id')
      .single();
    if (error || !data) {
      console.error('[cloudWrite] session insert error:', { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint, status, statusText });
      return;
    }
    sessionCloudId = data.id;
    console.log('[cloudWrite] session inserted, cloudId:', sessionCloudId);
  }

  // 2. Insert drills (for practice sessions)
  const drillIdMap = new Map<number, string>(); // local drill id -> cloud UUID

  if (session.drills && session.drills.length > 0) {
    // Delete existing drills for this session first (simpler than diffing)
    await supabase
      .from('practice_drills')
      .delete()
      .eq('session_id', sessionCloudId);

    // practice_drills columns: id, session_id, user_id, drill_type, distance,
    // foot, stance, shot_count, scored_count, drill_order, assigned_drill_id,
    // notes, created_at, updated_at
    // NOT in table: shot_category, template_id, start_time, end_time
    const drillPayloads = session.drills.map((drill) => ({
      session_id: sessionCloudId,
      user_id: user.id,
      drill_order: drill.drillOrder,
      drill_type: drill.drillType || 'free-form',
      distance: drill.distance,
      foot: drill.foot || 'right',
      stance: drill.stance || 'standing',
      shot_count: drill.shotCount || 0,
      scored_count: drill.scoredCount || 0,
      assigned_drill_id: drill.assignedDrillId || null,
    }));

    console.log('[cloudWrite] inserting drills — session_id:', sessionCloudId, '(type:', typeof sessionCloudId, ') payloads:', JSON.stringify(drillPayloads, null, 2));
    const drillResult = await supabase
      .from('practice_drills')
      .insert(drillPayloads)
      .select('id');

    console.log('[cloudWrite] drill insert result:', JSON.stringify(drillResult, null, 2));

    const { data: drillRows, error: drillError } = drillResult;

    if (drillError) {
      console.error('[cloudWrite] drill insert error:', JSON.stringify(drillError, null, 2), 'status:', drillResult.status, 'statusText:', drillResult.statusText);
    } else if (drillRows) {
      // Map local drill ids to cloud UUIDs (insert preserves order)
      session.drills.forEach((drill, i) => {
        if (drillRows[i]) {
          drillIdMap.set(drill.id, drillRows[i].id);
        }
      });
    }
  }

  // 3. Insert shots that don't have a cloudId yet
  const unsyncedShots = (session.shots ?? []).filter((s) => !s.cloudId);

  if (unsyncedShots.length > 0) {
    // shots columns: session_id, x, y, distance, foot, half, shot_for,
    // shot_category, shot_type, point_value, result, timestamp, comment,
    // miss_result, miss_reason, drill_id
    // NOT in table: user_id
    const shotPayloads = unsyncedShots.map((shot) => ({
      session_id: sessionCloudId,
      x: shot.x,
      y: shot.y,
      result: shot.result,
      distance: shot.distance || 0,
      foot: shot.foot || 'right',
      half: shot.half || null,
      comment: shot.comment || '',
      timestamp: shot.timestamp || new Date().toISOString(),
      shot_category: shot.shotCategory || 'in-play',
      shot_type: shot.shotType || 'standing',
      shot_for: shot.shotFor || 'point',
      point_value: shot.pointValue || 1,
      miss_result: shot.missResult || null,
      miss_reason: shot.missReason || null,
      drill_id: shot.drillId ? (drillIdMap.get(shot.drillId) || null) : null,
    }));

    console.log('[cloudWrite] inserting shots — session_id:', sessionCloudId, '(type:', typeof sessionCloudId, ') payloads:', JSON.stringify(shotPayloads, null, 2));
    const shotResult = await supabase
      .from('shots')
      .insert(shotPayloads)
      .select('id');

    console.log('[cloudWrite] shot insert result:', JSON.stringify(shotResult, null, 2));

    const { data: shotRows, error: shotError } = shotResult;

    if (shotError) {
      console.error('[cloudWrite] shot insert error:', JSON.stringify(shotError, null, 2), 'status:', shotResult.status, 'statusText:', shotResult.statusText);
    } else if (shotRows) {
      // Map shot cloudIds back — order is preserved by Supabase insert
      unsyncedShots.forEach((shot, i) => {
        if (shotRows[i]) {
          shot.cloudId = shotRows[i].id;
          // Also set drillCloudId if applicable
          if (shot.drillId && drillIdMap.has(shot.drillId)) {
            shot.drillCloudId = drillIdMap.get(shot.drillId);
          }
        }
      });
    }
  }

  // 4. Update Zustand store with cloud IDs
  const store = useSessionStore.getState();

  // Build updated drills with cloudIds
  const updatedDrills: PracticeDrill[] | undefined = session.drills?.map(
    (drill) => ({
      ...drill,
      cloudId: drillIdMap.get(drill.id) || drill.cloudId,
    }),
  );

  // Build updated shots with cloudIds
  const updatedShots: Shot[] = (session.shots ?? []).map((shot) => ({ ...shot }));

  store.updateSession(session.id, {
    id: sessionCloudId,
    cloudId: sessionCloudId,
    drills: updatedDrills,
    shots: updatedShots,
  });
}

export function syncSessionToCloud(session: Session): void {
  enqueue(() => _syncSessionToCloud(session));
}

// ---------------------------------------------------------------------------
// deleteSessionFromCloud
// ---------------------------------------------------------------------------

async function _deleteSessionFromCloud(cloudId: string): Promise<void> {
  if (isOffline()) {
    addPendingDelete('sessions', cloudId);
    return;
  }

  const user = await getUser();
  if (!user) return;

  const supabase = createClient();

  // Delete in order: shots, drills, then session (foreign key deps)
  await supabase.from('shots').delete().eq('session_id', cloudId);
  await supabase.from('practice_drills').delete().eq('session_id', cloudId);
  const { error } = await supabase.from('sessions').delete().eq('id', cloudId);

  if (error) {
    console.error('[cloudWrite] session delete error:', error);
  }
}

export function deleteSessionFromCloud(cloudId: string): void {
  enqueue(() => _deleteSessionFromCloud(cloudId));
}

// ---------------------------------------------------------------------------
// syncTrainingLogToCloud
// ---------------------------------------------------------------------------

async function _syncTrainingLogToCloud(log: TrainingLog): Promise<void> {
  if (isOffline()) return; // skip when offline — syncBacklog picks up on reconnect

  const user = await getUser();
  if (!user) return;

  const supabase = createClient();

  const payload = {
    user_id: user.id,
    date: log.date,
    session_type: log.sessionType || 'training',
    kicking_before: log.kickingBefore ?? false,
    kicking_after: log.kickingAfter ?? false,
    before_duration: log.beforeDuration || null,
    after_duration: log.afterDuration || null,
    gym_duration: log.gymDuration || null,
    gym_focus: log.gymFocus || null,
    recovery_duration: log.recoveryDuration || null,
    recovery_type: log.recoveryType || null,
    comments: log.comments || null,
  };

  let logCloudId = log.cloudId;

  if (logCloudId) {
    console.log('[cloudWrite] updating training log', logCloudId, payload);
    const { error, status, statusText } = await supabase
      .from('training_logs')
      .update(payload)
      .eq('id', logCloudId);
    if (error) {
      console.error('[cloudWrite] training log update error:', { message: error.message, code: error.code, details: error.details, hint: error.hint, status, statusText });
      return;
    }
  } else {
    console.log('[cloudWrite] inserting training log', payload);
    const { data, error, status, statusText } = await supabase
      .from('training_logs')
      .insert(payload)
      .select('id')
      .single();
    if (error || !data) {
      console.error('[cloudWrite] training log insert error:', { message: error?.message, code: error?.code, details: error?.details, hint: error?.hint, status, statusText });
      return;
    }
    logCloudId = data.id;
    console.log('[cloudWrite] training log inserted, cloudId:', logCloudId);
  }

  // Update store with cloudId
  const store = useSessionStore.getState();
  const currentLogs = store.trainingLogs;
  const updatedLogs = currentLogs.map((l) =>
    l.id === log.id ? { ...l, id: logCloudId!, cloudId: logCloudId! } : l,
  );
  store.setTrainingLogs(updatedLogs);
}

export function syncTrainingLogToCloud(log: TrainingLog): void {
  enqueue(() => _syncTrainingLogToCloud(log));
}

// ---------------------------------------------------------------------------
// deleteTrainingLogFromCloud
// ---------------------------------------------------------------------------

async function _deleteTrainingLogFromCloud(cloudId: string): Promise<void> {
  if (isOffline()) {
    addPendingDelete('trainingLogs', cloudId);
    return;
  }

  const user = await getUser();
  if (!user) return;

  const supabase = createClient();
  const { error } = await supabase
    .from('training_logs')
    .delete()
    .eq('id', cloudId);

  if (error) {
    console.error('[cloudWrite] training log delete error:', error);
  }
}

export function deleteTrainingLogFromCloud(cloudId: string): void {
  enqueue(() => _deleteTrainingLogFromCloud(cloudId));
}

// ---------------------------------------------------------------------------
// processPendingDeletes — execute any deletes queued while offline
// ---------------------------------------------------------------------------

export async function processPendingDeletes(): Promise<void> {
  const pending = loadPendingDeletes();
  if (pending.sessions.length === 0 && pending.trainingLogs.length === 0) return;

  const user = await getUser();
  if (!user) return;

  const supabase = createClient();

  for (const cloudId of pending.sessions) {
    await supabase.from('shots').delete().eq('session_id', cloudId);
    await supabase.from('practice_drills').delete().eq('session_id', cloudId);
    await supabase.from('sessions').delete().eq('id', cloudId);
  }

  for (const cloudId of pending.trainingLogs) {
    await supabase.from('training_logs').delete().eq('id', cloudId);
  }

  clearPendingDeletes();
}

// ---------------------------------------------------------------------------
// syncBacklog — sync all sessions/logs that need cloud sync
// ---------------------------------------------------------------------------

export function syncBacklog(): void {
  const store = useSessionStore.getState();

  for (const session of store.sessions) {
    if (!session.cloudId) {
      // Session never synced
      syncSessionToCloud(session);
    } else {
      // Session synced but may have unsynced shots (added while offline)
      const hasUnsyncedShots = (session.shots ?? []).some((s) => !s.cloudId);
      if (hasUnsyncedShots) {
        syncSessionToCloud(session);
      }
    }
  }

  for (const log of store.trainingLogs) {
    if (!log.cloudId) {
      syncTrainingLogToCloud(log);
    }
  }
}

// ---------------------------------------------------------------------------
// getPendingSyncCount — count items needing sync
// ---------------------------------------------------------------------------

export function getPendingSyncCount(): number {
  const store = useSessionStore.getState();
  const pending = loadPendingDeletes();

  let count = 0;

  // Sessions without cloudId
  count += store.sessions.filter((s) => !s.cloudId).length;

  // Shots without cloudId (on synced sessions)
  for (const session of store.sessions) {
    if (session.cloudId) {
      count += (session.shots ?? []).filter((s) => !s.cloudId).length;
    }
  }

  // Training logs without cloudId
  count += store.trainingLogs.filter((l) => !l.cloudId).length;

  // Pending deletes
  count += pending.sessions.length + pending.trainingLogs.length;

  return count;
}

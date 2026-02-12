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
  const user = await getUser();
  if (!user) return; // offline or not logged in

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

    const drillPayloads = session.drills.map((drill) => ({
      session_id: sessionCloudId,
      user_id: user.id,
      drill_order: drill.drillOrder,
      drill_type: drill.drillType || 'free-form',
      distance: drill.distance,
      foot: drill.foot || 'right',
      stance: drill.stance || 'standing',
      shot_category: drill.shotCategory || 'in-play',
      shot_count: drill.shotCount || 0,
      scored_count: drill.scoredCount || 0,
      assigned_drill_id: drill.assignedDrillId || null,
      template_id: drill.templateId || null,
      start_time: drill.startTime || null,
      end_time: drill.endTime || null,
    }));

    console.log('[cloudWrite] inserting', drillPayloads.length, 'drills for session', sessionCloudId);
    const { data: drillRows, error: drillError, status: drillStatus, statusText: drillStatusText } = await supabase
      .from('practice_drills')
      .insert(drillPayloads)
      .select('id');

    if (drillError) {
      console.error('[cloudWrite] drill insert error:', { message: drillError.message, code: drillError.code, details: drillError.details, hint: drillError.hint, status: drillStatus, statusText: drillStatusText });
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
    const shotPayloads = unsyncedShots.map((shot) => ({
      session_id: sessionCloudId,
      user_id: user.id,
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

    console.log('[cloudWrite] inserting', shotPayloads.length, 'shots for session', sessionCloudId);
    const { data: shotRows, error: shotError, status: shotStatus, statusText: shotStatusText } = await supabase
      .from('shots')
      .insert(shotPayloads)
      .select('id');

    if (shotError) {
      console.error('[cloudWrite] shot insert error:', { message: shotError.message, code: shotError.code, details: shotError.details, hint: shotError.hint, status: shotStatus, statusText: shotStatusText });
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
// syncBacklog — sync all sessions/logs that are missing cloudId
// ---------------------------------------------------------------------------

export function syncBacklog(): void {
  const store = useSessionStore.getState();

  for (const session of store.sessions) {
    if (!session.cloudId) {
      syncSessionToCloud(session);
    }
  }

  for (const log of store.trainingLogs) {
    if (!log.cloudId) {
      syncTrainingLogToCloud(log);
    }
  }
}

import { createClient } from './client';
import type { PlayerEventType, PlayerMatchEvent } from '@/types';

/**
 * Offline-capable persistence for player_match_events.
 *
 * Mirrors the cloudWrite offline pattern: writes go straight to Supabase when
 * online; when offline (or on a transient error) they are queued in
 * localStorage and flushed on reconnect. Reads come from Supabase and are
 * merged with any still-pending local events by the caller.
 */

const LS_PENDING = 'kickon_pending_player_events';

export interface PlayerEventInput {
  localId: string;
  coachMatchId: string;
  playerId: string;
  eventType: PlayerEventType;
  x: number | null;
  y: number | null;
  outcome: string | null;
  assistType: string | null;
  /** Coach id when a coach is entering/editing on the player's behalf; else null. */
  editedBy?: string | null;
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

function loadPending(): PlayerEventInput[] {
  try {
    const raw = localStorage.getItem(LS_PENDING);
    return raw ? (JSON.parse(raw) as PlayerEventInput[]) : [];
  } catch {
    return [];
  }
}

function savePending(list: PlayerEventInput[]): void {
  try {
    localStorage.setItem(LS_PENDING, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
}

function addPending(e: PlayerEventInput): void {
  const list = loadPending();
  if (!list.some((p) => p.localId === e.localId)) {
    list.push(e);
    savePending(list);
  }
}

function removePending(localId: string): void {
  savePending(loadPending().filter((p) => p.localId !== localId));
}

function toRow(e: PlayerEventInput) {
  return {
    coach_match_id: e.coachMatchId,
    player_id: e.playerId,
    event_type: e.eventType,
    x_position: e.x,
    y_position: e.y,
    outcome: e.outcome,
    assist_type: e.assistType,
    edited_by: e.editedBy ?? null,
  };
}

/** Insert an event. Returns the cloud id when synced, or null when queued offline. */
export async function insertPlayerEvent(e: PlayerEventInput): Promise<string | null> {
  if (isOffline()) {
    addPending(e);
    return null;
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_match_events')
    .insert(toRow(e))
    .select('id')
    .single();
  if (error || !data) {
    console.error('[playerEvents] insert error:', error);
    addPending(e);
    return null;
  }
  return data.id as string;
}

/** Delete an event. If only queued locally (no cloud id), just drop it from the queue. */
export async function deletePlayerEvent(localId: string, cloudId?: string): Promise<void> {
  removePending(localId);
  if (!cloudId) return;
  if (isOffline()) return;
  const supabase = createClient();
  const { error } = await supabase.from('player_match_events').delete().eq('id', cloudId);
  if (error) console.error('[playerEvents] delete error:', error);
}

export interface PlayerEventPatch {
  x?: number | null;
  y?: number | null;
  outcome?: string | null;
  assistType?: string | null;
  editedBy?: string | null;
}

/** Update an existing event (used by the coach edit flow). */
export async function updatePlayerEvent(
  localId: string,
  cloudId: string | undefined,
  patch: PlayerEventPatch,
): Promise<void> {
  // Keep any still-queued copy in sync so a later flush carries the edit.
  const list = loadPending();
  const idx = list.findIndex((p) => p.localId === localId);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      x: patch.x ?? list[idx].x,
      y: patch.y ?? list[idx].y,
      outcome: patch.outcome !== undefined ? patch.outcome : list[idx].outcome,
      assistType: patch.assistType !== undefined ? patch.assistType : list[idx].assistType,
      editedBy: patch.editedBy ?? list[idx].editedBy,
    };
    savePending(list);
  }

  if (!cloudId || isOffline()) return;
  const row: Record<string, unknown> = {};
  if (patch.x !== undefined) row.x_position = patch.x;
  if (patch.y !== undefined) row.y_position = patch.y;
  if (patch.outcome !== undefined) row.outcome = patch.outcome;
  if (patch.assistType !== undefined) row.assist_type = patch.assistType;
  if (patch.editedBy !== undefined) row.edited_by = patch.editedBy;

  const supabase = createClient();
  const { error } = await supabase.from('player_match_events').update(row).eq('id', cloudId);
  if (error) console.error('[playerEvents] update error:', error);
}

/** Coach marks a player's review complete (coaches have UPDATE on coach_match_players). */
export async function markReviewedByCoach(coachMatchId: string, playerId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('coach_match_players')
    .update({ reviewed: true, reviewed_at: new Date().toISOString() })
    .eq('coach_match_id', coachMatchId)
    .eq('player_id', playerId);
  if (error) throw error;
}

/** Flush any queued events. Returns the number successfully synced. */
export async function flushPendingPlayerEvents(): Promise<number> {
  if (isOffline()) return 0;
  const pending = loadPending();
  if (pending.length === 0) return 0;
  const supabase = createClient();
  let flushed = 0;
  for (const e of pending) {
    const { error } = await supabase.from('player_match_events').insert(toRow(e));
    if (!error) {
      removePending(e.localId);
      flushed++;
    } else {
      console.error('[playerEvents] flush error:', error);
    }
  }
  return flushed;
}

export function pendingPlayerEventCount(): number {
  return loadPending().length;
}

/** Pending events for a specific match (used to merge into the UI after a reload). */
export function pendingPlayerEventsFor(coachMatchId: string, playerId: string): PlayerEventInput[] {
  return loadPending().filter((e) => e.coachMatchId === coachMatchId && e.playerId === playerId);
}

/** Load this player's stored events for a match. */
export async function loadPlayerEvents(
  coachMatchId: string,
  playerId: string,
): Promise<PlayerMatchEvent[]> {
  if (isOffline()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('player_match_events')
    .select('*')
    .eq('coach_match_id', coachMatchId)
    .eq('player_id', playerId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[playerEvents] load error:', error);
    return [];
  }
  return (data ?? []) as unknown as PlayerMatchEvent[];
}

/** Mark the player's review complete via the SECURITY DEFINER RPC. */
export async function submitPlayerReview(coachMatchId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc('submit_player_review', {
    p_coach_match_id: coachMatchId,
  });
  if (error) throw error;
}
